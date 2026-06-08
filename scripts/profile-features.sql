-- ===========================================
-- Profile features: mode override + photos
-- Run in Supabase SQL Editor.
-- ===========================================

-- 1. Add mode_override column.
--    Values: 'traveler' | 'local' | NULL.
--    NULL = auto-compute from location.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS
    mode_override text
    CHECK (mode_override IN
      ('traveler', 'local'));

-- 2. Create public bucket for user photos.
INSERT INTO storage.buckets
  (id, name, public)
VALUES
  ('user-photos', 'user-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS for storage.objects (photos).
--    Anyone authenticated can read public
--    photos. Owner can upload/delete in
--    their own folder.
DROP POLICY IF EXISTS
  "User photos readable"
  ON storage.objects;
DROP POLICY IF EXISTS
  "User photos owner write"
  ON storage.objects;
DROP POLICY IF EXISTS
  "User photos owner delete"
  ON storage.objects;

CREATE POLICY
  "User photos readable"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'user-photos');

CREATE POLICY
  "User photos owner write"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'user-photos' AND
    auth.uid()::text =
      (storage.foldername(name))[1]
  );

CREATE POLICY
  "User photos owner delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'user-photos' AND
    auth.uid()::text =
      (storage.foldername(name))[1]
  );

-- 4. Media table RLS:
--    photos readable by all authenticated,
--    writable by owner only.
DROP POLICY IF EXISTS
  "Media readable"
  ON public.media;
DROP POLICY IF EXISTS
  "Media owner write"
  ON public.media;

CREATE POLICY
  "Media readable"
  ON public.media
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY
  "Media owner write"
  ON public.media
  FOR ALL
  USING (auth.uid() = user_id);
