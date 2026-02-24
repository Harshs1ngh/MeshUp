import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    body: {
      type: String,
      trim: true,
      maxlength: 2000
    },

    media: {
      type: String,
      default: ""
    },

    mediaType: {
      type: String,
      enum: ["image", "video", "none"],
      default: "none"
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

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

// Feed optimization
postSchema.index({ createdAt: -1 });

export default mongoose.model("Post", postSchema);
