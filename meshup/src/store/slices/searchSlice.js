// 📁 src/store/slices/searchSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

const COLORS = ["#7c3aed","#5b5bd6","#8b5cf6","#6d28d9","#4f46e5","#6d6de0"];
const colorFor = (str) => COLORS[(str?.charCodeAt(0) || 0) % COLORS.length];

export const performSearch = createAsyncThunk("search/perform", async (query, thunkAPI) => {
  if (!query?.trim()) return { results: [], query: "" };
  try {
    // Use cached network users first — avoids extra API call
    const { network } = thunkAPI.getState();
    let profiles = network.suggestions || [];
    if (profiles.length === 0) {
      const res = await api.get("/users");
      profiles  = res.data;
    }

    const q = query.toLowerCase();
    const results = profiles
      .filter((profile) => {
        const u = profile.userId || {};
        return (
          u.name?.toLowerCase().includes(q)        ||
          u.username?.toLowerCase().includes(q)    ||
          profile.headline?.toLowerCase().includes(q) ||
          profile.location?.toLowerCase().includes(q)
        );
      })
      .slice(0, 8)
      .map((profile) => {
        const u = profile.userId || {};
        // ✅ _id from mongoose can be an ObjectId — always convert to plain string
        const id = u._id ? u._id.toString() : "";
        return {
          id,
          type:       "person",
          name:       u.name        || "Unknown",
          username:   u.username    || "",
          role:       profile.headline || ("@" + (u.username || "")),
          profilePic: u.profilePicture || null,
          avatar:     (u.name || "?")[0].toUpperCase(),
          avatarColor: colorFor(u.name),
        };
      })
      .filter((r) => r.id !== ""); // drop any with empty id

    return { results, query };
  } catch (e) {
    console.error("Search error:", e);
    return { results: [], query };
  }
});

const searchSlice = createSlice({
  name: "search",
  initialState: { query: "", results: [], isOpen: false, isLoading: false },
  reducers: {
    setQuery(state, action)  { state.query  = action.payload; },
    setIsOpen(state, action) { state.isOpen = action.payload; },
    clearSearch(state)       { state.query  = ""; state.results = []; state.isOpen = false; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(performSearch.pending,   (s) => { s.isLoading = true; })
      .addCase(performSearch.fulfilled, (s, a) => {
        s.isLoading = false;
        s.results   = a.payload.results;
        s.isOpen    = a.payload.query.length > 0;
      });
  },
});

export const { setQuery, setIsOpen, clearSearch } = searchSlice.actions;
export const selectSearchQuery   = (s) => s.search.query;
export const selectSearchResults = (s) => s.search.results;
export const selectSearchOpen    = (s) => s.search.isOpen;
export const selectSearchLoading = (s) => s.search.isLoading;

export default searchSlice.reducer;