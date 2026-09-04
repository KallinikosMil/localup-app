-- ===========================================
-- Three demo photos for every seeded account
-- ===========================================
--
-- Without these, seeded profiles render as a grey placeholder icon, the
-- photo pager never appears (it needs >1 photo), and nothing about the
-- card can be judged — including the paging bug that only shows up when
-- there is more than one picture to page through.
--
-- ⚠️ POINTS AT THE demo-*.jpg OBJECTS ONLY.
-- The user-photos bucket also holds real photographs belonging to real
-- people who signed up. Those are never referenced here and must never
-- be: seed data is demo data, and a fixture that hands one person's face
-- to eight fake profiles is exactly the thing that must not happen.
--
-- No upload is needed. The bucket is public for reads, so a media row
-- pointing at a shared demo path renders. Several profiles referencing
-- one object is fine for fixtures and saves six copies of the same file.
--
-- ⚠️ One consequence worth knowing: useDeletePhoto finds a file THROUGH a
-- media row, so deleting a photo from one of these seeded profiles
-- removes the shared object and blanks it for the others. Re-run this
-- file after that happens; do not "fix" it by deleting rows.
--
-- SAFE TO RE-RUN. Only touches @test.local accounts, and only ones with
-- no photo at all — anyone who has uploaded is left alone.

begin;

with demo(path, n) as (values
  ('dddddddd-0001-4000-8000-000000000001/demo-0.jpg', 0),
  ('dddddddd-0001-4000-8000-000000000001/demo-1.jpg', 1),
  ('dddddddd-0001-4000-8000-000000000001/demo-2.jpg', 2),
  ('dddddddd-0002-4000-8000-000000000002/demo-0.jpg', 3),
  ('dddddddd-0002-4000-8000-000000000002/demo-1.jpg', 4),
  ('dddddddd-0002-4000-8000-000000000002/demo-2.jpg', 5)
),
needy as (
  select p.user_id, row_number() over (order by p.user_id) - 1 as k
    from public.profiles p
    join auth.users u on u.id = p.user_id
   where u.email like '%@test.local'
     and not exists (
       select 1 from public.media m where m.user_id = p.user_id
     )
)
insert into public.media (user_id, type, storage_path, position)
select n.user_id, 'photo', d.path, s.pos
  from needy n
  -- Three each, and the rotation offset by the account's own index so
  -- consecutive cards in the deck do not all show the same picture.
  cross join lateral (values (0), (1), (2)) as s(pos)
  join demo d on d.n = ((n.k * 3) + s.pos) % 6;

-- avatar_url mirrors position 0 — the same rule complete_onboarding
-- follows, so a seeded profile and a real one agree on which photo is
-- the avatar.
update public.profiles p
   set avatar_url = 'https://ejpenygtbeszhvapulro.supabase.co'
                 || '/storage/v1/object/public/user-photos/'
                 || m.storage_path
  from public.media m
 where m.user_id = p.user_id
   and m.position = 0
   and p.avatar_url is null;

commit;

-- Should report zero.
select count(*) as profiles_without_photos
  from public.profiles p
 where not exists (select 1 from public.media m where m.user_id = p.user_id);
