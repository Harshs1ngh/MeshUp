import Post from "../models/posts.model.js";

// ---------------- CREATE POST ----------------

export const createPost = async (req, res) => {
  try {
    const { body } = req.body;

    if (!body && !req.file) {
      return res.status(400).json({ message: "Post cannot be empty" });
    }

    let media = "";
    let mediaType = "none";

    if (req.file) {
      media = req.file.filename;

      if (req.file.mimetype.startsWith("image")) mediaType = "image";
      if (req.file.mimetype.startsWith("video")) mediaType = "video";
    }

    const post = await Post.create({
      userId: req.user._id,
      body,
      media,
      mediaType
    });

    res.status(201).json(post);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------------- GET FEED ----------------

export const activecheck = async (req, res) => {
  try {
    const posts = await Post.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .populate("userId", "name username profilePicture");

    res.json(posts);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------------- DELETE POST ----------------

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


//------------------ Post Like -----------------

export const toggleLike = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!post)
      return res.status(404).json({ message: "Post not found" });

    const userId = req.user._id;

    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
      // UNLIKE
      await Post.updateOne(
        { _id: post._id },
        { $pull: { likes: userId } }
      );

      return res.json({
        liked: false,
        likesCount: post.likes.length - 1
      });
    } else {
      // LIKE
      await Post.updateOne(
        { _id: post._id },
        { $addToSet: { likes: userId } }
      );

      return res.json({
        liked: true,
        likesCount: post.likes.length + 1
      });
    }

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
