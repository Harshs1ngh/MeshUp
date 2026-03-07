// 📁 backend/controllers/connect.controller.js
import Connection  from "../models/connection.model.js";
import Notification from "../models/notification.model.js";

// ─── SEND CONNECTION REQUEST ──────────────────────────────────────────────────
export const sendConnectionRequest = async (req, res) => {
  try {
    const receiverId = req.params.id;

    if (String(receiverId) === String(req.user._id))
      return res.status(400).json({ message: "Cannot connect with yourself" });

    const exists = await Connection.findOne({
      $or: [
        { sender: req.user._id, receiver: receiverId },
        { sender: receiverId,   receiver: req.user._id }
      ]
    });

    if (exists)
      return res.status(400).json({ message: "Connection already exists" });

    await Connection.create({ sender: req.user._id, receiver: receiverId });

    // Notify receiver
    await Notification.create({
      recipient: receiverId,
      sender:    req.user._id,
      type:      "connect_request",
      message:   "sent you a connection request"
    });

    res.json({ message: "Connection request sent" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET MY PENDING REQUESTS (received) ──────────────────────────────────────
export const getMyRequests = async (req, res) => {
  try {
    const requests = await Connection.find({
      receiver: req.user._id,
      status:   "pending"
    }).populate("sender", "name username profilePicture");

    res.json(requests);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── ACCEPT CONNECTION ────────────────────────────────────────────────────────
// Frontend sends the sender's userId (not connection _id)
export const acceptConnection = async (req, res) => {
  try {
    const senderId = req.params.id;  // the user who sent the request

    const request = await Connection.findOne({
      sender:   senderId,
      receiver: req.user._id,
      status:   "pending"
    });

    if (!request)
      return res.status(404).json({ message: "Request not found" });

    request.status = "accepted";
    await request.save();

    // Notify the original sender that their request was accepted
    await Notification.create({
      recipient: senderId,
      sender:    req.user._id,
      type:      "connect_accept",
      message:   "accepted your connection request"
    });

    res.json({ message: "Connection accepted" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── REJECT / REMOVE CONNECTION ───────────────────────────────────────────────
// Frontend sends the sender's userId
export const rejectConnection = async (req, res) => {
  try {
    const senderId = req.params.id;

    const request = await Connection.findOneAndDelete({
      sender:   senderId,
      receiver: req.user._id,
      status:   "pending"
    });

    if (!request)
      return res.status(404).json({ message: "Request not found" });

    res.json({ message: "Request removed" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET MY CONNECTIONS ───────────────────────────────────────────────────────
export const getMyConnections = async (req, res) => {
  try {
    const connections = await Connection.find({
      status: "accepted",
      $or: [{ sender: req.user._id }, { receiver: req.user._id }]
    }).populate("sender receiver", "name username profilePicture");

    res.json(connections);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET CONNECTION STATUS WITH A USER ───────────────────────────────────────
// Returns: { status: "none" | "pending_sent" | "pending_received" | "connected" }
export const getConnectionStatus = async (req, res) => {
  try {
    const otherId = req.params.id;
    const myId    = req.user._id;

    const conn = await Connection.findOne({
      $or: [
        { sender: myId,     receiver: otherId },
        { sender: otherId,  receiver: myId    }
      ]
    });

    if (!conn)
      return res.json({ status: "none" });

    if (conn.status === "accepted")
      return res.json({ status: "connected" });

    // pending — figure out direction
    if (String(conn.sender) === String(myId))
      return res.json({ status: "pending_sent" });

    return res.json({ status: "pending_received" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET ANY USER'S CONNECTIONS (public) ──────────────────────────────────────
export const getUserConnections = async (req, res) => {
  try {
    const userId = req.params.userId;
    const connections = await Connection.find({
      status: "accepted",
      $or: [{ sender: userId }, { receiver: userId }]
    }).populate("sender receiver", "name username profilePicture");

    // Return the "other" person from each connection
    const people = connections.map((c) => {
      const other = String(c.sender._id) === String(userId) ? c.receiver : c.sender;
      return { _id: other._id, name: other.name, username: other.username, profilePicture: other.profilePicture };
    });

    res.json(people);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};