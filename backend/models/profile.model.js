import mongoose from "mongoose";

const educationSchema = new mongoose.Schema(
  {
    school: String,
    degree: String,
    fieldOfStudy: String,
    startDate: Date,
    endDate: Date
  },
  { _id: false }
);

const workSchema = new mongoose.Schema(
  {
    company: String,
    position: String,
    startDate: Date,
    endDate: Date,
    isCurrent: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },

    bio: {
      type: String,
      maxlength: 500,
      default: ""
    },

    headline: {
      type: String,
      default: ""
    },

    location: {
      type: String,
      default: ""
    },

    skills: {
      type: [String],
      default: []
    },

    website: {
      type: String,
      default: ""
    },

    workExperience: {
      type: [workSchema],
      default: []
    },

    education: {
      type: [educationSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Profile", profileSchema);
