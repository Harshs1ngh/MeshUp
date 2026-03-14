// 📁 backend/controllers/post.controller.js
import Post from "../models/posts.model.js";
import Notification from "../models/notification.model.js";

// ─── CREATE POST ─────────────────────────────────────────────────────────────
export const createPost = async (req, res) => {
  try {
    const { body } = req.body;

    if (!body && !req.file)
      return res.status(400).json({ message: "Post cannot be empty" });

    let media    = "";
    let mediaType = "none";

    if (req.file) {
      media     = req.file.path;
      mediaType = req.file.mimetype.startsWith("image") ? "image" : "video";
    }

    const post = await Post.create({
      userId: req.user._id,
      body,
      media,
      mediaType
    });

    // ✅ Populate userId so frontend gets name/username/profilePicture immediately
    const populated = await Post.findById(post._id)
      .populate("userId", "name username profilePicture");

    res.status(201).json(populated);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET FEED ─────────────────────────────────────────────────────────────────
export const getFeed = async (req, res) => {
  try {
    const myId = req.user._id;

    const posts = await Post.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .populate("userId", "name username profilePicture");

    // ✅ Add likedByMe flag so frontend can highlight the like button
    const postsWithMeta = posts.map((p) => {
      const obj       = p.toObject();
      obj.likedByMe   = p.likes.some((id) => String(id) === String(myId));
      obj.likesCount  = p.likes.length;
      return obj;
    });

    res.json(postsWithMeta);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── DELETE POST ──────────────────────────────────────────────────────────────
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!post)
      return res.status(404).json({ message: "Post not found" });

    post.isDeleted = true;
    await post.save();

    res.json({ message: "Post deleted" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── TOGGLE LIKE ──────────────────────────────────────────────────────────────
export const toggleLike = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, isDeleted: false });

    if (!post)
      return res.status(404).json({ message: "Post not found" });

    const userId       = req.user._id;
    const alreadyLiked = post.likes.some((id) => String(id) === String(userId));

    if (alreadyLiked) {
      await Post.updateOne({ _id: post._id }, { $pull: { likes: userId } });

      return res.json({ liked: false, likesCount: post.likes.length - 1 });
    } else {
      await Post.updateOne({ _id: post._id }, { $addToSet: { likes: userId } });

      // ✅ Create notification for post owner (not if liking own post)
      if (String(post.userId) !== String(userId)) {
        await Notification.create({
          recipient: post.userId,
          sender:    userId,
          type:      "like",
          post:      post._id,
          message:   "liked your post"
        });
      }

      return res.json({ liked: true, likesCount: post.likes.length + 1 });
    }

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET POSTS BY USER ID ─────────────────────────────────────────────────────
export const getUserPosts = async (req, res) => {
  try {
    const myId  = req.user._id;
    // ✅ Post model uses "userId" not "author"
    const posts = await Post.find({ userId: req.params.userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .populate("userId", "name username profilePicture");

    const result = posts.map((p) => {
      const obj = p.toObject();
      obj.likedByMe  = p.likes.some((id) => String(id) === String(myId));
      obj.likesCount = p.likes.length;
      // ✅ normalize author field for frontend
      obj.author = obj.userId;
      return obj;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET ACTIVITY HEATMAP for a user ─────────────────────────────────────────
// Returns { "2025-03-01": 2, "2025-03-04": 1, ... } — post counts per day for past year
export const getActivityHeatmap = async (req, res) => {
  try {
    const userId = req.params.userId;
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const posts = await Post.find({
      userId,
      isDeleted: false,
      createdAt: { $gte: oneYearAgo },
    }).select("createdAt");

    // Bucket by YYYY-MM-DD
    const map = {};
    for (const p of posts) {
      const d = new Date(p.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      map[key] = (map[key] || 0) + 1;
    }

    res.json(map);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};