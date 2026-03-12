// 📁 backend/routes/connect.routes.js
import { Router } from "express";

import {
  sendConnectionRequest,
  getMyRequests,
  acceptConnection,
  rejectConnection,
  getMyConnections,
  getConnectionStatus,
  getUserConnections,
} from "../controllers/connect.controller.js";

import { protect }             from "../middlewares/auth.js";
import { apiLimiter }          from "../middlewares/rateLimiters.js";
import { validateParam }       from "../middlewares/validate.js";

const router = Router();

// ── IMPORTANT: Specific routes BEFORE wildcard (:id) routes ──────────────────

// ─── Get pending requests received ────────────────────────────────────────────
router.get("/connections/requests",
  protect,
  apiLimiter,
  getMyRequests,
);

// ─── Get connection status with a specific user ────────────────────────────────
router.get("/connections/status/:id",
  protect,
  apiLimiter,
  validateParam("id"),
  getConnectionStatus,
);

// ─── Get someone else's connections (public) ──────────────────────────────────
router.get("/connections/user/:userId",
  protect,
  apiLimiter,
  validateParam("userId"),
  getUserConnections,
);

// ─── Get my accepted connections ──────────────────────────────────────────────
router.get("/connections",
  protect,
  apiLimiter,
  getMyConnections,
);

// ─── Send connection request ───────────────────────────────────────────────────
router.post("/connect/:id",
  protect,
  apiLimiter,
  validateParam("id"),
  sendConnectionRequest,
);

// ─── Accept request ────────────────────────────────────────────────────────────
router.put("/connections/accept/:id",
  protect,
  apiLimiter,
  validateParam("id"),
  acceptConnection,
);

// ─── Reject / withdraw request ────────────────────────────────────────────────
router.delete("/connections/reject/:id",
  protect,
  apiLimiter,
  validateParam("id"),
  rejectConnection,
);

export default router;