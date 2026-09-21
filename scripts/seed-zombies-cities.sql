-- ===========================================
-- Zombies for the closed test: five cities, both sides of the deck
-- ===========================================
--
-- The twelve testers live in Athens, Thessaloniki, Larissa, Heraklion and
-- Lappeenranta. A tester who opens the app and sees "No one nearby" has
-- nothing to test, so every one of those cities gets three locals and
-- three travellers — thirty @test.local accounts that can also be driven
-- by scripts/zombie.mjs (they sign in with the fixture password).
--
-- All Greek, all deliberately daft. Nobody should mistake one for a real
-- person, and a tester should smile rather than swipe seriously.
--
-- Photos: the six shared demo-*.jpg objects, same as every other seed
-- (see seed-demo-photos.sql for why that is safe and why a real user's
-- photo must never be referenced here).
--
-- SAFE TO RE-RUN: re-plants everyone in their city, restores bios.
-- Remove: teardown-demo-users.sql handles @test.local wholesale.

begin;

-- 1. Auth users + identities (fixture password, confirmed email).
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
  -- Athens
  ('eeeeeeee-0101-4000-8000-000000000101'::uuid, 'z.thanos@test.local'),
  ('eeeeeeee-0102-4000-8000-000000000102'::uuid, 'z.fotini@test.local'),
  ('eeeeeeee-0103-4000-8000-000000000103'::uuid, 'z.babis@test.local'),
  ('eeeeeeee-0104-4000-8000-000000000104'::uuid, 'z.kyriaki@test.local'),
  ('eeeeeeee-0105-4000-8000-000000000105'::uuid, 'z.lefteris@test.local'),
  ('eeeeeeee-0106-4000-8000-000000000106'::uuid, 'z.despina@test.local'),
  -- Thessaloniki
  ('eeeeeeee-0201-4000-8000-000000000201'::uuid, 'z.pantelis@test.local'),
  ('eeeeeeee-0202-4000-8000-000000000202'::uuid, 'z.roula@test.local'),
  ('eeeeeeee-0203-4000-8000-000000000203'::uuid, 'z.makis@test.local'),
  ('eeeeeeee-0204-4000-8000-000000000204'::uuid, 'z.eirini@test.local'),
  ('eeeeeeee-0205-4000-8000-000000000205'::uuid, 'z.stelios@test.local'),
  ('eeeeeeee-0206-4000-8000-000000000206'::uuid, 'z.vaso@test.local'),
  -- Larissa
  ('eeeeeeee-0301-4000-8000-000000000301'::uuid, 'z.thodoris@test.local'),
  ('eeeeeeee-0302-4000-8000-000000000302'::uuid, 'z.katerina@test.local'),
  ('eeeeeeee-0303-4000-8000-000000000303'::uuid, 'z.mitsos@test.local'),
  ('eeeeeeee-0304-4000-8000-000000000304'::uuid, 'z.anthi@test.local'),
  ('eeeeeeee-0305-4000-8000-000000000305'::uuid, 'z.kostis@test.local'),
  ('eeeeeeee-0306-4000-8000-000000000306'::uuid, 'z.lena@test.local'),
  -- Heraklion
  ('eeeeeeee-0401-4000-8000-000000000401'::uuid, 'z.manolis@test.local'),
  ('eeeeeeee-0402-4000-8000-000000000402'::uuid, 'z.argyro@test.local'),
  ('eeeeeeee-0403-4000-8000-000000000403'::uuid, 'z.sifis@test.local'),
  ('eeeeeeee-0404-4000-8000-000000000404'::uuid, 'z.marina@test.local'),
  ('eeeeeeee-0405-4000-8000-000000000405'::uuid, 'z.aris@test.local'),
  ('eeeeeeee-0406-4000-8000-000000000406'::uuid, 'z.chara@test.local'),
  -- Lappeenranta
  ('eeeeeeee-0501-4000-8000-000000000501'::uuid, 'z.jukka@test.local'),
  ('eeeeeeee-0502-4000-8000-000000000502'::uuid, 'z.aino@test.local'),
  ('eeeeeeee-0503-4000-8000-000000000503'::uuid, 'z.pekka@test.local'),
  ('eeeeeeee-0504-4000-8000-000000000504'::uuid, 'z.myrto@test.local'),
  ('eeeeeeee-0505-4000-8000-000000000505'::uuid, 'z.vangelis@test.local'),
  ('eeeeeeee-0506-4000-8000-000000000506'::uuid, 'z.ioanna@test.local')
) as v(id, email)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
)
select
  u.id, u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  now(), now(), now()
from auth.users u
where u.id::text like 'eeeeeeee-0%'
  and not exists (
    select 1 from auth.identities i
     where i.user_id = u.id and i.provider = 'email'
  );

-- 2. Profiles. Locals: home = current = the city. Travellers: home is
--    somewhere else, current is the city. Coordinates are jittered so the
--    cards do not all read "0.0 km".
insert into public.profiles (
  user_id, display_name, home_city, home_lat, home_lng,
  current_lat, current_lng, last_location_at,
  date_of_birth, bio, languages, onboarding_complete
)
values
  -- ---------- Αθήνα (37.9838, 23.7275) ----------
  ('eeeeeeee-0101-4000-8000-000000000101','Θάνος','Αθήνα',37.9838,23.7275, 37.9790,23.7330, now(), '1990-04-12',
   'Ντόπιος. Ξέρω πού είναι το καλό σουβλάκι αλλά δεν θα σου πω, θα σε πάω.', '{el,en}', true),
  ('eeeeeeee-0102-4000-8000-000000000102','Φωτεινή','Αθήνα',37.9838,23.7275, 37.9880,23.7210, now(), '1995-09-03',
   'Έχω ανέβει στην Ακρόπολη 40 φορές. Τις 39 για να δείξω σε ξένους πού είναι η τουαλέτα.', '{el,en}', true),
  ('eeeeeeee-0103-4000-8000-000000000103','Μπάμπης','Αθήνα',37.9838,23.7275, 37.9750,23.7400, now(), '1984-01-27',
   'Ήμουν κι εγώ ταξιδιώτης σαν εσένα. Μετά έφαγα ένα βέλος στο γόνατο.', '{el}', true),
  ('eeeeeeee-0104-4000-8000-000000000104','Κυριακή','Ιωάννινα',39.6650,20.8537, 37.9820,23.7300, now(), '1998-06-18',
   'Ήρθα Αθήνα για ένα συνέδριο. Το συνέδριο ήταν χθες. Δεν πήγα.', '{el,en}', true),
  ('eeeeeeee-0105-4000-8000-000000000105','Λευτέρης','Πάτρα',38.2466,21.7346, 37.9900,23.7250, now(), '1987-11-30',
   'Τα λεφτά υπάρχουν. Απλά δεν είναι σε μένα.', '{el}', true),
  ('eeeeeeee-0106-4000-8000-000000000106','Δέσποινα','Καβάλα',40.9397,24.4019, 37.9770,23.7180, now(), '1993-02-14',
   'Ψάχνω κάποιον να μου εξηγήσει το μετρό. Έχω χαθεί τρεις φορές στον ίδιο σταθμό.', '{el,en}', true),

  -- ---------- Θεσσαλονίκη (40.6401, 22.9444) ----------
  ('eeeeeeee-0201-4000-8000-000000000201','Παντελής','Θεσσαλονίκη',40.6401,22.9444, 40.6350,22.9500, now(), '1989-07-21',
   'Ντόπιος. Η μπουγάτσα είναι θρησκεία και εγώ είμαι ο παπάς.', '{el,en}', true),
  ('eeeeeeee-0202-4000-8000-000000000202','Ρούλα','Θεσσαλονίκη',40.6401,22.9444, 40.6440,22.9380, now(), '1996-12-05',
   'Περπατάω στην παραλία κάθε μέρα. Μια μέρα θα φτάσω κάπου.', '{el,en}', true),
  ('eeeeeeee-0203-4000-8000-000000000203','Μάκης','Θεσσαλονίκη',40.6401,22.9444, 40.6300,22.9550, now(), '1982-03-09',
   'ΑΛΛΑ ΑΥΤΟΙ ΕΙΣΤΕ. Εσείς που swipάρετε αριστερά. ΑΥΤΟΙ ΕΙΣΤΕ.', '{el}', true),
  ('eeeeeeee-0204-4000-8000-000000000204','Ειρήνη','Βόλος',39.3622,22.9420, 40.6420,22.9470, now(), '1997-08-16',
   'Ήρθα για τρεις μέρες πριν δύο εβδομάδες. Κάποιος να μου θυμίσει να φύγω.', '{el,en}', true),
  ('eeeeeeee-0205-4000-8000-000000000205','Στέλιος','Ρόδος',36.4349,28.2176, 40.6380,22.9400, now(), '1991-05-02',
   'Καλά κρασιά. Αυτό είναι όλο το προφίλ μου. Καλά κρασιά.', '{el,en}', true),
  ('eeeeeeee-0206-4000-8000-000000000206','Βάσω','Λευκωσία',35.1856,33.3823, 40.6460,22.9520, now(), '1994-10-23',
   'Ήρθα να δω το Άγιον Όρος. Μου είπαν ότι δεν μπορώ. Τώρα τρώω τρίγωνα Πανοράματος.', '{el,en}', true),

  -- ---------- Λάρισα (39.6390, 22.4200) ----------
  ('eeeeeeee-0301-4000-8000-000000000301','Θοδωρής','Λάρισα',39.6390,22.4200, 39.6420,22.4150, now(), '1988-02-08',
   'Ντόπιος. Έχω πιει καφέ σε όλες τις καφετέριες της πόλης. Είναι 400. Έχω πρόβλημα.', '{el,en}', true),
  ('eeeeeeee-0302-4000-8000-000000000302','Κατερίνα','Λάρισα',39.6390,22.4200, 39.6360,22.4260, now(), '1995-04-29',
   'Ξέρω τον Ιπποκράτη προσωπικά. Το άγαλμα εννοώ. Του λέω καλημέρα.', '{el,en}', true),
  ('eeeeeeee-0303-4000-8000-000000000303','Μήτσος','Λάρισα',39.6390,22.4200, 39.6450,22.4230, now(), '1979-09-14',
   'Τι ώρα ανοίγει η θάλασσα; Ρωτάω για φίλο. Ο φίλος είμαι εγώ.', '{el}', true),
  ('eeeeeeee-0304-4000-8000-000000000304','Ανθή','Χανιά',35.5138,24.0180, 39.6400,22.4180, now(), '1999-01-11',
   'Πέρασα από Λάρισα για βενζίνη πριν τέσσερις μέρες. Ακόμα εδώ. Δεν ξέρω γιατί.', '{el,en}', true),
  ('eeeeeeee-0305-4000-8000-000000000305','Κωστής','Κέρκυρα',39.6243,19.9217, 39.6370,22.4240, now(), '1986-06-06',
   'Λέμε τώρα. Δεν λέμε κάτι. Απλά λέμε τώρα.', '{el,en}', true),
  ('eeeeeeee-0306-4000-8000-000000000306','Λένα','Αλεξανδρούπολη',40.8457,25.8740, 39.6410,22.4120, now(), '1992-11-19',
   'Ήρθα για μια συναυλία. Ήταν πέρυσι. Η πληροφορία ήταν παλιά.', '{el,en}', true),

  -- ---------- Ηράκλειο (35.3387, 25.1442) ----------
  ('eeeeeeee-0401-4000-8000-000000000401','Μανώλης','Ηράκλειο',35.3387,25.1442, 35.3350,25.1400, now(), '1985-08-25',
   'Ντόπιος. Έχω ρακή. Δεν έχω τίποτα άλλο αλλά έχω ρακή.', '{el,en}', true),
  ('eeeeeeee-0402-4000-8000-000000000402','Αργυρώ','Ηράκλειο',35.3387,25.1442, 35.3420,25.1480, now(), '1993-03-17',
   'Ο Μινώταυρος ήταν προπάππους μου. Από την πλευρά της μάνας μου.', '{el,en}', true),
  ('eeeeeeee-0403-4000-8000-000000000403','Σήφης','Ηράκλειο',35.3387,25.1442, 35.3300,25.1500, now(), '1978-12-01',
   'Ήμουν κι εγώ ντόπιος σαν εσένα. Μετά έφαγα ένα βέλος στο γόνατο. Σε ταβέρνα.', '{el}', true),
  ('eeeeeeee-0404-4000-8000-000000000404','Μαρίνα','Θεσσαλονίκη',40.6401,22.9444, 35.3400,25.1430, now(), '1996-07-07',
   'Ήρθα για τρεις μέρες παραλία. Είμαι εδώ έντεκα. Το αφεντικό μου δεν το ξέρει.', '{el,en}', true),
  ('eeeeeeee-0405-4000-8000-000000000405','Άρης','Αθήνα',37.9838,23.7275, 35.3360,25.1470, now(), '1990-10-10',
   'Δεν έχω λόγια. Μόνο ντάκο. Ζήτησα φραπέ και με κοιτάνε ακόμα.', '{el,en}', true),
  ('eeeeeeee-0406-4000-8000-000000000406','Χαρά','Λάρισα',39.6390,22.4200, 35.3440,25.1390, now(), '1994-05-21',
   'Πήγα στην Κνωσό και ρώτησα πού είναι ο λαβύρινθος. Ακόμα ψάχνω την έξοδο από το πάρκινγκ.', '{el,en}', true),

  -- ---------- Lappeenranta (61.0587, 28.1887) ----------
  ('eeeeeeee-0501-4000-8000-000000000501','Jukka','Lappeenranta',61.0587,28.1887, 61.0560,28.1920, now(), '1987-01-15',
   'Ντόπιος. Έμαθα ελληνικά από ένα σουβλατζίδικο στην Ελσίνκι. Ξέρω 40 λέξεις, οι 30 είναι φαγητά.', '{fi,en,el}', true),
  ('eeeeeeee-0502-4000-8000-000000000502','Aino','Lappeenranta',61.0587,28.1887, 61.0610,28.1850, now(), '1994-06-30',
   'Έχω σάουνα. Έχω λίμνη. Έχω -25 βαθμούς. Έλα, θα περάσουμε τέλεια.', '{fi,en,el}', true),
  ('eeeeeeee-0503-4000-8000-000000000503','Pekka','Lappeenranta',61.0587,28.1887, 61.0540,28.1960, now(), '1981-09-09',
   'Πουλάω πρωτότυπες αντιγραφές του βόρειου σέλαος. Ξέρεις εσύ.', '{fi,en,el}', true),
  ('eeeeeeee-0504-4000-8000-000000000504','Μυρτώ','Αθήνα',37.9838,23.7275, 61.0590,28.1900, now(), '1998-03-22',
   'Erasmus στη Φινλανδία. Πήρα μαζί μου 4 κιλά φέτα. Τελείωσε τη δεύτερη μέρα.', '{el,en}', true),
  ('eeeeeeee-0505-4000-8000-000000000505','Βαγγέλης','Ηράκλειο',35.3387,25.1442, 61.0570,28.1870, now(), '1989-11-11',
   'Κρητικός στο χιόνι. Έφερα ρακή για την ομάδα. Η ομάδα τώρα με λέει αρχηγό.', '{el,en}', true),
  ('eeeeeeee-0506-4000-8000-000000000506','Ιωάννα','Θεσσαλονίκη',40.6401,22.9444, 61.0600,28.1830, now(), '1995-08-08',
   'Ήρθα για το βόρειο σέλας. Είδα σύννεφα. ΑΛΛΑ ΑΥΤΟΙ ΕΙΣΤΕ, τα σύννεφα.', '{el,en}', true)
on conflict (user_id) do update set
  home_city        = excluded.home_city,
  home_lat         = excluded.home_lat,
  home_lng         = excluded.home_lng,
  current_lat      = excluded.current_lat,
  current_lng      = excluded.current_lng,
  last_location_at = now(),
  bio              = excluded.bio,
  languages        = excluded.languages,
  onboarding_complete = true;

-- 3. Wide filters so testers on the edge of a city still reach them.
insert into public.match_preferences (user_id, max_distance_km, min_age, max_age)
select user_id, 150, 18, 99
from public.profiles
where user_id::text like 'eeeeeeee-0%'
on conflict (user_id) do nothing;

-- 4. Interests by name, three or four each, uneven overlap on purpose.
delete from public.user_interests where user_id::text like 'eeeeeeee-0%';

insert into public.user_interests (user_id, interest_id)
select v.user_id::uuid, i.id
from (values
  ('eeeeeeee-0101-4000-8000-000000000101','Street Food'),('eeeeeeee-0101-4000-8000-000000000101','Tavernas'),('eeeeeeee-0101-4000-8000-000000000101','Football'),
  ('eeeeeeee-0102-4000-8000-000000000102','History'),('eeeeeeee-0102-4000-8000-000000000102','Museums'),('eeeeeeee-0102-4000-8000-000000000102','Coffee Culture'),('eeeeeeee-0102-4000-8000-000000000102','Photography'),
  ('eeeeeeee-0103-4000-8000-000000000103','Rooftop Bars'),('eeeeeeee-0103-4000-8000-000000000103','Wine & Cocktails'),('eeeeeeee-0103-4000-8000-000000000103','Fashion'),
  ('eeeeeeee-0104-4000-8000-000000000104','Live Music'),('eeeeeeee-0104-4000-8000-000000000104','Coffee Culture'),('eeeeeeee-0104-4000-8000-000000000104','Street Art'),
  ('eeeeeeee-0105-4000-8000-000000000105','Road Trips'),('eeeeeeee-0105-4000-8000-000000000105','Tavernas'),('eeeeeeee-0105-4000-8000-000000000105','Pub Quizzes'),
  ('eeeeeeee-0106-4000-8000-000000000106','Museums'),('eeeeeeee-0106-4000-8000-000000000106','Markets & Bazaars'),('eeeeeeee-0106-4000-8000-000000000106','Desserts'),('eeeeeeee-0106-4000-8000-000000000106','Theater'),

  ('eeeeeeee-0201-4000-8000-000000000201','Bakeries'),('eeeeeeee-0201-4000-8000-000000000201','Local Cuisine'),('eeeeeeee-0201-4000-8000-000000000201','Football'),
  ('eeeeeeee-0202-4000-8000-000000000202','Running'),('eeeeeeee-0202-4000-8000-000000000202','Coffee Culture'),('eeeeeeee-0202-4000-8000-000000000202','Photography'),('eeeeeeee-0202-4000-8000-000000000202','Beach'),
  ('eeeeeeee-0203-4000-8000-000000000203','History'),('eeeeeeee-0203-4000-8000-000000000203','Tavernas'),('eeeeeeee-0203-4000-8000-000000000203','Live Music'),
  ('eeeeeeee-0204-4000-8000-000000000204','Street Food'),('eeeeeeee-0204-4000-8000-000000000204','Clubs'),('eeeeeeee-0204-4000-8000-000000000204','Cocktail Bars'),
  ('eeeeeeee-0205-4000-8000-000000000205','Beach'),('eeeeeeee-0205-4000-8000-000000000205','Seafood'),('eeeeeeee-0205-4000-8000-000000000205','Sailing'),('eeeeeeee-0205-4000-8000-000000000205','Coffee Culture'),
  ('eeeeeeee-0206-4000-8000-000000000206','Desserts'),('eeeeeeee-0206-4000-8000-000000000206','Museums'),('eeeeeeee-0206-4000-8000-000000000206','Local Traditions'),

  ('eeeeeeee-0301-4000-8000-000000000301','Coffee Culture'),('eeeeeeee-0301-4000-8000-000000000301','Board Game Cafes'),('eeeeeeee-0301-4000-8000-000000000301','Cycling'),
  ('eeeeeeee-0302-4000-8000-000000000302','History'),('eeeeeeee-0302-4000-8000-000000000302','Theater'),('eeeeeeee-0302-4000-8000-000000000302','Reading'),('eeeeeeee-0302-4000-8000-000000000302','Coffee Culture'),
  ('eeeeeeee-0303-4000-8000-000000000303','Archaeology'),('eeeeeeee-0303-4000-8000-000000000303','Tavernas'),('eeeeeeee-0303-4000-8000-000000000303','Folk Dancing'),
  ('eeeeeeee-0304-4000-8000-000000000304','Road Trips'),('eeeeeeee-0304-4000-8000-000000000304','Late Night Food'),('eeeeeeee-0304-4000-8000-000000000304','Live Music'),
  ('eeeeeeee-0305-4000-8000-000000000305','Beach'),('eeeeeeee-0305-4000-8000-000000000305','Kayaking'),('eeeeeeee-0305-4000-8000-000000000305','Seafood'),
  ('eeeeeeee-0306-4000-8000-000000000306','Live Music'),('eeeeeeee-0306-4000-8000-000000000306','Festivals'),('eeeeeeee-0306-4000-8000-000000000306','Vinyl & Records'),('eeeeeeee-0306-4000-8000-000000000306','Coffee Culture'),

  ('eeeeeeee-0401-4000-8000-000000000401','Tavernas'),('eeeeeeee-0401-4000-8000-000000000401','Local Traditions'),('eeeeeeee-0401-4000-8000-000000000401','Mountains'),
  ('eeeeeeee-0402-4000-8000-000000000402','Archaeology'),('eeeeeeee-0402-4000-8000-000000000402','Museums'),('eeeeeeee-0402-4000-8000-000000000402','Beach'),('eeeeeeee-0402-4000-8000-000000000402','Local Cuisine'),
  ('eeeeeeee-0403-4000-8000-000000000403','Road Trips'),('eeeeeeee-0403-4000-8000-000000000403','Fishing'),('eeeeeeee-0403-4000-8000-000000000403','Football'),
  ('eeeeeeee-0404-4000-8000-000000000404','Beach'),('eeeeeeee-0404-4000-8000-000000000404','Cocktail Bars'),('eeeeeeee-0404-4000-8000-000000000404','Yoga'),
  ('eeeeeeee-0405-4000-8000-000000000405','Coffee Culture'),('eeeeeeee-0405-4000-8000-000000000405','Rooftop Bars'),('eeeeeeee-0405-4000-8000-000000000405','Brunch'),
  ('eeeeeeee-0406-4000-8000-000000000406','Archaeology'),('eeeeeeee-0406-4000-8000-000000000406','Hiking'),('eeeeeeee-0406-4000-8000-000000000406','Photography'),('eeeeeeee-0406-4000-8000-000000000406','Museums'),

  ('eeeeeeee-0501-4000-8000-000000000501','Language Exchange'),('eeeeeeee-0501-4000-8000-000000000501','Street Food'),('eeeeeeee-0501-4000-8000-000000000501','Skiing'),
  ('eeeeeeee-0502-4000-8000-000000000502','Camping'),('eeeeeeee-0502-4000-8000-000000000502','Stargazing'),('eeeeeeee-0502-4000-8000-000000000502','Coffee Culture'),('eeeeeeee-0502-4000-8000-000000000502','Hiking'),
  ('eeeeeeee-0503-4000-8000-000000000503','Fishing'),('eeeeeeee-0503-4000-8000-000000000503','Beer & Breweries'),('eeeeeeee-0503-4000-8000-000000000503','Board Game Cafes'),
  ('eeeeeeee-0504-4000-8000-000000000504','Language Exchange'),('eeeeeeee-0504-4000-8000-000000000504','Local Cuisine'),('eeeeeeee-0504-4000-8000-000000000504','Live Music'),
  ('eeeeeeee-0505-4000-8000-000000000505','Skiing'),('eeeeeeee-0505-4000-8000-000000000505','Tavernas'),('eeeeeeee-0505-4000-8000-000000000505','Karaoke'),
  ('eeeeeeee-0506-4000-8000-000000000506','Stargazing'),('eeeeeeee-0506-4000-8000-000000000506','Photography'),('eeeeeeee-0506-4000-8000-000000000506','Coffee Culture'),('eeeeeeee-0506-4000-8000-000000000506','Museums')
) as v(user_id, interest_name)
join public.interests i on i.name = v.interest_name
on conflict do nothing;

-- 5. Photos: the six shared demo objects, rotated by account index.
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
   where p.user_id::text like 'eeeeeeee-0%'
     and not exists (select 1 from public.media m where m.user_id = p.user_id)
)
insert into public.media (user_id, type, storage_path, position)
select n.user_id, 'photo', d.path, s.pos
  from needy n
  cross join lateral (values (0), (1), (2)) as s(pos)
  join demo d on d.n = ((n.k * 3) + s.pos) % 6;

update public.profiles p
   set avatar_url = 'https://ejpenygtbeszhvapulro.supabase.co'
                 || '/storage/v1/object/public/user-photos/'
                 || m.storage_path
  from public.media m
 where m.user_id = p.user_id
   and m.position = 0
   and p.user_id::text like 'eeeeeeee-0%'
   and p.avatar_url is null;

commit;

-- Sanity: 30 rows, 3 locals + 3 travellers per city.
select p.home_city,
       count(*) filter (where ST_Distance(p.home_geog, p.current_geog) / 1000 <= 50) as locals_here,
       count(*) filter (where ST_Distance(p.home_geog, p.current_geog) / 1000 >  50) as travellers_here
  from public.profiles p
 where p.user_id::text like 'eeeeeeee-0%'
 group by 1 order by 1;
