import { Router } from "express";
import { protect } from "../middlewares/auth.js";
import {
  addComment,
  getComments,
  deleteComment
} from "../controllers/comment.controller.js";

const router = Router();

router.post("/comment", protect, addComment);

router.get("/comments/:postId", protect, getComments);

router.delete("/comment/:id", protect, deleteComment);

export default router;
