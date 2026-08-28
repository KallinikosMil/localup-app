-- ===========================================
-- RLS policies for LocalUp
-- Run in Supabase SQL Editor.
--
-- Drops the known policy names before creating them, so it is safe to
-- re-run. That is ALSO how it became dangerous once: RLS policies are
-- PERMISSIVE and OR together, so a policy this script does not name is
-- not replaced — it is joined by whatever this file creates, and the
-- more permissive of the two wins. For three policies this file was a
-- silent way to undo a security fix.
--
-- Keep it in step with the live database. It is not just a bootstrap; it
-- is the readable record of what the policies ARE.
--
-- Last reconciled against the live project: 2026-08-28.
-- ===========================================

-- ----- PROFILES -----
DROP POLICY IF EXISTS
  "Profiles are viewable by owner"
  ON public.profiles;
DROP POLICY IF EXISTS
  "Profiles are editable by owner"
  ON public.profiles;
DROP POLICY IF EXISTS
  "Profiles viewable by authenticated"
  ON public.profiles;
DROP POLICY IF EXISTS
  "Profiles editable by owner"
  ON public.profiles;
DROP POLICY IF EXISTS
  "Profiles are viewable by authenticated users"
  ON public.profiles;
DROP POLICY IF EXISTS
  "Profiles readable by owner"
  ON public.profiles;

-- Owner only. This used to be USING (auth.role() = 'authenticated'),
-- which is not "the public fields" — it is every row of profiles to
-- anyone holding an account, and the table carries home_lat, home_lng,
-- current_lat, current_lng and date_of_birth.
--
-- Other people's profiles are reached through SECURITY DEFINER functions
-- that return only what the screen needs: get_public_profile,
-- discover_candidates, get_matches_overview and get_blocked_users. The
-- last two were INVOKER and had to be promoted before this could tighten,
-- or the Matches list and the Blocked screen would have gone blank.
CREATE POLICY
  "Profiles readable by owner"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY
  "Profiles editable by owner"
  ON public.profiles
  FOR ALL
  USING (auth.uid() = user_id);

-- ----- USER INTERESTS -----
DROP POLICY IF EXISTS
  "User interests viewable by owner"
  ON public.user_interests;
DROP POLICY IF EXISTS
  "User interests viewable by authenticated"
  ON public.user_interests;
DROP POLICY IF EXISTS
  "User interests editable by owner"
  ON public.user_interests;

CREATE POLICY
  "User interests viewable by authenticated"
  ON public.user_interests
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY
  "User interests editable by owner"
  ON public.user_interests
  FOR ALL
  USING (auth.uid() = user_id);

-- ----- SWIPES -----
-- SELECT-only since PR #2 (migrations 2c + 2e): all writes go through
-- the handle_swipe RPC (SECURITY DEFINER). No client INSERT/UPDATE/
-- DELETE policies — that's deliberate, do not re-add them. 2e also
-- dropped the legacy "Match queue *" policies that survived the #0a
-- table rename and the duplicate "Users can ..." set.
DROP POLICY IF EXISTS
  "Swipes access by swiper"
  ON public.swipes;
DROP POLICY IF EXISTS
  "Swipes readable by swiper"
  ON public.swipes;
DROP POLICY IF EXISTS
  "Swipes target readable"
  ON public.swipes;

CREATE POLICY
  "Swipes readable by swiper"
  ON public.swipes
  FOR SELECT
  USING (auth.uid() = swiper_id);

-- DELIBERATELY NOT RECREATED: "Swipes target readable", which was
-- USING (auth.uid() = swiped_id). It let every user read every swipe aimed
-- at them — who liked them before any match existed, and who passed on
-- them. Nothing reads this table from the client, and discover_candidates
-- and handle_swipe are SECURITY DEFINER, so removing it costs nothing.
-- The DROP above stays so re-running this file removes it again.

-- ----- MATCHES -----
DROP POLICY IF EXISTS
  "Matches viewable by participants"
  ON public.matches;
DROP POLICY IF EXISTS
  "Matches insertable by authenticated"
  ON public.matches;

CREATE POLICY
  "Matches viewable by participants"
  ON public.matches
  FOR SELECT
  USING (
    auth.uid() = traveler_id OR
    auth.uid() = host_id
  );

CREATE POLICY
  "Matches insertable by authenticated"
  ON public.matches
  FOR INSERT
  WITH CHECK (
    auth.uid() = traveler_id OR
    auth.uid() = host_id
  );

-- ----- CHAT THREADS -----
DROP POLICY IF EXISTS
  "Threads viewable by participants"
  ON public.chat_threads;
DROP POLICY IF EXISTS
  "Threads insertable by participants"
  ON public.chat_threads;
DROP POLICY IF EXISTS
  "Threads updatable by participants"
  ON public.chat_threads;

DROP POLICY IF EXISTS
  "Participants can read chat threads"
  ON public.chat_threads;
DROP POLICY IF EXISTS
  "Participants can insert chat threads"
  ON public.chat_threads;
DROP POLICY IF EXISTS
  "Participants can update chat threads"
  ON public.chat_threads;

CREATE POLICY
  "Participants can read chat threads"
  ON public.chat_threads
  FOR SELECT
  USING (
    auth.uid() = traveler_id OR
    auth.uid() = host_id
  );

-- Being one of the two named participants was the whole check, and it
-- never confirmed the match existed — so a thread could be opened with
-- anyone, skipping matching entirely.
CREATE POLICY
  "Participants can insert chat threads"
  ON public.chat_threads
  FOR INSERT
  WITH CHECK (
    (auth.uid() = traveler_id OR auth.uid() = host_id)
    AND EXISTS (
      SELECT 1 FROM public.matches m
       WHERE m.id          = chat_threads.match_id
         AND m.traveler_id = chat_threads.traveler_id
         AND m.host_id     = chat_threads.host_id
         AND (m.traveler_id = auth.uid() OR m.host_id = auth.uid())
    )
  );

-- USING with no WITH CHECK: Postgres then reuses USING as the write
-- check, so a traveler could rewrite host_id to a third party and still
-- pass it — they are still the traveler. RLS cannot compare the new row
-- to the old one, so the guard is a COLUMN GRANT below instead: the app
-- only ever writes last_message_at, so that is the only column anyone may
-- write. The policy still decides WHICH rows.
CREATE POLICY
  "Participants can update chat threads"
  ON public.chat_threads
  FOR UPDATE
  USING (
    auth.uid() = traveler_id OR
    auth.uid() = host_id
  );

REVOKE UPDATE ON public.chat_threads FROM authenticated;
GRANT  UPDATE (last_message_at) ON public.chat_threads TO authenticated;
REVOKE UPDATE ON public.chat_threads FROM anon;

-- ----- CHAT MESSAGES -----
DROP POLICY IF EXISTS
  "Messages viewable by thread members"
  ON public.chat_messages;
DROP POLICY IF EXISTS
  "Messages insertable by sender"
  ON public.chat_messages;

CREATE POLICY
  "Messages viewable by thread members"
  ON public.chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_threads t
      WHERE t.id = thread_id
        AND (
          auth.uid() = t.traveler_id OR
          auth.uid() = t.host_id
        )
    )
  );

CREATE POLICY
  "Messages insertable by sender"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
  );

-- Done! All RLS policies updated.
