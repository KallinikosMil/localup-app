-- ===========================================
-- Enable Supabase Realtime for live updates
-- Run in Supabase SQL Editor
-- ===========================================

ALTER PUBLICATION supabase_realtime
  ADD TABLE public.chat_messages;

ALTER PUBLICATION supabase_realtime
  ADD TABLE public.chat_threads;

ALTER PUBLICATION supabase_realtime
  ADD TABLE public.matches;
