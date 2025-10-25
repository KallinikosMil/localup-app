import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  isAuthed: boolean;
  initialized: boolean;
}

const initialState: AuthState = {
  isAuthed: false,
  initialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.initialized = action.payload;
    },
    login: (state) => {
      state.isAuthed = true;
    },
    logout: (state) => {
      state.isAuthed = false;
    },
  },
});

export const { setInitialized, login, logout } = authSlice.actions;
export default authSlice.reducer;
