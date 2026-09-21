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
//
// The session deliberately outlives its access token. Supabase expires one
// after an hour, and `auto` is meant to sit there all afternoon: the first
// version died mid-conversation on PGRST303 "JWT expired" after five
// perfectly good replies, which reads as a crash and is really a clock.
// Signing in again is enough for a dev script — the fixture password is
// right here, and refresh-token rotation would only be more to get wrong.
const openSession = async who => {
  let { token, uid } = await signIn(who);

  const call = async (path, init = {}, mayRetry = true) => {
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
    if (res.status === 401 && mayRetry) {
      ({ token } = await signIn(who));
      return call(path, init, false);
    }
    if (!res.ok) {
      throw new Error(`${path} → ${res.status} ${JSON.stringify(body)}`);
    }
    return body;
  };

  return { call, uid };
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

// The horde talks in Greek internet memes, on purpose: a tester who gets
// "ΑΛΛΑ ΑΥΤΟΙ ΕΙΣΤΕ" back at midnight knows exactly what they are talking
// to. Openers go out when a match has no messages yet; replies answer
// anything unread. Both are short and obviously synthetic.
const OPENERS = [
  'Γεια! Ήμουν κι εγώ ταξιδιώτης σαν εσένα. Μετά έφαγα ένα βέλος στο γόνατο.',
  'Καλά κρασιά. Πάμε για καφέ;',
  'Λέμε τώρα. Πού είσαι;',
  'Τα λεφτά υπάρχουν. Κερνάω εγώ. (Δεν υπάρχουν.)',
  'Γεια σου. Τι ώρα ανοίγει η θάλασσα εδώ;',
  'Καλησπέρα. Είμαι ζόμπι της πτυχιακής. Μη φοβάσαι, δεν δαγκώνω. Πολύ.',
  'Εσύ που είσαι νέο παιδί, πες μου πού πάνε οι ντόπιοι.',
  'Πάμε πλατεία;',
];
const REPLIES_MEME = [
  'ΑΛΛΑ ΑΥΤΟΙ ΕΙΣΤΕ.',
  'Καλά κρασιά.',
  'Λέμε τώρα.',
  'Έφαγα ένα βέλος στο γόνατο και δεν μπορώ να έρθω. Αλλά θέλω.',
  'Τα λεφτά υπάρχουν.',
  'Δεν είμαι καλά.',
  'Κάτσε να δεις τι θα γίνει.',
  'Εντάξει μωρέ, πάρε ένα έλα.',
  'Ξέρεις εσύ.',
  'Πουλάς και το κρύβεις;',
  'Καφές, τσιγάρο και καλή παρέα. Το τσιγάρο το έκοψα.',
  'Ναι ρε, πάμε. Πού;',
  'Το ξέρω αυτό το μέρος. Έχει το καλύτερο τίποτα.',
  'Είμαι ζόμπι, μην περιμένεις και πολλά.',
  'Ό,τι πεις. Σοβαρά, ό,τι πεις, είμαι script.',
  'Τι ώρα ανοίγει η θάλασσα;',
  'Στείλε τοποθεσία. Πλάκα κάνω, δεν βλέπω τοποθεσίες, μόνο χιλιόμετρα.',
  'Καλά, εσύ;',
];
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// Everyone the horde should animate: the z.* seeds plus any other
// @test.local account you name in ZOMBIES (comma-separated).
const listZombies = async () => {
  const anon = { call: async path => {
    const res = await fetch(`${URL_BASE}/rest/v1${path}`, { headers: { apikey: ANON } });
    return res.json();
  } };
  const extra = (process.env.ZOMBIES ?? '').split(',').map(s => s.trim()).filter(Boolean);
  // Profiles are readable by the anon role only when signed in, so the
  // z.* list is static: it is the seed file's roster.
  const seeded = [
    'thanos','fotini','babis','kyriaki','lefteris','despina',
    'pantelis','roula','makis','eirini','stelios','vaso',
    'thodoris','katerina','mitsos','anthi','kostis','lena',
    'manolis','argyro','sifis','marina','aris','chara',
    'jukka','aino','pekka','myrto','vangelis','ioanna',
    'stavros','eleni','giannis','niki','petros','elpida',
  ].map(n => `z.${n}@test.local`);
  void anon;
  return [...seeded, ...extra];
};

// One pass for one zombie: like the deck, open silent matches, answer
// unread. Returns what it did so the loop can log a summary line.
// Seed accounts recognise each other by uuid prefix. A zombie that liked
// another zombie would match it, open a conversation, and the two would
// answer each other on every poll until the heat death of the universe.
// The horde exists for real testers only.
const isSeed = uid => /^(aaaaaaaa|bbbbbbbb|dddddddd|eeeeeeee)-/.test(uid);

const animate = async (session, who, delayMs) => {
  const { call, uid } = session;
  const did = { liked: 0, opened: 0, replied: 0 };

  // Like everyone currently in the deck, so a tester who likes this
  // zombie matches on the spot. handle_swipe is idempotent per pair.
  const deck = await call('/rpc/discover_candidates', {
    method: 'POST', body: JSON.stringify({ p_limit: 20 }),
  });
  for (const c of deck) {
    if (isSeed(c.user_id)) continue;
    await call('/rpc/handle_swipe', {
      method: 'POST',
      body: JSON.stringify({ p_swiped_id: c.user_id, p_action: 'liked' }),
    });
    did.liked++;
  }

  const overview = await call('/rpc/get_matches_overview', { method: 'POST', body: '{}' });
  for (const m of overview) {
    if (isSeed(m.user_id)) continue;
    if (m.last_message == null) {
      // A fresh match nobody has spoken in: the zombie goes first, once.
      await new Promise(r => setTimeout(r, delayMs));
      await send(call, m.id, uid, pick(OPENERS));
      did.opened++;
      continue;
    }
    if ((m.unread_count ?? 0) > 0) {
      await new Promise(r => setTimeout(r, delayMs));
      await send(call, m.id, uid, pick(REPLIES_MEME));
      // Mark read the way the app does, so the next pass does not answer
      // the same message again.
      await call('/match_reads?on_conflict=match_id,user_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ match_id: m.id, user_id: uid, last_read_at: new Date().toISOString() }),
      });
      did.replied++;
    }
  }
  return did;
};

const commands = {
  async like(zombie, target) {
    const { call } = await openSession(zombie);
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
    const { call, uid } = await openSession(zombie);
    const targetUid = await resolveTarget(call, target);
    const matchId = await activeMatch(call, uid, targetUid);
    await send(call, matchId, uid, message);
    console.log(`${zombie}: ${message}`);
  },

  async auto(zombie, target, seconds = '3') {
    const delay = Number(seconds) * 1000;
    const { call, uid } = await openSession(zombie);
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
          `&sender_id=eq.${targetUid}` +
          // encodeURIComponent, and it is load-bearing. Postgres hands
          // back timestamps as 2026-09-08T16:15:33.18828+00:00, and a
          // bare '+' in a query string decodes to a SPACE — so the
          // server received "…18828 00:00" and answered 22007, invalid
          // input syntax for timestamptz. The very first reply worked
          // because `since` was still a Z-suffixed ISO string from
          // new Date(); it only broke on the second poll, once `since`
          // came from the database.
          `&created_at=gt.${encodeURIComponent(since)}` +
          `&order=created_at.asc`,
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

  // The whole roster at once. `--once` does a single pass (for a cron);
  // otherwise it loops until Ctrl+C. Second arg: seconds before answering.
  async horde(mode = 'loop', seconds = '4') {
    const once = mode === '--once';
    const delayMs = Number(seconds) * 1000;
    const roster = await listZombies();
    const sessions = [];
    for (const who of roster) {
      try { sessions.push([who, await openSession(who)]); }
      catch (e) { console.error(`skip ${who}: ${e.message}`); }
    }
    console.log(`horde: ${sessions.length} zombies${once ? ', one pass' : ' listening. Ctrl+C to stop.'}`);
    for (;;) {
      for (const [who, session] of sessions) {
        try {
          const d = await animate(session, who, delayMs);
          if (d.opened || d.replied) console.log(`${who.replace('@test.local', '')}: opened ${d.opened}, replied ${d.replied}`);
        } catch (e) {
          console.error(`${who}: ${e.message}`);
        }
      }
      if (once) return;
      await new Promise(r => setTimeout(r, POLL_MS * 4));
    }
  },
};

const [command, ...args] = process.argv.slice(2);
const run = commands[command];
if (!run || (command !== 'horde' && args.length < 2)) {
  console.error(
    [
      'usage:',
      '  node scripts/zombie.mjs like  <zombie> <target>',
      '  node scripts/zombie.mjs say   <zombie> <target> "message"',
      '  node scripts/zombie.mjs auto  <zombie> <target> [seconds]',
      '  node scripts/zombie.mjs horde [--once] [seconds]   (all z.* zombies)',
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
