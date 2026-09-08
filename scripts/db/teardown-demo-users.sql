-- Remove every seeded demo account and everything it owns.
--
-- WHY THIS EXISTS
-- Google Play's dating policy prohibits synthetically generated profiles
-- without a clear and conspicuous disclosure. The seeded accounts are fine
-- through closed testing — a known group who are told what they are testing —
-- and they must be gone before a real user can match with one. Written as a
-- script rather than left as an intention, because "we'll clean it up before
-- launch" is not a plan.
--
-- WHAT DEFINES A SEED ACCOUNT
-- Its email ends in @test.local. Nothing else. That suffix was chosen for the
-- seeds precisely so a query like this could never touch a real address, and
-- it is the ONLY thing this script matches on — never a name, never a uuid
-- prefix, both of which have drifted before.
--
-- WHY EVERY TABLE IS LISTED BY HAND
-- Nothing in public.* has a foreign key to auth.users. Verified 2026-09-08:
-- the only FKs in the schema are chat_messages -> chat_threads,
-- chat_threads -> matches, match_reads -> matches and
-- user_interests -> interests. So deleting the auth user cascades NOTHING and
-- would leave orphaned rows in eleven tables. Delete the data first, the
-- account last.
--
-- STORAGE DOES NOT CASCADE EITHER
-- Photo files live in the user-photos bucket, keyed by the owner's uuid as the
-- first path segment. Removing the database rows leaves the files behind,
-- still stored and still billed, so storage.objects is cleared in the same
-- transaction.
--
-- HOW TO RUN
-- Read the two counts it prints BEFORE committing. Run the whole file in one
-- transaction; if the "remaining real users" count is not what you expect,
-- roll back.

begin;

-- The set, resolved once. Everything below deletes against this and only this.
create temporary table demo_uids on commit drop as
select u.id
from auth.users u
where u.email like '%@test.local';

-- Say out loud what is about to happen, and what will survive it.
do $$
declare
  v_demo bigint;
  v_real bigint;
begin
  select count(*) into v_demo from demo_uids;
  select count(*) into v_real from auth.users
    where email not like '%@test.local';
  raise notice 'deleting % seeded accounts; % real accounts will remain',
    v_demo, v_real;
  if v_real = 0 then
    raise exception 'refusing to run: this would empty the entire user table';
  end if;
end $$;

-- Conversations first: chat_messages and match_reads cascade from their
-- parents, but a message whose sender is a demo user can hang under a thread
-- between two real users, so it goes explicitly rather than by cascade.
delete from public.chat_messages
where sender_id in (select id from demo_uids);

delete from public.matches
where traveler_id in (select id from demo_uids)
   or host_id     in (select id from demo_uids);
-- chat_threads, chat_messages and match_reads follow by cascade from here.

delete from public.swipes
where swiper_id in (select id from demo_uids)
   or swiped_id in (select id from demo_uids);

delete from public.blocks
where blocker_id in (select id from demo_uids)
   or blocked_id in (select id from demo_uids);

delete from public.user_interests    where user_id in (select id from demo_uids);
delete from public.match_preferences where user_id in (select id from demo_uids);
delete from public.push_tokens       where user_id in (select id from demo_uids);
delete from public.media             where user_id in (select id from demo_uids);
delete from public.profiles          where user_id in (select id from demo_uids);

-- The photo files. Paths are owner-scoped on the first segment, which is what
-- makes this safe to match by prefix.
delete from storage.objects
where bucket_id = 'user-photos'
  and split_part(name, '/', 1) in (select id::text from demo_uids);

-- The accounts themselves, last, so a failure above leaves a set that can
-- still be resolved by the same query on a retry.
delete from auth.identities where user_id in (select id from demo_uids);
delete from auth.users      where id      in (select id from demo_uids);

-- Prove it. Anything non-zero here means a table was missed — add it above
-- rather than committing.
select
  (select count(*) from auth.users where email like '%@test.local') as seed_accounts_left,
  (select count(*) from public.profiles p
     where not exists (select 1 from auth.users u where u.id = p.user_id)) as orphan_profiles,
  (select count(*) from public.media m
     where not exists (select 1 from auth.users u where u.id = m.user_id)) as orphan_media,
  (select count(*) from auth.users) as accounts_remaining;

commit;
