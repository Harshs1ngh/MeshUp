// 📁 src/store/slices/profileSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchMyProfile = createAsyncThunk("profile/fetchMyProfile", async (_, thunkAPI) => {
  try {
    const res = await api.get("/me");
    return res.data; // now includes connectionCount
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed");
  }
});

export const fetchUserProfile = createAsyncThunk("profile/fetchUserProfile", async (username, thunkAPI) => {
  try {
    const res = await api.get(`/profile/${username}`);
    return res.data; // includes connectionCount + connectionStatus
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "User not found");
  }
});

export const updateProfile = createAsyncThunk("profile/updateProfile", async (data, thunkAPI) => {
  try {
    const res = await api.put("/profile", data);
    return res.data.profile;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Update failed");
  }
});

export const updateUserInfo = createAsyncThunk("profile/updateUserInfo", async (data, thunkAPI) => {
  try {
    await api.put("/update", data);
    const res = await api.get("/me");
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Update failed");
  }
});

export const uploadProfilePicture = createAsyncThunk("profile/uploadProfilePicture", async (file, thunkAPI) => {
  try {
    const formData = new FormData();
    formData.append("profilePic", file);
    await api.post("/upload_profilePic", formData, { headers: { "Content-Type": "multipart/form-data" } });
    const res = await api.get("/me");
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Upload failed");
  }
});

function computeTasks(tasks, profile) {
  if (!profile) return tasks;
  const u = profile.userId || {};
  return tasks.map((t) => ({
    ...t,
    done:
      t.id === "photo"    ? !!(u.profilePicture)               :
      t.id === "headline" ? !!(profile.headline)                :
      t.id === "bio"      ? !!(profile.bio)                     :
      t.id === "skills"   ? (profile.skills?.length > 0)        :
      t.id === "work"     ? (profile.workExperience?.length > 0):
      t.id === "edu"      ? (profile.education?.length > 0)     :
      t.done,
  }));
}
function computeStrength(tasks) {
  return tasks.reduce((sum, t) => sum + (t.done ? t.weight : 0), 0);
}

const INITIAL_TASKS = [
  { id: "photo",    label: "Add a profile photo",   done: false, weight: 20 },
  { id: "headline", label: "Add your headline",     done: false, weight: 20 },
  { id: "bio",      label: "Write a bio",           done: false, weight: 15 },
  { id: "skills",   label: "Add your skills",       done: false, weight: 20 },
  { id: "work",     label: "Add work experience",   done: false, weight: 15 },
  { id: "edu",      label: "Add education",         done: false, weight: 10 },
];

const profileSlice = createSlice({
  name: "profile",
  initialState: {
    myProfile:     null,
    viewedProfile: null,
    // ✅ Real stats — updated from backend
    stats: { connections: 0, posts: 0, likes: 0, profileViews: 0, postImpressions: 0 },
    tasks:         INITIAL_TASKS,
    strength:      0,
    isLoading:     false,
    isSaving:      false,
    isUploading:   false,
    error:         null,
  },
  reducers: {
    // ✅ Allow networkSlice to push updated connection count
    setConnectionCount(state, action) {
      state.stats.connections = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyProfile.pending,   (s) => { s.isLoading = true; })
      .addCase(fetchMyProfile.fulfilled, (s, a) => {
        s.isLoading  = false;
        s.myProfile  = a.payload;
        s.stats.connections     = a.payload?.connectionCount   ?? s.stats.connections;
        s.stats.posts           = a.payload?.postCount         ?? s.stats.posts;
        s.stats.likes           = a.payload?.totalLikes        ?? s.stats.likes;
        s.stats.profileViews    = a.payload?.profileViews      ?? s.stats.profileViews;
        s.stats.postImpressions = a.payload?.postImpressions   ?? s.stats.postImpressions;
        s.tasks    = computeTasks(s.tasks, a.payload);
        s.strength = computeStrength(s.tasks);
      })
      .addCase(fetchMyProfile.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload; });

    builder
      .addCase(fetchUserProfile.pending,   (s) => { s.isLoading = true; s.viewedProfile = null; })
      .addCase(fetchUserProfile.fulfilled, (s, a) => { s.isLoading = false; s.viewedProfile = a.payload; })
      .addCase(fetchUserProfile.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload; });

    builder
      .addCase(updateProfile.pending,   (s) => { s.isSaving = true; s.error = null; })
      .addCase(updateProfile.fulfilled, (s, a) => {
        s.isSaving = false;
        if (s.myProfile) Object.assign(s.myProfile, a.payload);
        s.tasks    = computeTasks(s.tasks, s.myProfile);
        s.strength = computeStrength(s.tasks);
      })
      .addCase(updateProfile.rejected,  (s, a) => { s.isSaving = false; s.error = a.payload; });

    builder
      .addCase(updateUserInfo.pending,   (s) => { s.isSaving = true; })
      .addCase(updateUserInfo.fulfilled, (s, a) => {
        s.isSaving  = false;
        s.myProfile = a.payload;
        s.stats.connections = a.payload?.connectionCount ?? s.stats.connections;
        s.tasks    = computeTasks(s.tasks, a.payload);
        s.strength = computeStrength(s.tasks);
      })
      .addCase(updateUserInfo.rejected,  (s, a) => { s.isSaving = false; s.error = a.payload; });

    builder
      .addCase(uploadProfilePicture.pending,   (s) => { s.isUploading = true; })
      .addCase(uploadProfilePicture.fulfilled, (s, a) => {
        s.isUploading = false;
        s.myProfile   = a.payload;
        s.stats.connections = a.payload?.connectionCount ?? s.stats.connections;
        s.tasks    = computeTasks(s.tasks, a.payload);
        s.strength = computeStrength(s.tasks);
      })
      .addCase(uploadProfilePicture.rejected, (s, a) => { s.isUploading = false; s.error = a.payload; });
  },
});

export const { setConnectionCount } = profileSlice.actions;

export const selectMyProfile          = (s) => s.profile.myProfile;
export const selectViewedProfile      = (s) => s.profile.viewedProfile;
export const selectStats              = (s) => s.profile.stats;
export const selectTasks              = (s) => s.profile.tasks;
export const selectStrength           = (s) => s.profile.strength;
export const selectProfileLoading     = (s) => s.profile.isLoading;
export const selectProfileSaving      = (s) => s.profile.isSaving;
export const selectProfileUploading   = (s) => s.profile.isUploading;

export default profileSlice.reducer;