// 📁 backend/middlewares/auth.js
import jwt  from "jsonwebtoken";
import User from "../models/user.model.js";

/* ─── protect ─────────────────────────────────────────────────────────────────
   Verifies the JWT stored in the httpOnly cookie.
   Attaches req.user to every protected request.
   Rejects with 401 if token missing, expired, or tampered.
──────────────────────────────────────────────────────────────────────────────*/
export const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token)
      return res.status(401).json({ message: "Not authenticated" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // TokenExpiredError vs JsonWebTokenError — give specific message
      if (err.name === "TokenExpiredError")
        return res.status(401).json({ message: "Session expired. Please sign in again." });
      return res.status(401).json({ message: "Invalid token" });
    }

    const user = await User.findById(decoded.id).select("-__v");
    if (!user)
      return res.status(401).json({ message: "Account no longer exists" });

    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ message: "Auth check failed" });
  }
};

/* ─── authorizeOwner ──────────────────────────────────────────────────────────
   Factory middleware — checks that req.user._id matches the field on a document.
   Usage: router.delete("/post/:id", protect, authorizeOwner(Post, "userId"))
   
   @param Model   — Mongoose model to query
   @param field   — field on that document that should equal req.user._id (default "userId")
   @param idParam — req.params key to use as document id (default "id")
──────────────────────────────────────────────────────────────────────────────*/
export const authorizeOwner = (Model, field = "userId", idParam = "id") => {
  return async (req, res, next) => {
    try {
      const doc = await Model.findById(req.params[idParam]);
      if (!doc)
        return res.status(404).json({ message: "Not found" });

      if (String(doc[field]) !== String(req.user._id))
        return res.status(403).json({ message: "Forbidden — not your resource" });

      req.doc = doc; // pass to controller so it doesn't need to re-query
      next();
    } catch (err) {
      res.status(500).json({ message: "Authorization check failed" });
    }
  };
};