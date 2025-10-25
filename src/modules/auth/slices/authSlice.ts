import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PublicUser {
  uid: string;
  email?: string | null;
}

interface AuthState {
  user: PublicUser | null;
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
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.initialized = action.payload;
    },
    setUser: (state, action: PayloadAction<PublicUser | null>) => {
      state.user = action.payload;
    },
  },
});

export const { setInitialized, setUser } = authSlice.actions;
export default authSlice.reducer;
