// 📁 src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

// ── LOGIN ─────────────────────────────────────────────────────────────────
export const loginUser = createAsyncThunk(
  "auth/login",
  async (data, thunkAPI) => {
    try {
      await api.post("/login", data);
      const res = await api.get("/me");
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Login failed");
    }
  }
);

// ── REGISTER ──────────────────────────────────────────────────────────────
export const registerUser = createAsyncThunk(
  "auth/register",
  async (data, thunkAPI) => {
    try {
      await api.post("/register", data);
      await api.post("/login", { email: data.email, password: data.password });
      const res = await api.get("/me");
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Registration failed");
    }
  }
);

// ── REHYDRATE ─────────────────────────────────────────────────────────────
// Called on every page load — checks if cookie is still valid
export const rehydrateAuth = createAsyncThunk(
  "auth/rehydrate",
  async (_, thunkAPI) => {
    try {
      const res = await api.get("/me");
      return res.data;
    } catch (err) {
      return null; // no valid cookie — treat as logged out
    }
  }
);

// ── LOGOUT ────────────────────────────────────────────────────────────────
export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, thunkAPI) => {
    try { await api.post("/logout"); } catch (_) {}
    return null;
  }
);

// ── SLICE ─────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: "auth",
  initialState: {
    user:            null,
    isAuthenticated: false,
    isInitialized:   false,   // ✅ true after rehydrateAuth completes (success OR fail)
    isRehydrating:   true,    // ✅ true until the first /me check finishes
    loading:         false,
    error:           null,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    // ── Rehydrate (session check on page load) ───────────────────────────
    builder
      .addCase(rehydrateAuth.pending, (state) => {
        state.isRehydrating = true;   // ✅ block guard while checking
      })
      .addCase(rehydrateAuth.fulfilled, (state, action) => {
        state.isRehydrating   = false;
        state.isInitialized   = true;
        state.user            = action.payload;
        state.isAuthenticated = !!action.payload;
      })
      .addCase(rehydrateAuth.rejected, (state) => {
        state.isRehydrating   = false;
        state.isInitialized   = true;
        state.isAuthenticated = false;
      });

    // ── Login ────────────────────────────────────────────────────────────
    builder
      .addCase(loginUser.pending,    (state)         => { state.loading = true;  state.error = null; })
      .addCase(loginUser.fulfilled,  (state, action) => {
        state.loading = false; state.user = action.payload;
        state.isAuthenticated = true; state.isInitialized = true;
      })
      .addCase(loginUser.rejected,   (state, action) => { state.loading = false; state.error = action.payload; });

    // ── Register ─────────────────────────────────────────────────────────
    builder
      .addCase(registerUser.pending,   (state)         => { state.loading = true;  state.error = null; })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false; state.user = action.payload;
        state.isAuthenticated = true; state.isInitialized = true;
      })
      .addCase(registerUser.rejected,  (state, action) => { state.loading = false; state.error = action.payload; });

    // ── Logout ───────────────────────────────────────────────────────────
    builder
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null; state.isAuthenticated = false;
      });
  },
});

export const { clearError } = authSlice.actions;

export const selectAuth             = (state) => state.auth;
export const selectUser             = (state) => state.auth.user;
export const selectIsAuthenticated  = (state) => state.auth.isAuthenticated;
export const selectIsRehydrating    = (state) => state.auth.isRehydrating;   // ✅ NOW EXPORTED
export const selectIsInitialized    = (state) => state.auth.isInitialized;
export const selectAuthLoading      = (state) => state.auth.loading;
export const selectAuthError        = (state) => state.auth.error;

export default authSlice.reducer;