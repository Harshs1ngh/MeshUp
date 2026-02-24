
import User from "../models/user.model.js";
import bcrypt from 'bcrypt';
import Profile from "../models/profile.model.js";
import jwt from "jsonwebtoken";


export const check = async(req,res) => {
  try{
    return res.status(200).json({message: "Working fine birrooo"});
  }catch(err){
    return res.status(500).json({message: err.message});
  }
};

export const register = async (req, res) => {
    const { name, email, username, password } = req.body;

    if (!name || !email || !username || !password)
        return res.status(400).json({ message: "Missing fields" });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ message: "User exists" });

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
        name, email, username, password: hash
    });

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

    res.cookie("token", token, { httpOnly: true, sameSite: "strict" });

    res.json({ message: "Logged in" });
};


export const upload_profile_picture = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file" });

    req.user.profilePicture = req.file.filename;
    await req.user.save();

    res.json({ message: "Updated" });
};


export const updateUserProfile = async (req, res) => {
  try {
    const allowedFields = ["name", "username", "email"];
    const updates = {};

    allowedFields.forEach(field => {
      if (req.body[field]) updates[field] = req.body[field];
    });

    if (updates.email || updates.username) {
      const exists = await User.findOne({
        $or: [{ email: updates.email }, { username: updates.username }],
        _id: { $ne: req.user._id }
      });

      if (exists)
        return res.status(400).json({ message: "Already taken" });
    }

    Object.assign(req.user, updates);
    await req.user.save();

    res.json({ message: "User updated" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



export const getUserAndProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id })
      .populate("userId", "name email username profilePicture");

    if (!profile)
      return res.status(404).json({ message: "Profile not found" });

    res.json(profile);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};




export const updateProfileData = async (req, res) => {
  try {
    let profile = await Profile.findOne({ userId: req.user._id });

    if (!profile) {
      profile = new Profile({ userId: req.user._id });
    }

    Object.assign(profile, req.body);
    await profile.save();

    res.json({ message: "Profile updated", profile });

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
