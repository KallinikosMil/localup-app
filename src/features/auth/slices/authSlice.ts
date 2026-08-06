import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type AuthUser = {
  uid: string;
  email: string | null;
};

export interface AuthState {
  user: AuthUser | null;
  initialized: boolean;
  // Tri-state: `null` = not yet known for the current user (the
  // SIGNED_IN profile fetch is in flight). AppGuard must not route
  // in/out of onboarding while it's null — that race is the W5 flash.
  onboardingComplete: boolean | null;
  // W13: the profile read FAILED (after retries). Distinct from
  // `null` (in flight) and from `false` (genuinely not onboarded).
  // Without this third state a failed read collapses into `false`
  // and an already-onboarded user is routed back into onboarding —
  // where finishing it OVERWRITES their profile. A failure must
  // never select a branch; it gets its own state + a Retry screen.
  authError: boolean;
  // V10: WHY it failed — was the request unable to leave the device, or
  // did the server answer badly? The error object itself dies with the
  // dispatch, so the verdict (isNetworkError, structured fields only) is
  // carried here for AuthErrorScreen to render the right sentence.
  // Meaningless unless authError is true.
  authErrorOffline: boolean;
  // The recovery link signed the user in FOR THE SOLE PURPOSE of setting
  // a new password. They are authenticated, so without this flag AppGuard
  // would route them straight into the app and they could never reach the
  // reset screen — the link would look broken. Cleared once the password
  // is actually changed (or on sign-out / a different user).
  passwordRecovery: boolean;
}

const initialState: AuthState = {
  user: null,
  initialized: false,
  onboardingComplete: null,
  authError: false,
  authErrorOffline: false,
  passwordRecovery: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.initialized = action.payload;
    },
    setUser: (state, action: PayloadAction<AuthUser | null>) => {
      const nextUid = action.payload?.uid ?? null;
      const changed = (state.user?.uid ?? null) !== nextUid;
      state.user = action.payload;

      // Only reset when the IDENTITY changes (login / logout / switch
      // account) — a previously-known status no longer applies, so go
      // back to unknown until the profile fetch resolves (W5).
      //
      // TOKEN_REFRESHED fires on app resume and ~hourly with the SAME
      // uid. Resetting on those would blank the app (AppGuard renders
      // null while onboardingComplete is null) and re-read the profile
      // for no reason — a blip on that re-read would then throw the
      // user onto the error screen mid-session. Same uid ⇒ the status
      // we already have is still true.
      if (changed) {
        state.onboardingComplete = null;
        state.authError = false;
        state.authErrorOffline = false;
        // A logout or a different account ends any recovery in progress.
        // NOTE: the PASSWORD_RECOVERY handler must therefore dispatch
        // setUser BEFORE setPasswordRecovery(true), or it would clear the
        // flag it just set (the recovery session IS an identity change).
        state.passwordRecovery = false;
      }
    },
    setOnboardingComplete: (state, action: PayloadAction<boolean | null>) => {
      state.onboardingComplete = action.payload;
    },
    setAuthError: (
      state,
      action: PayloadAction<{
        failed: boolean;
        offline?: boolean;
      }>,
    ) => {
      state.authError = action.payload.failed;
      state.authErrorOffline = action.payload.failed
        ? (action.payload.offline ?? false)
        : false;
    },
    setPasswordRecovery: (state, action: PayloadAction<boolean>) => {
      state.passwordRecovery = action.payload;
    },
  },
});

export const {
  setInitialized,
  setUser,
  setOnboardingComplete,
  setAuthError,
  setPasswordRecovery,
} = authSlice.actions;
export default authSlice.reducer;
