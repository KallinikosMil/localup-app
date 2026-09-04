-- ROLLBACK SNAPSHOT — discover_candidates as it stood BEFORE the two-tier
-- interest score. Captured 2026-09-04 from pg_get_functiondef.
--   md5 5a3ad1ba9a62cf8fb5c8a6cb6e02d79e, 7343 chars
--
-- Run this verbatim to put the previous ranking back.
--
-- The two SET clauses below are load-bearing and easy to lose: CREATE OR
-- REPLACE does NOT preserve function attributes, so any replacement that
-- omits them silently drops the 1500ms statement timeout and the
-- search_path pin. A SECURITY DEFINER function with an unpinned
-- search_path is a privilege-escalation shape, so this is not cosmetic.

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
  v_max_dist_km       int;
  v_min_age           int;
  v_max_age           int;
  v_w_interests       double precision;
  v_w_distance        double precision;
  v_w_recency         double precision;
  v_w_language        double precision;
  v_recency_window_d  int;
  v_local_radius_km   constant int := 50;
  v_photo_cap         constant int := 6;
  -- Must equal PREF_DEFAULTS.maxDistanceKm on the client. A screen that
  -- names a different number is describing a deck this function is not
  -- building.
  v_default_dist_km   constant int := 10;
  v_default_min_age   constant int := 18;
  v_default_max_age   constant int := 99;
begin
  if v_swiper_id is null then
    raise exception 'discover_candidates: not authenticated'
      using errcode = '28000';
  end if;

  select p.current_geog, p.home_geog, coalesce(p.languages, '{}'::text[]),
         p.mode_override, coalesce(p.interest_ids, '{}'::uuid[])
    into v_swiper_geog, v_swiper_home, v_swiper_langs,
         v_swiper_mode_ovr, v_swiper_interests
    from public.profiles p
   where p.user_id = v_swiper_id;

  if v_swiper_geog is null then return; end if;

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
         mw.recency_window_days
    into v_w_interests, v_w_distance, v_w_recency, v_w_language,
         v_recency_window_d
    from public.match_weights mw
   where mw.id = 1;

  return query
  with swiper_swiped as materialized (
    select swiped_id from public.swipes where swiper_id = v_swiper_id
  ),
  bbox as (
    select p.user_id, p.display_name, p.bio, p.home_city, p.avatar_url,
           p.languages, p.last_location_at, p.current_lat, p.current_lng,
           p.interest_ids,
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
       -- GUARD: safe only because swipes.swiped_id is NOT NULL. NOT IN over a
       -- set containing NULL is never TRUE and would silently return an empty
       -- deck.
       and p.user_id not in (select swiped_id from swiper_swiped)
       -- Blocks, both directions.
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
             as shared_count
      from bbox b
  ),
  ranked as (
    select s.*,
           (
             v_w_interests
               * (s.shared_count::float
                  / greatest(cardinality(v_swiper_interests), 1)::float)
           + v_w_distance
               * (1.0 - least(s.dist_meters / (v_max_dist_km * 1000.0), 1.0))
           + v_w_recency
               * greatest(0,
                   1.0 - extract(epoch from (now() - coalesce(s.last_location_at, 'epoch'::timestamptz)))
                         / (v_recency_window_d * 86400.0))
           + v_w_language
               * case when s.languages && v_swiper_langs then 1.0 else 0.0 end
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
    -- Shared first, then alphabetical inside each group, so the card can
    -- render the array as-is and the highlighted chips lead.
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
