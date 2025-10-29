import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
} from '@reduxjs/toolkit';
import { supabase } from '@config/supabase';

export interface AuthState {
  user: { uid: string; email: string | null } | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  initialized: false,
};

// Login
export const loginUser = createAsyncThunk<
  void,
  { email: string; password: string },
  { rejectValue: string }
>(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    const { error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (error) return rejectWithValue(error.message);
  },
);

// Logout
export const logoutUser = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>('auth/logoutUser', async (_, { rejectWithValue }) => {
  const { error } = await supabase.auth.signOut();
  if (error) return rejectWithValue(error.message);
});

// Register
export const registerUser = createAsyncThunk<
  void,
  { email: string; password: string },
  { rejectValue: string }
>(
  'auth/registerUser',
  async ({ email, password }, { rejectWithValue }) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) return rejectWithValue(error.message);
  },
);

const setPending = (state: AuthState) => {
  state.loading = true;
  state.error = null;
};

const setFulfilled = (state: AuthState) => {
  state.loading = false;
};

const setRejected =
  (fallback: string) => (state: AuthState, action: any) => {
    state.loading = false;
    state.error = action.payload ?? fallback;
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
  extraReducers: builder => {
    builder
      // 🔹 Login
      .addCase(loginUser.pending, setPending)
      .addCase(loginUser.fulfilled, setFulfilled)
      .addCase(
        loginUser.rejected,
        setRejected('Login failed'),
      )

      // 🔹 Logout
      .addCase(logoutUser.pending, setPending)
      .addCase(logoutUser.fulfilled, setFulfilled)
      .addCase(
        logoutUser.rejected,
        setRejected('Logout failed'),
      )

      // 🔹 Register
      .addCase(registerUser.pending, setPending)
      .addCase(registerUser.fulfilled, setFulfilled)
      .addCase(
        registerUser.rejected,
        setRejected('Register failed'),
      );
  },
});

export const { setInitialized, setUser } =
  authSlice.actions;
export default authSlice.reducer;
