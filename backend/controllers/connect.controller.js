import Connection from "../models/connection.model.js";




// SEND CONNECTION REQUEST
export const sendConnectionRequest = async (req, res) => {
  try {
    const receiverId = req.params.id;

    if (String(receiverId) === String(req.user._id))
      return res.status(400).json({ message: "Cannot connect with yourself" });

    const exists = await Connection.findOne({
      $or: [
        { sender: req.user._id, receiver: receiverId },
        { sender: receiverId, receiver: req.user._id }
      ]
    });

    if (exists)
      return res.status(400).json({ message: "Connection already exists" });

    await Connection.create({
      sender: req.user._id,
      receiver: receiverId
    });

    res.json({ message: "Connection request sent" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};





// GET MY PENDING REQUESTS
export const getMyRequests = async (req, res) => {
  try {
    const requests = await Connection.find({
      receiver: req.user._id,
      status: "pending"
    }).populate("sender", "name username profilePicture");

    res.json(requests);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};





// ACCEPT CONNECTION REQUEST
export const acceptConnection = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await Connection.findOne({
      _id: id,
      receiver: req.user._id,
      status: "pending"
    });

    if (!request)
      return res.status(404).json({ message: "Request not found" });

    request.status = "accepted";
    await request.save();

    res.json({ message: "Connection accepted" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};





// REJECT (DELETE)
export const rejectConnection = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await Connection.findOneAndDelete({
      _id: id,
      receiver: req.user._id,
      status: "pending"
    });

    if (!request)
      return res.status(404).json({ message: "Request not found" });

    res.json({ message: "Request removed" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};





// GET MY CONNECTIONS
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
