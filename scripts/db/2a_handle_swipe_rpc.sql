-- SNAPSHOT of migration 2a_handle_swipe_rpc (applied 2026-06-10 via
-- mcp__supabase__apply_migration). The live DB is canonical; this copy
-- exists so scripts/verify-mode-constant.ts can pin v_local_radius_km
-- without a DB round trip, and as the repo record of the deployed SQL.
-- If you change the function, change it via a NEW migration and update
-- this snapshot in the same commit.
--
-- PR #2: server-side atomic swipe + mutual match.
-- Spec: docs/superpowers/specs/2026-06-10-handle-swipe-rpc-design.md (v2,
-- tech-lead approved with R1 advisory-lock + R2 stored-status decision).

-- (1) Arbiter for ON CONFLICT (swiper_id, swiped_id): ensure a unique
-- pair index exists (believed to ship via add_match_queue_unique_constraint
-- + the #0a rename; verified rather than assumed).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = 'swipes'
       AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
       AND (indexdef ILIKE '%(swiper_id, swiped_id)%'
            OR indexdef ILIKE '%(swiped_id, swiper_id)%')
  ) THEN
    ALTER TABLE public.swipes
      ADD CONSTRAINT swipes_swiper_swiped_unique UNIQUE (swiper_id, swiped_id);
  END IF;
END $$;

-- (2) Matches: both parties mandatory (LEAST/GREATEST over NULL would
-- corrupt the canonical pair), and exactly-one-match-per-pair enforced by
-- constraint, not logic. Two concurrent mutual likes -> one insert wins,
-- the other no-ops via ON CONFLICT DO NOTHING.
ALTER TABLE public.matches
  ALTER COLUMN traveler_id SET NOT NULL,
  ALTER COLUMN host_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_matches_pair
  ON public.matches (LEAST(traveler_id, host_id), GREATEST(traveler_id, host_id));

-- (3) The RPC.
CREATE OR REPLACE FUNCTION public.handle_swipe(
  p_swiped_id uuid,
  p_action    text
)
RETURNS TABLE (matched boolean, match_id uuid)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
SET statement_timeout = '1500ms'
AS $fn$
DECLARE
  v_swiper          uuid := auth.uid();
  v_my_status       text;
  v_swiper_mode     text;
  v_other_mode      text;
  v_traveler        uuid;
  v_host            uuid;
  v_match_id        uuid;
  -- MUST stay equal to discover_candidates.v_local_radius_km and the
  -- client LOCAL_RADIUS_KM (useProfile.ts). Pinned by
  -- scripts/verify-mode-constant.ts (spec §16 / Q2: logic deliberately
  -- duplicated for v1 — do not extract a per-row helper, it would not
  -- inline and risks the verified discover_candidates plan).
  v_local_radius_km constant int := 50;
BEGIN
  -- Swiper identity comes from the JWT, never from a parameter: this
  -- function is SECURITY DEFINER, a caller-supplied id would let any
  -- authenticated user swipe (and match) as someone else.
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

  -- [R1] Serialize concurrent calls for the SAME pair. Under READ
  -- COMMITTED, two simultaneous mutual likes can each run their mutual
  -- check before the other's commit -> both return matched:false and
  -- the match is never created. The unique index only prevents the
  -- duplicate match; it cannot create the missed one. xact-scoped:
  -- released automatically at commit/rollback.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(LEAST(v_swiper, p_swiped_id)::text || ':' ||
                     GREATEST(v_swiper, p_swiped_id)::text, 0));

  INSERT INTO public.swipes (swiper_id, swiped_id, status)
  VALUES (v_swiper, p_swiped_id, p_action)
  ON CONFLICT (swiper_id, swiped_id) DO NOTHING;

  -- [R2] Decide from the STORED status, never from p_action: after
  -- DO NOTHING a repeat call may carry a different action than what was
  -- stored ('passed' then 'liked'); flowing on p_action could create a
  -- match contradicting the stored 'passed'. First-action-wins.
  SELECT s.status INTO v_my_status
    FROM public.swipes s
   WHERE s.swiper_id = v_swiper AND s.swiped_id = p_swiped_id;

  IF v_my_status = 'matched' THEN
    -- Idempotent re-call after a match: return the existing truth.
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

  -- Mutual? A concurrent partner transaction reaches here only after
  -- ours commits (advisory lock), so it WILL see our liked row.
  IF NOT EXISTS (
    SELECT 1 FROM public.swipes s
     WHERE s.swiper_id = p_swiped_id AND s.swiped_id = v_swiper
       AND s.status IN ('liked', 'matched')
  ) THEN
    RETURN QUERY SELECT false, NULL::uuid;
    RETURN;
  END IF;

  -- Roles from modes AT MATCH TIME, computed from profiles — never from
  -- who liked last. Mode logic mirrors the bbox CASE in
  -- discover_candidates (see constant note above).
  SELECT COALESCE(
           pr.mode_override,
           CASE
             WHEN pr.home_geog IS NOT NULL AND pr.current_geog IS NOT NULL
                  AND ST_Distance(pr.home_geog, pr.current_geog) / 1000.0 <= v_local_radius_km
             THEN 'local'
             ELSE 'traveler'
           END)
    INTO v_swiper_mode
    FROM public.profiles pr
   WHERE pr.user_id = v_swiper;

  SELECT COALESCE(
           pr.mode_override,
           CASE
             WHEN pr.home_geog IS NOT NULL AND pr.current_geog IS NOT NULL
                  AND ST_Distance(pr.home_geog, pr.current_geog) / 1000.0 <= v_local_radius_km
             THEN 'local'
             ELSE 'traveler'
           END)
    INTO v_other_mode
    FROM public.profiles pr
   WHERE pr.user_id = p_swiped_id;

  IF v_swiper_mode = 'traveler' AND v_other_mode = 'local' THEN
    v_traveler := v_swiper;     v_host := p_swiped_id;
  ELSIF v_swiper_mode = 'local' AND v_other_mode = 'traveler' THEN
    v_traveler := p_swiped_id;  v_host := v_swiper;
  ELSE
    -- Q1: same-mode tie (GPS drift since serve time) never rejects the
    -- match. v1 fallback: deterministic LEAST(uuid) = traveler. Future
    -- option: greater home->current distance = traveler.
    v_traveler := LEAST(v_swiper, p_swiped_id);
    v_host     := GREATEST(v_swiper, p_swiped_id);
  END IF;

  INSERT INTO public.matches (traveler_id, host_id, status)
  VALUES (v_traveler, v_host, 'active')
  ON CONFLICT (LEAST(traveler_id, host_id), GREATEST(traveler_id, host_id)) DO NOTHING;

  SELECT m.id INTO v_match_id
    FROM public.matches m
   WHERE LEAST(m.traveler_id, m.host_id) = LEAST(v_swiper, p_swiped_id)
     AND GREATEST(m.traveler_id, m.host_id) = GREATEST(v_swiper, p_swiped_id);

  -- Flip both swipe rows (definer rights — this is exactly the write
  -- that RLS silently blocked when the client attempted it).
  UPDATE public.swipes s
     SET status = 'matched', updated_at = now()
   WHERE (s.swiper_id = v_swiper AND s.swiped_id = p_swiped_id)
      OR (s.swiper_id = p_swiped_id AND s.swiped_id = v_swiper);

  RETURN QUERY SELECT true, v_match_id;
END;
$fn$;

-- (4) Definer hygiene: authenticated-only.
REVOKE EXECUTE ON FUNCTION public.handle_swipe(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_swipe(uuid, text) TO authenticated, service_role;
