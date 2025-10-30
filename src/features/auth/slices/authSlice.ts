import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
} from '@reduxjs/toolkit';
import { supabase } from '@config/supabase';
import { RequestStatus } from '@shared/types/RequestStatus';

export interface AuthState {
  user: { uid: string; email: string | null } | null;
  error: string | null;
  initialized: boolean;
  status: RequestStatus;
}

const initialState: AuthState = {
  user: null,
  error: null,
  initialized: false,
  status: RequestStatus.IDLE,
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
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    console.log('[registerUser] signUp response', {
      user: data?.user,
      session: data?.session,
      error,
    });

    const identities = data?.user?.identities;
    if (Array.isArray(identities) && identities.length === 0) {
      return rejectWithValue(
        'Email already registered. Please log in.',
      );
    }

    if (error) return rejectWithValue(error.message);
  },
);

const setPending = (state: AuthState) => {
  state.status = RequestStatus.LOADING;
  state.error = null;
};

const setFulfilled = (state: AuthState) => {
  state.status = RequestStatus.SUCCESS;
};

const setRejected =
  (fallback: string) => (state: AuthState, action: any) => {
    console.log('rejected')
    state.status = RequestStatus.ERROR;
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
    resetState: () => initialState,
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

export const { setInitialized, setUser, resetState } =
  authSlice.actions;
export default authSlice.reducer;
