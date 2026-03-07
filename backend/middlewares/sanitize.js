// 📁 backend/middlewares/sanitize.js
// Guards against XSS in text fields and NoSQL injection via $ keys.
// Applied globally before routes — req.body is cleaned in place.

/* ─── Strip HTML tags from a string (XSS prevention) ─────────────────────── */
const stripHtml = (str) =>
  typeof str === "string"
    ? str.replace(/<[^>]*>/g, "").replace(/javascript:/gi, "").trim()
    : str;

/* ─── Recursively sanitize all string values in an object ────────────────── */
const sanitizeObj = (obj, depth = 0) => {
  if (depth > 10 || obj === null || typeof obj !== "object") return obj;

  for (const key of Object.keys(obj)) {
    // ── NoSQL injection: reject any key starting with $ or containing . ──
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
      continue;
    }

    const val = obj[key];
    if (typeof val === "string") {
      obj[key] = stripHtml(val);
    } else if (Array.isArray(val)) {
      obj[key] = val.map((item) =>
        typeof item === "string" ? stripHtml(item) : sanitizeObj(item, depth + 1)
      );
    } else if (typeof val === "object") {
      obj[key] = sanitizeObj(val, depth + 1);
    }
  }

  return obj;
};

/* ─── Express middleware ──────────────────────────────────────────────────── */
export const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    sanitizeObj(req.body);
  }
  next();
};

/* ─── Sanitize URL params ─────────────────────────────────────────────────── */
export const sanitizeParams = (req, res, next) => {
  // Prevent path traversal in params
  for (const key of Object.keys(req.params)) {
    req.params[key] = req.params[key]
      .replace(/\.\./g, "")
      .replace(/[<>'"]/g, "")
      .trim();
  }
  next();
};