import { Router } from "express";
import multer from "multer";
import crypto from "crypto";

import {
  login,
  register,
  upload_profile_picture,
  updateUserProfile,
  getUserAndProfile,
  updateProfileData,
  get_all_users,
  check
} from "../controllers/user.controller.js";

import { protect } from "../middlewares/auth.js";

const router = Router();

// ---------- Multer Setup ----------

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    const name = crypto.randomBytes(16).toString("hex");
    cb(null, `${name}.${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image"))
      return cb(new Error("Only images allowed"));
    cb(null, true);
  }
});

router.route('/register').post(register);
router.route('/login').post(login);

router.route('/').get(check);

router
  .route("/me")
  .get(protect, getUserAndProfile);

router
  .route("/update")
  .put(protect, updateUserProfile);

router
  .route("/profile")
  .put(protect, updateProfileData);

router
  .route("/users")
  .get(protect, get_all_users);

router 
  .route("/upload_profilePic")
  .get(protect, upload_profile_picture);



export default router;