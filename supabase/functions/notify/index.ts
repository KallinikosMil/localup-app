// Turns a database event into a push notification.
//
// Wired as a Supabase Database Webhook on INSERT into public.chat_messages
// and public.matches. It runs with the service_role key, so every read
// below bypasses RLS — which is exactly why it must decide for itself who
// is allowed to learn what. It sends only to the other participant of an
// ACTIVE match, and never echoes anything back to the sender.
//
// Deployed with verify_jwt disabled: a webhook carries no user session.
// Authorisation is a shared secret that lives in Vault and is sent by the
// trigger as x-webhook-secret. Deliberately NOT the service_role key —
// that key opens the entire database, and the ability to say "a message
// was inserted" should not be the same privilege as the ability to read
// every row in it. Rotating one must not force rotating the other.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Record<string, unknown> | null;
};

type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: { matchId: string };
  sound: 'default';
  channelId: 'default';
};

// Fetched once per cold start rather than per request — it changes only
// when someone rotates it, and a round trip to Postgres on every message
// would be paid by the sender.
let cachedSecret: string | null = null;
const webhookSecret = async () => {
  if (cachedSecret) return cachedSecret;
  const { data, error } = await admin.rpc('notify_webhook_secret');
  if (error || !data) {
    console.error('could not read webhook secret', error?.message);
    return null;
  }
  cachedSecret = data as string;
  return cachedSecret;
};

// Compares in constant time. The header is attacker-controlled, and a
// plain === leaks how many leading characters were right through timing.
const secretMatches = (given: string | null, expected: string) => {
  if (!given || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// A message body is arbitrary user text arriving on someone's lock screen.
// Trim it so a wall of text cannot push the rest of the notification out of
// view, and collapse newlines so it stays one line.
const preview = (text: string | null) => {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!flat) return 'Sent a photo';
  return flat.length > 120 ? `${flat.slice(0, 119)}…` : flat;
};

const tokensFor = async (userId: string) => {
  const { data, error } = await admin
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId);
  if (error) {
    console.error('token lookup failed', error.message);
    return [];
  }
  return (data ?? []).map(r => r.token as string);
};

const nameOf = async (userId: string) => {
  const { data } = await admin
    .from('profiles')
    .select('display_name')
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.display_name as string) ?? 'Someone';
};

// Expo accepts up to 100 messages per request and answers per-message, so
// one bad token does not sink the batch.
const send = async (messages: PushMessage[]) => {
  if (messages.length === 0) return { sent: 0 };
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(messages),
  });
  const body = await res.json().catch(() => null);

  // A token dies when the app is uninstalled. Expo tells us so explicitly;
  // dropping the row keeps us from retrying it forever.
  const tickets: Array<{ status: string; details?: { error?: string } }> =
    body?.data ?? [];
  const dead = messages
    .filter(
      (_, i) => tickets[i]?.details?.error === 'DeviceNotRegistered',
    )
    .map(m => m.to);
  if (dead.length > 0) {
    await admin.from('push_tokens').delete().in('token', dead);
    console.log('pruned dead tokens', dead.length);
  }

  return { sent: messages.length, response: body };
};

const onNewMessage = async (record: Record<string, unknown>) => {
  const threadId = record.thread_id as string | null;
  const senderId = record.sender_id as string | null;
  if (!threadId || !senderId) return json({ skipped: 'incomplete row' });

  const { data: thread } = await admin
    .from('chat_threads')
    .select('match_id, traveler_id, host_id')
    .eq('id', threadId)
    .maybeSingle();
  if (!thread) return json({ skipped: 'no thread' });

  const recipient =
    thread.traveler_id === senderId ? thread.host_id : thread.traveler_id;
  if (!recipient) return json({ skipped: 'no recipient' });

  // An unmatched or blocked pair must go silent. The match row is the
  // authority on that, not the thread, which outlives the match.
  const { data: match } = await admin
    .from('matches')
    .select('status')
    .eq('id', thread.match_id)
    .maybeSingle();
  if (match?.status !== 'active') return json({ skipped: 'match not active' });

  const tokens = await tokensFor(recipient);
  if (tokens.length === 0) return json({ skipped: 'no devices' });

  const senderName = await nameOf(senderId);

  return json(
    await send(
      tokens.map(token => ({
        to: token,
        title: senderName,
        body: preview(record.body as string | null),
        data: { matchId: thread.match_id as string },
        sound: 'default',
        channelId: 'default',
      })),
    ),
  );
};

const onNewMatch = async (record: Record<string, unknown>) => {
  const travelerId = record.traveler_id as string;
  const hostId = record.host_id as string;
  if (!travelerId || !hostId) return json({ skipped: 'incomplete row' });
  if (record.status !== 'active') return json({ skipped: 'not active' });

  const matchId = record.id as string;
  const messages: PushMessage[] = [];

  // Both sides hear about it, and each is told the OTHER person's name.
  for (const [me, them] of [
    [travelerId, hostId],
    [hostId, travelerId],
  ]) {
    const [tokens, theirName] = await Promise.all([
      tokensFor(me),
      nameOf(them),
    ]);
    for (const token of tokens) {
      messages.push({
        to: token,
        title: "It's a match!",
        body: `You and ${theirName} liked each other`,
        data: { matchId },
        sound: 'default',
        channelId: 'default',
      });
    }
  }

  return json(await send(messages));
};

Deno.serve(async req => {
  const expected = await webhookSecret();
  if (!expected) return json({ error: 'misconfigured' }, 500);
  if (!secretMatches(req.headers.get('x-webhook-secret'), expected)) {
    return json({ error: 'unauthorized' }, 401);
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'bad payload' }, 400);
  }

  if (payload.type !== 'INSERT' || !payload.record) {
    return json({ skipped: 'not an insert' });
  }

  try {
    if (payload.table === 'chat_messages') {
      return await onNewMessage(payload.record);
    }
    if (payload.table === 'matches') {
      return await onNewMatch(payload.record);
    }
    return json({ skipped: `unhandled table ${payload.table}` });
  } catch (e) {
    // Never 500 back at the database. A webhook failure must not become a
    // failed INSERT — the message was already sent, the notification is
    // the best-effort part.
    console.error('notify failed', (e as Error).message);
    return json({ error: 'handled' }, 200);
  }
});
