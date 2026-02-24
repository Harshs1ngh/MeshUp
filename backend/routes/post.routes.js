import { Router } from "express";
import multer from "multer";
import crypto from "crypto";

import { activecheck, createPost, deletePost, toggleLike } from "../controllers/post.controller.js";
import { protect } from "../middlewares/auth.js";

const router = Router();

// ---------- Multer Setup (same pattern as user upload) ----------

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for posts
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image") ||
      file.mimetype.startsWith("video")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only image or video allowed"));
    }
  }
});

// ---------- Routes ----------

router.get("/:name/feed", activecheck);

router.post(
  "/post",
  protect,
  upload.single("media"),
  createPost
);
router.delete("/:id", protect, deletePost);

router.put("/like/:id", protect, toggleLike);

export default router;
