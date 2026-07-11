import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthState {
  user: {
    uid: string;
    email: string | null;
  } | null;
  initialized: boolean;
  // Tri-state: `null` = not yet known for the current user (the
  // SIGNED_IN profile fetch is in flight). AppGuard must not route
  // in/out of onboarding while it's null — that race is the W5 flash.
  onboardingComplete: boolean | null;
}

const initialState: AuthState = {
  user: null,
  initialized: false,
  onboardingComplete: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.initialized = action.payload;
    },
    setUser: (
      state,
      action: PayloadAction<{
        uid: string;
        email: string | null;
      } | null>,
    ) => {
      state.user = action.payload;
      // Whenever the user changes (login / token event / logout),
      // the previously-known onboarding status no longer applies —
      // reset to unknown until the profile fetch resolves so a stale
      // value can't leak and the guard doesn't flash onboarding (W5).
      state.onboardingComplete = null;
    },
    setOnboardingComplete: (state, action: PayloadAction<boolean | null>) => {
      state.onboardingComplete = action.payload;
    },
  },
});

export const { setInitialized, setUser, setOnboardingComplete } =
  authSlice.actions;
export default authSlice.reducer;
