# LocalUp Core Features Design

## Overview

LocalUp is a Tinder-style mobile app that connects travelers with locals based on shared interests. The app automatically determines whether a user is a traveler or a local based on their current location relative to their home city. Matching is interest-based with classic swipe mechanics — mutual right-swipes create a match and unlock chat.

This is a thesis project first, portfolio piece second. The MVP prioritizes functional completeness over visual polish.

## 1. Onboarding Flow

A linear 4-step flow triggered after a user registers for the first time. Simple progress indicator (dots or step count). Back/Next navigation.

### Step 1: Name & Age (required)

- Text input for display name
- Date picker or number input for age/date of birth
- Both required to proceed

### Step 2: Home City (required)

- Search/autocomplete input for selecting home city
- Brief explanation shown: "This helps us connect you with travelers or locals"
- Stores city name + coordinates (lat/lng) for distance calculations
- Can be changed later in profile settings

### Step 3: Photo (required)

- Single profile photo upload
- Stored in the `avatars` Supabase storage bucket
- Must upload before proceeding

### Step 4: Interests & Bio

- **Interests (required):** Grid/chips of pre-defined interests. Minimum 3, maximum 5 selections before proceeding.
- **Bio (optional):** Text area below the interests. User can leave it empty and proceed.

### On Completion

- Profile data saved to `profiles` table
- Interests saved to `user_interests` junction table
- Photo uploaded to `avatars` bucket
- `onboarded` flag set to `true`
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

### Card Content

- Profile photo (full-bleed background)
- Name and age (bottom overlay)
- Home city
- 3-5 interest chips

### Actions

- Swipe right → like
- Swipe left → pass
- Two buttons below the card as alternative (X and checkmark)

### Swipe Queue Logic

- Filtered by mode: locals see travelers, travelers see locals
- Ranked by shared interests — more overlap = higher priority, but non-overlapping users can still appear (ranked lower)
- Already-swiped profiles are excluded

### MVP Scope

- No super like, rewind, or boost
- Core swipe mechanic only

## 4. Matching & Chat

### Matching

- Mutual right-swipe → match created in `matches` table
- Brief "It's a match!" overlay with the other person's photo
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

4 tabs in the main app:

| Tab | Icon | Screen |
|-----|------|--------|
| Discover | Compass | Swipe screen |
| Matches | Handshake/People | List of matches |
| Chat | Chat bubble | Chat threads |
| Profile | Person | View/edit profile, settings, home city |

## 6. Data & Schema

### `profiles` table — additions needed

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `display_name` | text | yes | Set during onboarding |
| `date_of_birth` | date | yes | Set during onboarding |
| `home_city` | text | yes | City name, set during onboarding |
| `home_lat` | float | yes | Home city latitude |
| `home_lng` | float | yes | Home city longitude |
| `bio` | text | no | Optional, set during onboarding |
| `onboarded` | boolean | yes | Default false, set true after onboarding |

### `interests` table — needs seeding

- ~30-50 pre-defined interests
- Categories: Food & Drink, Outdoors, Culture, Nightlife, Sports, Arts
- Each interest has: `id`, `name`, `category`

### Existing tables (no changes needed)

- `user_interests` — junction table for user ↔ interest
- `media` — profile photos (+ `avatars` storage bucket)
- `match_queue` — swipe tracking
- `matches` — confirmed matches
- `chat_threads` — conversation threads
- `chat_messages` — individual messages

### Device Permissions

- Location: `expo-location` for GPS to determine traveler/local mode

## 7. Implementation Order (Approach A: Onboarding-First)

1. **Onboarding flow** — 4 screens, profile creation, interest seeding
2. **Traveler/local logic** — location detection, mode determination
3. **Bottom tab navigation** — shell with 4 tabs
4. **Discover/swipe screen** — card UI, swipe mechanics, queue logic
5. **Matching** — mutual swipe detection, match creation, match list
6. **Chat** — real-time messaging per match
