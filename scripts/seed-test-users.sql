-- ===========================================
-- Seed Test Users for LocalUp
-- Run this in the Supabase SQL Editor
-- ===========================================

-- 1. Create fake auth users
-- (Supabase lets you insert into auth.users
--  from the SQL editor with service-role access)

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token
) VALUES
  (
    'aaaaaaaa-0001-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'alice@test.local',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{}', 'authenticated', 'authenticated',
    '', '', '', '', '', '', '', ''
  ),
  (
    'aaaaaaaa-0002-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'bob@test.local',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{}', 'authenticated', 'authenticated',
    '', '', '', '', '', '', '', ''
  ),
  (
    'aaaaaaaa-0003-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'carla@test.local',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{}', 'authenticated', 'authenticated',
    '', '', '', '', '', '', '', ''
  ),
  (
    'aaaaaaaa-0004-4000-8000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'dimitris@test.local',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{}', 'authenticated', 'authenticated',
    '', '', '', '', '', '', '', ''
  ),
  (
    'aaaaaaaa-0005-4000-8000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'elena@test.local',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{}', 'authenticated', 'authenticated',
    '', '', '', '', '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

-- Also insert into auth.identities (required
-- for Supabase auth to work properly)
INSERT INTO auth.identities (
  id, user_id, provider_id, provider,
  identity_data, last_sign_in_at,
  created_at, updated_at
) VALUES
  (
    'aaaaaaaa-0001-4000-8000-000000000001',
    'aaaaaaaa-0001-4000-8000-000000000001',
    'aaaaaaaa-0001-4000-8000-000000000001',
    'email',
    '{"sub":"aaaaaaaa-0001-4000-8000-000000000001","email":"alice@test.local"}',
    now(), now(), now()
  ),
  (
    'aaaaaaaa-0002-4000-8000-000000000002',
    'aaaaaaaa-0002-4000-8000-000000000002',
    'aaaaaaaa-0002-4000-8000-000000000002',
    'email',
    '{"sub":"aaaaaaaa-0002-4000-8000-000000000002","email":"bob@test.local"}',
    now(), now(), now()
  ),
  (
    'aaaaaaaa-0003-4000-8000-000000000003',
    'aaaaaaaa-0003-4000-8000-000000000003',
    'aaaaaaaa-0003-4000-8000-000000000003',
    'email',
    '{"sub":"aaaaaaaa-0003-4000-8000-000000000003","email":"carla@test.local"}',
    now(), now(), now()
  ),
  (
    'aaaaaaaa-0004-4000-8000-000000000004',
    'aaaaaaaa-0004-4000-8000-000000000004',
    'aaaaaaaa-0004-4000-8000-000000000004',
    'email',
    '{"sub":"aaaaaaaa-0004-4000-8000-000000000004","email":"dimitris@test.local"}',
    now(), now(), now()
  ),
  (
    'aaaaaaaa-0005-4000-8000-000000000005',
    'aaaaaaaa-0005-4000-8000-000000000005',
    'aaaaaaaa-0005-4000-8000-000000000005',
    'email',
    '{"sub":"aaaaaaaa-0005-4000-8000-000000000005","email":"elena@test.local"}',
    now(), now(), now()
  )
ON CONFLICT DO NOTHING;

-- 2. Create completed profiles
--    home_lat/lng = where they live.
--    current_lat/lng = where they are now.
--    Scenarios:
--      Alice    : Athens local (home & now Athens)
--      Bob      : Thessaloniki local (home & now Thessaloniki)
--      Carla    : Barcelona local visiting Athens (traveler)
--      Dimitris : Athens local (home & now Athens)
--      Elena    : Heraklion local visiting Athens (traveler)
INSERT INTO public.profiles (
  user_id, display_name, home_city,
  home_lat, home_lng,
  current_lat, current_lng,
  last_location_at,
  bio, onboarding_complete
) VALUES
  (
    'aaaaaaaa-0001-4000-8000-000000000001',
    'Alice', 'Athens',
    37.9838, 23.7275,
    37.9838, 23.7275,
    now(),
    'Love exploring hidden gems and street food spots!',
    true
  ),
  (
    'aaaaaaaa-0002-4000-8000-000000000002',
    'Bob', 'Thessaloniki',
    40.6401, 22.9444,
    40.6401, 22.9444,
    now(),
    'Backpacker and live music enthusiast.',
    true
  ),
  (
    'aaaaaaaa-0003-4000-8000-000000000003',
    'Carla', 'Barcelona',
    41.3851, 2.1734,
    37.9838, 23.7275,
    now(),
    'Traveling through Greece this summer.',
    true
  ),
  (
    'aaaaaaaa-0004-4000-8000-000000000004',
    'Dimitris', 'Athens',
    37.9838, 23.7275,
    37.9838, 23.7275,
    now(),
    'Local foodie, ask me about the best souvlaki.',
    true
  ),
  (
    'aaaaaaaa-0005-4000-8000-000000000005',
    'Elena', 'Heraklion',
    35.3387, 25.1442,
    37.9838, 23.7275,
    now(),
    'History nerd and sunset chaser.',
    true
  )
ON CONFLICT (user_id) DO NOTHING;

-- 3. Add interests to test users
-- (uses whatever interests already exist
--  in your interests table)
INSERT INTO public.user_interests (
  user_id, interest_id
)
SELECT
  'aaaaaaaa-0001-4000-8000-000000000001',
  id
FROM public.interests
LIMIT 3
ON CONFLICT DO NOTHING;

INSERT INTO public.user_interests (
  user_id, interest_id
)
SELECT
  'aaaaaaaa-0002-4000-8000-000000000002',
  id
FROM public.interests
OFFSET 1 LIMIT 3
ON CONFLICT DO NOTHING;

INSERT INTO public.user_interests (
  user_id, interest_id
)
SELECT
  'aaaaaaaa-0003-4000-8000-000000000003',
  id
FROM public.interests
OFFSET 2 LIMIT 3
ON CONFLICT DO NOTHING;

INSERT INTO public.user_interests (
  user_id, interest_id
)
SELECT
  'aaaaaaaa-0004-4000-8000-000000000004',
  id
FROM public.interests
OFFSET 3 LIMIT 3
ON CONFLICT DO NOTHING;

INSERT INTO public.user_interests (
  user_id, interest_id
)
SELECT
  'aaaaaaaa-0005-4000-8000-000000000005',
  id
FROM public.interests
OFFSET 4 LIMIT 3
ON CONFLICT DO NOTHING;

-- Done! You now have 5 test users:
-- alice@test.local    / password123
-- bob@test.local      / password123
-- carla@test.local    / password123
-- dimitris@test.local / password123
-- elena@test.local    / password123
--
-- All have completed onboarding and
-- will show up in the discover feed.
