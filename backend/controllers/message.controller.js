// 📁 backend/controllers/message.controller.js
import mongoose from "mongoose";
import { Conversation, Message } from "../models/message.model.js";

const FIVE_HOURS = 5 * 60 * 60 * 1000; // ms

// ─── Safe unread helpers ──────────────────────────────────────────────────────
const getUnread = (conv, userId) => conv?.unreadCount?.[String(userId)] || 0;
const setUnread = (conv, userId, val) => {
  if (!conv.unreadCount) conv.unreadCount = {};
  conv.unreadCount[String(userId)] = val;
  conv.markModified("unreadCount");
};

// ─── GET OR CREATE CONVERSATION ───────────────────────────────────────────────
export const getOrCreateConversation = async (req, res) => {
  try {
    const myId        = req.user._id;
    const otherUserId = new mongoose.Types.ObjectId(req.params.userId);

    let conv = await Conversation.findOne({
      participants: { $all: [myId, otherUserId] }
    }).populate("participants", "name username profilePicture").populate("lastMessage");

    if (!conv) {
      const created = await Conversation.create({ participants: [myId, otherUserId], unreadCount: {} });
      conv = await Conversation.findById(created._id).populate("participants", "name username profilePicture");
    }
    res.json(conv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET ALL MY CONVERSATIONS ─────────────────────────────────────────────────
export const getMyConversations = async (req, res) => {
  try {
    const myId = req.user._id;
    const convs = await Conversation.find({ participants: myId })
      .sort({ updatedAt: -1 })
      .populate("participants", "name username profilePicture")
      .populate({ path: "lastMessage", populate: { path: "sender", select: "name username" } });

    const result = convs.map((c) => {
      const obj = c.toObject();
      obj.myUnread  = getUnread(c, myId);
      obj.otherUser = obj.participants.find((p) => String(p._id) !== String(myId));
      return obj;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET MESSAGES ─────────────────────────────────────────────────────────────
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const myId = req.user._id;
    const conv = await Conversation.findOne({ _id: conversationId, participants: myId });
    if (!conv) return res.status(403).json({ message: "Not authorized" });

    // ✅ Include messages deleted for everyone (show as placeholder)
    // Only exclude messages deleted just for this user (deletedFor: "me")
    const messages = await Message.find({
      conversationId,
      $or: [
        { isDeleted: false },
        { isDeleted: true, deletedFor: "everyone" }  // keep as placeholder
      ]
    })
      .sort({ createdAt: 1 })
      .populate("sender", "name username profilePicture");

    setUnread(conv, myId, 0);
    await conv.save();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── SEND MESSAGE ─────────────────────────────────────────────────────────────
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, body } = req.body;
    const myId = req.user._id;
    if (!body?.trim()) return res.status(400).json({ message: "Empty message" });

    const conv = await Conversation.findOne({ _id: conversationId, participants: myId });
    if (!conv) return res.status(403).json({ message: "Not authorized" });

    const msg = await Message.create({ conversationId, sender: myId, body: body.trim(), readBy: [myId] });

    conv.participants.forEach((pid) => {
      if (String(pid) !== String(myId)) setUnread(conv, pid, getUnread(conv, pid) + 1);
    });
    conv.lastMessage = msg._id;
    conv.updatedAt   = new Date();
    await conv.save();

    const populated = await Message.findById(msg._id).populate("sender", "name username profilePicture");
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── EDIT MESSAGE (sender only, within 5 hours) ───────────────────────────────
export const editMessage = async (req, res) => {
  try {
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ message: "Empty message" });

    const msg = await Message.findOne({ _id: req.params.id, sender: req.user._id, isDeleted: false });
    if (!msg) return res.status(404).json({ message: "Message not found" });

    const age = Date.now() - new Date(msg.createdAt).getTime();
    if (age > FIVE_HOURS)
      return res.status(403).json({ message: "Edit window expired (5 hours)" });

    msg.body      = body.trim();
    msg.editedAt  = new Date();
    await msg.save();

    const populated = await Message.findById(msg._id).populate("sender", "name username profilePicture");
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── DELETE MESSAGE ───────────────────────────────────────────────────────────
// Within 5 hours: sender can delete for EVERYONE (body replaced with placeholder)
// After 5 hours:  sender can only delete for THEMSELVES (isDeleted = true, only hidden for them)
export const deleteMessage = async (req, res) => {
  try {
    const myId = req.user._id;
    const { deleteFor } = req.body; // "everyone" | "me"

    const msg = await Message.findOne({ _id: req.params.id, sender: myId, isDeleted: false });
    if (!msg) return res.status(404).json({ message: "Message not found" });

    const age          = Date.now() - new Date(msg.createdAt).getTime();
    const withinWindow = age <= FIVE_HOURS;

    if (withinWindow && deleteFor === "everyone") {
      // ✅ Replace body with placeholder — persisted in DB
      msg.body       = "🚫 This message was deleted";
      msg.isDeleted  = true;
      msg.deletedFor = "everyone";
    } else {
      // Delete only for sender — completely hidden from their view
      msg.isDeleted  = true;
      msg.deletedFor = "me";
    }

    await msg.save();
    res.json({ message: "Deleted", deletedFor: msg.deletedFor, id: msg._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET TOTAL UNREAD ─────────────────────────────────────────────────────────
export const getTotalUnread = async (req, res) => {
  try {
    const myId = req.user._id;
    const convs = await Conversation.find({ participants: myId });
    const total = convs.reduce((sum, c) => sum + getUnread(c, myId), 0);
    res.json({ count: total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};