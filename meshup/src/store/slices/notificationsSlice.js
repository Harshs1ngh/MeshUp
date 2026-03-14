// 📁 src/store/slices/notificationsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

const BASE   = "https://meshup-z0g6.onrender.com/uploads/";
const COLORS = ["#7c3aed","#5b5bd6","#8b5cf6","#6d28d9","#4f46e5","#6d6de0"];
const colorFor = (str) => COLORS[(str?.charCodeAt(0) || 0) % COLORS.length];

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// Map backend type → UI config
const TYPE_CONFIG = {
  like:            { icon: "❤️", label: "liked your post",               link: "/" },
  comment:         { icon: "💬", label: "commented on your post",        link: "/" },
  connect_request: { icon: "🤝", label: "sent you a connection request", link: "/users/network" },
  connect_accept:  { icon: "✅", label: "accepted your connection",      link: "/users/network" },
  mention:         { icon: "📣", label: "mentioned you in a post",       link: "/" },
};

// Shape a raw DB notification into UI-ready object
function shapeNotif(n) {
  const sender  = n.sender || {};
  const config  = TYPE_CONFIG[n.type] || { icon: "🔔", label: n.message || n.type, link: "/" };
  const pic     = sender.profilePicture;

  return {
    id:          n._id,
    type:        n.type,
    read:        n.read,
    actor:       sender.name     || "Someone",
    username:    sender.username || "",
    avatar:      (sender.name || "?")[0].toUpperCase(),
    avatarColor: colorFor(sender.name),
    profilePic:  pic || null,
    icon:        config.icon,
    text:        n.message || config.label,
    time:        timeAgo(n.createdAt),
    // Navigate to post if it exists, else default link
    link:        n.post ? `/users` : config.link,
    postId:      n.post?._id || n.post || null,
  };
}

// ─── THUNKS ───────────────────────────────────────────────────────────────────
export const fetchNotifications = createAsyncThunk(
  "notifications/fetch",
  async (_, thunkAPI) => {
    try {
      const res = await api.get("/notifications");
      return res.data.map(shapeNotif);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed");
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  "notifications/fetchUnreadCount",
  async (_, thunkAPI) => {
    try {
      const res = await api.get("/notifications/unread-count");
      return res.data.count;
    } catch { return 0; }
  }
);

export const markRead = createAsyncThunk(
  "notifications/markRead",
  async (id, thunkAPI) => {
    try {
      await api.put(`/notifications/${id}/read`);
      return id;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed");
    }
  }
);

export const markAllRead = createAsyncThunk(
  "notifications/markAllRead",
  async (_, thunkAPI) => {
    try {
      await api.put("/notifications/read-all");
      return true;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed");
    }
  }
);

export const dismissNotification = createAsyncThunk(
  "notifications/dismiss",
  async (id, thunkAPI) => {
    try {
      await api.delete(`/notifications/${id}`);
      return id;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed");
    }
  }
);

// ─── SLICE ────────────────────────────────────────────────────────────────────
const notificationsSlice = createSlice({
  name: "notifications",
  initialState: {
    items:     [],
    isLoading: false,
    filter:    "All",
    error:     null,
  },
  reducers: {
    setFilter(state, action) { state.filter = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending,   (s) => { s.isLoading = true; s.error = null; })
      .addCase(fetchNotifications.fulfilled, (s, a) => { s.isLoading = false; s.items = a.payload; })
      .addCase(fetchNotifications.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload; });

    builder
      .addCase(markRead.fulfilled, (s, a) => {
        const n = s.items.find((i) => i.id === a.payload);
        if (n) n.read = true;
      });

    builder
      .addCase(markAllRead.fulfilled, (s) => {
        s.items.forEach((i) => { i.read = true; });
      });

    builder
      .addCase(dismissNotification.fulfilled, (s, a) => {
        s.items = s.items.filter((i) => i.id !== a.payload);
      });

    builder
      .addCase(fetchUnreadCount.fulfilled, (s, a) => {
        // Only used for badge — don't overwrite items
        // The unread count is derived from items when loaded
      });
  },
});

export const { setFilter } = notificationsSlice.actions;

export const selectNotifications = (s) => s.notifications.items;
export const selectNotifsLoading = (s) => s.notifications.isLoading;
export const selectNotifsFilter  = (s) => s.notifications.filter;
export const selectUnreadCount   = (s) => s.notifications.items.filter((i) => !i.read).length;

export { BASE, colorFor };
export default notificationsSlice.reducer;