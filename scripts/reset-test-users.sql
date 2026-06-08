-- ===========================================
-- Reset Test Users for LocalUp
-- WARNING: this DELETES all @test.local
-- accounts. Cascade clears profiles,
-- user_interests, match_queue, matches,
-- chat_threads, chat_messages, media.
-- Run this in the Supabase SQL Editor,
-- then re-run scripts/seed-test-users.sql.
-- ===========================================

DELETE FROM auth.users
WHERE email LIKE '%@test.local';
