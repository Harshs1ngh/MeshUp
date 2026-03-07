// 📁 backend/controllers/comment.controller.js
import Comment from "../models/comment.model.js";
import Post    from "../models/posts.model.js";
import Notification from "../models/notification.model.js";

// ─── ADD COMMENT ─────────────────────────────────────────────────────────────
export const addComment = async (req, res) => {
  try {
    const { postId, body, parentComment } = req.body;

    if (!postId || !body)
      return res.status(400).json({ message: "postId and body required" });

    const comment = await Comment.create({
      userId:        req.user._id,
      postId,
      body,
      parentComment: parentComment || null
    });

    // Populate user info for immediate frontend use
    const populated = await Comment.findById(comment._id)
      .populate("userId", "name username profilePicture");

    // Notify post owner
    const post = await Post.findById(postId);
    if (post && String(post.userId) !== String(req.user._id)) {
      await Notification.create({
        recipient: post.userId,
        sender:    req.user._id,
        type:      "comment",
        post:      postId,
        comment:   comment._id,
        message:   "commented on your post"
      });
    }

    res.status(201).json(populated);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET COMMENTS FOR POST ────────────────────────────────────────────────────
export const getComments = async (req, res) => {
  try {
    const comments = await Comment.find({
      postId:    req.params.postId,
      isDeleted: false,
      parentComment: null  // top-level only
    })
      .sort({ createdAt: 1 })
      .populate("userId", "name username profilePicture");

    res.json(comments);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── DELETE COMMENT ───────────────────────────────────────────────────────────
export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findOne({
      _id:    req.params.id,
      userId: req.user._id
    });

    if (!comment)
      return res.status(404).json({ message: "Comment not found" });

    comment.isDeleted = true;
    await comment.save();

    res.json({ message: "Comment deleted" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};