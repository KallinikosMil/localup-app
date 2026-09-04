-- ===========================================
-- Ten travellers currently in Larissa
-- ===========================================
--
-- Why this file exists: the deck only ever shows the OPPOSITE mode
-- (discover_candidates filters on `candidate_mode <> v_swiper_mode`), so a
-- LOCAL testing in Larissa can only ever see TRAVELLERS who are in Larissa
-- right now. There were five. Five is two minutes of swiping and then an
-- empty deck, which is indistinguishable from a broken one.
--
-- The five that existed were also added by hand, straight into the
-- database, and recorded nowhere — so nobody could tell what the fixture
-- was supposed to be. This file is the fixture.
--
-- SAFE TO RE-RUN. Every statement is idempotent. It does NOT touch the
-- accounts seeded by seed-test-users.sql, and it is NOT the nuke in
-- reset-test-users.sql (which deletes every @test.local account there is —
-- read that warning before you ever run it).
--
-- home_* is elsewhere in Europe and current_* is Larissa, which is what
-- makes each of these a traveller: the mode is DERIVED from the distance
-- between the two (>50km => traveler), never stored.
-- current_geog / home_geog are GENERATED columns — set lat/lng only.
-- interest_ids is likewise maintained by a trigger off user_interests, so
-- inserting the join rows is enough.

begin;

-- 1. Auth accounts. Same convention as seed-test-users.sql:
--    <name>@test.local / password123.
insert into auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  aud, role, confirmation_token, recovery_token, email_change_token_new,
  email_change, email_change_token_current, phone_change,
  phone_change_token, reauthentication_token
)
select
  v.id, '00000000-0000-0000-0000-000000000000', v.email,
  crypt('password123', gen_salt('bf')), now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  'authenticated', 'authenticated', '', '', '', '', '', '', '', ''
from (values
  ('bbbbbbbb-0031-4000-8000-000000000031'::uuid, 'lucas@test.local'),
  ('bbbbbbbb-0032-4000-8000-000000000032'::uuid, 'ines@test.local'),
  ('bbbbbbbb-0033-4000-8000-000000000033'::uuid, 'mattia@test.local'),
  ('bbbbbbbb-0034-4000-8000-000000000034'::uuid, 'freja@test.local'),
  ('bbbbbbbb-0035-4000-8000-000000000035'::uuid, 'omar@test.local'),
  ('bbbbbbbb-0036-4000-8000-000000000036'::uuid, 'hanna@test.local'),
  ('bbbbbbbb-0037-4000-8000-000000000037'::uuid, 'pedro@test.local'),
  ('bbbbbbbb-0038-4000-8000-000000000038'::uuid, 'zeynep@test.local'),
  ('bbbbbbbb-0039-4000-8000-000000000039'::uuid, 'jonas@test.local'),
  ('bbbbbbbb-0040-4000-8000-000000000040'::uuid, 'clara@test.local')
) as v(id, email)
on conflict (id) do nothing;

-- 2. Profiles. Ages are spread 26-44 on purpose: wide enough that a
--    default 18-99 filter and a narrowed one both leave somebody in the
--    deck, so a filter test can tell "narrowed too far" from "empty".
insert into public.profiles (
  user_id, display_name, home_city, home_lat, home_lng,
  current_lat, current_lng, last_location_at,
  date_of_birth, bio, onboarding_complete
)
values
  ('bbbbbbbb-0031-4000-8000-000000000031','Lucas','Lyon',45.7640,4.8357,
   39.6390,22.4180, now(), '1994-03-11',
   'Three weeks across Greece on trains. Here for four days.', true),
  ('bbbbbbbb-0032-4000-8000-000000000032','Inês','Porto',41.1579,-8.6291,
   39.6425,22.4102, now(), '1996-07-22',
   'Photographing market towns. Point me at the good bakery.', true),
  ('bbbbbbbb-0033-4000-8000-000000000033','Mattia','Bologna',44.4949,11.3426,
   39.6338,22.4256, now(), '1988-11-02',
   'Cooking my way through Thessaly. I will eat anything twice.', true),
  ('bbbbbbbb-0034-4000-8000-000000000034','Freja','Copenhagen',55.6761,12.5683,
   39.6461,22.4211, now(), '1999-01-30',
   'First time this far south. Everything is louder and better.', true),
  ('bbbbbbbb-0035-4000-8000-000000000035','Omar','Valencia',39.4699,-0.3763,
   39.6302,22.4139, now(), '1991-05-17',
   'Climbing at Meteora, resting in town. Coffee recommendations welcome.', true),
  ('bbbbbbbb-0036-4000-8000-000000000036','Hanna','Krakow',50.0647,19.9450,
   39.6407,22.4301, now(), '1993-09-08',
   'Two months of slow travel. I would rather sit somewhere than see everything.', true),
  ('bbbbbbbb-0037-4000-8000-000000000037','Pedro','Lisbon',38.7223,-9.1393,
   39.6355,22.4078, now(), '1982-12-19',
   'Playing a few shows on the way to Athens. Free most afternoons.', true),
  ('bbbbbbbb-0038-4000-8000-000000000038','Zeynep','Ankara',39.9334,32.8597,
   39.6488,22.4165, now(), '1997-04-25',
   'Here for the food and the theatre. Mostly the food.', true),
  ('bbbbbbbb-0039-4000-8000-000000000039','Jonas','Hamburg',53.5511,9.9937,
   39.6321,22.4224, now(), '1986-08-14',
   'Driving south with no fixed plan. Larissa was not on the list; it is now.', true),
  ('bbbbbbbb-0040-4000-8000-000000000040','Clara','Ghent',51.0543,3.7174,
   39.6443,22.4258, now(), '1995-02-06',
   'Looking for the places that are not in anyone''s top ten.', true)
on conflict (user_id) do update set
  home_city      = excluded.home_city,
  home_lat       = excluded.home_lat,
  home_lng       = excluded.home_lng,
  -- Re-running re-plants them in Larissa. That is the point: it is how you
  -- put the deck back after they have drifted or been swiped away.
  current_lat    = excluded.current_lat,
  current_lng    = excluded.current_lng,
  last_location_at = now(),
  bio            = excluded.bio,
  onboarding_complete = true;

-- 3. Filters. Without a row, discover_candidates falls back to a 10km
--    default, which is not what these are for.
insert into public.match_preferences (user_id, max_distance_km, min_age, max_age)
select user_id, 150, 18, 99
from public.profiles
where user_id::text like 'bbbbbbbb-00%'
on conflict (user_id) do nothing;

-- 4. Interests, by NAME rather than id — the ids differ per environment,
--    and a hardcoded uuid here is a fixture that only works on one
--    database. Overlap is deliberately uneven (0 to 4 shared with a
--    Museums / Rooftop Bars / Theater / Vegan & Veggie / Yoga profile) so
--    that ranking by shared interests is actually visible in the deck
--    order instead of every card scoring the same.
delete from public.user_interests
where user_id::text like 'bbbbbbbb-00%';

insert into public.user_interests (user_id, interest_id)
select v.user_id, i.id
from (values
  ('bbbbbbbb-0031-4000-8000-000000000031'::uuid, 'Museums'),
  ('bbbbbbbb-0031-4000-8000-000000000031'::uuid, 'Theater'),
  ('bbbbbbbb-0031-4000-8000-000000000031'::uuid, 'Yoga'),
  ('bbbbbbbb-0031-4000-8000-000000000031'::uuid, 'Rooftop Bars'),

  ('bbbbbbbb-0032-4000-8000-000000000032'::uuid, 'Museums'),
  ('bbbbbbbb-0032-4000-8000-000000000032'::uuid, 'Street Food'),
  ('bbbbbbbb-0032-4000-8000-000000000032'::uuid, 'Markets & Bazaars'),

  ('bbbbbbbb-0033-4000-8000-000000000033'::uuid, 'Local Cuisine'),
  ('bbbbbbbb-0033-4000-8000-000000000033'::uuid, 'Street Food'),
  ('bbbbbbbb-0033-4000-8000-000000000033'::uuid, 'Vegan & Veggie'),

  ('bbbbbbbb-0034-4000-8000-000000000034'::uuid, 'Yoga'),
  ('bbbbbbbb-0034-4000-8000-000000000034'::uuid, 'Live Music'),

  ('bbbbbbbb-0035-4000-8000-000000000035'::uuid, 'Coffee Culture'),
  ('bbbbbbbb-0035-4000-8000-000000000035'::uuid, 'Hiking'),

  ('bbbbbbbb-0036-4000-8000-000000000036'::uuid, 'Coffee Culture'),
  ('bbbbbbbb-0036-4000-8000-000000000036'::uuid, 'Museums'),
  ('bbbbbbbb-0036-4000-8000-000000000036'::uuid, 'Theater'),

  ('bbbbbbbb-0037-4000-8000-000000000037'::uuid, 'Live Music'),
  ('bbbbbbbb-0037-4000-8000-000000000037'::uuid, 'Rooftop Bars'),
  ('bbbbbbbb-0037-4000-8000-000000000037'::uuid, 'Theater'),

  ('bbbbbbbb-0038-4000-8000-000000000038'::uuid, 'Local Cuisine'),
  ('bbbbbbbb-0038-4000-8000-000000000038'::uuid, 'Theater'),
  ('bbbbbbbb-0038-4000-8000-000000000038'::uuid, 'Vegan & Veggie'),
  ('bbbbbbbb-0038-4000-8000-000000000038'::uuid, 'Markets & Bazaars'),

  ('bbbbbbbb-0039-4000-8000-000000000039'::uuid, 'Hiking'),
  ('bbbbbbbb-0039-4000-8000-000000000039'::uuid, 'Live Music'),

  ('bbbbbbbb-0040-4000-8000-000000000040'::uuid, 'Museums'),
  ('bbbbbbbb-0040-4000-8000-000000000040'::uuid, 'Vegan & Veggie'),
  ('bbbbbbbb-0040-4000-8000-000000000040'::uuid, 'Coffee Culture'),
  ('bbbbbbbb-0040-4000-8000-000000000040'::uuid, 'Yoga')
) as v(user_id, interest_name)
join public.interests i on i.name = v.interest_name
on conflict do nothing;

commit;

-- Put the deck back for one account (swipes are what consume it):
--   delete from public.swipes where swiper_id = '<your uuid>';
