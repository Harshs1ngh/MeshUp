// 📁 backend/user.routes.js
import { Router } from "express";

import {
  login, logout, register,
  upload_profile_picture, upload_cover_photo,
  updateUserProfile, getUserAndProfile,
  getProfileByUsername, updateProfileData,
  get_all_users, check,
  forgotPassword, resetPassword,
} from "../controllers/user.controller.js";

import { protect }                                    from "../middlewares/auth.js";
import { authLimiter, otpLimiter, apiLimiter, uploadLimiter } from "../middlewares/rateLimiters.js";
import { validate, validateParam, schemas }           from "../middlewares/validate.js";
import { profilePicUpload, coverPhotoUpload, handleUploadError } from "../middlewares/upload.js";

const router = Router();

// ─── Health check ──────────────────────────────────────────────────────────────
router.get("/", check);

// ─── Auth (public) ────────────────────────────────────────────────────────────
router.post("/register",
  authLimiter,
  validate(schemas.register),
  register,
);

router.post("/login",
  authLimiter,
  validate(schemas.login),
  login,
);

router.post("/logout",
  protect,              // must be logged in to log out (prevents CSRF logout)
  logout,
);

// ─── Forgot / Reset password — strictest rate limits ──────────────────────────
router.post("/forgot-password",
  otpLimiter,
  validate(schemas.forgotPassword),
  forgotPassword,
);

router.post("/reset-password",
  otpLimiter,
  validate(schemas.resetPassword),
  resetPassword,
);

// ─── My profile ───────────────────────────────────────────────────────────────
router.get("/me",
  protect,
  apiLimiter,
  getUserAndProfile,
);

router.put("/update",
  protect,
  apiLimiter,
  validate(schemas.updateUserInfo),
  updateUserProfile,
);

router.put("/profile",
  protect,
  apiLimiter,
  validate(schemas.updateProfile),
  updateProfileData,
);

// ─── Profile picture upload ───────────────────────────────────────────────────
router.post("/upload_profilePic",
  protect,
  uploadLimiter,
  profilePicUpload.single("profilePic"),
  handleUploadError,
  upload_profile_picture,
);

// ─── Cover photo upload ───────────────────────────────────────────────────────
router.post("/upload_coverPhoto",
  protect,
  uploadLimiter,
  coverPhotoUpload.single("coverPhoto"),
  handleUploadError,
  upload_cover_photo,
);

// ─── Public profile (must come AFTER /me, /update so :username doesn't eat them)
router.get("/profile/:username",
  protect,
  apiLimiter,
  getProfileByUsername,
);

// ─── All users (network suggestions) ─────────────────────────────────────────
router.get("/users",
  protect,
  apiLimiter,
  get_all_users,
);

export default router;