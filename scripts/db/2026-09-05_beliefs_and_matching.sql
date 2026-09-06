-- ===========================================
-- 2026-09-04/05 — the matching changes, as ONE bundle
-- ===========================================
--
-- Everything in this file is LIVE (applied through the Supabase MCP,
-- versions 20260904112513 → 20260905133656) and until now existed only
-- there. Five separate migrations landed in a day; the repo held one of
-- them and an intermediate copy of another — which a code review caught
-- as a trap: re-applying that intermediate file would have silently
-- removed the politics/religion tier from the live ranking.
--
-- This is the current truth, in dependency order. Idempotent: safe to
-- re-run against a database that already has all of it.
--
-- Contents:
--   1. profiles.politics / profiles.religion + CHECK vocabularies
--   2. match_weights.w_politics / w_religion
--   3. set_user_interests — cap 3-5 → 3-8
--   4. handle_swipe — reactivate an unmatched pair, refuse blocked pairs
--   5. discover_candidates — two-tier interest affinity + belief terms
--
-- Rollback for #5 alone: discover_candidates_ROLLBACK.sql (the function
-- as it was before ANY of this). There is no rollback for #1 that keeps
-- data; dropping the columns drops the answers.

begin;

-- ---------------------------------------------------------------
-- 1. Politics and religion on the profile
-- ---------------------------------------------------------------
-- ⚠️ GDPR Article 9 SPECIAL CATEGORY DATA. Lawful here only under 9(2)(a),
-- explicit consent — hence nullable, never required, and scored
-- NEUTRALLY when absent (see v_unanswered in #5). A ranking that buries
-- people who decline to answer is pressure to answer, and that is not
-- consent.

alter table public.profiles
  add column if not exists politics text,
  add column if not exists religion text;

-- Politics is ORDERED left → right on purpose: #5 measures DISTANCE along
-- it. 'apolitical' is off the axis and scored as its own category.
alter table public.profiles drop constraint if exists profiles_politics_check;
alter table public.profiles add constraint profiles_politics_check check (
  politics is null or politics in (
    'left', 'centre_left', 'centre', 'centre_right', 'right', 'apolitical'
  )
);

-- Religion has no meaningful order; matched categorically.
alter table public.profiles drop constraint if exists profiles_religion_check;
alter table public.profiles add constraint profiles_religion_check check (
  religion is null or religion in (
    'agnostic', 'atheist', 'buddhist', 'christian', 'hindu',
    'jewish', 'muslim', 'spiritual', 'other'
  )
);

comment on column public.profiles.politics is
  'GDPR Art.9 special category. Optional, self-declared, never required. NULL = not answered and is scored neutrally.';
comment on column public.profiles.religion is
  'GDPR Art.9 special category. Optional, self-declared, never required. NULL = not answered and is scored neutrally.';

-- ---------------------------------------------------------------
-- 2. Weights — below interests (10) and distance (5) on purpose
-- ---------------------------------------------------------------
alter table public.match_weights
  add column if not exists w_politics double precision not null default 3,
  add column if not exists w_religion double precision not null default 3;

-- ---------------------------------------------------------------
-- 3. set_user_interests — 3-8
-- ---------------------------------------------------------------
-- Raised alongside the catalogue growing 32 → 90. Expected shared
-- interests between two users is about k²/N; holding k at 5 while
-- tripling N would have cut average overlap from 0.78 to 0.28. This is
-- the boundary that DECIDES; INTEREST_MAX on the client is the copy the
-- UI uses to grey out a chip and must never exceed it.
CREATE OR REPLACE FUNCTION public.set_user_interests(p_interest_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid   uuid := auth.uid();
  v_count int;
  v_valid int;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select count(*) into v_count
    from (select distinct unnest(p_interest_ids) as id) d;

  if v_count < 3 or v_count > 8 then
    raise exception 'between 3 and 8 interests are required, got %', v_count
      using errcode = '23514';
  end if;

  select count(*) into v_valid
    from public.interests i
   where i.id = any (p_interest_ids) and i.is_active;

  if v_valid <> v_count then
    raise exception 'unknown or inactive interest in selection'
      using errcode = '23503';
  end if;

  delete from public.user_interests where user_id = v_uid;
  insert into public.user_interests (user_id, interest_id)
  select distinct v_uid, unnest(p_interest_ids);
end;
$function$;

-- ---------------------------------------------------------------
-- 4. handle_swipe — reactivate, and respect blocks
-- ---------------------------------------------------------------
-- Two fixes. (a) uq_matches_pair is unique per PAIR, so after end_match
-- the pair's row says 'unmatched' and the old DO NOTHING left it there
-- while still returning matched:true — "It's a match!" over a match the
-- database considered over. (b) There was NO block check: this is
-- SECURITY DEFINER and REST-callable with any uuid, and relying on the
-- deck to filter blocks is relying on the client.
CREATE OR REPLACE FUNCTION public.handle_swipe(p_swiped_id uuid, p_action text)
 RETURNS TABLE(matched boolean, match_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
 SET statement_timeout TO '1500ms'
AS $function$
DECLARE
  v_swiper          uuid := auth.uid();
  v_my_status       text;
  v_swiper_mode     text;
  v_other_mode      text;
  v_traveler        uuid;
  v_host            uuid;
  v_match_id        uuid;
  v_local_radius_km constant int := 50;
BEGIN
  IF v_swiper IS NULL THEN
    RAISE EXCEPTION 'handle_swipe: not authenticated';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('liked', 'passed') THEN
    RAISE EXCEPTION 'handle_swipe: invalid action "%"', p_action;
  END IF;
  IF p_swiped_id IS NULL OR p_swiped_id = v_swiper THEN
    RAISE EXCEPTION 'handle_swipe: invalid target';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.user_id = p_swiped_id) THEN
    RAISE EXCEPTION 'handle_swipe: unknown target';
  END IF;

  -- Blocks, both directions. A 'passed'-shaped answer rather than an
  -- error: whether a specific person blocked you is not something an
  -- error message should confirm.
  IF EXISTS (
    SELECT 1 FROM public.blocks b
     WHERE (b.blocker_id = v_swiper AND b.blocked_id = p_swiped_id)
        OR (b.blocker_id = p_swiped_id AND b.blocked_id = v_swiper)
  ) THEN
    RETURN QUERY SELECT false, NULL::uuid;
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(LEAST(v_swiper, p_swiped_id)::text || ':' ||
                     GREATEST(v_swiper, p_swiped_id)::text, 0));

  INSERT INTO public.swipes (swiper_id, swiped_id, status)
  VALUES (v_swiper, p_swiped_id, p_action)
  ON CONFLICT (swiper_id, swiped_id) DO NOTHING;

  SELECT s.status INTO v_my_status
    FROM public.swipes s
   WHERE s.swiper_id = v_swiper AND s.swiped_id = p_swiped_id;

  IF v_my_status = 'matched' THEN
    SELECT m.id INTO v_match_id
      FROM public.matches m
     WHERE LEAST(m.traveler_id, m.host_id) = LEAST(v_swiper, p_swiped_id)
       AND GREATEST(m.traveler_id, m.host_id) = GREATEST(v_swiper, p_swiped_id);
    RETURN QUERY SELECT true, v_match_id;
    RETURN;
  ELSIF v_my_status IS DISTINCT FROM 'liked' THEN
    RETURN QUERY SELECT false, NULL::uuid;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.swipes s
     WHERE s.swiper_id = p_swiped_id AND s.swiped_id = v_swiper
       AND s.status IN ('liked', 'matched')
  ) THEN
    RETURN QUERY SELECT false, NULL::uuid;
    RETURN;
  END IF;

  SELECT COALESCE(pr.mode_override,
           CASE WHEN pr.home_geog IS NOT NULL AND pr.current_geog IS NOT NULL
                     AND ST_Distance(pr.home_geog, pr.current_geog) / 1000.0 <= v_local_radius_km
                THEN 'local' ELSE 'traveler' END)
    INTO v_swiper_mode FROM public.profiles pr WHERE pr.user_id = v_swiper;

  SELECT COALESCE(pr.mode_override,
           CASE WHEN pr.home_geog IS NOT NULL AND pr.current_geog IS NOT NULL
                     AND ST_Distance(pr.home_geog, pr.current_geog) / 1000.0 <= v_local_radius_km
                THEN 'local' ELSE 'traveler' END)
    INTO v_other_mode FROM public.profiles pr WHERE pr.user_id = p_swiped_id;

  IF v_swiper_mode = 'traveler' AND v_other_mode = 'local' THEN
    v_traveler := v_swiper;     v_host := p_swiped_id;
  ELSIF v_swiper_mode = 'local' AND v_other_mode = 'traveler' THEN
    v_traveler := p_swiped_id;  v_host := v_swiper;
  ELSE
    v_traveler := LEAST(v_swiper, p_swiped_id);
    v_host     := GREATEST(v_swiper, p_swiped_id);
  END IF;

  -- DO UPDATE, not DO NOTHING: a previously unmatched pair that likes
  -- each other again gets their match BACK. Unmatch is not a block.
  INSERT INTO public.matches (traveler_id, host_id, status)
  VALUES (v_traveler, v_host, 'active')
  ON CONFLICT (LEAST(traveler_id, host_id), GREATEST(traveler_id, host_id))
  DO UPDATE SET status = 'active', updated_at = now();

  SELECT m.id INTO v_match_id
    FROM public.matches m
   WHERE LEAST(m.traveler_id, m.host_id) = LEAST(v_swiper, p_swiped_id)
     AND GREATEST(m.traveler_id, m.host_id) = GREATEST(v_swiper, p_swiped_id);

  UPDATE public.swipes s
     SET status = 'matched', updated_at = now()
   WHERE (s.swiper_id = v_swiper AND s.swiped_id = p_swiped_id)
      OR (s.swiper_id = p_swiped_id AND s.swiped_id = v_swiper);

  RETURN QUERY SELECT true, v_match_id;
END;
$function$;

-- ---------------------------------------------------------------
-- 5. discover_candidates — two-tier interests + beliefs
-- ---------------------------------------------------------------
-- Interest affinity = exact + (1 − exact) × 0.35 × category, so a shared
-- CATEGORY fills only the room exact leaves; nobody's score can drop.
-- Politics is DISTANCE along an ordered axis (neighbours 0.75, opposite
-- ends 0.0, apolitical 0.35 against any position). Religion is
-- categorical (same 1.0, different 0.2). A missing answer on either is
-- v_unanswered = 0.5 — the middle of the field — never 0.
--
-- ⚠️ Both SET clauses are load-bearing. CREATE OR REPLACE does not keep
-- function attributes; omit them and a SECURITY DEFINER function loses
-- its search_path pin.
CREATE OR REPLACE FUNCTION public.discover_candidates(p_limit integer DEFAULT 20)
 RETURNS TABLE(user_id uuid, display_name text, age integer, bio text, home_city text, avatar_url text, photo_paths text[], interest_names text[], shared_interest_names text[], current_lat double precision, current_lng double precision, languages text[], last_location_at timestamp with time zone, distance_km double precision, candidate_mode text, shared_interests integer, rank_score double precision)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET statement_timeout TO '1500ms'
 SET search_path TO 'public', 'extensions'
AS $function$
#variable_conflict use_column
declare
  v_swiper_id         uuid := auth.uid();
  v_swiper_geog       geography;
  v_swiper_home       geography;
  v_swiper_langs      text[];
  v_swiper_mode_ovr   text;
  v_swiper_mode       text;
  v_swiper_interests  uuid[];
  v_swiper_cats       text[];
  v_swiper_cat_n      int;
  v_swiper_politics   text;
  v_swiper_religion   text;
  v_max_dist_km       int;
  v_min_age           int;
  v_max_age           int;
  v_w_interests       double precision;
  v_w_distance        double precision;
  v_w_recency         double precision;
  v_w_language        double precision;
  v_w_politics        double precision;
  v_w_religion        double precision;
  v_recency_window_d  int;
  v_local_radius_km   constant int := 50;
  v_photo_cap         constant int := 6;
  v_cat_weight        constant double precision := 0.35;
  v_politics_axis     constant text[] :=
    array['left', 'centre_left', 'centre', 'centre_right', 'right'];
  v_unanswered        constant double precision := 0.5;
  v_default_dist_km   constant int := 10;
  v_default_min_age   constant int := 18;
  v_default_max_age   constant int := 99;
begin
  if v_swiper_id is null then
    raise exception 'discover_candidates: not authenticated'
      using errcode = '28000';
  end if;

  select p.current_geog, p.home_geog, coalesce(p.languages, '{}'::text[]),
         p.mode_override, coalesce(p.interest_ids, '{}'::uuid[]),
         p.politics, p.religion
    into v_swiper_geog, v_swiper_home, v_swiper_langs,
         v_swiper_mode_ovr, v_swiper_interests,
         v_swiper_politics, v_swiper_religion
    from public.profiles p
   where p.user_id = v_swiper_id;

  if v_swiper_geog is null then return; end if;

  select coalesce(array_agg(distinct i.category), '{}'::text[])
    into v_swiper_cats
    from public.interests i
   where i.id = any (v_swiper_interests);
  v_swiper_cat_n := greatest(coalesce(cardinality(v_swiper_cats), 0), 1);

  v_swiper_mode := coalesce(
    v_swiper_mode_ovr,
    case
      when v_swiper_home is null then 'traveler'
      when ST_Distance(v_swiper_home, v_swiper_geog) / 1000.0 <= v_local_radius_km
        then 'local'
      else 'traveler'
    end
  );

  select coalesce(mp.max_distance_km, v_default_dist_km)::int,
         coalesce(mp.min_age, v_default_min_age),
         coalesce(mp.max_age, v_default_max_age)
    into v_max_dist_km, v_min_age, v_max_age
    from public.match_preferences mp
   where mp.user_id = v_swiper_id;
  if not found then
    v_max_dist_km := v_default_dist_km;
    v_min_age     := v_default_min_age;
    v_max_age     := v_default_max_age;
  end if;

  select mw.w_interests, mw.w_distance, mw.w_recency, mw.w_language,
         mw.w_politics, mw.w_religion, mw.recency_window_days
    into v_w_interests, v_w_distance, v_w_recency, v_w_language,
         v_w_politics, v_w_religion, v_recency_window_d
    from public.match_weights mw
   where mw.id = 1;

  return query
  with swiper_swiped as materialized (
    select swiped_id from public.swipes where swiper_id = v_swiper_id
  ),
  bbox as (
    select p.user_id, p.display_name, p.bio, p.home_city, p.avatar_url,
           p.languages, p.last_location_at, p.current_lat, p.current_lng,
           p.interest_ids, p.politics, p.religion,
           extract(year from age(p.date_of_birth))::int as age,
           ST_Distance(p.current_geog, v_swiper_geog) as dist_meters,
           coalesce(
             p.mode_override,
             case
               when p.home_geog is not null
                    and ST_Distance(p.home_geog, p.current_geog) / 1000.0 <= v_local_radius_km
               then 'local'
               else 'traveler'
             end
           ) as candidate_mode
      from public.profiles p
     where p.user_id <> v_swiper_id
       and coalesce(p.onboarding_complete, false)
       and p.current_geog is not null
       and ST_DWithin(p.current_geog, v_swiper_geog, v_max_dist_km * 1000.0)
       and extract(year from age(p.date_of_birth))::int between v_min_age and v_max_age
       and p.user_id not in (select swiped_id from swiper_swiped)
       and not exists (
         select 1 from public.blocks b
          where (b.blocker_id = v_swiper_id and b.blocked_id = p.user_id)
             or (b.blocker_id = p.user_id and b.blocked_id = v_swiper_id)
       )
       and coalesce(
             p.mode_override,
             case
               when p.home_geog is not null
                    and ST_Distance(p.home_geog, p.current_geog) / 1000.0 <= v_local_radius_km
               then 'local'
               else 'traveler'
             end
           ) <> v_swiper_mode
     order by p.current_geog <-> v_swiper_geog
     limit 1000
  ),
  scored as (
    select b.*,
           public.array_intersect_count_uuid(v_swiper_interests, b.interest_ids)
             as shared_count,
           coalesce(cc.n, 0) as shared_cat_count,
           case
             when v_swiper_politics is null or b.politics is null
               then v_unanswered
             when v_swiper_politics = b.politics then 1.0
             when array_position(v_politics_axis, v_swiper_politics) is null
               or array_position(v_politics_axis, b.politics) is null
               then 0.35
             else 1.0 - abs(
                    array_position(v_politics_axis, v_swiper_politics)
                  - array_position(v_politics_axis, b.politics)
                  )::double precision / 4.0
           end as politics_affinity,
           case
             when v_swiper_religion is null or b.religion is null
               then v_unanswered
             when v_swiper_religion = b.religion then 1.0
             else 0.2
           end as religion_affinity
      from bbox b
      left join lateral (
        select count(distinct i.category) as n
          from public.interests i
         where i.id = any (b.interest_ids)
           and i.category = any (v_swiper_cats)
      ) cc on true
  ),
  ranked as (
    select s.*,
           (
             v_w_interests
               * (
                   (s.shared_count::float
                      / greatest(cardinality(v_swiper_interests), 1)::float)
                   + (1.0 - (s.shared_count::float
                             / greatest(cardinality(v_swiper_interests), 1)::float))
                     * v_cat_weight
                     * least(s.shared_cat_count::float / v_swiper_cat_n::float, 1.0)
                 )
           + v_w_distance
               * (1.0 - least(s.dist_meters / (v_max_dist_km * 1000.0), 1.0))
           + v_w_recency
               * greatest(0,
                   1.0 - extract(epoch from (now() - coalesce(s.last_location_at, 'epoch'::timestamptz)))
                         / (v_recency_window_d * 86400.0))
           + v_w_language
               * case when s.languages && v_swiper_langs then 1.0 else 0.0 end
           + v_w_politics * s.politics_affinity
           + v_w_religion * s.religion_affinity
           ) as rank_score
      from scored s
  ),
  top_n as (
    select r.*
      from ranked r
     order by r.rank_score desc, r.user_id asc
     limit p_limit
  )
  select t.user_id, t.display_name, t.age, t.bio, t.home_city, t.avatar_url,
         coalesce(ph.paths, '{}'::text[]) as photo_paths,
         coalesce(ix.all_names, '{}'::text[]) as interest_names,
         coalesce(ix.shared_names, '{}'::text[]) as shared_interest_names,
         t.current_lat, t.current_lng, t.languages, t.last_location_at,
         t.dist_meters / 1000.0 as distance_km,
         t.candidate_mode,
         t.shared_count as shared_interests,
         t.rank_score
    from top_n t
    left join lateral (
      select array_agg(m.storage_path order by m.position, m.id) as paths
        from (
          select m2.storage_path, m2.position, m2.id
            from public.media m2
           where m2.user_id = t.user_id
             and m2.type = 'photo'
           order by m2.position, m2.id
           limit v_photo_cap
        ) m
    ) ph on true
    left join lateral (
      select array_agg(i.name order by i.is_shared desc, i.name) as all_names,
             array_agg(i.name order by i.name)
               filter (where i.is_shared) as shared_names
        from (
          select it.name,
                 (it.id = any (v_swiper_interests)) as is_shared
            from public.interests it
           where it.id = any (t.interest_ids)
        ) i
    ) ix on true
   order by t.rank_score desc, t.user_id asc;
end;
$function$;

commit;
