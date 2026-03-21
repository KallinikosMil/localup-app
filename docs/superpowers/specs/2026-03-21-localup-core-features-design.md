# LocalUp Core Features Design

## Overview

LocalUp is a Tinder-style mobile app that connects travelers with locals based on shared interests. The app automatically determines whether a user is a traveler or a local based on their current location relative to their home city. Matching is interest-based with classic swipe mechanics — mutual right-swipes create a match and unlock chat.

This is a thesis project first, portfolio piece second. The MVP prioritizes functional completeness over visual polish.

## 1. Onboarding Flow

A linear 4-step flow triggered after a user registers for the first time. Simple progress indicator (dots or step count). Back/Next navigation.

**Routing:** `AppGuard` must be updated to add a third routing branch. Currently it checks authenticated vs unauthenticated. It must also check `onboarding_complete`:
- Not authenticated → `/auth/login`
- Authenticated, not onboarded → `/onboarding`
- Authenticated and onboarded → `/dashboard` (main app)

### Step 1: Name & Age (required)

- Text input for display name
- Date picker for date of birth (age is calculated client-side from `date_of_birth`, never stored separately)
- Both required to proceed

### Step 2: Home City (required)

- Search/autocomplete input for selecting home city
- Brief explanation shown: "This helps us connect you with travelers or locals"
- Stores city name + coordinates (lat/lng) for distance calculations
- City autocomplete API: use a free geocoding service (e.g., Nominatim/OpenStreetMap) or Google Places if budget allows. Decision deferred to implementation planning.
- Can be changed later in profile settings

### Step 3: Photo (required)

- Single profile photo upload
- Photo is uploaded to the `avatars` Supabase storage bucket
- A row is inserted into the `media` table with `type = 'avatar'` and `is_primary = true`
- The resulting public/signed URL is stored in `profiles.avatar_url`
- Must upload before proceeding

### Step 4: Interests & Bio

- **Interests (required):** Grid/chips of pre-defined interests. Minimum 3, maximum 5 selections before proceeding.
- **Bio (optional):** Text area below the interests. User can leave it empty and proceed.

### On Completion

- Profile data saved to `profiles` table
- Interests saved to `user_interests` junction table
- Photo uploaded to `avatars` bucket + `media` row created + `profiles.avatar_url` set
- `onboarding_complete` flag set to `true`
- User routed to the main app (Discover tab)

## 2. Traveler/Local Logic

### How It Works

- Home city is set during onboarding (stored in `profiles` with coordinates)
- App reads current device location via `expo-location`
- If current location is within ~50km of home city → **local mode** (sees only travelers nearby)
- If current location is outside that radius → **traveler mode** (sees only locals in that area)
- The mode is automatic — no manual toggle

### Edge Cases

- **Two travelers in the same foreign city:** They do NOT see each other. The app only connects travelers with locals.
- **User relocates permanently:** Manual setting in profile to update home city. A smart auto-detect prompt ("Did you move?") is a future nice-to-have, not MVP.

### Configuration

- Radius threshold is a simple config value (e.g., 50km), adjustable without code changes

## 3. Discover/Swipe Screen

### Layout

- Full-screen card stack (Tinder-style)
- One card visible at a time, next card peeking behind
- Swipe gestures via `react-native-gesture-handler` + `react-native-reanimated` (both already installed). Custom `PanGestureHandler` implementation — no third-party swipe library needed for MVP.

### Card Content

- Profile photo (full-bleed background)
- Name and age (bottom overlay, age calculated from `date_of_birth`)
- Home city
- 3-5 interest chips

### Actions

- Swipe right → like
- Swipe left → pass
- Two buttons below the card as alternative (X and checkmark)

### Swipe Queue Logic

- Populated via a Supabase RPC function `match_candidates(user_id, user_lat, user_lng, radius_km)`
- The function determines the user's mode (traveler or local) by comparing their current coordinates against `home_lat`/`home_lng`
- Returns profiles of the opposite mode within the area, ranked by shared interest count (descending)
- Excludes profiles already in `match_queue` for this user
- Returns a batch (e.g., 20 candidates at a time)

### MVP Scope

- No super like, rewind, or boost
- Core swipe mechanic only

## 4. Matching & Chat

### Matching

- Mutual right-swipe → match created in `matches` table
- Match detection: when a user swipes right, the insert/upsert to `match_queue` checks if the target already has a `liked` entry for the current user. If yes, a match is created and the API response includes a `matched: true` flag. The client shows the "It's a match!" overlay based on this response.
- Both users see each other in the Matches tab

### Chat

- 1-on-1 text messaging per match
- Text only for MVP (no images, voice, or media)
- Uses `chat_threads` and `chat_messages` tables
- Real-time via Supabase Realtime (Postgres changes subscriptions)

### MVP Scope

- No read receipts, typing indicators, or push notifications
- Functional real-time text chat only

## 5. Bottom Tab Navigation

3 tabs in the main app (Matches and Chat merged into one tab for MVP simplicity — a match row shows the last message preview and opens the chat):

| Tab | Icon | Screen |
|-----|------|--------|
| Discover | Compass | Swipe screen |
| Matches | Chat bubble | Match list with last message preview; tap opens chat |
| Profile | Person | View/edit profile, settings, home city |

## 6. Data & Schema

### Schema migration (reconciling with existing `SUPABASE_SETUP.md`)

The existing `profiles` table already has: `display_name`, `home_city`, `bio`, `avatar_url`, `onboarding_complete`, `languages`. The following columns must be **added** via ALTER TABLE:

| Column | Type | Notes |
|--------|------|-------|
| `date_of_birth` | date | Required during onboarding. Age calculated client-side. |
| `home_lat` | double precision | Home city latitude for distance calc |
| `home_lng` | double precision | Home city longitude for distance calc |

**No renames needed.** The spec uses `onboarding_complete` (matching the existing column name, not `onboarded`).

**`languages` column:** Exists in schema but not used in MVP. Left in place, no action needed.

**`match_preferences` table:** Exists in schema but not used in MVP. Matching is purely interest-based with a fixed configurable radius. Left in place for future use.

### `match_queue` — constraint needed

Add a unique constraint to prevent duplicate swipes:

```sql
ALTER TABLE public.match_queue
ADD CONSTRAINT match_queue_user_target_unique
UNIQUE (user_id, target_user_id);
```

### RLS policy update for discovery

The existing RLS policy on `profiles` only allows owner SELECT. For the swipe screen to work, authenticated users must be able to read other profiles. Update:

```sql
-- Replace the owner-only select policy with:
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
USING (auth.role() = 'authenticated');

-- Keep the owner-only write policy:
CREATE POLICY "Profiles are editable by owner"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);
```

### `interests` table — needs seeding

- ~30-50 pre-defined interests
- Categories: Food & Drink, Outdoors, Culture, Nightlife, Sports, Arts
- Each interest has: `id`, `name`, `category`, `icon`

### Photo storage flow

1. Photo binary uploaded to `avatars` storage bucket
2. Row inserted into `media` table (`type = 'avatar'`, `is_primary = true`, `storage_path` = bucket path)
3. `profiles.avatar_url` set to the public/signed URL

### Device Permissions

- Location: `expo-location` for GPS to determine traveler/local mode (not currently in `package.json` — must be installed)

### Supabase RPC function: `match_candidates`

Server-side function that returns swipe candidates. High-level logic:

```
INPUT: user_id, current_lat, current_lng, radius_km (default 50)
1. Determine user mode: compare (current_lat, current_lng) vs (home_lat, home_lng)
   - Within radius → local mode → return travelers
   - Outside radius → traveler mode → return locals
2. Find candidates of the opposite mode within radius of user's current location
3. Exclude profiles already in match_queue for this user
4. Rank by count of shared interests (descending)
5. Return batch of ~20 profiles with: user_id, display_name, date_of_birth, home_city, avatar_url, bio, interests[]
```

## 7. Implementation Order (Approach A: Onboarding-First)

1. **Schema migration** — add columns to `profiles`, add `match_queue` unique constraint, update RLS policies, seed interests
2. **Install dependencies** — `expo-location`, city autocomplete solution
3. **AppGuard update** — add onboarding routing branch
4. **Onboarding flow** — 4 screens, profile creation, photo upload, interest selection
5. **Bottom tab navigation** — shell with 3 tabs (Discover, Matches, Profile)
6. **Traveler/local logic** — location detection, mode determination
7. **Discover/swipe screen** — card UI, swipe gestures, `match_candidates` RPC
8. **Matching** — mutual swipe detection, match creation, match list screen
9. **Chat** — real-time messaging per match
