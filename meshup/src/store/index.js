// 📁 src/store/index.js
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import authReducer          from "./slices/authSlice";
import feedReducer          from "./slices/feedSlice";
import networkReducer       from "./slices/networkSlice";
import jobsReducer          from "./slices/progressSlice";
import messagesReducer      from "./slices/messagesSlice";
import notificationsReducer from "./slices/notificationsSlice";
import profileReducer       from "./slices/profileSlice";
import searchReducer        from "./slices/searchSlice";
import progressReducer      from "./slices/progressSlice";

const appReducer = combineReducers({
  auth:          authReducer,
  feed:          feedReducer,
  network:       networkReducer,
  jobs:          jobsReducer,
  messages:      messagesReducer,
  notifications: notificationsReducer,
  profile:       profileReducer,
  search:        searchReducer,
  progress:      progressReducer,
});

// ✅ Root reducer — when logout action fires, wipe ALL state
// This prevents previous user's posts/profile leaking to next user
const rootReducer = (state, action) => {
  if (action.type === "auth/logoutUser/fulfilled") {
    // Reset everything except auth (auth handles its own reset)
    state = { auth: state.auth };
  }
  return appReducer(state, action);
};

const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== "production",
});

export default store;