import Comment from "../models/comment.model.js";

// ---------------- ADD COMMENT ----------------

export const addComment = async (req, res) => {
  try {
    const { postId, body, parentComment } = req.body;

    if (!postId || !body)
      return res.status(400).json({ message: "postId and body required" });

    const comment = await Comment.create({
      userId: req.user._id,
      postId,
      body,
      parentComment: parentComment || null
    });

    res.status(201).json(comment);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------------- GET COMMENTS FOR POST ----------------

export const getComments = async (req, res) => {
  try {
    const comments = await Comment.find({
      postId: req.params.postId,
      isDeleted: false
    })
      .sort({ createdAt: 1 })
      .populate("userId", "name username profilePicture");

    res.json(comments);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------------- DELETE COMMENT (SOFT) ----------------

export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findOne({
      _id: req.params.id,
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
