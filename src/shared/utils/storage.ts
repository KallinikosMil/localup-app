import { supabase } from '@config/supabase';

// The ONE bucket this project has. `avatars`, `interest-photos` and
// `chat-media` were documented for a long time and never existed —
// onboarding uploaded to `avatars` and failed for every real user until
// that was found. The name lived as a string literal in five places; a
// sixth was about to be added, so it lives here now and nowhere else.
export const PHOTO_BUCKET = 'user-photos';

// `getPublicUrl` is a pure string concat against the project URL — no
// network, no expiry. Signed URLs must NOT be persisted anywhere (they
// go stale); public URLs are safe to hold in a cache or a query result.
export const publicPhotoUrl = (storagePath: string) =>
  supabase.storage.from(PHOTO_BUCKET).getPublicUrl(storagePath).data.publicUrl;

// Paths come back from `discover_candidates` as an ordered array
// (`photo_paths`, position order). Kept separate from the single-path
// helper so callers read as what they are: a deck maps a list, a profile
// row maps one.
export const publicPhotoUrls = (storagePaths: string[] | null | undefined) =>
  (storagePaths ?? []).map(publicPhotoUrl);
