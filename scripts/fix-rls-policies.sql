-- ===========================================
-- Fix RLS policies for LocalUp
-- Run in Supabase SQL Editor
-- Idempotent: drops all known policies
-- before creating new ones.
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

CREATE POLICY
  "Profiles viewable by authenticated"
  ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

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

-- ----- MATCH QUEUE -----
DROP POLICY IF EXISTS
  "Match queue access by user"
  ON public.match_queue;
DROP POLICY IF EXISTS
  "Match queue target readable"
  ON public.match_queue;

CREATE POLICY
  "Match queue access by user"
  ON public.match_queue
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY
  "Match queue target readable"
  ON public.match_queue
  FOR SELECT
  USING (
    auth.uid() = target_user_id
  );

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

CREATE POLICY
  "Threads viewable by participants"
  ON public.chat_threads
  FOR SELECT
  USING (
    auth.uid() = traveler_id OR
    auth.uid() = host_id
  );

CREATE POLICY
  "Threads insertable by participants"
  ON public.chat_threads
  FOR INSERT
  WITH CHECK (
    auth.uid() = traveler_id OR
    auth.uid() = host_id
  );

CREATE POLICY
  "Threads updatable by participants"
  ON public.chat_threads
  FOR UPDATE
  USING (
    auth.uid() = traveler_id OR
    auth.uid() = host_id
  );

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
