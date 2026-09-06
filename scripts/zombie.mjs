#!/usr/bin/env node
// ===========================================
// Zombies — seeded users that act on their own
// ===========================================
//
// Testing a match, a push notification, an unread badge or a realtime
// message needed a SECOND PERSON holding a second phone. That is why the
// chat bugs found this week were found by a friend rather than by us: the
// only way to receive anything was for someone else to send it.
//
// A zombie is a seeded @test.local account that SIGNS IN and acts through
// the same endpoints the app calls. It is deliberately NOT service-role
// SQL: a zombie that writes rows directly would bypass handle_swipe, RLS,
// and the notify trigger — and would therefore prove nothing. Everything
// here goes through auth + PostgREST exactly as a phone does, so if a
// path is broken the zombie breaks on it too.
//
// This only became possible once seed-larissa-travelers.sql started
// inserting auth.identities; before that these accounts existed but could
// not log in.
//
// USAGE
//   node scripts/zombie.mjs like  <zombie> <target>
//   node scripts/zombie.mjs say   <zombie> <target> "message"
//   node scripts/zombie.mjs auto  <zombie> <target> [seconds]
//
//   <zombie>  a seeded account: an email, or just the local part
//             (lucas → lucas@test.local)
//   <target>  who they are acting on: an email or a uuid
//
//   like   swipe 'liked'. If the target already liked them, a match is
//          created by the real RPC and both phones get the real push.
//   say    send one chat message. Creates the thread if this is the
//          first one, same as the app does.
//   auto   poll for messages from the target and answer each one after a
//          short delay. The closest thing to a person on the other end.
//
// The fixture password is the one seed-test-users.sql has committed for
// every @test.local account. Override with ZOMBIE_PASSWORD if yours
// differ.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PASSWORD = process.env.ZOMBIE_PASSWORD ?? 'password123';
const POLL_MS = 4000;

// Read .env rather than requiring it exported: this is a dev script and
// the values are already sitting there for Expo.
const env = readFileSync(join(HERE, '..', '.env'), 'utf8');
const readEnv = name => {
  const hit = env.match(new RegExp(`^${name}=(.+)$`, 'm'));
  if (!hit) throw new Error(`${name} missing from .env`);
  return hit[1].trim();
};
const URL_BASE = readEnv('EXPO_PUBLIC_SUPABASE_URL');
const ANON = readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

const emailOf = who => (who.includes('@') ? who : `${who}@test.local`);
const isUuid = s => /^[0-9a-f-]{36}$/i.test(s);

const signIn = async who => {
  const res = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailOf(who), password: PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) {
    throw new Error(
      `sign-in failed for ${emailOf(who)}: ${
        body.error_description ?? body.msg ?? res.status
      }`,
    );
  }
  return { token: body.access_token, uid: body.user.id };
};

// Every call carries the zombie's OWN token, so RLS and auth.uid() see a
// normal signed-in user. Nothing here is privileged.
const api = (token) => async (path, init = {}) => {
  const res = await fetch(`${URL_BASE}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${path} → ${res.status} ${JSON.stringify(body)}`);
  }
  return body;
};

const resolveTarget = async (call, target) => {
  if (isUuid(target)) return target;
  // Only reachable for accounts the caller can see; a real uuid is the
  // reliable form and what the error below asks for.
  const rows = await call(
    `/profiles?select=user_id,display_name&display_name=ilike.${encodeURIComponent(target)}`,
  );
  if (rows.length !== 1) {
    throw new Error(
      `could not resolve "${target}" to one profile (${rows.length} matches). Pass the uuid.`,
    );
  }
  return rows[0].user_id;
};

// The app's own sequence: find the thread for this match, create it from
// the match's traveler/host if it does not exist yet, then insert.
const threadFor = async (call, matchId) => {
  const found = await call(
    `/chat_threads?select=id&match_id=eq.${matchId}&limit=1`,
  );
  if (found.length) return found[0].id;

  const [match] = await call(
    `/matches?select=traveler_id,host_id&id=eq.${matchId}&limit=1`,
  );
  if (!match) throw new Error('match not found or not visible');

  const [created] = await call('/chat_threads', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      match_id: matchId,
      traveler_id: match.traveler_id,
      host_id: match.host_id,
    }),
  });
  return created.id;
};

const activeMatch = async (call, zombieUid, targetUid) => {
  const rows = await call(
    `/matches?select=id,status&or=(and(traveler_id.eq.${zombieUid},host_id.eq.${targetUid}),and(traveler_id.eq.${targetUid},host_id.eq.${zombieUid}))`,
  );
  const active = rows.find(m => m.status === 'active');
  if (!active) {
    throw new Error(
      rows.length
        ? `a match exists but its status is "${rows[0].status}" — run "like" from both sides first`
        : 'no match between these two yet — run "like" first (and like them back from the app)',
    );
  }
  return active.id;
};

const send = async (call, matchId, zombieUid, body) => {
  const threadId = await threadFor(call, matchId);
  await call('/chat_messages', {
    method: 'POST',
    body: JSON.stringify({
      thread_id: threadId,
      sender_id: zombieUid,
      body,
    }),
  });
  // Mirrors the app so the Matches list orders correctly.
  await call(`/chat_threads?id=eq.${threadId}`, {
    method: 'PATCH',
    body: JSON.stringify({ last_message_at: new Date().toISOString() }),
  });
  return threadId;
};

// Canned answers. Short and obviously synthetic — these land on a real
// phone as real notifications and should never read as a real person.
const REPLIES = [
  'Καλά, εσύ;',
  'Ωραία! Πού είσαι τώρα;',
  'Α τέλεια.',
  'Ναι ρε, πάμε.',
  'Το ξέρω αυτό το μέρος.',
  'Οκ, τα λέμε.',
];

const commands = {
  async like(zombie, target) {
    const { token, uid } = await signIn(zombie);
    const call = api(token);
    const targetUid = await resolveTarget(call, target);
    const [result] = await call('/rpc/handle_swipe', {
      method: 'POST',
      body: JSON.stringify({ p_swiped_id: targetUid, p_action: 'liked' }),
    });
    console.log(
      result?.matched
        ? `${zombie} liked them back → MATCH ${result.match_id}`
        : `${zombie} liked them. No match yet — like them from the app.`,
    );
  },

  async say(zombie, target, ...words) {
    const message = words.join(' ');
    if (!message) throw new Error('nothing to say — pass a message');
    const { token, uid } = await signIn(zombie);
    const call = api(token);
    const targetUid = await resolveTarget(call, target);
    const matchId = await activeMatch(call, uid, targetUid);
    await send(call, matchId, uid, message);
    console.log(`${zombie}: ${message}`);
  },

  async auto(zombie, target, seconds = '3') {
    const delay = Number(seconds) * 1000;
    const { token, uid } = await signIn(zombie);
    const call = api(token);
    const targetUid = await resolveTarget(call, target);
    const matchId = await activeMatch(call, uid, targetUid);
    const threadId = await threadFor(call, matchId);

    // Start from now, so the zombie answers what arrives from here on
    // and does not reply to the whole backlog at once.
    let since = new Date().toISOString();
    console.log(`${zombie} is listening. Ctrl+C to stop.`);

    for (;;) {
      await new Promise(r => setTimeout(r, POLL_MS));
      const incoming = await call(
        `/chat_messages?select=body,created_at&thread_id=eq.${threadId}` +
          `&sender_id=eq.${targetUid}&created_at=gt.${since}&order=created_at.asc`,
      );
      if (!incoming.length) continue;
      since = incoming[incoming.length - 1].created_at;
      for (const m of incoming) console.log(`  them: ${m.body}`);
      await new Promise(r => setTimeout(r, delay));
      const reply = REPLIES[Math.floor(Math.random() * REPLIES.length)];
      await send(call, matchId, uid, reply);
      console.log(`${zombie}: ${reply}`);
    }
  },
};

const [command, ...args] = process.argv.slice(2);
const run = commands[command];
if (!run || args.length < 2) {
  console.error(
    [
      'usage:',
      '  node scripts/zombie.mjs like  <zombie> <target>',
      '  node scripts/zombie.mjs say   <zombie> <target> "message"',
      '  node scripts/zombie.mjs auto  <zombie> <target> [seconds]',
      '',
      'zombie: a seeded account (lucas → lucas@test.local)',
      'target: an email, a display name, or a uuid',
    ].join('\n'),
  );
  process.exit(1);
}

run(...args).catch(err => {
  console.error(err.message);
  process.exit(1);
});
