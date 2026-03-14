// 📁 src/store/slices/networkSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";
import { setConnectionCount } from "./profileSlice";

export const fetchNetwork = createAsyncThunk("network/fetchNetwork", async (_, thunkAPI) => {
  try {
    const { auth } = thunkAPI.getState();
    const myId = auth.user?.userId?._id || auth.user?._id;

    const [usersRes, connectionsRes, requestsRes] = await Promise.all([
      api.get("/users"),
      api.get("/connections"),
      api.get("/connections/requests"),
    ]);

    // Build connected map from accepted connections
    const connectedMap = {};
    connectionsRes.data.forEach((conn) => {
      const senderId   = String(conn.sender?._id || conn.sender);
      const receiverId = String(conn.receiver?._id || conn.receiver);
      const otherId    = senderId === String(myId) ? receiverId : senderId;
      connectedMap[otherId] = true;
    });

    // ✅ Sync connection count into profileSlice immediately
    thunkAPI.dispatch(setConnectionCount(connectionsRes.data.length));

    const suggestions = usersRes.data.filter((p) => {
      const uid = String(p.userId?._id || p.userId);
      return uid !== String(myId);
    });

    return {
      suggestions,
      connected: connectedMap,
      requests:  requestsRes.data,
    };
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed");
  }
});

export const sendConnection = createAsyncThunk("network/sendConnection", async (targetUserId, thunkAPI) => {
  try {
    await api.post(`/connect/${targetUserId}`);
    return String(targetUserId);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed");
  }
});

export const acceptRequest = createAsyncThunk("network/acceptRequest", async (senderId, thunkAPI) => {
  try {
    await api.put(`/connections/accept/${senderId}`);
    // ✅ Increment connection count in profileSlice
    const current = thunkAPI.getState().profile.stats.connections;
    thunkAPI.dispatch(setConnectionCount(current + 1));
    return String(senderId);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed");
  }
});

export const declineRequest = createAsyncThunk("network/declineRequest", async (senderId, thunkAPI) => {
  try {
    await api.delete(`/connections/reject/${senderId}`);
    return String(senderId);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed");
  }
});

const networkSlice = createSlice({
  name: "network",
  initialState: {
    suggestions: [],
    requests:    [],
    pending:     {},
    connected:   {},
    filter:      "All",
    isLoading:   false,
    error:       null,
  },
  reducers: {
    setFilter: (state, action) => { state.filter = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNetwork.pending,   (s) => { s.isLoading = true; s.error = null; })
      .addCase(fetchNetwork.fulfilled, (s, a) => {
        s.isLoading   = false;
        s.suggestions = a.payload.suggestions;
        s.connected   = a.payload.connected;
        s.requests    = a.payload.requests;
      })
      .addCase(fetchNetwork.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload; });

    builder.addCase(sendConnection.fulfilled, (s, a) => {
      s.pending[a.payload] = true;
    });

    builder.addCase(acceptRequest.fulfilled, (s, a) => {
      s.connected[a.payload] = true;
      s.requests = s.requests.filter(
        (r) => String(r.sender?._id || r.sender) !== a.payload
      );
    });

    builder.addCase(declineRequest.fulfilled, (s, a) => {
      s.requests = s.requests.filter(
        (r) => String(r.sender?._id || r.sender) !== a.payload
      );
    });
  },
});

export const { setFilter } = networkSlice.actions;

export const selectSuggestions    = (s) => s.network.suggestions;
export const selectRequests       = (s) => s.network.requests;
export const selectPending        = (s) => s.network.pending;
export const selectConnected      = (s) => s.network.connected;
export const selectNetworkFilter  = (s) => s.network.filter;
export const selectNetworkLoading = (s) => s.network.isLoading;

export default networkSlice.reducer;