// 📁 src/store/slices/progressSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

// ── Async thunks ──────────────────────────────────────────────────────────────

export const fetchSites = createAsyncThunk("progress/fetchSites", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get("/progress/sites");
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed");
  }
});

export const addSite = createAsyncThunk("progress/addSite", async (data, { rejectWithValue }) => {
  try {
    const res = await api.post("/progress/sites", data);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed");
  }
});

export const deleteSite = createAsyncThunk("progress/deleteSite", async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/progress/sites/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed");
  }
});

export const startSession = createAsyncThunk("progress/startSession", async (data, { rejectWithValue }) => {
  try {
    const res = await api.post("/progress/sessions/start", data);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed");
  }
});

export const endSession = createAsyncThunk("progress/endSession", async (data, { rejectWithValue }) => {
  try {
    const res = await api.post("/progress/sessions/end", data);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed");
  }
});

export const closeOpenSessions = createAsyncThunk("progress/closeOpenSessions", async (data, { rejectWithValue }) => {
  try {
    const res = await api.post("/progress/sessions/close-all", data);
    return res.data;
  } catch (err) {
    return rejectWithValue(null); // silently fail — unload context
  }
});

export const fetchSiteSessions = createAsyncThunk("progress/fetchSiteSessions", async (siteId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/progress/sites/${siteId}/sessions`);
    return { siteId, sessions: res.data };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed");
  }
});

// ── Slice ─────────────────────────────────────────────────────────────────────
const progressSlice = createSlice({
  name: "progress",
  initialState: {
    sites:        [],
    sessions:     {},          // { [siteId]: [session, ...] }
    isLoading:    false,
    isSaving:     false,
    error:        null,
  },
  reducers: {
    // Optimistically update totalTime after a session is saved locally
    addTimeToSite(state, action) {
      const { siteId, seconds } = action.payload;
      const site = state.sites.find((s) => s._id === siteId);
      if (site) site.totalTime = (site.totalTime || 0) + seconds;
    },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSites.pending,    (s) => { s.isLoading = true; })
      .addCase(fetchSites.fulfilled,  (s, a) => { s.isLoading = false; s.sites = a.payload; })
      .addCase(fetchSites.rejected,   (s, a) => { s.isLoading = false; s.error = a.payload; });

    builder
      .addCase(addSite.fulfilled, (s, a) => { s.sites.push(a.payload); });

    builder
      .addCase(deleteSite.fulfilled, (s, a) => {
        s.sites = s.sites.filter((site) => site._id !== a.payload);
      });

    builder
      .addCase(fetchSiteSessions.fulfilled, (s, a) => {
        s.sessions[a.payload.siteId] = a.payload.sessions;
      });
  },
});

export const { addTimeToSite, clearError } = progressSlice.actions;

export const selectSites      = (s) => s.progress.sites;
export const selectSessions   = (s) => s.progress.sessions;
export const selectProgressLoading = (s) => s.progress.isLoading;

export default progressSlice.reducer;