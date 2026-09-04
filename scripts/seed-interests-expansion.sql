-- ===========================================
-- Interest catalogue: 32 -> 90
-- ===========================================
--
-- WHY, and why the ORDER matters.
--
-- Measured on the live data at 32 interests with a 5-pick cap: 53.5% of
-- all user pairs share ZERO interests. Average shared 0.62 across 465
-- pairs. The interest term in discover_candidates is already contributing
-- nothing for over half the deck.
--
-- Expected shared interests between two users is roughly k^2/N — picks
-- squared, over catalogue size. So growing N ALONE makes it worse:
--
--     N=32,  k=5  ->  0.78        (today)
--     N=90,  k=5  ->  0.28        (this file alone: ~80% zero overlap)
--     N=90,  k=8  ->  0.71        (with the raised cap)
--
-- That is why this file is step 2 of 3 and must not ship on its own:
--   1. two-tier scoring in discover_candidates (category as a fallback
--      tier, so a bigger catalogue cannot starve the signal)
--   2. this expansion
--   3. MAX_INTERESTS 5 -> 8 on the client
--
-- Everything stays inside the SIX EXISTING CATEGORIES on purpose.
-- Categories are the safety net in step 1, and a net with more holes
-- catches less: adding categories would dilute exactly the fallback that
-- makes the expansion safe. Measured, category-level overlap already
-- rescues two thirds of the dead pairs — 53.5% zero on exact interests
-- becomes 17.8% zero once category counts.
--
-- SAFE TO RE-RUN: interests_name_key is UNIQUE(name), so ON CONFLICT DO
-- NOTHING makes this idempotent. That constraint exists because the
-- original seed was once run twice and produced 64 rows for 32 names,
-- which would have silently zeroed interest overlap for everyone.
--
-- Icons are Material Community Icons names, matching the existing rows.

insert into public.interests (name, category, icon, is_active) values
  -- Culture: 6 -> 15
  ('Archaeology',            'Culture',     'pillar',              true),
  ('Art Galleries',          'Culture',     'image-frame',         true),
  ('Castles & Ruins',        'Culture',     'castle',              true),
  ('Festivals',              'Culture',     'party-popper',        true),
  ('Folk Dancing',           'Culture',     'human-female-dance',  true),
  ('Language Exchange',      'Culture',     'translate',           true),
  ('Libraries',              'Culture',     'library',             true),
  ('Local Crafts',           'Culture',     'hand-saw',            true),
  ('Opera',                  'Culture',     'music-clef-treble',   true),

  -- Food & Drink: 6 -> 15
  ('Bakeries',               'Food & Drink','bread-slice',         true),
  ('Beer & Breweries',       'Food & Drink','beer',                true),
  ('Brunch',                 'Food & Drink','egg-fried',           true),
  ('Desserts',               'Food & Drink','cupcake',             true),
  ('Farmers Markets',        'Food & Drink','carrot',              true),
  ('Fine Dining',            'Food & Drink','silverware-fork-knife',true),
  ('Food Tours',             'Food & Drink','map-marker-path',     true),
  ('Seafood',                'Food & Drink','fish',                true),
  ('Tavernas',               'Food & Drink','table-chair',         true),

  -- Outdoors: 6 -> 15
  ('Birdwatching',           'Outdoors',    'bird',                true),
  ('Boat Trips',             'Outdoors',    'ferry',               true),
  ('Fishing',                'Outdoors',    'fishbowl',            true),
  ('Gardens & Parks',        'Outdoors',    'tree',                true),
  ('Islands',                'Outdoors',    'island',              true),
  ('Kayaking',               'Outdoors',    'kayaking',            true),
  ('Mountains',              'Outdoors',    'terrain',             true),
  ('Road Trips',             'Outdoors',    'car-side',            true),
  ('Stargazing',             'Outdoors',    'telescope',           true),

  -- Arts: 5 -> 15
  ('Animation',              'Arts',        'animation',           true),
  ('Comics',                 'Arts',        'book-open-page-variant',true),
  ('Dance',                  'Arts',        'dance-ballroom',      true),
  ('Design',                 'Arts',        'vector-square',       true),
  ('Fashion',                'Arts',        'hanger',              true),
  ('Painting',               'Arts',        'brush',               true),
  ('Poetry',                 'Arts',        'feather',             true),
  ('Pottery',                'Arts',        'pot',                 true),
  ('Sculpture',              'Arts',        'chess-rook',          true),
  ('Vinyl & Records',        'Arts',        'album',               true),

  -- Sports: 5 -> 15
  ('Boxing',                 'Sports',      'boxing-glove',        true),
  ('Diving',                 'Sports',      'diving-scuba',        true),
  ('Martial Arts',           'Sports',      'karate',              true),
  ('Padel',                  'Sports',      'racquetball',         true),
  ('Pilates',                'Sports',      'yoga',                true),
  ('Sailing',                'Sports',      'sail-boat',           true),
  ('Skiing',                 'Sports',      'ski',                 true),
  ('Surfing',                'Sports',      'surfing',             true),
  ('Tennis',                 'Sports',      'tennis',              true),
  ('Volleyball',             'Sports',      'volleyball',          true),

  -- Nightlife: 4 -> 15
  ('Board Game Cafes',       'Nightlife',   'dice-multiple',       true),
  ('Cocktail Bars',          'Nightlife',   'glass-cocktail',      true),
  ('Comedy Clubs',           'Nightlife',   'emoticon-happy',      true),
  ('DJ Sets',                'Nightlife',   'disc-player',         true),
  ('Karaoke',                'Nightlife',   'microphone-variant',  true),
  ('Late Night Food',        'Nightlife',   'noodles',             true),
  ('Live Jazz',              'Nightlife',   'saxophone',           true),
  ('Open Mic',               'Nightlife',   'microphone',          true),
  ('Pub Quizzes',            'Nightlife',   'head-question',       true),
  ('Techno',                 'Nightlife',   'waveform',            true),
  ('Wine Bars',              'Nightlife',   'glass-wine',          true)
on conflict (name) do nothing;

-- Proof it landed, and that the shape is what was intended.
select category, count(*) as n
from public.interests
where is_active
group by category
order by category;
