// 📁 src/store/slices/messagesSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const BASE = "";
const COLORS = ["#7c3aed","#5b5bd6","#8b5cf6","#6d28d9","#4f46e5","#6d6de0"];
export const colorFor = (str) => COLORS[(str?.charCodeAt(0) || 0) % COLORS.length];

export function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const FIVE_HOURS = 5 * 60 * 60 * 1000;
export const canEdit   = (msg) => Date.now() - new Date(msg.createdAt).getTime() <= FIVE_HOURS;

// ─── THUNKS ───────────────────────────────────────────────────────────────────
export const fetchConversations = createAsyncThunk("messages/fetchConversations", async () => {
  const res = await api.get("/conversations");
  return res.data;
});

export const openConversation = createAsyncThunk("messages/openConversation", async (userId, thunkAPI) => {
  try {
    const res = await api.get(`/conversations/with/${userId}`);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed");
  }
});

export const fetchMessages = createAsyncThunk("messages/fetchMessages", async (conversationId, thunkAPI) => {
  try {
    const res = await api.get(`/conversations/${conversationId}/messages`);
    return { conversationId, messages: res.data };
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed");
  }
});

export const sendMessage = createAsyncThunk("messages/sendMessage", async ({ conversationId, body }, thunkAPI) => {
  try {
    const res = await api.post("/messages", { conversationId, body });
    return { conversationId, message: res.data };
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed");
  }
});

export const editMessage = createAsyncThunk("messages/editMessage", async ({ messageId, conversationId, body }, thunkAPI) => {
  try {
    const res = await api.put(`/messages/${messageId}`, { body });
    return { conversationId, message: res.data };
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Edit failed");
  }
});

export const deleteMessage = createAsyncThunk("messages/deleteMessage", async ({ messageId, conversationId, deleteFor }, thunkAPI) => {
  try {
    const res = await api.delete(`/messages/${messageId}`, { data: { deleteFor } });
    return { conversationId, messageId, deleteFor: res.data.deletedFor };
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Delete failed");
  }
});

export const fetchUnreadCount = createAsyncThunk("messages/fetchUnreadCount", async () => {
  try {
    const res = await api.get("/conversations/unread");
    return res.data.count;
  } catch { return 0; }
});

// ─── SLICE ────────────────────────────────────────────────────────────────────
const messagesSlice = createSlice({
  name: "messages",
  initialState: {
    conversations:      [],
    messages:           {},
    activeConversation: null,
    totalUnread:        0,
    isLoading:          false,
    isSending:          false,
    typingUsers:        {},   // { conversationId: { userId: name } }
    error:              null,
  },
  reducers: {
    setActiveConversation(state, action) {
      state.activeConversation = action.payload;
      const conv = state.conversations.find((c) => c._id === action.payload);
      if (conv) conv.myUnread = 0;
    },

    // ✅ Real-time: incoming message from socket
    socketMessageReceived(state, action) {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) state.messages[conversationId] = [];
      // Avoid duplicates
      const exists = state.messages[conversationId].find((m) => m._id === message._id);
      if (!exists) {
        state.messages[conversationId].push(message);
      }
      // Update conversation preview
      const conv = state.conversations.find((c) => c._id === conversationId);
      if (conv) {
        conv.lastMessage = { body: message.body };
        conv.updatedAt   = message.createdAt;
        // Increment unread only if not currently viewing this conversation
        if (state.activeConversation !== conversationId) {
          conv.myUnread = (conv.myUnread || 0) + 1;
          state.totalUnread += 1;
        }
      }
    },

    // ✅ Real-time: message edited by other user
    socketMessageUpdated(state, action) {
      const { conversationId, message } = action.payload;
      const msgs = state.messages[conversationId];
      if (msgs) {
        const idx = msgs.findIndex((m) => m._id === message._id);
        if (idx !== -1) msgs[idx] = message;
      }
    },

    // ✅ Real-time: message deleted by other user
    socketMessageRemoved(state, action) {
      const { conversationId, messageId, deletedFor, body } = action.payload;
      const msgs = state.messages[conversationId];
      if (!msgs) return;
      if (deletedFor === "everyone") {
        const idx = msgs.findIndex((m) => m._id === messageId);
        if (idx !== -1) msgs[idx] = { ...msgs[idx], body: body || "🚫 This message was deleted", isDeleted: true, deletedFor: "everyone" };
      } else {
        state.messages[conversationId] = msgs.filter((m) => m._id !== messageId);
      }
    },

    // ✅ Real-time: typing indicator
    socketTypingStart(state, action) {
      const { conversationId, userId, name } = action.payload;
      if (!state.typingUsers[conversationId]) state.typingUsers[conversationId] = {};
      state.typingUsers[conversationId][userId] = name;
    },
    socketTypingStop(state, action) {
      const { conversationId, userId } = action.payload;
      if (state.typingUsers[conversationId]) {
        delete state.typingUsers[conversationId][userId];
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending,   (s) => { s.isLoading = true; })
      .addCase(fetchConversations.fulfilled, (s, a) => {
        s.isLoading     = false;
        s.conversations = a.payload;
        s.totalUnread   = a.payload.reduce((sum, c) => sum + (c.myUnread || 0), 0);
      })
      .addCase(fetchConversations.rejected,  (s) => { s.isLoading = false; });

    builder
      .addCase(openConversation.fulfilled, (s, a) => {
        const conv = a.payload;
        if (!conv?._id) return;
        if (!s.conversations.find((c) => c._id === conv._id))
          s.conversations.unshift({ ...conv, myUnread: 0 });
        s.activeConversation = conv._id;
      });

    builder
      .addCase(fetchMessages.pending,   (s) => { s.isLoading = true; })
      .addCase(fetchMessages.fulfilled, (s, a) => {
        s.isLoading = false;
        s.messages[a.payload.conversationId] = a.payload.messages;
        const conv = s.conversations.find((c) => c._id === a.payload.conversationId);
        if (conv) { s.totalUnread = Math.max(0, s.totalUnread - (conv.myUnread || 0)); conv.myUnread = 0; }
      })
      .addCase(fetchMessages.rejected, (s) => { s.isLoading = false; });

    builder
      .addCase(sendMessage.pending,   (s) => { s.isSending = true; })
      .addCase(sendMessage.fulfilled, (s, a) => {
        s.isSending = false;
        const { conversationId, message } = a.payload;
        if (!s.messages[conversationId]) s.messages[conversationId] = [];
        // Avoid duplicate if socket also fires for own message
        if (!s.messages[conversationId].find((m) => m._id === message._id)) {
          s.messages[conversationId].push(message);
        }
        const conv = s.conversations.find((c) => c._id === conversationId);
        if (conv) { conv.lastMessage = { body: message.body }; conv.updatedAt = message.createdAt; }
      })
      .addCase(sendMessage.rejected, (s) => { s.isSending = false; });

    builder
      .addCase(editMessage.fulfilled, (s, a) => {
        const { conversationId, message } = a.payload;
        const msgs = s.messages[conversationId];
        if (msgs) {
          const idx = msgs.findIndex((m) => m._id === message._id);
          if (idx !== -1) msgs[idx] = message;
        }
      });

    builder
      .addCase(deleteMessage.fulfilled, (s, a) => {
        const { conversationId, messageId, deleteFor } = a.payload;
        const msgs = s.messages[conversationId];
        if (!msgs) return;
        if (deleteFor === "everyone") {
          const idx = msgs.findIndex((m) => m._id === messageId);
          if (idx !== -1) msgs[idx] = { ...msgs[idx], body: "🚫 This message was deleted", isDeleted: true, deletedFor: "everyone" };
        } else {
          s.messages[conversationId] = msgs.filter((m) => m._id !== messageId);
        }
      });

    builder.addCase(fetchUnreadCount.fulfilled, (s, a) => { s.totalUnread = a.payload; });
  },
});

export const {
  setActiveConversation,
  socketMessageReceived,
  socketMessageUpdated,
  socketMessageRemoved,
  socketTypingStart,
  socketTypingStop,
} = messagesSlice.actions;

export const selectConversations      = (s) => s.messages.conversations;
export const selectActiveConversation = (s) => s.messages.activeConversation;
export const selectMessages           = (id) => (s) => s.messages.messages[id] || [];
export const selectMessagesLoading    = (s) => s.messages.isLoading;
export const selectIsSending          = (s) => s.messages.isSending;
export const selectTotalUnread        = (s) => s.messages.totalUnread;
export const selectTypingUsers        = (convId) => (s) => s.messages.typingUsers[convId] || {};

export default messagesSlice.reducer;