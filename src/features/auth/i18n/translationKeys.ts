export enum Translations {
  AUTH_HEADER_TEXT = 'authHeaderText',
  AUTH_WELCOME_TEXT = 'authWelcomeText',
  AUTH_SUBTITLE_TEXT = 'authSubtitleText',
  AUTH_EMAIL_LABEL = 'authEmailLabel',
  AUTH_PASSWORD_LABEL = 'authPasswordLabel',
  AUTH_LOGIN_BUTTON = 'authLoginButton',
  AUTH_FORGOT_PASSWORD = 'authForgotPassword',
  AUTH_OR_DIVIDER = 'authOrDivider',
  AUTH_GOOGLE_SIGN_IN = 'authGoogleSignIn',
  AUTH_NO_ACCOUNT = 'authNoAccount',
  AUTH_REGISTER = 'authRegister',
  AUTH_CREATE_ACCOUNT_TITLE = 'authCreateAccountTitle',
  AUTH_CREATE_ACCOUNT_SUBTITLE = 'authCreateAccountSubtitle',
  AUTH_CREATE_ACCOUNT_BUTTON = 'authCreateAccountButton',
  AUTH_CONFIRM_PASSWORD_LABEL = 'authConfirmPasswordLabel',
  AUTH_HAS_ACCOUNT = 'authHasAccount',
  AUTH_LOGIN_LINK = 'authLoginLink',
  AUTH_ERROR_FALLBACK = 'authErrorFallback',
  // The screens used to render Supabase's own `err.message` — raw
  // provider prose, in English, straight into the UI. Every auth failure
  // is now classified into one of these (see authErrorKey in useAuth).
  AUTH_ERROR_INVALID_CREDENTIALS = 'authErrorInvalidCredentials',
  AUTH_ERROR_EMAIL_NOT_CONFIRMED = 'authErrorEmailNotConfirmed',
  AUTH_ERROR_EMAIL_TAKEN = 'authErrorEmailTaken',
  AUTH_ERROR_WEAK_PASSWORD = 'authErrorWeakPassword',
  AUTH_ERROR_RATE_LIMITED = 'authErrorRateLimited',
  AUTH_ERROR_INVALID_EMAIL = 'authErrorInvalidEmail',
  AUTH_ERROR_NETWORK = 'authErrorNetwork',
  AUTH_ERROR_SIGNUP_UNVERIFIABLE = 'authErrorSignupUnverifiable',
  AUTH_DISMISS = 'authDismiss',
  AUTH_CONFIRM_EMAIL_SENT = 'authConfirmEmailSent',
  AUTH_BOOTSTRAP_ERROR_TITLE = 'authBootstrapErrorTitle',
  // The body is COMMON_ERROR_OFFLINE / COMMON_ERROR_GENERIC now (V10) —
  // authBootstrapErrorBody said "Check your connection" for every
  // failure, including the ones that had nothing to do with the network.
  AUTH_BOOTSTRAP_RETRY = 'authBootstrapRetry',

  // Password recovery
  AUTH_FORGOT_TITLE = 'authForgotTitle',
  AUTH_FORGOT_SUBTITLE = 'authForgotSubtitle',
  AUTH_FORGOT_SEND = 'authForgotSend',
  AUTH_FORGOT_SENT_TITLE = 'authForgotSentTitle',
  // Deliberately says "if an account exists" — confirming which
  // addresses are registered to an anonymous caller is an enumeration
  // vector, and this screen needs no session.
  AUTH_FORGOT_SENT_BODY = 'authForgotSentBody',
  AUTH_FORGOT_BACK = 'authForgotBack',
  AUTH_RESET_TITLE = 'authResetTitle',
  AUTH_RESET_SUBTITLE = 'authResetSubtitle',
  AUTH_RESET_NEW_PASSWORD = 'authResetNewPassword',
  AUTH_RESET_SUBMIT = 'authResetSubmit',
  AUTH_RESET_DONE = 'authResetDone',
  AUTH_PASSWORD_MIN = 'authPasswordMin',
  AUTH_PASSWORD_MISMATCH = 'authPasswordMismatch',
  AUTH_EMAIL_REQUIRED = 'authEmailRequired',
  AUTH_PASSWORD_REQUIRED = 'authPasswordRequired',
}
