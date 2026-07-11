import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  isAuthApiError,
  isAuthRetryableFetchError,
  isAuthWeakPasswordError,
} from '@supabase/supabase-js';
import { supabase } from '@config/supabase';
import { Translations } from '@features/auth/i18n/translationKeys';

// ─── Error taxonomy ──────────────────────────────────────────────────
//
// The screens used to render `err.message` — Supabase's own English
// prose — straight into the modal. Every auth failure is instead
// classified into one of these codes here, and the screens translate the
// code. Classification reads STRUCTURED fields only (error classes and
// the documented `code` field), never message text.

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'invalid_credentials',
  EMAIL_NOT_CONFIRMED = 'email_not_confirmed',
  EMAIL_TAKEN = 'email_taken',
  WEAK_PASSWORD = 'weak_password',
  RATE_LIMITED = 'rate_limited',
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

const classifyError = (err: unknown): AuthErrorCode => {
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
type SignUpOutcome = 'created' | 'duplicate' | 'unverifiable';

const classifySignUp = (data: unknown): SignUpOutcome => {
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

// ─── Hooks ───────────────────────────────────────────────────────────

export function useLogin() {
  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      // Check the error FIRST. It used to be checked last, after the
      // identities probe, so a real API error was read for its
      // (undefined) user shape before anyone asked whether the call had
      // failed at all.
      if (error) throw error;

      const outcome = classifySignUp(data);
      if (outcome === 'duplicate') {
        throw new AuthFailure(AuthErrorCode.EMAIL_TAKEN);
      }
      if (outcome === 'unverifiable') {
        throw new AuthFailure(AuthErrorCode.SIGNUP_UNVERIFIABLE);
      }
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    // H4 — signOut() left the whole query cache in memory. Most keys are
    // uid-scoped, so a cross-user render is unlikely, but ['chat',
    // matchId] and ['interests'] are NOT scoped to a user, and every
    // cached row (messages, matches, the deck) survives for gcTime after
    // the session that was allowed to read it is gone. Log out means
    // forget: drop everything, so the next user starts from the network.
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
