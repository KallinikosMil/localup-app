# LocalUp

> **🚧 Work in progress.** LocalUp is an actively-developed MVP built as a
> university thesis project. Core flows work end-to-end, but the app is not
> feature-complete and the UI is still being polished.

**LocalUp connects travelers with locals in the same city.** Not a dating app —
think "Bumble meets Airbnb's editorial style": clean, curated, trust-oriented.
It's about meeting real people in a place, not hookups.

## The core idea

Every user has two locations: a **home base** (where they live) and a **current
location** (where they are right now). From these, the app derives your **mode**:

- **LOCAL** — you're near your home base.
- **TRAVELER** — you're more than ~50 km from home.

The whole product in one sentence: **you only see people in the opposite mode
near you.** A traveler in Athens sees locals in Athens; a local in Athens sees
travelers currently passing through. That opposite-mode pairing is the core
invariant — it's what makes *"I want to meet locals when I travel"* and *"I want
to meet interesting travelers in my city"* the same product.

## Demo

🎥 *A full walkthrough video and screenshots are coming once the UI polish pass
is done.* In the meantime, the sections below describe what the app does and how
it's built.

## What you can do today

- **Sign up & build a profile** — name, bio, photos, interests, languages, date
  of birth.
- **Get placed automatically** — the app reads your location and assigns your
  mode (local vs. traveler).
- **Discover** — swipe through a deck of opposite-mode people near you. Each card
  shows their mode badge, home city, bio, and shared interests.
- **Match** — a mutual like creates a match.
- **Chat** — matched users get a thread to coordinate meeting up.

Candidates are ranked server-side by a quality score combining shared interests,
distance, activity recency, and language overlap. You can filter by distance and
age range — mode is never a filter, opposite-mode is fixed.

## Tech stack

| Layer      | Choice |
|------------|--------|
| App        | React Native + [Expo](https://expo.dev) SDK 54 (New Architecture) |
| Navigation | [Expo Router](https://docs.expo.dev/router/introduction/) (file-based) |
| State      | Redux Toolkit + [TanStack Query](https://tanstack.com/query) |
| UI         | React Native Paper |
| Backend    | [Supabase](https://supabase.com) — Postgres, Auth, Storage, Realtime |
| Logic      | Postgres RPCs (`SECURITY DEFINER`/`INVOKER`) + Row-Level Security |
| i18n       | i18next (English + Greek) |

Sensitive/multi-step operations (mutual-match resolution, onboarding, the matches
overview) run as **Postgres functions**, so they're atomic and enforced at the
database layer rather than composed on the client.

## Project structure

```
src/
  app/          # Expo Router routes (auth, tabs, chat, onboarding)
  features/     # feature modules (matches, chat, discover…) — slices + hooks + i18n
  shared/       # shared components & hooks
  providers/    # AppProviders (Redux → Theme → Paper → SafeArea → AppGuard)
  theme/        # colors, spacing, Paper themes
  config/       # Supabase client, i18n
```

## Roadmap

- [ ] Profile photo gallery (3-photo minimum) + profile edit rebuild
- [ ] Discovery filters UI (distance / age)
- [ ] Unread message badges
- [ ] Push notifications (Expo Push, server-side)
- [ ] Design polish pass across all screens

## Status & scope

This is a thesis MVP: auth, profiles, location-based discovery with a swipe deck,
opposite-mode filtering, mutual matching, and chat all work — matching has been
verified end-to-end between two real devices. It is **not** production-hardened.

## License

Built for academic purposes. No license is granted for commercial use at this time.
