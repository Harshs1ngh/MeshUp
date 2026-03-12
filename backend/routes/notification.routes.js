// 📁 backend/routes/notification.routes.js
import { Router } from "express";

import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../controllers/notification.controller.js";

import { protect }       from "../middlewares/auth.js";
import { apiLimiter }    from "../middlewares/rateLimiters.js";
import { validateParam } from "../middlewares/validate.js";

const router = Router();

// ── Specific routes BEFORE /:id wildcard ──────────────────────────────────────

// ─── Get all notifications ────────────────────────────────────────────────────
router.get("/notifications",
  protect,
  apiLimiter,
  getMyNotifications,
);

// ─── Get unread count (for bell badge) ────────────────────────────────────────
router.get("/notifications/unread-count",
  protect,
  apiLimiter,
  getUnreadCount,
);

// ─── Mark ALL as read ─────────────────────────────────────────────────────────
router.put("/notifications/read-all",
  protect,
  apiLimiter,
  markAllAsRead,
);

// ─── Mark single notification as read ─────────────────────────────────────────
router.put("/notifications/:id/read",
  protect,
  apiLimiter,
  validateParam("id"),
  markAsRead,
);

// ─── Delete a notification ────────────────────────────────────────────────────
router.delete("/notifications/:id",
  protect,
  apiLimiter,
  validateParam("id"),
  deleteNotification,
);

export default router;