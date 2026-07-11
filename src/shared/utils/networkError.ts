import { isAuthRetryableFetchError } from '@supabase/supabase-js';

// ─── "You're offline" vs "something went wrong" ──────────────────────
//
// V10. Every failure in the app used to render the same sentence, and
// half of those sentences asserted "check your connection" — a lie on a
// 500, and the exact class of guess-from-nothing bug this hardening pass
// exists to kill.
//
// The classification is STRUCTURED-ONLY. We never look at error message
// text: prose is not an API contract (that was W12), and Supabase/RN can
// reword a message in any patch release.
//
// Four structured signals, in order:
//
//   1. isAuthRetryableFetchError() — auth-js's OWN predicate for
//      "transport failed, the session says nothing". Covers offline,
//      DNS, dead sockets, our 15s abort (auth-js re-wraps it) and
//      502/503/504. Re-exported by @supabase/supabase-js.
//
//   2. `code === NETWORK_ERROR_CODE` — our transport stamp. postgrest-js
//      does NOT rethrow a fetch rejection: it CATCHES it and hands back
//      `{ error: { message, details, hint, code }, status: 0 }`, and the
//      query fns throw that plain object. The class is gone by then, so
//      the only structured field that survives is `code` — which
//      postgrest copies verbatim off the rejected error. So we stamp the
//      rejection at the transport boundary (see @config/supabase) and
//      read the stamp back here.
//
//   3. `name === 'AbortError' | 'TimeoutError'` — our 15s timeout abort,
//      for any path where it escapes unwrapped. `name` is a field, not
//      prose.
//
//   4. `instanceof TypeError` — what RN's fetch rejects with when a
//      request never reaches the server ("Network request failed"). We
//      match the CLASS; the message is never read.
//
// Anything unrecognised is NOT a network error — it degrades to the
// generic message. A wrong "you're offline" is worse than a vague
// "something went wrong".

export const NETWORK_ERROR_CODE = 'LOCALUP_NETWORK';

// Stamped onto every fetch rejection by @config/supabase's fetch
// wrapper, so `code` survives postgrest-js flattening the error.
export class NetworkError extends Error {
  readonly code = NETWORK_ERROR_CODE;
  readonly cause: unknown;

  constructor(cause: unknown) {
    const original = cause as { name?: unknown; message?: unknown } | null;
    super(typeof original?.message === 'string' ? original.message : 'network');
    // Preserve an abort so callers that only look at `name` (auth-js,
    // useAuth's taxonomy) keep classifying it exactly as they did.
    this.name =
      original?.name === 'AbortError' || original?.name === 'TimeoutError'
        ? original.name
        : 'NetworkError';
    this.cause = cause;
  }
}

export const toNetworkError = (cause: unknown): NetworkError =>
  cause instanceof NetworkError ? cause : new NetworkError(cause);

// `depth` guards against a self-referential `originalError` chain
// (storage-js nests the cause there).
export const isNetworkError = (error: unknown, depth = 0): boolean => {
  if (error == null || depth > 3) return false;

  if (isAuthRetryableFetchError(error)) return true;
  if (error instanceof TypeError) return true;

  if (typeof error !== 'object') return false;

  const { code, name, originalError } = error as {
    code?: unknown;
    name?: unknown;
    originalError?: unknown;
  };

  if (code === NETWORK_ERROR_CODE) return true;
  if (name === 'AbortError' || name === 'TimeoutError') return true;

  // storage-js wraps a transport failure in StorageUnknownError and
  // keeps the cause under `originalError`.
  if (originalError != null) {
    return isNetworkError(originalError, depth + 1);
  }

  return false;
};
