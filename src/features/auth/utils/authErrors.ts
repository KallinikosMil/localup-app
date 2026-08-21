import {
  isAuthApiError,
  isAuthRetryableFetchError,
  isAuthWeakPasswordError,
} from '@supabase/supabase-js';

import { Translations } from '@features/auth/i18n/translationKeys';

// Turning whatever the auth provider threw into one of OUR codes, and then
// into a translation key. Pure classification — no client, no React — so it
// lives here rather than in the hooks file, where it could not be tested
// without dragging in Supabase and react-query.
//
// This is the guarantee that no raw provider prose ("Invalid login
// credentials") ever reaches a user: every screen renders t(authErrorKey(err)),
// never err.message.

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'invalid_credentials',
  EMAIL_NOT_CONFIRMED = 'email_not_confirmed',
  EMAIL_TAKEN = 'email_taken',
  WEAK_PASSWORD = 'weak_password',
  RATE_LIMITED = 'rate_limited',
  INVALID_EMAIL = 'invalid_email',
  NETWORK = 'network',
  // "The sign-up MAY have worked — we cannot tell." See classifySignUp.
  SIGNUP_UNVERIFIABLE = 'signup_unverifiable',
  UNKNOWN = 'unknown',
}

export class AuthFailure extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode) {
    super(code);
    this.name = 'AuthFailure';
    this.code = code;
  }
}

// Supabase's documented error codes
// (supabase.com/docs/guides/auth/debugging/error-codes). Anything not
// listed falls through to UNKNOWN and the generic message — a new or
// renamed code degrades to "something went wrong", never to a wrong
// claim.
const API_CODE_MAP: Record<string, AuthErrorCode> = {
  invalid_credentials: AuthErrorCode.INVALID_CREDENTIALS,
  email_not_confirmed: AuthErrorCode.EMAIL_NOT_CONFIRMED,
  user_already_exists: AuthErrorCode.EMAIL_TAKEN,
  email_exists: AuthErrorCode.EMAIL_TAKEN,
  weak_password: AuthErrorCode.WEAK_PASSWORD,
  over_request_rate_limit: AuthErrorCode.RATE_LIMITED,
  over_email_send_rate_limit: AuthErrorCode.RATE_LIMITED,
};

export const classifyError = (err: unknown): AuthErrorCode => {
  if (err instanceof AuthFailure) return err.code;

  // Network / timeout / abort — including our global 15s fetch timeout,
  // which auth-js wraps in AuthRetryableFetchError.
  if (isAuthRetryableFetchError(err)) return AuthErrorCode.NETWORK;
  if (isAuthWeakPasswordError(err)) return AuthErrorCode.WEAK_PASSWORD;

  if (isAuthApiError(err)) {
    const mapped = err.code ? API_CODE_MAP[err.code] : undefined;
    if (mapped) return mapped;
    if (err.status === 429) return AuthErrorCode.RATE_LIMITED;
  }

  if (
    err instanceof Error &&
    (err.name === 'AbortError' || err.name === 'TimeoutError')
  ) {
    return AuthErrorCode.NETWORK;
  }

  return AuthErrorCode.UNKNOWN;
};

const MESSAGE_BY_CODE: Record<AuthErrorCode, Translations> = {
  [AuthErrorCode.INVALID_CREDENTIALS]:
    Translations.AUTH_ERROR_INVALID_CREDENTIALS,
  [AuthErrorCode.EMAIL_NOT_CONFIRMED]:
    Translations.AUTH_ERROR_EMAIL_NOT_CONFIRMED,
  [AuthErrorCode.EMAIL_TAKEN]: Translations.AUTH_ERROR_EMAIL_TAKEN,
  [AuthErrorCode.WEAK_PASSWORD]: Translations.AUTH_ERROR_WEAK_PASSWORD,
  [AuthErrorCode.RATE_LIMITED]: Translations.AUTH_ERROR_RATE_LIMITED,
  [AuthErrorCode.INVALID_EMAIL]: Translations.AUTH_ERROR_INVALID_EMAIL,
  [AuthErrorCode.NETWORK]: Translations.AUTH_ERROR_NETWORK,
  [AuthErrorCode.SIGNUP_UNVERIFIABLE]:
    Translations.AUTH_ERROR_SIGNUP_UNVERIFIABLE,
  [AuthErrorCode.UNKNOWN]: Translations.AUTH_ERROR_FALLBACK,
};

// What the screens call: any thrown auth error → a translation key.
export const authErrorKey = (err: unknown): Translations =>
  MESSAGE_BY_CODE[classifyError(err)];

// ─── Sign-up outcome ─────────────────────────────────────────────────
//
// With email-enumeration protection on (the default), a signUp for an
// address that ALREADY EXISTS returns HTTP 200 with a fabricated user
// whose `identities` array is empty — there is no error to check. That
// empty array is an artifact of the obfuscation, NOT an API contract:
// nothing in the docs promises it, and if it ever changes shape the old
// code (`Array.isArray(identities) && identities.length === 0`) would
// silently fall through to SUCCESS and tell a duplicate registrant to go
// wait for a confirmation mail that is never coming.
//
// So the signal is treated as three-valued, and the un-decidable case is
// NOT success:
//   session present            → created  (a fabricated user never gets
//                                          a session)
//   identities: [] (an array)  → duplicate
//   anything else              → unverifiable → we throw and tell the
//                                user to try logging in. Worst case they
//                                see one honest "we're not sure" instead
//                                of one confident lie.
export type SignUpOutcome = 'created' | 'duplicate' | 'unverifiable';

export const classifySignUp = (data: unknown): SignUpOutcome => {
  if (!data || typeof data !== 'object') return 'unverifiable';

  const { user, session } = data as {
    user?: unknown;
    session?: unknown;
  };

  if (session && typeof session === 'object') return 'created';
  if (!user || typeof user !== 'object') return 'unverifiable';

  const { identities } = user as { identities?: unknown };
  if (!Array.isArray(identities)) return 'unverifiable';

  return identities.length === 0 ? 'duplicate' : 'created';
};
