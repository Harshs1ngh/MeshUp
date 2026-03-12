// 📁 backend/routes/post.routes.js
import { Router } from "express";

import {
  getFeed, createPost, deletePost,
  toggleLike, getUserPosts, getActivityHeatmap,
} from "../controllers/post.controller.js";

import { protect }                          from "../middlewares/auth.js";
import { apiLimiter, uploadLimiter }        from "../middlewares/rateLimiters.js";
import { validate, validateParam, schemas } from "../middlewares/validate.js";
import { postMediaUpload, handleUploadError, validateFileType } from "../middlewares/upload.js";

const router = Router();

// ─── Feed ─────────────────────────────────────────────────────────────────────
router.get("/feed",
  protect,
  apiLimiter,
  getFeed,
);

// ─── User posts + heatmap ──────────────────────────────────────────────────────
router.get("/posts/user/:userId",
  protect,
  apiLimiter,
  validateParam("userId"),       // ensures it's a valid 24-char ObjectId
  getUserPosts,
);

router.get("/posts/heatmap/:userId",
  protect,
  apiLimiter,
  validateParam("userId"),
  getActivityHeatmap,
);

// ─── Create post ──────────────────────────────────────────────────────────────
router.post("/post",
  protect,
  uploadLimiter,
  postMediaUpload.single("media"),
  handleUploadError,
  validateFileType(true),        // magic-byte check (images + video)
  validate(schemas.createPost),
  createPost,
);

// ─── Delete post (only own posts — controller enforces ownership) ─────────────
router.delete("/post/:id",
  protect,
  apiLimiter,
  validateParam("id"),
  deletePost,
);

// ─── Like / Unlike ────────────────────────────────────────────────────────────
router.put("/like/:id",
  protect,
  apiLimiter,
  validateParam("id"),
  toggleLike,
);

export default router;