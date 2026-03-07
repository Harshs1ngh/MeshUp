// 📁 backend/models/user.model.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name:           { type: String, required: true, trim: true },
    username:       { type: String, required: true, unique: true, trim: true, lowercase: true },
    email:          { type: String, required: true, unique: true, trim: true, lowercase: true },
    password:       { type: String, required: true, select: false },
    profilePicture: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);