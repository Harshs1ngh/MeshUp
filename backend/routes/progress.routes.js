// 📁 backend/routes/progress.routes.js
import { Router } from "express";

import {
  getSites, addSite, deleteSite,
  startSession, endSession,
  closeOpenSessions, getSiteSessions,
} from "../controllers/progress.controller.js";

import { protect }                          from "../middlewares/auth.js";
import { apiLimiter }                       from "../middlewares/rateLimiters.js";
import { validate, validateParam, schemas } from "../middlewares/validate.js";

const router = Router();

// ── Specific routes BEFORE /:id wildcard ──────────────────────────────────────

// ─── Sites CRUD ───────────────────────────────────────────────────────────────
router.get("/progress/sites",
  protect,
  apiLimiter,
  getSites,
);

router.post("/progress/sites",
  protect,
  apiLimiter,
  validate(schemas.addSite),
  addSite,
);

router.delete("/progress/sites/:id",
  protect,
  apiLimiter,
  validateParam("id"),
  deleteSite,
);

// ─── Sessions ─────────────────────────────────────────────────────────────────
router.post("/progress/sessions/start",
  protect,
  apiLimiter,
  validate(schemas.startSession),
  startSession,
);

router.post("/progress/sessions/end",
  protect,
  apiLimiter,
  validate(schemas.endSession),
  endSession,
);

router.post("/progress/sessions/close-all",
  protect,
  apiLimiter,
  closeOpenSessions,
);

// ─── Session history for a site ────────────────────────────────────────────────
router.get("/progress/sites/:id/sessions",
  protect,
  apiLimiter,
  validateParam("id"),
  getSiteSessions,
);

export default router;