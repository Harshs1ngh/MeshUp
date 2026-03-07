// 📁 backend/models/message.model.js
import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessage:  { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    unreadCount:  { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);
conversationSchema.index({ participants: 1 });
export const Conversation = mongoose.model("Conversation", conversationSchema);

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    sender:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body:           { type: String, required: true, trim: true, maxlength: 2000 },
    media:          { type: String, default: "" },
    readBy:         [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isDeleted:      { type: Boolean, default: false },
    // ✅ New fields for edit/delete
    editedAt:       { type: Date, default: null },
    deletedFor:     { type: String, enum: ["everyone", "me", null], default: null },
  },
  { timestamps: true }
);
messageSchema.index({ conversationId: 1, createdAt: 1 });
export const Message = mongoose.model("Message", messageSchema);