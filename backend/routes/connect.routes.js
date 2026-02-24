import { Router } from "express";
import { protect } from "../middlewares/auth.js";

import {
  sendConnectionRequest,
  getMyRequests,
  acceptConnection,
  rejectConnection,
  getMyConnections
} from "../controllers/connect.controller.js";

const router = Router();

router.post("/connect/:id", protect, sendConnectionRequest);

router.get("/connections/requests", protect, getMyRequests);

router.put("/connections/accept/:id", protect, acceptConnection);

router.delete("/connections/reject/:id", protect, rejectConnection);

router.get("/connections", protect, getMyConnections);

export default router;
