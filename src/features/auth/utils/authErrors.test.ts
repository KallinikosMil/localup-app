import { Translations } from '@features/auth/i18n/translationKeys';

import {
  AuthErrorCode,
  AuthFailure,
  authErrorKey,
  classifyError,
  classifySignUp,
} from './authErrors';

// Shaped like what auth-js throws. isAuthApiError checks `__isAuthError`
// and the constructor name, so the guards need the real marker rather than
// a bare object.
const apiError = (code: string | undefined, status = 400) =>
  Object.assign(new Error(code ?? 'error'), {
    __isAuthError: true,
    name: 'AuthApiError',
    status,
    code,
  });

describe('classifyError', () => {
  it('passes our own AuthFailure through unchanged', () => {
    const err = new AuthFailure(AuthErrorCode.SIGNUP_UNVERIFIABLE);
    expect(classifyError(err)).toBe(AuthErrorCode.SIGNUP_UNVERIFIABLE);
  });

  it('maps the documented provider codes', () => {
    expect(classifyError(apiError('invalid_credentials'))).toBe(
      AuthErrorCode.INVALID_CREDENTIALS,
    );
    expect(classifyError(apiError('email_not_confirmed'))).toBe(
      AuthErrorCode.EMAIL_NOT_CONFIRMED,
    );
    expect(classifyError(apiError('user_already_exists'))).toBe(
      AuthErrorCode.EMAIL_TAKEN,
    );
    expect(classifyError(apiError('email_exists'))).toBe(
      AuthErrorCode.EMAIL_TAKEN,
    );
  });

  it('reads a 429 as rate limiting even without a mapped code', () => {
    expect(classifyError(apiError(undefined, 429))).toBe(
      AuthErrorCode.RATE_LIMITED,
    );
  });

  // The whole point of the taxonomy: an unrecognised code must degrade to
  // "something went wrong", never to a confident wrong claim.
  it('degrades an unknown provider code to UNKNOWN', () => {
    expect(classifyError(apiError('some_code_that_does_not_exist_yet'))).toBe(
      AuthErrorCode.UNKNOWN,
    );
  });

  it('reads aborts and timeouts as network failures', () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const timeout = Object.assign(new Error('slow'), { name: 'TimeoutError' });
    expect(classifyError(abort)).toBe(AuthErrorCode.NETWORK);
    expect(classifyError(timeout)).toBe(AuthErrorCode.NETWORK);
  });

  it('falls back to UNKNOWN for anything unrecognisable', () => {
    expect(classifyError(new Error('boom'))).toBe(AuthErrorCode.UNKNOWN);
    expect(classifyError(null)).toBe(AuthErrorCode.UNKNOWN);
    expect(classifyError('a string')).toBe(AuthErrorCode.UNKNOWN);
  });
});

describe('authErrorKey', () => {
  it('gives every code a translation key', () => {
    for (const code of Object.values(AuthErrorCode)) {
      expect(authErrorKey(new AuthFailure(code))).toBeDefined();
    }
  });

  it('translates invalid credentials rather than echoing the provider', () => {
    // The regression: err.message ("Invalid login credentials") used to go
    // straight to the modal, in English, whatever the user's language.
    expect(authErrorKey(apiError('invalid_credentials'))).toBe(
      Translations.AUTH_ERROR_INVALID_CREDENTIALS,
    );
  });

  it('uses the generic message for anything unrecognised', () => {
    expect(authErrorKey(new Error('boom'))).toBe(
      Translations.AUTH_ERROR_FALLBACK,
    );
  });
});

// With email-enumeration protection on, signing up with an address that
// already exists returns HTTP 200 and a fabricated user. There is no error
// to check — the only signal is the shape of the response, and reading it
// wrongly tells a duplicate registrant to go wait for a mail that will never
// arrive.
describe('classifySignUp', () => {
  it('treats a session as a real new account', () => {
    expect(classifySignUp({ user: {}, session: { access_token: 'x' } })).toBe(
      'created',
    );
  });

  it('treats an empty identities array as a duplicate', () => {
    expect(classifySignUp({ user: { identities: [] }, session: null })).toBe(
      'duplicate',
    );
  });

  it('treats a populated identities array as created', () => {
    expect(
      classifySignUp({ user: { identities: [{ id: 'a' }] }, session: null }),
    ).toBe('created');
  });

  // The important half. `identities: []` is an artifact of the obfuscation,
  // not an API contract. If its shape ever changes, the answer must be "we
  // cannot tell" — one honest hedge beats one confident lie.
  it('refuses to guess when the shape is unfamiliar', () => {
    expect(classifySignUp({ user: {}, session: null })).toBe('unverifiable');
    expect(classifySignUp({ user: { identities: 'nope' } })).toBe(
      'unverifiable',
    );
    expect(classifySignUp({})).toBe('unverifiable');
    expect(classifySignUp(null)).toBe('unverifiable');
    expect(classifySignUp('surprise')).toBe('unverifiable');
  });
});
