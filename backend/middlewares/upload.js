import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

// ─── Cloudinary config ────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Cloudinary storage buckets ───────────────────────────────────────────────
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          "meshup",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    resource_type:   "image",
  },
});

const mediaStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          "meshup",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "mp4", "webm"],
    resource_type:   "auto",
  },
});

// ─── MIME type filters ────────────────────────────────────────────────────────
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

// ─── Named upload handlers ────────────────────────────────────────────────────
export const profilePicUpload = multer({
  storage:    imageStorage,
  limits:     { fileSize: 5  * 1024 * 1024, files: 1 },
  fileFilter: imageFilter,
});

export const coverPhotoUpload = multer({
  storage:    imageStorage,
  limits:     { fileSize: 8  * 1024 * 1024, files: 1 },
  fileFilter: imageFilter,
});

export const postMediaUpload = multer({
  storage:    mediaStorage,
  limits:     { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: mediaFilter,
});

// ─── Multer error handler ─────────────────────────────────────────────────────
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