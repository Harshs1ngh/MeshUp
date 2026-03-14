// 📁 backend/controllers/user.controller.js
import User    from "../models/user.model.js";
import bcrypt  from "bcrypt";
import Profile from "../models/profile.model.js";
import Connection from "../models/connection.model.js";
import jwt     from "jsonwebtoken";

export const check = async (req, res) => {
  res.status(200).json({ message: "Working fine" });
};

export const register = async (req, res) => {
  const { name, email, username, password } = req.body;
  if (!name || !email || !username || !password)
    return res.status(400).json({ message: "Missing fields" });
  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) return res.status(400).json({ message: "User exists" });
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, username, password: hash });
  await Profile.create({ userId: user._id });
  res.status(201).json({ message: "Registered" });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user) return res.status(404).json({ message: "User not found" });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Wrong password" });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, { 
  httpOnly: true, 
  secure: true,        //  required for HTTPS
  sameSite: "none",    //  allows cross-domain cookies as the backend and frontend are hosted in diff sites
  maxAge: 7 * 24 * 60 * 60 * 1000 
});
  res.json({ message: "Logged in" });
};

export const logout = async (req, res) => {
  res.clearCookie("token", { httpOnly: true, sameSite: "strict" });
  res.json({ message: "Logged out" });
};

// ─── GET MY PROFILE (/me) — now includes connection count ────────────────────
export const getUserAndProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id })
      .populate("userId", "name email username profilePicture");
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    // ✅ Count real connections
    const connectionCount = await Connection.countDocuments({
      status: "accepted",
      $or: [{ sender: req.user._id }, { receiver: req.user._id }]
    });

    const result = profile.toObject();
    result.connectionCount = connectionCount;

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET ANY USER PROFILE BY USERNAME ────────────────────────────────────────
export const getProfileByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    const profile = await Profile.findOne({ userId: user._id })
      .populate("userId", "name email username profilePicture");
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    // Count their connections
    const connectionCount = await Connection.countDocuments({
      status: "accepted",
      $or: [{ sender: user._id }, { receiver: user._id }]
    });

    // Check connection status between viewer and this user
    const conn = await Connection.findOne({
      $or: [
        { sender: req.user._id, receiver: user._id },
        { sender: user._id,     receiver: req.user._id }
      ]
    });

    let connectionStatus = "none";
    if (conn) {
      if (conn.status === "accepted") connectionStatus = "connected";
      else if (String(conn.sender) === String(req.user._id)) connectionStatus = "pending_sent";
      else connectionStatus = "pending_received";
    }

    const result = profile.toObject();
    result.connectionCount  = connectionCount;
    result.connectionStatus = connectionStatus;

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const allowedFields = ["name", "username", "email"];
    const updates = {};
    allowedFields.forEach((field) => { if (req.body[field]) updates[field] = req.body[field]; });
    if (updates.email || updates.username) {
      const exists = await User.findOne({
        $or: [{ email: updates.email }, { username: updates.username }],
        _id: { $ne: req.user._id },
      });
      if (exists) return res.status(400).json({ message: "Already taken" });
    }
    Object.assign(req.user, updates);
    await req.user.save();
    res.json({ message: "User updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateProfileData = async (req, res) => {
  try {
    let profile = await Profile.findOne({ userId: req.user._id });
    if (!profile) profile = new Profile({ userId: req.user._id });
    const allowedFields = ["bio","headline","location","website","skills","workExperience","education"];
    allowedFields.forEach((field) => { if (req.body[field] !== undefined) profile[field] = req.body[field]; });
    await profile.save();
    const updated = await Profile.findById(profile._id)
      .populate("userId", "name email username profilePicture");
    res.json({ message: "Profile updated", profile: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const upload_profile_picture = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file" });
    req.user.profilePicture = req.file.filename;
    await req.user.save();
    res.json({ message: "Profile picture updated", filename: req.file.filename });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const get_all_users = async (req, res) => {
  try {
    const profiles = await Profile.find()
      .populate("userId", "name username email profilePicture");
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── FORGOT PASSWORD — sends OTP ──────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select("+resetOtp +resetOtpExpiry");

    // Always respond OK to prevent email enumeration
    if (!user) return res.json({ message: "If that email exists, a code was sent." });

    // Generate 6-digit OTP
    const otp    = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Hash OTP before storing
    const hashed = await bcrypt.hash(otp, 10);
    user.resetOtp       = hashed;
    user.resetOtpExpiry = expiry;
    await user.save();

    // In production: send email here via nodemailer/SendGrid etc.
    // For development we return the OTP directly in the response
    console.log(`[DEV] Reset OTP for ${email}: ${otp}`);

    res.json({
      message: "If that email exists, a code was sent.",
      // ── DEV ONLY: remove this in production ──
      devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── RESET PASSWORD — verifies OTP and sets new password ─────────────────────
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: "Email, OTP and new password are required" });

    if (newPassword.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select("+password +resetOtp +resetOtpExpiry");

    if (!user || !user.resetOtp || !user.resetOtpExpiry)
      return res.status(400).json({ message: "Invalid or expired code" });

    if (user.resetOtpExpiry < new Date())
      return res.status(400).json({ message: "Code has expired. Please request a new one." });

    const match = await bcrypt.compare(otp, user.resetOtp);
    if (!match) return res.status(400).json({ message: "Incorrect code" });

    // Set new password and clear OTP
    user.password       = await bcrypt.hash(newPassword, 12);
    user.resetOtp       = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const upload_cover_photo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file" });

    let profile = await Profile.findOne({ userId: req.user._id });
    if (!profile) profile = new Profile({ userId: req.user._id });

    profile.coverPhoto = req.file.filename;
    await profile.save();

    const updated = await Profile.findById(profile._id)
      .populate("userId", "name username email profilePicture");
    res.json({ message: "Cover updated", filename: req.file.filename, profile: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};