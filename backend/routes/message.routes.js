// 📁 backend/routes/message.routes.js
import { Router } from "express";

import {
  getOrCreateConversation, getMyConversations,
  getMessages, sendMessage, editMessage,
  deleteMessage, getTotalUnread,
} from "../controllers/message.controller.js";

import { protect }                          from "../middlewares/auth.js";
import { messageLimiter, apiLimiter }       from "../middlewares/rateLimiters.js";
import { validate, validateParam, schemas } from "../middlewares/validate.js";

const router = Router();

// ── IMPORTANT: specific paths BEFORE /:id wildcards ──────────────────────────

// ─── List conversations ────────────────────────────────────────────────────────
router.get("/conversations",
  protect,
  apiLimiter,
  getMyConversations,
);

// ─── Total unread count (for badge in topbar) ─────────────────────────────────
router.get("/conversations/unread",
  protect,
  apiLimiter,
  getTotalUnread,
);

// ─── Get or create DM with a user ─────────────────────────────────────────────
router.get("/conversations/with/:userId",
  protect,
  apiLimiter,
  validateParam("userId"),
  getOrCreateConversation,
);

// ─── Get messages in a conversation ───────────────────────────────────────────
router.get("/conversations/:conversationId/messages",
  protect,
  apiLimiter,
  validateParam("conversationId"),
  getMessages,
);

// ─── Send a message ────────────────────────────────────────────────────────────
router.post("/messages",
  protect,
  messageLimiter,
  validate(schemas.sendMessage),
  sendMessage,
);

// ─── Edit a message (within 5 hours, sender only — controller enforces) ────────
router.put("/messages/:id",
  protect,
  messageLimiter,
  validateParam("id"),
  validate(schemas.editMessage),
  editMessage,
);

// ─── Delete a message ──────────────────────────────────────────────────────────
router.delete("/messages/:id",
  protect,
  messageLimiter,
  validateParam("id"),
  validate(schemas.deleteMessage),
  deleteMessage,
);

export default router;