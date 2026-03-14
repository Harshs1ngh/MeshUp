// 📁 src/store/slices/feedSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

// ─── FETCH FEED ──────────────────────────────────────────────────────────────
export const fetchFeed = createAsyncThunk("feed/fetchFeed", async (_, thunkAPI) => {
  try {
    const res = await api.get("/feed");
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to fetch feed");
  }
});

// ─── CREATE POST ─────────────────────────────────────────────────────────────
export const createPost = createAsyncThunk("feed/createPost", async ({ content, media }, thunkAPI) => {
  try {
    const formData = new FormData();
    if (content) formData.append("body", content);
    if (media)   formData.append("media", media);
    const res = await api.post("/post", formData, { headers: { "Content-Type": "multipart/form-data" } });
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to create post");
  }
});

// ─── TOGGLE LIKE ─────────────────────────────────────────────────────────────
export const likePost = createAsyncThunk("feed/likePost", async (postId, thunkAPI) => {
  try {
    const res = await api.put(`/like/${postId}`);
    return { postId, ...res.data };
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed");
  }
});

// ─── DELETE POST ─────────────────────────────────────────────────────────────
export const deletePost = createAsyncThunk("feed/deletePost", async (postId, thunkAPI) => {
  try {
    await api.delete(`/post/${postId}`);
    return postId;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed");
  }
});

// ─── FETCH COMMENTS FOR A POST ────────────────────────────────────────────────
export const fetchComments = createAsyncThunk("feed/fetchComments", async (postId, thunkAPI) => {
  try {
    const res = await api.get(`/comments/${postId}`);
    return { postId, comments: res.data };
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to load comments");
  }
});

// ─── ADD COMMENT ─────────────────────────────────────────────────────────────
export const addComment = createAsyncThunk("feed/addComment", async ({ postId, body }, thunkAPI) => {
  try {
    const res = await api.post("/comment", { postId, body });
    return { postId, comment: res.data }; // res.data is populated comment from backend
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to add comment");
  }
});

// ─── DELETE COMMENT ──────────────────────────────────────────────────────────
export const deleteComment = createAsyncThunk("feed/deleteComment", async ({ commentId, postId }, thunkAPI) => {
  try {
    await api.delete(`/comment/${commentId}`);
    return { commentId, postId };
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to delete comment");
  }
});

// ─── SLICE ───────────────────────────────────────────────────────────────────
const feedSlice = createSlice({
  name: "feed",
  initialState: {
    posts:            [],
    // comments stored per post: { [postId]: { items: [], isLoading, isSubmitting } }
    comments:         {},
    isLoading:        false,
    isPosting:        false,
    error:            null,
    activeTab:        "For you",
  },
  reducers: {
    setActiveTab(state, action) { state.activeTab = action.payload; },
    toggleSave(state, action) {
      const post = state.posts.find((p) => p._id === action.payload);
      if (post) post.savedByMe = !post.savedByMe;
    },
  },
  extraReducers: (builder) => {
    // ── Feed ──
    builder
      .addCase(fetchFeed.pending,   (s) => { s.isLoading = true; s.error = null; })
      .addCase(fetchFeed.fulfilled, (s, a) => { s.isLoading = false; s.posts = a.payload; })
      .addCase(fetchFeed.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload; });

    // ── Create post ──
    builder
      .addCase(createPost.pending,   (s) => { s.isPosting = true; })
      .addCase(createPost.fulfilled, (s, a) => {
        s.isPosting = false;
        s.posts.unshift({ ...a.payload, likedByMe: false, likesCount: 0 });
      })
      .addCase(createPost.rejected,  (s) => { s.isPosting = false; });

    // ── Like ──
    builder.addCase(likePost.fulfilled, (s, a) => {
      const post = s.posts.find((p) => p._id === a.payload.postId);
      if (post) { post.likedByMe = a.payload.liked; post.likesCount = a.payload.likesCount; }
    });

    // ── Delete post ──
    builder.addCase(deletePost.fulfilled, (s, a) => {
      s.posts = s.posts.filter((p) => p._id !== a.payload);
    });

    // ── Fetch comments ──
    builder
      .addCase(fetchComments.pending, (s, a) => {
        const postId = a.meta.arg;
        s.comments[postId] = { items: [], isLoading: true, isSubmitting: false };
      })
      .addCase(fetchComments.fulfilled, (s, a) => {
        const { postId, comments } = a.payload;
        s.comments[postId] = { items: comments, isLoading: false, isSubmitting: false };
      })
      .addCase(fetchComments.rejected, (s, a) => {
        const postId = a.meta.arg;
        if (s.comments[postId]) s.comments[postId].isLoading = false;
      });

    // ── Add comment ──
    builder
      .addCase(addComment.pending, (s, a) => {
        const postId = a.meta.arg.postId;
        if (!s.comments[postId]) s.comments[postId] = { items: [], isLoading: false, isSubmitting: false };
        s.comments[postId].isSubmitting = true;
      })
      .addCase(addComment.fulfilled, (s, a) => {
        const { postId, comment } = a.payload;
        if (!s.comments[postId]) s.comments[postId] = { items: [], isLoading: false, isSubmitting: false };
        s.comments[postId].items.push(comment);
        s.comments[postId].isSubmitting = false;
        // update comment count on the post
        const post = s.posts.find((p) => p._id === postId);
        if (post) post.commentCount = (post.commentCount || 0) + 1;
      })
      .addCase(addComment.rejected, (s, a) => {
        const postId = a.meta.arg.postId;
        if (s.comments[postId]) s.comments[postId].isSubmitting = false;
      });

    // ── Delete comment ──
    builder.addCase(deleteComment.fulfilled, (s, a) => {
      const { commentId, postId } = a.payload;
      if (s.comments[postId]) {
        s.comments[postId].items = s.comments[postId].items.filter((c) => c._id !== commentId);
        const post = s.posts.find((p) => p._id === postId);
        if (post && post.commentCount > 0) post.commentCount -= 1;
      }
    });
  },
});

export const { setActiveTab, toggleSave } = feedSlice.actions;

export const selectPosts           = (s) => s.feed.posts;
export const selectActiveTab       = (s) => s.feed.activeTab;
export const selectFeedLoading     = (s) => s.feed.isLoading;
export const selectIsPosting       = (s) => s.feed.isPosting;
export const selectComments        = (postId) => (s) => s.feed.comments[postId] || { items: [], isLoading: false, isSubmitting: false };

export default feedSlice.reducer;