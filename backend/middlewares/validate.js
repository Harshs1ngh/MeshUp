// 📁 backend/middlewares/validate.js
// Input validation using pure JS — no external deps needed.
// Each validator returns an array of error strings (empty = valid).

/* ── Helper ── */
const err = (msg) => [msg];

/* ─── Generic validate middleware factory ─────────────────────────────────────
   Usage: validate(schemas.register)
   schema is a function: (body) => string[]  (list of errors)
──────────────────────────────────────────────────────────────────────────────*/
export const validate = (schema) => (req, res, next) => {
  const errors = schema(req.body);
  if (errors.length > 0)
    return res.status(400).json({ message: errors[0], errors });
  next();
};

/* ─── Param validation middleware factory ─────────────────────────────────────
   Usage: validateParam("id")  — checks req.params.id is a valid MongoDB ObjectId
──────────────────────────────────────────────────────────────────────────────*/
const MONGO_ID_RE = /^[a-f\d]{24}$/i;

export const validateParam = (...paramNames) => (req, res, next) => {
  for (const name of paramNames) {
    const val = req.params[name];
    if (!val || !MONGO_ID_RE.test(val))
      return res.status(400).json({ message: `Invalid ${name} parameter` });
  }
  next();
};

/* ─── Schemas ─────────────────────────────────────────────────────────────── */

/* Shared validators */
const isEmail    = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isUrl      = (v) => { try { new URL(v); return true; } catch { return false; } };
const isSafeStr  = (v) => typeof v === "string" && v.length <= 1000;
const notEmpty   = (v) => typeof v === "string" && v.trim().length > 0;
const maxLen     = (v, n) => typeof v === "string" && v.length <= n;

export const schemas = {

  /* ── Auth ── */
  register: ({ name, email, username, password }) => {
    if (!notEmpty(name))                return err("Name is required");
    if (!maxLen(name, 80))              return err("Name too long (max 80)");
    if (!notEmpty(email))               return err("Email is required");
    if (!isEmail(email))                return err("Invalid email address");
    if (!notEmpty(username))            return err("Username is required");
    if (!/^[a-z0-9_]{3,30}$/.test(username))
                                        return err("Username must be 3-30 chars: lowercase letters, numbers, underscores only");
    if (!notEmpty(password))            return err("Password is required");
    if (password.length < 8)            return err("Password must be at least 8 characters");
    if (password.length > 128)          return err("Password too long");
    return [];
  },

  login: ({ email, password }) => {
    if (!notEmpty(email))               return err("Email is required");
    if (!isEmail(email))                return err("Invalid email");
    if (!notEmpty(password))            return err("Password is required");
    if (password.length > 128)          return err("Invalid credentials");
    return [];
  },

  forgotPassword: ({ email }) => {
    if (!notEmpty(email))               return err("Email is required");
    if (!isEmail(email))                return err("Invalid email");
    return [];
  },

  resetPassword: ({ email, otp, newPassword }) => {
    if (!notEmpty(email))               return err("Email is required");
    if (!isEmail(email))                return err("Invalid email");
    if (!notEmpty(otp))                 return err("Code is required");
    if (!/^\d{6}$/.test(otp))          return err("Code must be 6 digits");
    if (!notEmpty(newPassword))         return err("New password is required");
    if (newPassword.length < 8)         return err("Password must be at least 8 characters");
    if (newPassword.length > 128)       return err("Password too long");
    return [];
  },

  /* ── Profile ── */
  updateUserInfo: ({ name, username, email }) => {
    if (name    !== undefined && !notEmpty(name))         return err("Name cannot be empty");
    if (name    !== undefined && !maxLen(name, 80))       return err("Name too long");
    if (username !== undefined && !/^[a-z0-9_]{3,30}$/.test(username))
                                                          return err("Invalid username format");
    if (email   !== undefined && !isEmail(email))         return err("Invalid email");
    return [];
  },

  updateProfile: (body) => {
    const { headline, bio, location, website, skills } = body;
    if (headline !== undefined && !maxLen(headline, 220))  return err("Headline max 220 chars");
    if (bio      !== undefined && !maxLen(bio, 2600))      return err("Bio max 2600 chars");
    if (location !== undefined && !maxLen(location, 100))  return err("Location max 100 chars");
    if (website  !== undefined && website !== "" && !isUrl("https://" + website.replace(/^https?:\/\//,"")))
                                                           return err("Invalid website URL");
    if (skills !== undefined) {
      if (!Array.isArray(skills))                          return err("Skills must be an array");
      if (skills.length > 50)                              return err("Maximum 50 skills");
      if (skills.some(s => typeof s !== "string" || s.length > 60))
                                                           return err("Each skill max 60 chars");
    }
    return [];
  },

  /* ── Posts ── */
  createPost: (body) => {
    // body or file — controller handles file. We only validate text here.
    if (body.body !== undefined && !maxLen(body.body, 3000))
                                                return err("Post too long (max 3000 chars)");
    return [];
  },

  /* ── Comments ── */
  addComment: ({ postId, body }) => {
    if (!notEmpty(postId) || !MONGO_ID_RE.test(postId))  return err("Invalid post ID");
    if (!notEmpty(body))                                  return err("Comment cannot be empty");
    if (!maxLen(body, 1000))                              return err("Comment max 1000 chars");
    return [];
  },

  /* ── Messages ── */
  sendMessage: ({ conversationId, body }) => {
    if (!conversationId || !MONGO_ID_RE.test(conversationId))
                                                  return err("Invalid conversation ID");
    if (!notEmpty(body))                          return err("Message cannot be empty");
    if (!maxLen(body, 2000))                      return err("Message max 2000 chars");
    return [];
  },

  editMessage: ({ body }) => {
    if (!notEmpty(body))                          return err("Message cannot be empty");
    if (!maxLen(body, 2000))                      return err("Message max 2000 chars");
    return [];
  },

  deleteMessage: ({ deleteFor }) => {
    if (!["everyone", "me"].includes(deleteFor))  return err("deleteFor must be 'everyone' or 'me'");
    return [];
  },

  /* ── Progress ── */
  addSite: ({ name, url }) => {
    if (!notEmpty(name))                          return err("Site name is required");
    if (!maxLen(name, 100))                       return err("Site name max 100 chars");
    if (!notEmpty(url))                           return err("URL is required");
    if (!maxLen(url, 500))                        return err("URL too long");
    return [];
  },

  startSession: ({ siteId }) => {
    if (!siteId || !MONGO_ID_RE.test(siteId))    return err("Invalid site ID");
    return [];
  },

  endSession: ({ sessionId }) => {
    if (!sessionId || !MONGO_ID_RE.test(sessionId))
                                                  return err("Invalid session ID");
    return [];
  },
};