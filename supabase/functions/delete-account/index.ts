// Deletes the caller's own account, permanently.
//
// Required by Google Play for any app that lets people create an account,
// and the right thing regardless: an account you cannot leave is not an
// account, it is a trap.
//
// Runs with verify_jwt ENABLED, so the platform rejects anonymous calls
// before this code runs. The identity then comes from the caller's own
// token and NOTHING else — there is deliberately no uid parameter. A
// function that accepted "which user to delete" would be a one-request
// account-deletion weapon aimed at every user in the database, and the
// service_role key below would happily carry it out.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const PHOTO_BUCKET = 'user-photos';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// Every row that belongs to a user is ON DELETE CASCADE from auth.users
// (profiles, media, swipes, matches, chat_threads, chat_messages, blocks,
// push_tokens, match_reads, user_interests, match_preferences), so removing
// the auth user takes the whole graph with it.
//
// Storage does NOT cascade — storage.objects has no foreign key to
// auth.users. Delete the files FIRST: once the auth user is gone the paths
// are still there but nothing points at them, and an orphaned photo of a
// person who asked to be forgotten is the one thing this endpoint exists to
// prevent.
const deletePhotos = async (uid: string) => {
  const { data, error } = await admin.storage.from(PHOTO_BUCKET).list(uid);
  if (error) throw error;
  if (!data?.length) return 0;

  const paths = data.map(f => `${uid}/${f.name}`);
  const { error: removeError } = await admin.storage
    .from(PHOTO_BUCKET)
    .remove(paths);
  if (removeError) throw removeError;
  return paths.length;
};

Deno.serve(async req => {
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  const authorization = req.headers.get('Authorization');
  if (!authorization) {
    return json(401, { error: 'missing_authorization' });
  }

  // Resolve the caller with the ANON key plus their own token, never with
  // service_role: this client must be exactly as privileged as the user is,
  // so a revoked or expired token resolves to nobody.
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
  });

  const { data: userData, error: userError } = await caller.auth.getUser();
  const uid = userData?.user?.id;
  if (userError || !uid) {
    return json(401, { error: 'invalid_token' });
  }

  try {
    const photosRemoved = await deletePhotos(uid);

    const { error: deleteError } = await admin.auth.admin.deleteUser(uid);
    if (deleteError) throw deleteError;

    console.log('deleted account', { uid, photosRemoved });
    return json(200, { deleted: true, photosRemoved });
  } catch (e) {
    // The photos may already be gone while the user remains, which is
    // recoverable — the client can simply ask again. Say so plainly rather
    // than reporting a success the user would rely on.
    console.error('delete-account failed', { uid, error: String(e) });
    return json(500, { error: 'delete_failed' });
  }
});
