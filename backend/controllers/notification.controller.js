import Notification from "../models/notification.model.js";

// ─── GET MY NOTIFICATIONS ─────────────────────────────────────────────────────
export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("sender", "name username profilePicture")
      .populate("post",   "body");

    res.json(notifications);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET UNREAD COUNT ─────────────────────────────────────────────────────────
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      read:      false
    });

    res.json({ count });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── MARK ONE AS READ ─────────────────────────────────────────────────────────
export const markAsRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true }
    );

    res.json({ message: "Marked as read" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── MARK ALL AS READ ─────────────────────────────────────────────────────────
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );

    res.json({ message: "All marked as read" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── DELETE NOTIFICATION ──────────────────────────────────────────────────────
export const deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id:       req.params.id,
      recipient: req.user._id
    });

    res.json({ message: "Deleted" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};