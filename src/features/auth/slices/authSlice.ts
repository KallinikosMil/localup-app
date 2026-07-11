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
}

const initialState: AuthState = {
  user: null,
  initialized: false,
  onboardingComplete: null,
  authError: false,
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
      }
    },
    setOnboardingComplete: (state, action: PayloadAction<boolean | null>) => {
      state.onboardingComplete = action.payload;
    },
    setAuthError: (state, action: PayloadAction<boolean>) => {
      state.authError = action.payload;
    },
  },
});

export const { setInitialized, setUser, setOnboardingComplete, setAuthError } =
  authSlice.actions;
export default authSlice.reducer;
