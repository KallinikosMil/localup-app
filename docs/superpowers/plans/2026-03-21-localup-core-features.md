# LocalUp Core Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build onboarding, traveler/local logic, tab navigation, discover/swipe, matching, and chat — turning LocalUp from an auth-only shell into a functional MVP.

**Architecture:** Onboarding-first approach. Schema migrations and interest seeding first, then 4-step onboarding flow, then tab shell with Discover, Matches, and Profile tabs. Swipe queue populated via Supabase RPC. Real-time chat via Supabase Realtime subscriptions. Location via `expo-location`.

**Tech Stack:** Expo SDK 54, Expo Router, Supabase (Postgres + Realtime + Storage), Redux Toolkit (client state), TanStack Query (server mutations/queries), React Native Paper (UI), react-native-gesture-handler + react-native-reanimated (swipe gestures), expo-location, expo-image-picker.

**Spec:** `docs/superpowers/specs/2026-03-21-localup-core-features-design.md`

---

## File Structure

### New files to create

```
src/
├── app/
│   ├── onboarding/
│   │   ├── _layout.tsx              # Onboarding stack layout
│   │   ├── name-age.tsx             # Step 1: Name & DOB
│   │   ├── home-city.tsx            # Step 2: Home city selection
│   │   ├── photo.tsx                # Step 3: Profile photo upload
│   │   └── interests.tsx            # Step 4: Interests + optional bio
│   └── (tabs)/
│       ├── _layout.tsx              # Bottom tab navigator
│       ├── discover.tsx             # Swipe screen
│       ├── matches.tsx              # Match list + chat entry
│       └── profile.tsx              # Profile view/edit
├── features/
│   ├── onboarding/
│   │   ├── hooks/
│   │   │   └── useOnboarding.ts     # Onboarding mutations (save profile, upload photo, save interests)
│   │   ├── context/
│   │   │   └── OnboardingContext.tsx # Shared state across onboarding steps (avoids fragile route params)
│   │   └── i18n/
│   │       ├── translationKeys.ts   # Onboarding translation keys
│   │       └── locales/
│   │           ├── en.js            # English translations
│   │           └── el.js            # Greek translations
│   ├── discover/
│   │   ├── hooks/
│   │   │   └── useDiscover.ts       # Swipe queue query + swipe mutation
│   │   ├── components/
│   │   │   └── SwipeCard.tsx         # Single card component
│   │   └── i18n/
│   │       ├── translationKeys.ts
│   │       └── locales/
│   │           ├── en.js
│   │           └── el.js
│   ├── matches/
│   │   ├── hooks/
│   │   │   └── useMatches.ts        # Matches query
│   │   ├── components/
│   │   │   └── MatchCard.tsx         # Match list item
│   │   └── i18n/
│   │       ├── translationKeys.ts
│   │       └── locales/
│   │           ├── en.js
│   │           └── el.js
│   ├── chat/
│   │   ├── hooks/
│   │   │   └── useChat.ts           # Messages query + send mutation + realtime sub
│   │   ├── components/
│   │   │   ├── MessageBubble.tsx     # Single message
│   │   │   └── ChatInput.tsx         # Text input + send button
│   │   └── i18n/
│   │       ├── translationKeys.ts
│   │       └── locales/
│   │           ├── en.js
│   │           └── el.js
│   └── profile/
│       ├── hooks/
│       │   └── useProfile.ts        # Profile query + update mutation
│       └── i18n/
│           ├── translationKeys.ts
│           └── locales/
│               ├── en.js
│               └── el.js
├── shared/
│   ├── hooks/
│   │   └── useLocation.ts          # expo-location wrapper for current coords
│   └── components/
│       └── InterestChip.tsx         # Reusable interest chip (used in onboarding + cards)
└── app/
    └── chat/
        ├── _layout.tsx              # Stack layout with back header for chat
        └── [threadId].tsx           # Individual chat screen (dynamic route)
```

### Files to modify

```
src/providers/AppProviders.tsx      # Add onboarding check to AppGuard + fetch profile on auth
src/features/auth/slices/authSlice.ts  # Add onboardingComplete to auth state
src/app/_layout.tsx                 # Remove ScrollView/KeyboardAvoidingView wrapper (tabs need full control)
src/app/index.ts                    # Update redirect target
src/config/i18n/index.ts            # Register new feature translation namespaces
```

---

## Task 1: Schema Migration

**Files:**
- Reference: `SUPABASE_SETUP.md`
- Reference: `docs/superpowers/specs/2026-03-21-localup-core-features-design.md` (Section 6)

This task uses the Supabase MCP to run migrations. No test files — these are SQL changes.

- [ ] **Step 1: Add missing columns to `profiles` table**

Run via Supabase MCP `apply_migration`:

```sql
-- Add columns needed for onboarding and location
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS home_lat double precision,
ADD COLUMN IF NOT EXISTS home_lng double precision;
```

- [ ] **Step 2: Add unique constraint to `match_queue`**

```sql
ALTER TABLE public.match_queue
ADD CONSTRAINT match_queue_user_target_unique
UNIQUE (user_id, target_user_id);
```

- [ ] **Step 3: Update RLS policies for all tables**

```sql
-- PROFILES: Allow authenticated users to read all profiles (needed for swipe cards)
DROP POLICY IF EXISTS "Profiles are viewable by owner"
ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
USING (auth.role() = 'authenticated');

-- PROFILES: Allow users to insert their own profile (needed for onboarding)
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- MATCH_QUEUE: Users can insert their own swipes
CREATE POLICY "Users can insert own swipes"
ON public.match_queue FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- MATCH_QUEUE: Users can read swipes involving them
CREATE POLICY "Users can read own swipes"
ON public.match_queue FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = target_user_id);

-- MATCHES: Users can insert matches they participate in
CREATE POLICY "Users can insert own matches"
ON public.matches FOR INSERT
WITH CHECK (auth.uid() = traveler_id OR auth.uid() = host_id);

-- MATCHES: Users can read matches they participate in
CREATE POLICY "Users can read own matches"
ON public.matches FOR SELECT
USING (auth.uid() = traveler_id OR auth.uid() = host_id);

-- CHAT_THREADS: Participants can insert and read
CREATE POLICY "Participants can insert chat threads"
ON public.chat_threads FOR INSERT
WITH CHECK (auth.uid() = traveler_id OR auth.uid() = host_id);

CREATE POLICY "Participants can read chat threads"
ON public.chat_threads FOR SELECT
USING (auth.uid() = traveler_id OR auth.uid() = host_id);

CREATE POLICY "Participants can update chat threads"
ON public.chat_threads FOR UPDATE
USING (auth.uid() = traveler_id OR auth.uid() = host_id);

-- CHAT_MESSAGES: Users can insert own messages and read messages in their threads
CREATE POLICY "Users can insert own messages"
ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can read messages in their threads"
ON public.chat_messages FOR SELECT
USING (
  thread_id IN (
    SELECT id FROM public.chat_threads
    WHERE traveler_id = auth.uid()
       OR host_id = auth.uid()
  )
);

-- USER_INTERESTS: Users can manage their own interests
CREATE POLICY "Users can insert own interests"
ON public.user_interests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read all interests"
ON public.user_interests FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete own interests"
ON public.user_interests FOR DELETE
USING (auth.uid() = user_id);

-- MEDIA: Users can manage their own media
CREATE POLICY "Users can insert own media"
ON public.media FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own media"
ON public.media FOR SELECT
USING (auth.uid() = user_id);

-- INTERESTS (seed data): All authenticated users can read
CREATE POLICY "Anyone can read interests"
ON public.interests FOR SELECT
USING (auth.role() = 'authenticated');
```

- [ ] **Step 4: Seed interests table**

```sql
INSERT INTO public.interests (name, category, icon) VALUES
-- Food & Drink
('Street Food', 'Food & Drink', 'food'),
('Coffee Culture', 'Food & Drink', 'coffee'),
('Local Cuisine', 'Food & Drink', 'silverware-fork-knife'),
('Wine & Cocktails', 'Food & Drink', 'glass-cocktail'),
('Cooking', 'Food & Drink', 'pot-steam'),
('Vegan & Veggie', 'Food & Drink', 'leaf'),
-- Outdoors
('Hiking', 'Outdoors', 'hiking'),
('Beach', 'Outdoors', 'beach'),
('Cycling', 'Outdoors', 'bicycle'),
('Camping', 'Outdoors', 'tent'),
('Water Sports', 'Outdoors', 'swim'),
('Running', 'Outdoors', 'run'),
-- Culture
('Museums', 'Culture', 'bank'),
('History', 'Culture', 'castle'),
('Architecture', 'Culture', 'city'),
('Local Traditions', 'Culture', 'account-group'),
('Markets & Bazaars', 'Culture', 'store'),
('Live Music', 'Culture', 'music'),
-- Nightlife
('Bars & Pubs', 'Nightlife', 'glass-mug-variant'),
('Clubs', 'Nightlife', 'speaker'),
('Rooftop Bars', 'Nightlife', 'weather-night'),
('Live Events', 'Nightlife', 'ticket'),
-- Sports
('Football', 'Sports', 'soccer'),
('Basketball', 'Sports', 'basketball'),
('Yoga', 'Sports', 'meditation'),
('Gym', 'Sports', 'dumbbell'),
('Climbing', 'Sports', 'carabiner'),
-- Arts
('Photography', 'Arts', 'camera'),
('Street Art', 'Arts', 'palette'),
('Film', 'Arts', 'movie'),
('Theater', 'Arts', 'drama-masks'),
('Reading', 'Arts', 'book-open-variant');
```

- [ ] **Step 5: Create `match_candidates` RPC function**

```sql
CREATE OR REPLACE FUNCTION public.match_candidates(
  p_user_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision DEFAULT 50
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  date_of_birth date,
  home_city text,
  avatar_url text,
  bio text,
  shared_interest_count bigint,
  interests jsonb
) AS $$
DECLARE
  v_home_lat double precision;
  v_home_lng double precision;
  v_is_local boolean;
BEGIN
  -- Get user's home coordinates
  SELECT p.home_lat, p.home_lng
  INTO v_home_lat, v_home_lng
  FROM public.profiles p
  WHERE p.user_id = p_user_id;

  -- Determine if user is local (within radius of home)
  v_is_local := (
    6371 * acos(
      cos(radians(p_lat)) * cos(radians(v_home_lat))
      * cos(radians(v_home_lng) - radians(p_lng))
      + sin(radians(p_lat)) * sin(radians(v_home_lat))
    )
  ) <= p_radius_km;

  RETURN QUERY
  SELECT
    p.user_id,
    p.display_name,
    p.date_of_birth,
    p.home_city,
    p.avatar_url,
    p.bio,
    COALESCE(shared.cnt, 0) AS shared_interest_count,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('name', i.name, 'icon', i.icon))
       FROM public.user_interests ui2
       JOIN public.interests i ON i.id = ui2.interest_id
       WHERE ui2.user_id = p.user_id),
      '[]'::jsonb
    ) AS interests
  FROM public.profiles p
  LEFT JOIN (
    -- Count shared interests
    SELECT ui_other.user_id, COUNT(*) AS cnt
    FROM public.user_interests ui_other
    WHERE ui_other.interest_id IN (
      SELECT interest_id FROM public.user_interests WHERE user_id = p_user_id
    )
    AND ui_other.user_id != p_user_id
    GROUP BY ui_other.user_id
  ) shared ON shared.user_id = p.user_id
  WHERE p.user_id != p_user_id
    AND p.onboarding_complete = true
    -- Exclude already-swiped users
    AND p.user_id NOT IN (
      SELECT mq.target_user_id FROM public.match_queue mq
      WHERE mq.user_id = p_user_id
    )
    -- If current user is local, show travelers (those NOT near their home)
    -- If current user is traveler, show locals (those near their home)
    AND CASE
      WHEN v_is_local THEN
        -- User is local: show travelers (people far from THEIR OWN home)
        (6371 * acos(
          cos(radians(p_lat)) * cos(radians(p.home_lat))
          * cos(radians(p.home_lng) - radians(p_lng))
          + sin(radians(p_lat)) * sin(radians(p.home_lat))
        )) > p_radius_km
      ELSE
        -- User is traveler: show locals (people near THEIR OWN home, i.e., near user's current location)
        (6371 * acos(
          cos(radians(p_lat)) * cos(radians(p.home_lat))
          * cos(radians(p.home_lng) - radians(p_lng))
          + sin(radians(p_lat)) * sin(radians(p.home_lat))
        )) <= p_radius_km
      END
  ORDER BY shared_interest_count DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 6: Commit**

```bash
git add SUPABASE_SETUP.md
git commit -m "docs: document schema migrations for core features"
```

---

## Task 2: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install expo-location, expo-image-picker, and datetimepicker**

```bash
npx expo install expo-location expo-image-picker @react-native-community/datetimepicker
```

- [ ] **Step 2: Verify installation**

```bash
npx expo install --check
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add expo-location and expo-image-picker"
```

---

## Task 3: Update Auth State & AppGuard for Onboarding

**Files:**
- Modify: `src/features/auth/slices/authSlice.ts`
- Modify: `src/providers/AppProviders.tsx`
- Modify: `src/app/_layout.tsx`
- Modify: `src/app/index.ts`

- [ ] **Step 1: Add `onboardingComplete` to auth slice**

In `src/features/auth/slices/authSlice.ts`, update the state interface and add a reducer:

```typescript
export interface AuthState {
  user: {
    uid: string;
    email: string | null;
  } | null;
  initialized: boolean;
  onboardingComplete: boolean;
}

const initialState: AuthState = {
  user: null,
  initialized: false,
  onboardingComplete: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setInitialized: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.initialized = action.payload;
    },
    setUser: (
      state,
      action: PayloadAction<{
        uid: string;
        email: string | null;
      } | null>,
    ) => {
      state.user = action.payload;
    },
    setOnboardingComplete: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.onboardingComplete = action.payload;
    },
  },
});

export const {
  setInitialized,
  setUser,
  setOnboardingComplete,
} = authSlice.actions;
export default authSlice.reducer;
```

- [ ] **Step 2: Update AppProviders to fetch profile and check onboarding**

In `src/providers/AppProviders.tsx`, after getting the session, fetch the profile to check `onboarding_complete`:

```typescript
// Add import
import {
  setInitialized,
  setUser,
  setOnboardingComplete,
} from '@features/auth/slices/authSlice';

// In the useEffect, after getting session:
useEffect(() => {
  supabase.auth
    .getSession()
    .then(async ({ data }) => {
      const session = data.session;
      const user = session?.user
        ? {
            uid: session.user.id,
            email:
              session.user.email ?? null,
          }
        : null;
      store.dispatch(setUser(user));

      // Check onboarding status
      if (session?.user) {
        const { data: profile } =
          await supabase
            .from('profiles')
            .select('onboarding_complete')
            .eq('user_id', session.user.id)
            .single();
        store.dispatch(
          setOnboardingComplete(
            profile?.onboarding_complete ??
              false,
          ),
        );
      }

      store.dispatch(
        setInitialized(true),
      );
    });

  const { data: sub } =
    supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user
          ? {
              uid: session.user.id,
              email:
                session.user.email ?? null,
            }
          : null;
        store.dispatch(setUser(user));

        if (session?.user) {
          const { data: profile } =
            await supabase
              .from('profiles')
              .select('onboarding_complete')
              .eq(
                'user_id',
                session.user.id,
              )
              .single();
          store.dispatch(
            setOnboardingComplete(
              profile?.onboarding_complete ??
                false,
            ),
          );
        } else {
          store.dispatch(
            setOnboardingComplete(false),
          );
        }
      },
    );

  return () => {
    sub?.subscription.unsubscribe();
  };
}, []);
```

- [ ] **Step 3: Update AppGuard with three-branch routing**

```typescript
function AppGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const segments = useSegments();
  const { user, initialized, onboardingComplete } =
    useSelector((s: RootState) => s.auth);

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup =
      segments[0] === 'auth';
    const inOnboarding =
      segments[0] === 'onboarding';

    if (!user && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      if (onboardingComplete) {
        router.replace('/(tabs)/discover');
      } else {
        router.replace(
          '/onboarding/name-age',
        );
      }
    } else if (
      user &&
      !onboardingComplete &&
      !inOnboarding &&
      !inAuthGroup
    ) {
      router.replace(
        '/onboarding/name-age',
      );
    } else if (
      user &&
      onboardingComplete &&
      inOnboarding
    ) {
      router.replace('/(tabs)/discover');
    }
  }, [
    initialized,
    user,
    onboardingComplete,
    segments,
  ]);

  return <>{children}</>;
}
```

- [ ] **Step 4: Simplify `_layout.tsx`**

The root layout currently wraps everything in ScrollView + KeyboardAvoidingView. The tab navigator and individual screens need to control their own scrolling. Simplify to:

```typescript
import React from 'react';
import { Slot } from 'expo-router';
import AppProviders from
  '@providers/AppProviders';

export default function RootLayout() {
  return (
    <AppProviders>
      <Slot />
    </AppProviders>
  );
}
```

- [ ] **Step 5: Update `src/app/index.ts` redirect**

Change redirect from `/core` to `/(tabs)/discover` (AppGuard will handle auth/onboarding redirects):

```typescript
import { Redirect } from 'expo-router';

export default () =>
  Redirect({ href: '/(tabs)/discover' });
```

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/slices/authSlice.ts src/providers/AppProviders.tsx src/app/_layout.tsx src/app/index.ts
git commit -m "feat: add onboarding gate to AppGuard with three-branch routing"
```

---

## Task 4: Onboarding Flow — Step 1 (Name & Age)

**Files:**
- Create: `src/app/onboarding/_layout.tsx`
- Create: `src/app/onboarding/name-age.tsx`
- Create: `src/features/onboarding/i18n/translationKeys.ts`
- Create: `src/features/onboarding/i18n/locales/en.js`
- Create: `src/features/onboarding/i18n/locales/el.js`
- Modify: `src/config/i18n/index.ts`

- [ ] **Step 1: Create onboarding translation keys**

`src/features/onboarding/i18n/translationKeys.ts`:

```typescript
export const Translations = {
  ONBOARDING_STEP_1_TITLE:
    'onboarding.step1Title',
  ONBOARDING_STEP_1_SUBTITLE:
    'onboarding.step1Subtitle',
  ONBOARDING_NAME_LABEL:
    'onboarding.nameLabel',
  ONBOARDING_NAME_REQUIRED:
    'onboarding.nameRequired',
  ONBOARDING_DOB_LABEL:
    'onboarding.dobLabel',
  ONBOARDING_DOB_REQUIRED:
    'onboarding.dobRequired',
  ONBOARDING_NEXT: 'onboarding.next',
  ONBOARDING_STEP_2_TITLE:
    'onboarding.step2Title',
  ONBOARDING_STEP_2_SUBTITLE:
    'onboarding.step2Subtitle',
  ONBOARDING_CITY_LABEL:
    'onboarding.cityLabel',
  ONBOARDING_CITY_REQUIRED:
    'onboarding.cityRequired',
  ONBOARDING_CITY_EXPLANATION:
    'onboarding.cityExplanation',
  ONBOARDING_STEP_3_TITLE:
    'onboarding.step3Title',
  ONBOARDING_STEP_3_SUBTITLE:
    'onboarding.step3Subtitle',
  ONBOARDING_UPLOAD_PHOTO:
    'onboarding.uploadPhoto',
  ONBOARDING_CHANGE_PHOTO:
    'onboarding.changePhoto',
  ONBOARDING_STEP_4_TITLE:
    'onboarding.step4Title',
  ONBOARDING_STEP_4_SUBTITLE:
    'onboarding.step4Subtitle',
  ONBOARDING_BIO_LABEL:
    'onboarding.bioLabel',
  ONBOARDING_BIO_PLACEHOLDER:
    'onboarding.bioPlaceholder',
  ONBOARDING_INTERESTS_MIN:
    'onboarding.interestsMin',
  ONBOARDING_FINISH: 'onboarding.finish',
} as const;
```

- [ ] **Step 2: Create English translations**

`src/features/onboarding/i18n/locales/en.js`:

```javascript
export default {
  onboarding: {
    step1Title: 'About You',
    step1Subtitle:
      "Let's start with the basics",
    nameLabel: 'Display Name',
    nameRequired: 'Please enter your name',
    dobLabel: 'Date of Birth',
    dobRequired:
      'Please enter your date of birth',
    next: 'Next',
    step2Title: 'Where Do You Live?',
    step2Subtitle:
      'This helps us connect you with travelers or locals',
    cityLabel: 'Home City',
    cityRequired:
      'Please select your home city',
    cityExplanation:
      'We use this to know if you are a local or a traveler in any given location.',
    step3Title: 'Add a Photo',
    step3Subtitle:
      'Help others recognize you',
    uploadPhoto: 'Upload Photo',
    changePhoto: 'Change Photo',
    step4Title: 'Your Interests',
    step4Subtitle:
      'Pick at least 3 interests to help us find your match',
    bioLabel: 'Bio',
    bioPlaceholder:
      'Tell others a bit about yourself...',
    interestsMin:
      'Select at least 3 interests',
    finish: 'Get Started',
  },
};
```

- [ ] **Step 3: Create Greek translations**

`src/features/onboarding/i18n/locales/el.js`:

```javascript
export default {
  onboarding: {
    step1Title: 'Σχετικά με εσένα',
    step1Subtitle:
      'Ας ξεκινήσουμε με τα βασικά',
    nameLabel: 'Εμφανιζόμενο Όνομα',
    nameRequired:
      'Παρακαλώ εισάγετε το όνομά σας',
    dobLabel: 'Ημερομηνία Γέννησης',
    dobRequired:
      'Παρακαλώ εισάγετε την ημερομηνία γέννησής σας',
    next: 'Επόμενο',
    step2Title: 'Πού Μένεις;',
    step2Subtitle:
      'Αυτό μας βοηθά να σε συνδέσουμε με ταξιδιώτες ή ντόπιους',
    cityLabel: 'Πόλη Κατοικίας',
    cityRequired:
      'Παρακαλώ επιλέξτε την πόλη σας',
    cityExplanation:
      'Χρησιμοποιούμε αυτό για να ξέρουμε αν είσαι ντόπιος ή ταξιδιώτης.',
    step3Title: 'Πρόσθεσε μια Φωτογραφία',
    step3Subtitle:
      'Βοήθησε τους άλλους να σε αναγνωρίσουν',
    uploadPhoto: 'Ανέβασε Φωτογραφία',
    changePhoto: 'Άλλαξε Φωτογραφία',
    step4Title: 'Τα Ενδιαφέροντά Σου',
    step4Subtitle:
      'Διάλεξε τουλάχιστον 3 ενδιαφέροντα',
    bioLabel: 'Βιογραφικό',
    bioPlaceholder:
      'Πες λίγα λόγια για τον εαυτό σου...',
    interestsMin:
      'Επιλέξτε τουλάχιστον 3 ενδιαφέροντα',
    finish: 'Ξεκίνα',
  },
};
```

- [ ] **Step 4: Register onboarding translations in i18n config**

In `src/config/i18n/index.ts`, import and merge the onboarding translations alongside the existing auth ones. Follow the same pattern already used for auth translations.

- [ ] **Step 5: Create OnboardingContext for shared state**

`src/features/onboarding/context/OnboardingContext.tsx`:

Instead of passing data through route params (fragile if user navigates back/forward), use a React context that holds all onboarding draft data across steps.

```typescript
import React, {
  createContext,
  useContext,
  useState,
} from 'react';

type OnboardingData = {
  displayName: string;
  dateOfBirth: Date | null;
  homeCity: string;
  homeLat: number;
  homeLng: number;
  photoUri: string;
  interestIds: string[];
  bio: string;
};

type OnboardingContextType = {
  data: OnboardingData;
  update: (
    partial: Partial<OnboardingData>,
  ) => void;
};

const defaultData: OnboardingData = {
  displayName: '',
  dateOfBirth: null,
  homeCity: '',
  homeLat: 0,
  homeLng: 0,
  photoUri: '',
  interestIds: [],
  bio: '',
};

const OnboardingContext =
  createContext<OnboardingContextType>({
    data: defaultData,
    update: () => {},
  });

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, setData] =
    useState<OnboardingData>(defaultData);

  const update = (
    partial: Partial<OnboardingData>,
  ) =>
    setData((prev) => ({
      ...prev,
      ...partial,
    }));

  return (
    <OnboardingContext.Provider
      value={{ data, update }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboardingData = () =>
  useContext(OnboardingContext);
```

- [ ] **Step 6: Create onboarding layout**

`src/app/onboarding/_layout.tsx`:

```typescript
import React from 'react';
import { Stack } from 'expo-router';
import { OnboardingProvider } from
  '@features/onboarding/context/OnboardingContext';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </OnboardingProvider>
  );
}
```

- [ ] **Step 7: Create name-age screen**

`src/app/onboarding/name-age.tsx`:

```typescript
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import {
  Button,
  useTheme,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import {
  FormProvider,
  useForm,
} from 'react-hook-form';
import { router } from 'expo-router';
import DateTimePicker from
  '@react-native-community/datetimepicker';
import AppText from
  '@shared/components/AppText';
import InputField from
  '@shared/components/InputField';
import Spacer from
  '@shared/components/Spacer';
import { Spacing } from
  '@theme/constants/Spacing';
import { BorderRadius } from
  '@theme/constants/BorderRadius';
import { Translations } from
  '@features/onboarding/i18n/translationKeys';
import { useOnboardingData } from
  '@features/onboarding/context/OnboardingContext';

type FormData = {
  displayName: string;
};

export default function NameAgeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: onboarding, update } =
    useOnboardingData();
  const [dateOfBirth, setDateOfBirth] =
    useState<Date | null>(
      onboarding.dateOfBirth,
    );
  const [showPicker, setShowPicker] =
    useState(false);

  const form = useForm<FormData>({
    defaultValues: { displayName: '' },
    mode: 'onBlur',
  });

  const {
    handleSubmit,
    formState: { isValid },
  } = form;

  const canProceed =
    isValid && dateOfBirth !== null;

  const onNext = handleSubmit(() => {
    update({
      displayName:
        form.getValues('displayName'),
      dateOfBirth: dateOfBirth!,
    });
    router.push('/onboarding/home-city');
  });

  const maxDate = new Date();
  maxDate.setFullYear(
    maxDate.getFullYear() - 18,
  );

  return (
    <KeyboardAvoidingView
      style={[
        styles.root,
        {
          backgroundColor:
            theme.colors.background,
        },
      ]}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.progress}>
          <AppText
            variant="caption"
            style={{
              color:
                theme.colors
                  .onSurfaceVariant,
            }}
          >
            1 / 4
          </AppText>
        </View>

        <AppText
          variant="h2"
          style={{
            color: theme.colors.primary,
          }}
        >
          {t(
            Translations.ONBOARDING_STEP_1_TITLE,
          )}
        </AppText>
        <Spacer
          spacing={Spacing.SPACING_PADDING_8}
        />
        <AppText
          variant="body"
          style={{
            color:
              theme.colors.onSurfaceVariant,
          }}
        >
          {t(
            Translations.ONBOARDING_STEP_1_SUBTITLE,
          )}
        </AppText>

        <Spacer
          spacing={Spacing.SPACING_PADDING_32}
        />

        <FormProvider {...form}>
          <InputField
            name="displayName"
            label={t(
              Translations.ONBOARDING_NAME_LABEL,
            )}
            rules={{
              required: {
                value: true,
                message: t(
                  Translations.ONBOARDING_NAME_REQUIRED,
                ),
              },
            }}
            dense
            autoCapitalize="words"
            returnKeyType="next"
          />
        </FormProvider>

        <Spacer
          spacing={Spacing.SPACING_PADDING_16}
        />

        <Button
          mode="outlined"
          onPress={() => setShowPicker(true)}
          style={{
            borderRadius: BorderRadius.sm,
            borderColor:
              theme.colors.outline,
          }}
          textColor={
            dateOfBirth
              ? theme.colors.onBackground
              : theme.colors.onSurfaceVariant
          }
        >
          {dateOfBirth
            ? dateOfBirth.toLocaleDateString()
            : t(
                Translations.ONBOARDING_DOB_LABEL,
              )}
        </Button>

        {showPicker && (
          <DateTimePicker
            value={dateOfBirth ?? maxDate}
            mode="date"
            maximumDate={maxDate}
            onChange={(_, date) => {
              setShowPicker(
                Platform.OS === 'ios',
              );
              if (date) setDateOfBirth(date);
            }}
          />
        )}

        <View style={styles.bottom}>
          <Button
            mode="contained"
            onPress={onNext}
            disabled={!canProceed}
            contentStyle={styles.btnContent}
            style={{
              borderRadius: BorderRadius.pill,
            }}
          >
            {t(Translations.ONBOARDING_NEXT)}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  progress: {
    alignItems: 'flex-end',
    paddingTop: 16,
    paddingBottom: 8,
  },
  bottom: {
    marginTop: 'auto',
    paddingTop: 32,
  },
  btnContent: { height: 52 },
});
```

- [ ] **Step 8: Commit**

```bash
git add src/app/onboarding/ src/features/onboarding/ src/config/i18n/
git commit -m "feat: add onboarding step 1 — name and date of birth"
```

---

## Task 5: Onboarding Flow — Step 2 (Home City)

**Files:**
- Create: `src/app/onboarding/home-city.tsx`

The city autocomplete uses the free Nominatim (OpenStreetMap) API — no API key needed. A simple text input with debounced search results.

- [ ] **Step 1: Create home-city screen**

`src/app/onboarding/home-city.tsx`:

Uses `useOnboardingData()` to read/write shared state. Provides a text input that queries Nominatim's search endpoint on debounce (300ms). Results display as a FlatList of city suggestions. Selecting one calls `update({ homeCity, homeLat, homeLng })`. The "Next" button navigates to `/onboarding/photo`.

Key implementation details:
- Fetch: `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=5&addressdetails=1&featuretype=city`
- Extract: `display_name`, `lat`, `lon` from results
- On select: `update({ homeCity: name, homeLat: parseFloat(lat), homeLng: parseFloat(lon) })`
- Next: `router.push('/onboarding/photo')`

- [ ] **Step 2: Commit**

```bash
git add src/app/onboarding/home-city.tsx
git commit -m "feat: add onboarding step 2 — home city with Nominatim autocomplete"
```

---

## Task 6: Onboarding Flow — Step 3 (Photo)

**Files:**
- Create: `src/app/onboarding/photo.tsx`

- [ ] **Step 1: Create photo upload screen**

`src/app/onboarding/photo.tsx`:

Uses `useOnboardingData()` for shared state. Uses `expo-image-picker` to let the user pick a photo from their library (or take one with camera). Displays the selected image in a circular preview. The photo URI is stored via `update({ photoUri })` — actual upload to Supabase happens in the final step (Task 7) to avoid orphaned uploads if the user abandons onboarding.

Key implementation details:
- `ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8 })`
- Show circular image preview when selected
- On select: `update({ photoUri: result.assets[0].uri })`
- Next: `router.push('/onboarding/interests')`

- [ ] **Step 2: Commit**

```bash
git add src/app/onboarding/photo.tsx
git commit -m "feat: add onboarding step 3 — profile photo selection"
```

---

## Task 7: Onboarding Flow — Step 4 (Interests + Bio) & Completion

**Files:**
- Create: `src/app/onboarding/interests.tsx`
- Create: `src/features/onboarding/hooks/useOnboarding.ts`
- Create: `src/shared/components/InterestChip.tsx`

- [ ] **Step 1: Create InterestChip component**

`src/shared/components/InterestChip.tsx`:

A pressable chip that shows an interest name + optional icon. Has selected/unselected states using Paper's `Chip` component. Used in both onboarding and on swipe cards.

```typescript
import React from 'react';
import { Chip } from 'react-native-paper';

type Props = {
  label: string;
  icon?: string;
  selected?: boolean;
  onPress?: () => void;
};

const InterestChip = ({
  label,
  icon,
  selected = false,
  onPress,
}: Props) => (
  <Chip
    mode={selected ? 'flat' : 'outlined'}
    selected={selected}
    onPress={onPress}
    icon={icon}
    style={{ margin: 4 }}
    compact
  >
    {label}
  </Chip>
);

export default InterestChip;
```

- [ ] **Step 2: Create useOnboarding hook**

`src/features/onboarding/hooks/useOnboarding.ts`:

```typescript
import { useMutation } from
  '@tanstack/react-query';
import { supabase } from
  '@config/supabase';
import { store } from '@store';
import { setOnboardingComplete } from
  '@features/auth/slices/authSlice';

type OnboardingData = {
  displayName: string;
  dateOfBirth: string;
  homeCity: string;
  homeLat: number;
  homeLng: number;
  photoUri: string;
  interestIds: string[];
  bio?: string;
};

export function useCompleteOnboarding() {
  return useMutation({
    mutationFn: async (
      data: OnboardingData,
    ) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Upload photo to avatars bucket
      // Use FormData for reliable RN uploads
      const fileExt = data.photoUri
        .split('.')
        .pop() ?? 'jpg';
      const filePath =
        `${user.id}/avatar.${fileExt}`;

      const formData = new FormData();
      formData.append('file', {
        uri: data.photoUri,
        name: `avatar.${fileExt}`,
        type: `image/${fileExt}`,
      } as any);

      const { error: uploadError } =
        await supabase.storage
          .from('avatars')
          .upload(filePath, formData, {
            upsert: true,
          });
      if (uploadError) throw uploadError;

      // 2. Get avatar signed URL (bucket is private)
      const {
        data: signedUrlData,
        error: urlError,
      } = await supabase.storage
        .from('avatars')
        .createSignedUrl(
          filePath,
          60 * 60 * 24 * 365,
        ); // 1 year
      if (urlError) throw urlError;
      const avatarUrl =
        signedUrlData.signedUrl;

      // 3. Upsert profile
      const { error: profileError } =
        await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            display_name: data.displayName,
            date_of_birth: data.dateOfBirth,
            home_city: data.homeCity,
            home_lat: data.homeLat,
            home_lng: data.homeLng,
            avatar_url: avatarUrl,
            bio: data.bio || null,
            onboarding_complete: true,
          });
      if (profileError) throw profileError;

      // 4. Insert media row
      await supabase.from('media').insert({
        user_id: user.id,
        type: 'avatar',
        storage_path: filePath,
        is_primary: true,
      });

      // 5. Save interests
      const interestRows =
        data.interestIds.map((id) => ({
          user_id: user.id,
          interest_id: id,
        }));
      const { error: interestsError } =
        await supabase
          .from('user_interests')
          .insert(interestRows);
      if (interestsError)
        throw interestsError;

      // 6. Update Redux
      store.dispatch(
        setOnboardingComplete(true),
      );
    },
  });
}
```

- [ ] **Step 3: Create interests screen**

`src/app/onboarding/interests.tsx`:

Uses `useOnboardingData()` for all accumulated data. Fetches interests from Supabase (`supabase.from('interests').select('*').eq('is_active', true)`). Displays them grouped by category using `SectionList` or grouped `View`s with `InterestChip` components. Below the interests grid, a `TextInput` for optional bio. The "Get Started" button calls `useCompleteOnboarding` with all accumulated data.

Key implementation details:
- Fetch interests via `useQuery`
- Track selected interest IDs in local state (Set)
- Enforce min 3, max 5 selection
- Show selection count (e.g., "3/5 selected")
- On submit: call `completeOnboarding.mutate()` with all params
- Show loading indicator during submission
- On success: AppGuard automatically redirects to `/(tabs)/discover`

- [ ] **Step 4: Commit**

```bash
git add src/app/onboarding/interests.tsx src/features/onboarding/hooks/ src/shared/components/InterestChip.tsx
git commit -m "feat: add onboarding step 4 — interests, bio, and profile completion"
```

---

## Task 8: Bottom Tab Navigation

**Files:**
- Create: `src/app/(tabs)/_layout.tsx`
- Create: `src/app/(tabs)/discover.tsx` (placeholder)
- Create: `src/app/(tabs)/matches.tsx` (placeholder)
- Create: `src/app/(tabs)/profile.tsx` (placeholder)
- Delete: `src/app/dashboard/index.tsx` (replaced by tabs)
- Delete: `src/app/core/index.tsx` (no longer needed)

- [ ] **Step 1: Create tab layout**

`src/app/(tabs)/_layout.tsx`:

```typescript
import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import Icon from
  '@expo/vector-icons/MaterialCommunityIcons';

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:
          theme.colors.primary,
        tabBarInactiveTintColor:
          theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor:
            theme.colors.surface,
          borderTopColor:
            theme.colors.outlineVariant,
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => (
            <Icon
              name="compass-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, size }) => (
            <Icon
              name="chat-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Icon
              name="account-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Create placeholder screens**

`src/app/(tabs)/discover.tsx`:
```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from '@shared/components/AppText';

export default function DiscoverScreen() {
  return (
    <View style={styles.root}>
      <AppText variant="h2">Discover</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

`src/app/(tabs)/matches.tsx` and `src/app/(tabs)/profile.tsx` follow the same pattern with their respective titles.

- [ ] **Step 3: Delete old routes**

Remove `src/app/dashboard/index.tsx` and `src/app/core/index.tsx` — their functionality is replaced by the tab navigator and AppGuard.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(tabs\)/ && git rm src/app/dashboard/index.tsx src/app/core/index.tsx
git commit -m "feat: add bottom tab navigation with Discover, Matches, Profile"
```

---

## Task 9: Location Hook

**Files:**
- Create: `src/shared/hooks/useLocation.ts`

- [ ] **Step 1: Create useLocation hook**

`src/shared/hooks/useLocation.ts`:

```typescript
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

type Coords = {
  latitude: number;
  longitude: number;
} | null;

export default function useLocation() {
  const [coords, setCoords] =
    useState<Coords>(null);
  const [error, setError] = useState<
    string | null
  >(null);
  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    (async () => {
      const { status } =
        await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError(
          'Location permission denied',
        );
        setLoading(false);
        return;
      }

      const location =
        await Location.getCurrentPositionAsync(
          {},
        );
      setCoords({
        latitude:
          location.coords.latitude,
        longitude:
          location.coords.longitude,
      });
      setLoading(false);
    })();
  }, []);

  return { coords, error, loading };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/hooks/useLocation.ts
git commit -m "feat: add useLocation hook for GPS coordinates"
```

---

## Task 10: Discover/Swipe Screen

**Files:**
- Modify: `src/app/(tabs)/discover.tsx`
- Create: `src/features/discover/hooks/useDiscover.ts`
- Create: `src/features/discover/components/SwipeCard.tsx`
- Create: `src/features/discover/i18n/translationKeys.ts`
- Create: `src/features/discover/i18n/locales/en.js`
- Create: `src/features/discover/i18n/locales/el.js`

- [ ] **Step 1: Create useDiscover hook**

`src/features/discover/hooks/useDiscover.ts`:

```typescript
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@config/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '@store';

type Candidate = {
  user_id: string;
  display_name: string;
  date_of_birth: string;
  home_city: string;
  avatar_url: string;
  bio: string | null;
  shared_interest_count: number;
  interests: {
    name: string;
    icon: string;
  }[];
};

export function useCandidates(
  lat: number | null,
  lng: number | null,
) {
  const user = useSelector(
    (s: RootState) => s.auth.user,
  );

  return useQuery<Candidate[]>({
    queryKey: [
      'candidates',
      user?.uid,
      lat,
      lng,
    ],
    queryFn: async () => {
      const { data, error } =
        await supabase.rpc(
          'match_candidates',
          {
            p_user_id: user!.uid,
            p_lat: lat!,
            p_lng: lng!,
          },
        );
      if (error) throw error;
      return data ?? [];
    },
    enabled:
      !!user?.uid &&
      lat !== null &&
      lng !== null,
  });
}

export function useSwipe(
  userIsLocal: boolean,
) {
  const queryClient = useQueryClient();
  const user = useSelector(
    (s: RootState) => s.auth.user,
  );

  return useMutation({
    mutationFn: async ({
      targetUserId,
      status,
    }: {
      targetUserId: string;
      status: 'liked' | 'passed';
    }) => {
      // Insert swipe decision
      const { error } = await supabase
        .from('match_queue')
        .insert({
          user_id: user!.uid,
          target_user_id: targetUserId,
          status,
        });
      if (error) throw error;

      // Check for mutual match
      if (status === 'liked') {
        const { data: mutual } =
          await supabase
            .from('match_queue')
            .select('id')
            .eq('user_id', targetUserId)
            .eq(
              'target_user_id',
              user!.uid,
            )
            .eq('status', 'liked')
            .single();

        if (mutual) {
          // Determine traveler/host roles
          // If current user is local, they
          // are the host. Target is traveler.
          const travelerId = userIsLocal
            ? targetUserId
            : user!.uid;
          const hostId = userIsLocal
            ? user!.uid
            : targetUserId;

          const { error: matchError } =
            await supabase
              .from('matches')
              .insert({
                traveler_id: travelerId,
                host_id: hostId,
                status: 'active',
              });
          if (matchError) throw matchError;
          return { matched: true };
        }
      }
      return { matched: false };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['candidates'],
      });
    },
  });
}
```

- [ ] **Step 2: Create SwipeCard component**

`src/features/discover/components/SwipeCard.tsx`:

A full-screen card component. Shows the user's avatar as background image (using `Image` from React Native), with a gradient overlay at the bottom containing name, age (calculated from `date_of_birth`), home city, and interest chips. The card is wrapped in an `Animated.View` driven by `PanGestureHandler` + Reanimated for swipe gestures.

Key implementation details:
- `PanGestureHandler` tracks horizontal drag
- `useAnimatedStyle` for rotation and translation during drag
- `runOnJS` callback when swipe threshold exceeded (±120px) to trigger `useSwipe` mutation
- Card snaps back if not past threshold
- Next card is visible behind at slightly smaller scale

- [ ] **Step 3: Build discover screen**

Update `src/app/(tabs)/discover.tsx`:

Uses `useLocation` to get current coords, passes them to `useCandidates`. Renders a stack of `SwipeCard` components. Shows "It's a Match!" overlay when `useSwipe` returns `{ matched: true }`. Shows empty state when no candidates available. Like/Pass buttons at the bottom as alternative to swiping.

- [ ] **Step 4: Add discover translations**

Create `src/features/discover/i18n/translationKeys.ts`, `locales/en.js`, `locales/el.js` with keys for: empty state message, match overlay text, button labels.

- [ ] **Step 5: Register discover translations in i18n config**

- [ ] **Step 6: Commit**

```bash
git add src/app/\(tabs\)/discover.tsx src/features/discover/
git commit -m "feat: add discover screen with swipe cards and matching"
```

---

## Task 11: Matches Screen

**Files:**
- Modify: `src/app/(tabs)/matches.tsx`
- Create: `src/features/matches/hooks/useMatches.ts`
- Create: `src/features/matches/components/MatchCard.tsx`
- Create: `src/features/matches/i18n/translationKeys.ts`
- Create: `src/features/matches/i18n/locales/en.js`
- Create: `src/features/matches/i18n/locales/el.js`

- [ ] **Step 1: Create useMatches hook**

`src/features/matches/hooks/useMatches.ts`:

```typescript
import { useQuery } from
  '@tanstack/react-query';
import { supabase } from
  '@config/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '@store';

export function useMatches() {
  const user = useSelector(
    (s: RootState) => s.auth.user,
  );

  return useQuery({
    queryKey: ['matches', user?.uid],
    queryFn: async () => {
      const { data, error } =
        await supabase
          .from('matches')
          .select(
            `
            id,
            traveler_id,
            host_id,
            created_at,
            chat_threads (
              id,
              last_message_at
            )
          `,
          )
          .or(
            `traveler_id.eq.${user!.uid},host_id.eq.${user!.uid}`,
          )
          .eq('status', 'active')
          .order('created_at', {
            ascending: false,
          });
      if (error) throw error;

      // Fetch matched user profiles
      const otherIds = (data ?? []).map(
        (m) =>
          m.traveler_id === user!.uid
            ? m.host_id
            : m.traveler_id,
      );

      const { data: profiles } =
        await supabase
          .from('profiles')
          .select(
            'user_id, display_name, avatar_url',
          )
          .in('user_id', otherIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [
          p.user_id,
          p,
        ]),
      );

      return (data ?? []).map((match) => {
        const otherId =
          match.traveler_id === user!.uid
            ? match.host_id
            : match.traveler_id;
        return {
          ...match,
          otherUser:
            profileMap.get(otherId) ?? null,
        };
      });
    },
    enabled: !!user?.uid,
  });
}
```

- [ ] **Step 2: Create MatchCard component**

`src/features/matches/components/MatchCard.tsx`:

A list item showing the matched user's avatar (circular), display name, and last message time. Pressing it navigates to `/chat/[threadId]`.

- [ ] **Step 3: Build matches screen**

Update `src/app/(tabs)/matches.tsx` to use `useMatches` hook. Render a `FlatList` of `MatchCard` components. Show empty state when no matches.

- [ ] **Step 4: Add matches translations and register in i18n**

- [ ] **Step 5: Commit**

```bash
git add src/app/\(tabs\)/matches.tsx src/features/matches/
git commit -m "feat: add matches screen with match list"
```

---

## Task 12: Chat Screen

**Files:**
- Create: `src/app/chat/_layout.tsx`
- Create: `src/app/chat/[threadId].tsx`
- Create: `src/features/chat/hooks/useChat.ts`
- Create: `src/features/chat/components/MessageBubble.tsx`
- Create: `src/features/chat/components/ChatInput.tsx`
- Create: `src/features/chat/i18n/translationKeys.ts`
- Create: `src/features/chat/i18n/locales/en.js`
- Create: `src/features/chat/i18n/locales/el.js`

- [ ] **Step 1: Create useChat hook**

`src/features/chat/hooks/useChat.ts`:

Provides:
- `useMessages(threadId)` — `useQuery` that fetches messages from `chat_messages` ordered by `created_at`. Also sets up a Supabase Realtime subscription on the `chat_messages` table filtered by `thread_id`, using `queryClient.setQueryData` to append new messages in real-time.
- `useSendMessage()` — `useMutation` that inserts a new row into `chat_messages`.

Key implementation details for realtime:
```typescript
useEffect(() => {
  const channel = supabase
    .channel(`chat:${threadId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter:
          `thread_id=eq.${threadId}`,
      },
      (payload) => {
        queryClient.setQueryData(
          ['messages', threadId],
          (old: Message[]) => [
            ...(old ?? []),
            payload.new,
          ],
        );
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [threadId]);
```

- [ ] **Step 2: Create MessageBubble component**

`src/features/chat/components/MessageBubble.tsx`:

Shows a single message. Aligned right if sent by current user, left otherwise. Uses theme colors for bubbles (primary for own, surface for theirs). Shows message text and timestamp.

- [ ] **Step 3: Create ChatInput component**

`src/features/chat/components/ChatInput.tsx`:

A `TextInput` + send `IconButton` in a row at the bottom. Calls `useSendMessage` on press. Clears input after send.

- [ ] **Step 4: Build chat screen**

`src/app/chat/[threadId].tsx`:

Uses `useLocalSearchParams` to get `threadId`. Renders messages in an inverted `FlatList` (newest at bottom). `ChatInput` at the bottom. `KeyboardAvoidingView` wrapper.

- [ ] **Step 5: Ensure chat thread creation on first message**

When navigating from matches to chat, if no `chat_thread` exists for the match yet, create one. This can be handled in the matches screen: when a match card is pressed, check if `chat_threads` exists for that match. If not, create one, then navigate to `/chat/[threadId]`.

- [ ] **Step 6: Add chat translations and register in i18n**

- [ ] **Step 7: Commit**

```bash
git add src/app/chat/ src/features/chat/
git commit -m "feat: add real-time chat with Supabase Realtime"
```

---

## Task 13: Profile Screen

**Files:**
- Modify: `src/app/(tabs)/profile.tsx`
- Create: `src/features/profile/hooks/useProfile.ts`
- Create: `src/features/profile/i18n/translationKeys.ts`
- Create: `src/features/profile/i18n/locales/en.js`
- Create: `src/features/profile/i18n/locales/el.js`

- [ ] **Step 1: Create useProfile hook**

`src/features/profile/hooks/useProfile.ts`:

```typescript
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from
  '@config/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '@store';

export function useProfile() {
  const user = useSelector(
    (s: RootState) => s.auth.user,
  );

  return useQuery({
    queryKey: ['profile', user?.uid],
    queryFn: async () => {
      const { data, error } =
        await supabase
          .from('profiles')
          .select(
            `
            *,
            user_interests (
              interest_id,
              interests ( name, icon, category )
            )
          `,
          )
          .eq('user_id', user!.uid)
          .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.uid,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const user = useSelector(
    (s: RootState) => s.auth.user,
  );

  return useMutation({
    mutationFn: async (
      updates: Record<string, unknown>,
    ) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user!.uid);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['profile'],
      });
    },
  });
}
```

- [ ] **Step 2: Build profile screen**

Update `src/app/(tabs)/profile.tsx`:

Shows the user's profile info: avatar (large circle), display name, age, home city, bio, interests as chips. Below that, action buttons:
- "Edit Profile" — navigates to an edit screen (or inline editing for MVP)
- "Change Home City" — allows updating home city
- "Logout" — uses `useLogout()` hook

For MVP, keep editing simple: inline text fields that become editable, with a save button.

- [ ] **Step 3: Add profile translations and register in i18n**

- [ ] **Step 4: Commit**

```bash
git add src/app/\(tabs\)/profile.tsx src/features/profile/
git commit -m "feat: add profile screen with view and edit"
```

---

## Task 14: Final Wiring & Cleanup

**Files:**
- Modify: `src/config/i18n/index.ts` (ensure all feature translations registered)
- Remove: `src/app/dashboard/` directory (if not already removed)
- Remove: `src/app/core/` directory (if not already removed)
- Remove: `src/shared/types/RequestStatus.ts` (no longer used after thunk migration)

- [ ] **Step 1: Verify all i18n namespaces are registered**

Ensure `src/config/i18n/index.ts` imports and merges translations from: auth, onboarding, discover, matches, chat, profile.

- [ ] **Step 2: Clean up unused files**

Remove any files that are no longer referenced: `RequestStatus.ts`, old dashboard/core routes if still present.

- [ ] **Step 3: Test the full flow**

Manually verify in the simulator:
1. Register a new account → redirected to onboarding
2. Complete all 4 onboarding steps → redirected to Discover tab
3. Tab navigation works (Discover, Matches, Profile)
4. Profile screen shows correct data
5. Logout works → redirected to login
6. Login with existing onboarded account → goes directly to Discover

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: wire up all i18n namespaces and clean up unused files"
```
