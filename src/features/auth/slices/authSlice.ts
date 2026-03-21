import {
  createSlice,
  PayloadAction,
} from '@reduxjs/toolkit';

export interface AuthState {
  user: {
    uid: string;
    email: string | null;
  } | null;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  initialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setInitialized: (
      state,
      action: PayloadAction<boolean>,
    ) => {
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
    },
  },
});

export const { setInitialized, setUser } =
  authSlice.actions;
export default authSlice.reducer;
