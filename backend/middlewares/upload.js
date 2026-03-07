// 📁 backend/middlewares/upload.js
// Centralised, hardened Multer config for all file uploads.
// Uses magic-byte validation (not just MIME type from header — that can be spoofed).

import multer from "multer";
import crypto from "crypto";
import path   from "path";
import fs     from "fs";

/* ─── Allowed magic bytes (file signatures) ────────────────────────────────
   Checking file extension and Content-Type is NOT enough — both can be faked.
   We read the first bytes of the actual file to verify real type.
──────────────────────────────────────────────────────────────────────────── */
const IMAGE_SIGNATURES = [
  { type: "image/jpeg", bytes: [0xFF, 0xD8, 0xFF] },
  { type: "image/png",  bytes: [0x89, 0x50, 0x4E, 0x47] },
  { type: "image/gif",  bytes: [0x47, 0x49, 0x46, 0x38] },
  { type: "image/webp", header: "WEBP", offset: 8 },
];

const VIDEO_SIGNATURES = [
  { type: "video/mp4",  bytes: [0x00, 0x00, 0x00] },  // ftyp box — not perfect but ok
  { type: "video/webm", bytes: [0x1A, 0x45, 0xDF, 0xA3] },
];

/* Check if buffer starts with the given bytes */
const matchesSignature = (buf, sig) => {
  if (sig.bytes) {
    return sig.bytes.every((b, i) => buf[i] === b);
  }
  if (sig.header) {
    return buf.slice(sig.offset, sig.offset + sig.header.length).toString() === sig.header;
  }
  return false;
};

export const validateFileType = (allowVideo = false) => (req, res, next) => {
  if (!req.file) return next();

  const buf = req.file.buffer || fs.readFileSync(req.file.path);
  const allSigs = allowVideo
    ? [...IMAGE_SIGNATURES, ...VIDEO_SIGNATURES]
    : IMAGE_SIGNATURES;

  const isValid = allSigs.some((sig) => matchesSignature(buf, sig));

  if (!isValid) {
    // Delete the uploaded file — it's not a real image/video
    if (req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    return res.status(400).json({ message: "Invalid file type. Only images are allowed." });
  }

  next();
};

/* ─── Shared disk storage ──────────────────────────────────────────────────── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Crypto-random filename — never use original filename (path traversal risk)
    const ext  = path.extname(file.originalname)
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "");  // strip non-safe chars
    const name = crypto.randomBytes(20).toString("hex");
    cb(null, `${name}${ext}`);
  },
});

/* ─── MIME type filter (first-pass, before magic-byte check) ──────────────── */
const imageFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowed.includes(file.mimetype))
    return cb(new Error("Only JPEG, PNG, GIF, and WebP images are allowed"), false);
  cb(null, true);
};

const mediaFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp",
                   "video/mp4", "video/webm"];
  if (!allowed.includes(file.mimetype))
    return cb(new Error("Only images and MP4/WebM videos are allowed"), false);
  cb(null, true);
};

/* ─── Named upload handlers ─────────────────────────────────────────────────
   profilePicUpload → images only, 5MB
   coverPhotoUpload → images only, 8MB
   postMediaUpload  → images + video, 50MB
──────────────────────────────────────────────────────────────────────────── */
export const profilePicUpload = multer({
  storage,
  limits:     { fileSize: 5  * 1024 * 1024, files: 1 },
  fileFilter: imageFilter,
});

export const coverPhotoUpload = multer({
  storage,
  limits:     { fileSize: 8  * 1024 * 1024, files: 1 },
  fileFilter: imageFilter,
});

export const postMediaUpload = multer({
  storage,
  limits:     { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: mediaFilter,
});

/* ─── Multer error handler middleware ────────────────────────────────────────
   Put this AFTER any route that uses multer so multer errors are caught nicely.
──────────────────────────────────────────────────────────────────────────── */
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE")
      return res.status(400).json({ message: "File too large" });
    if (err.code === "LIMIT_UNEXPECTED_FILE")
      return res.status(400).json({ message: "Unexpected file field" });
    return res.status(400).json({ message: err.message });
  }
  if (err) return res.status(400).json({ message: err.message });
  next();
};