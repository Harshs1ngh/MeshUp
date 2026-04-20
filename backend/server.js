import express      from "express";
import dotenv       from "dotenv";
import cors         from "cors";
import mongoose     from "mongoose";
import cookieParser from "cookie-parser";
import path         from "path";
import { fileURLToPath } from "url";
import fs           from "fs";
import { createServer } from "http";
import { Server }   from "socket.io";
import jwt          from "jsonwebtoken";
import helmet       from "helmet";
import rateLimit    from "express-rate-limit";
import cookie       from "cookie";

import User         from "./models/user.model.js";
import { Conversation } from "./models/message.model.js";

// ─── Route imports ────────────────────────────────────────────────────────────
import userRoutes         from "./routes/user.routes.js";
import postRoutes         from "./routes/post.routes.js";
import commentRoutes      from "./routes/comment.routes.js";
import connectionRoutes   from "./routes/connect.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import messageRoutes      from "./routes/message.routes.js";
import progressRoutes     from "./routes/progress.routes.js";

// ─── Global middleware imports ────────────────────────────────────────────────
import { sanitizeBody, sanitizeParams } from "./middlewares/sanitize.js";

dotenv.config();

// ─── Env guards ───────────────────────────────────────────────────────────────
if (!process.env.MONGO_URL)   throw new Error("MONGO_URL env variable missing");
if (!process.env.JWT_SECRET)  throw new Error("JWT_SECRET env variable missing");
if (!process.env.CLIENT_URL)  console.warn("⚠️  CLIENT_URL not set — defaulting to localhost:3000");

const PORT       = process.env.PORT       || 8000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const IS_PROD    = process.env.NODE_ENV   === "production";

// ─── App + HTTP server ────────────────────────────────────────────────────────
const app        = express();
const httpServer = createServer(app);
app.set("trust proxy", 1);

// ─── Uploads directory ────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

//  SECURITY MIDDLEWARE
/*  1. Helmet — security headers */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // so this allow <img> from port 8000
    contentSecurityPolicy: IS_PROD ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'"],
        styleSrc:   ["'self'", "'unsafe-inline'"],
        imgSrc:     ["'self'", "data:", CLIENT_URL],
        connectSrc: ["'self'", CLIENT_URL],
      },
    } : false,  // disable CSP in dev for convenience
  })
);

/* ── 2. CORS — only allow our frontend ── */
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://mesh-up-olive.vercel.app",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

/* ── 3. Global rate limit (last resort — route-specific limits are tighter) ── */
app.use(rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             500,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { message: "Too many requests from this IP" },
}));

/* ── 4. Body parsing ── */
app.use(express.json({ limit: "2mb" }));       // reduced from 10mb (uploads use multipart)
app.use(express.urlencoded({ extended: false, limit: "2mb" }));
app.use(cookieParser());

/* ── 5. Global sanitization — strips XSS + NoSQL injection from all bodies ── */
app.use(sanitizeBody);
app.use(sanitizeParams);

/* ── 6. Remove X-Powered-By (don't advertise Express) ── */
app.disable("x-powered-by");

// ─── Static file serving ──────────────────────────────────────────────────────
app.use("/uploads", (req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable"); // 1 year cache
  next();
}, express.static(uploadsDir));

// ══════════════════════════════════════════════════════════════════════════════
//  ROUTES

app.use(userRoutes);
app.use(postRoutes);
app.use(commentRoutes);
app.use(connectionRoutes);
app.use(notificationRoutes);
app.use(messageRoutes);
app.use(progressRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ─── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
console.error(`[ERROR] ${req.method} ${req.path}:`,err.message);


  // Don't leak stack traces in production
  const message = IS_PROD ? "Something went wrong" : err.message;
  res.status(err.status || 500).json({ message });
});

// ══════════════════════════════════════════════════════════════════════════════
//  SOCKET.IO

const io = new Server(httpServer, {
  cors: { origin: CLIENT_URL, credentials: true },
  // Prevent memory exhaustion from too many concurrent connections
  maxHttpBufferSize: 1e6, // 1MB per socket message
});

/* ── Socket auth middleware — same JWT logic as HTTP protect ── */
io.use(async (socket, next) => {
  try {
    const rawCookie = socket.handshake.headers.cookie;
    if (!rawCookie) return next(new Error("No cookies provided"));

    const cookies = cookie.parse(rawCookie);
    const token   = cookies.token;
    if (!token) return next(new Error("No auth token"));

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return next(new Error(err.name === "TokenExpiredError"
        ? "Session expired" : "Invalid token"));
    }

    const user = await User.findById(decoded.id)
      .select("_id name username profilePicture")
      .lean();
    if (!user) return next(new Error("Account not found"));

    socket.user = user;
    next();
  } catch (err) {
    next(new Error("Socket authentication failed"));
  }
});

/* ── Online users map ── */
const onlineUsers = new Map(); // userId → socketId

io.on("connection", (socket) => {                // showes in log that which user is connected in messages 
  try {
    const userId = String(socket.user._id);
    onlineUsers.set(userId, socket.id);
    console.log(`🟢 ${socket.user.name} connected (${socket.id})`);

    // Join all existing conversation rooms
    (async () => {
      const convs = await Conversation
        .find({ participants: socket.user._id })
        .select("_id")
        .lean();
      convs.forEach((c) => socket.join(`conv:${c._id}`));
    })().catch(console.error);

    // Personal room for targeted events
    socket.join(`user:${userId}`);

    // ── Event listeners ────────────────────────────────────────────────────
    socket.on("join_conversation", (conversationId) => {
      if (conversationId && typeof conversationId === "string")
        socket.join(`conv:${conversationId}`);
    });

    socket.on("typing_start", ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conv:${conversationId}`).emit("user_typing", {
        conversationId, userId, name: socket.user.name,
      });
    });

    socket.on("typing_stop", ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conv:${conversationId}`).emit("user_stopped_typing", {
        conversationId, userId,
      });
    });

    socket.on("message_sent", ({ conversationId, message }) => {
      if (!conversationId || !message) return;
      socket.to(`conv:${conversationId}`).emit("new_message", { conversationId, message });
    });

    socket.on("message_edited", ({ conversationId, message }) => {
      if (!conversationId || !message) return;
      socket.to(`conv:${conversationId}`).emit("message_updated", { conversationId, message });
    });

    socket.on("message_deleted", ({ conversationId, messageId, deletedFor, body }) => {
      if (!conversationId || !messageId) return;
      socket.to(`conv:${conversationId}`).emit("message_removed", {
        conversationId, messageId, deletedFor, body,
      });
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      console.log(`🔴 ${socket.user.name} disconnected`);
    });

    // ── Error on socket ────────────────────────────────────────────────────
    socket.on("error", (err) => {
      console.error(`Socket error for ${socket.user.name}:`, err.message);
    });

  } catch (err) {
    console.error("Socket setup error:", err);
    socket.disconnect(true);
  }
});

export { io };

// ══════════════════════════════════════════════════════════════════════════════
//  START

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      autoIndex:       false,  // don't auto-build indexes in production
      maxPoolSize:     10,     // connection pool
      serverSelectionTimeoutMS: 5000,
    });
    console.log(" MongoDB connected");

    httpServer.listen(PORT, () =>
      console.log(` Server running on port ${PORT} [${IS_PROD ? "production" : "development"}]`)
    );
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
};

start();

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n${signal} received — shutting down gracefully...`);
  httpServer.close(async () => {
    await mongoose.connection.close();
    console.log("Server + DB closed");
    process.exit(0);
  });
  // Force-kill if shutdown takes too long
  setTimeout(() => process.exit(1), 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("uncaughtException",  (err) => { console.error("Uncaught:", err);       process.exit(1); });
process.on("unhandledRejection", (err) => { console.error("Unhandled:", err);      process.exit(1); });