import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true
    },

    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 500
    },

    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null
    },

    isEdited: {
      type: Boolean,
      default: false
    },

    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Comment", commentSchema);
