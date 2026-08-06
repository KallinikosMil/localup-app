import { isAuthRetryableFetchError } from '@supabase/supabase-js';

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
