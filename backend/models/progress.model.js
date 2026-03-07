// 📁 backend/models/progress.model.js
import mongoose from "mongoose";

// A website the user wants to track time on
const trackedSiteSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name:      { type: String, required: true, trim: true },
  url:       { type: String, required: true, trim: true },
  favicon:   { type: String, default: "" },         // stored favicon URL (google S2 or custom)
  totalTime: { type: Number, default: 0 },           // total accumulated seconds
  lastVisit: { type: Date,   default: null },
}, { timestamps: true });

// An individual session for one tracked site
const sessionSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  siteId:    { type: mongoose.Schema.Types.ObjectId, ref: "TrackedSite", required: true, index: true },
  startedAt: { type: Date, required: true },
  endedAt:   { type: Date, default: null },
  duration:  { type: Number, default: 0 },  // seconds
  isOpen:    { type: Boolean, default: true }, // true = session still active / not yet saved
}, { timestamps: true });

export const TrackedSite = mongoose.model("TrackedSite", trackedSiteSchema);
export const Session     = mongoose.model("Session",     sessionSchema);