// 📁 backend/models/profile.model.js
import mongoose from "mongoose";

const workSchema = new mongoose.Schema({
  company:   { type: String, default: "" },
  position:  { type: String, default: "" },
  startDate: { type: Date,   default: null },
  endDate:   { type: Date,   default: null },
  isCurrent: { type: Boolean, default: false },
}, { _id: false });

const eduSchema = new mongoose.Schema({
  school:       { type: String, default: "" },
  degree:       { type: String, default: "" },
  fieldOfStudy: { type: String, default: "" },
  startDate:    { type: Date,   default: null },
  endDate:      { type: Date,   default: null },
}, { _id: false });

const profileSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  headline:       { type: String, default: "" },
  bio:            { type: String, default: "" },
  location:       { type: String, default: "" },
  website:        { type: String, default: "" },
  skills:         [{ type: String }],
  workExperience: [workSchema],
  education:      [eduSchema],
  coverPhoto:     { type: String, default: "" },
  // ✅ Analytics fields — tracked automatically
  profileViews:   { type: Number, default: 0 },   // incremented when others view your profile
  postImpressions:{ type: Number, default: 0 },   // incremented via post likes (proxy metric)
}, { timestamps: true });

export default mongoose.model("Profile", profileSchema);