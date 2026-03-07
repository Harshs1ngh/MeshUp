// 📁 backend/middlewares/rateLimiters.js
import rateLimit from "express-rate-limit";

/* ── Shared response formatter ── */
const handler = (req, res) =>
  res.status(429).json({
    message: "Too many requests. Please slow down and try again later.",
  });

/* ─── Auth routes (login / register / forgot-password)
   Tightest limit — prevents brute force and credential stuffing.
   5 attempts per 15 minutes per IP.                               ──────────── */
export const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,  // 15 minutes
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  handler,
  skipSuccessfulRequests: true,      // only failed attempts count toward limit
});

/* ─── OTP / password-reset routes
   Extra strict — prevents code enumeration attacks.
   3 attempts per 10 minutes.                                       ──────────── */
export const otpLimiter = rateLimit({
  windowMs:        10 * 60 * 1000,  // 10 minutes
  max:             3,
  standardHeaders: true,
  legacyHeaders:   false,
  handler,
});

/* ─── General API routes (feed, profile, connections etc.)
   Generous for normal use, still caps abuse.
   100 requests per minute.                                         ──────────── */
export const apiLimiter = rateLimit({
  windowMs:        60 * 1000,        // 1 minute
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  handler,
});

/* ─── Upload routes (profile pic, cover photo, post media)
   Prevents storage exhaustion.
   20 uploads per hour.                                             ──────────── */
export const uploadLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,  // 1 hour
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  handler,
});

/* ─── Messaging routes
   Higher limit for chat feel, still throttled.
   200 per minute.                                                  ──────────── */
export const messageLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             200,
  standardHeaders: true,
  legacyHeaders:   false,
  handler,
});