# Supabase Project Setup

This document captures the backend artefacts LocalUp needs so the mobile app can persist real user data (profiles, interests, media, matching, chat) instead of leaving everything in Redux. Use it when you provision the Supabase project or adjust the schema.

---

## 1. Project Provisioning

1. Create a Supabase project (Organization → New project).
2. Region: choose close to primary user base (EU for thesis).
3. Note `Project URL` and `anon` + `service_role` keys – add the anon key to `EXPO_PUBLIC_SUPABASE_ANON_KEY` and the URL to `EXPO_PUBLIC_SUPABASE_URL`. Keep `service_role` for server-side scripts only.
4. In Authentication → Settings:
   - Enable email confirmations (default).
   - Under Email Templates, customise the “Confirm signup” template copy for LocalUp branding.
   - Under Policies, disable phone signups (not used yet).

5. In Authentication → Providers ensure only Email is enabled for MVP; leave social providers for later.

---

## 2. Database Schema

Run migrations manually in the SQL editor or via a migration file (recommended long-term). Table overview:

### profiles
Stores app-specific profile data (one row per auth user).

```sql
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  home_city text,
  languages text[] default '{}',
  bio text,
  avatar_url text,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

`updated_at` should be maintained via trigger:

```sql
create extension if not exists moddatetime schema extensions;

create trigger set_timestamp
  before update on public.profiles
  for each row
  execute procedure moddatetime(updated_at);
```

### interests (static seed)

```sql
create table public.interests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  icon text,              -- optional (emoji or asset id)
  is_active boolean default true,
  created_at timestamptz default now()
);
```

Seed data via SQL or the Dashboard once (e.g. Street Food, Live Music, Hidden Bars, etc.).

### user_interests

```sql
create table public.user_interests (
  user_id uuid references auth.users(id) on delete cascade,
  interest_id uuid references public.interests(id) on delete cascade,
  weight numeric default 1.0,         -- preference weight for matching
  selected_at timestamptz default now(),
  primary key (user_id, interest_id)
);
```

### media
Track uploaded assets (avatars, interest photos). Supabase Storage holds the binaries; table keeps metadata.

```sql
create table public.media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,                 -- 'avatar', 'interest_photo', etc.
  storage_path text not null,
  caption text,
  is_primary boolean default false,
  created_at timestamptz default now()
);
```

### match_preferences

```sql
create table public.match_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  max_distance_km numeric default 10,
  traveler_style text[],              -- e.g. ['foodie', 'history']
  host_style text[],                  -- e.g. ['guided', 'hangout']
  preferred_languages text[],
  availability text[],                -- e.g. ['weekday_evenings']
  updated_at timestamptz default now()
);
```

### match_queue
Records swipe decisions and pending matches.

```sql
create table public.match_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete cascade,
  status text not null,               -- 'pending', 'liked', 'passed', 'matched'
  match_score numeric,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);
create index on public.match_queue (user_id, status);
```

### matches

```sql
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  traveler_id uuid references auth.users(id) on delete cascade,
  host_id uuid references auth.users(id) on delete cascade,
  status text default 'active',       -- 'active', 'archived', 'reported'
  match_score numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### chat_threads & chat_messages

```sql
create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  traveler_id uuid references auth.users(id) on delete cascade,
  host_id uuid references auth.users(id) on delete cascade,
  last_message_at timestamptz,
  traveler_unread_count int default 0,
  host_unread_count int default 0,
  created_at timestamptz default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.chat_threads(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete cascade,
  body text,
  attachment_url text,
  created_at timestamptz default now()
);
create index on public.chat_messages (thread_id, created_at);
```

### optional supporting tables
- `languages`, `user_languages` if you want normalized language data.
- `analytics_events` for thesis telemetry (event_type, payload JSONB).
- `reports` / `moderation_flags` to track problematic matches or content.

---

## 3. Storage Buckets

Create buckets via Dashboard → Storage:

1. `avatars`
   - Public: false (private by default).
   - RLS: user can read/write their own images; generate signed URLs for display.

2. `interest-photos`
   - Public depends on UX; if locals share public interest photos, set read to public, write restricted via policies.

3. Optional: `chat-media` for images sent in chat threads.

---

## 4. Row Level Security (RLS)

Enable RLS on each table and create policies. Examples:

```sql
alter table public.profiles enable row level security;

create policy \"Profiles are viewable by owner\" on public.profiles
  for select using (auth.uid() = user_id);

create policy \"Profiles are editable by owner\" on public.profiles
  for all using (auth.uid() = user_id);
```

For `user_interests`, allow select/insert/delete where `auth.uid() = user_id`. For `matches` / `chat_*`, restrict to participants (traveler_id or host_id). Run similar policies for media rows and leverage Storage policies to ensure uploads belong to the authenticated UID.

---

## 5. Node Notification Service

To demonstrate a backend service layer alongside Supabase (per thesis plan), introduce a lightweight Node.js service dedicated to push notifications:

- **Responsibilities**
  - Receive chat message or match events (via Supabase Realtime webhook, Edge Function, or scheduled polling).
  - Look up recipient Expo push tokens (store in `profiles` or a `user_devices` table).
  - Send notifications through Expo Push API.
  - Log outcomes to `analytics_events` / `notification_log`.

- **Suggested structure**
  ```
  node-service/
  ├─ src/
  │  ├─ index.ts (Express/Fastify setup)
  │  ├─ routes/notifications.ts
  │  ├─ services/supabaseClient.ts   // uses service role key
  │  ├─ services/expoPush.ts
  │  ├─ workers/chatNotificationWorker.ts
  │  └─ env.ts
  ├─ package.json
  ├─ tsconfig.json
  └─ .env (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EXPO_ACCESS_TOKEN)
  ```

- **Event flow**
  1. Supabase edge function or webhook transmits chat message payload to Node endpoint.
  2. Node validates payload, fetches recipient push token, sends notification via Expo.
  3. Node inserts a record into `analytics_events` (or dedicated `notification_log`) for telemetry.

- **Environment variables**
  ```
  SUPABASE_URL=https://<project>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=<service role>
  EXPO_ACCESS_TOKEN=<Expo push token>
  ```

Deploy on Render/Fly/Heroku (or locally during dev). Keep the service role key server-side only.

---

## 6. Edge Functions / RPC (future)

Potential functions once core schema is stable:

- `match_candidates(user_id uuid)` → returns next set of locals/travelers based on interest overlap and distance.
- `upsert_profile(user_json)` to encapsulate profile updates.
- `log_event(event_name text, payload jsonb)` to capture thesis metrics.

Store the SQL under `supabase/functions` or use edge functions (TypeScript) if more complex logic is needed.

---

## 7. Environment Variables

Expose anon key + URL to Expo:

```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

If you build a Node service later, keep `SUPABASE_SERVICE_ROLE_KEY` in server env only.

---

## 7. Next Steps

- Seed `interests` with thesis categories (food, nightlife, hidden gems, art, etc.).
- Implement `fetchProfile` thunk on login to load `profiles`, `user_interests`, and `match_preferences`.
- Create upload utilities that write to Storage then insert rows into `media`.
- Add UI flows to update profile → call Supabase. Use optimistic updates in Redux but always persist.

Keep this doc updated when schema evolves (e.g., events, monetization).***
