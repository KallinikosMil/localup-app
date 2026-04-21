-- ===========================================
-- Fix RLS policies for LocalUp
-- Run in Supabase SQL Editor
-- ===========================================

-- Profiles: any authenticated user can
-- view profiles (needed for discover/matches)
-- Only owner can update their own profile
DROP POLICY IF EXISTS
  "Profiles are viewable by owner"
  ON public.profiles;

DROP POLICY IF EXISTS
  "Profiles are editable by owner"
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

-- User interests: any authenticated user
-- can view (for discover cards)
-- Only owner can insert/delete
DROP POLICY IF EXISTS
  "User interests viewable by owner"
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

-- Match queue: user can see and create
-- their own swipe entries
CREATE POLICY
  "Match queue access by user"
  ON public.match_queue
  FOR ALL
  USING (auth.uid() = user_id);

-- Also allow reading entries where user
-- is the target (for mutual match check)
CREATE POLICY
  "Match queue target readable"
  ON public.match_queue
  FOR SELECT
  USING (
    auth.uid() = target_user_id
  );

-- Matches: participants can view
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

-- Chat threads: participants can view
-- and create
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

-- Chat messages: thread participants
-- can view, sender can insert
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

-- Done! All RLS policies updated for
-- proper multi-user access patterns.
