// 📁 backend/controllers/progress.controller.js
import { TrackedSite, Session } from "../models/progress.model.js";

// ── GET all tracked sites for the current user ─────────────────────────────
export const getSites = async (req, res) => {
  try {
    const sites = await TrackedSite.find({ userId: req.user._id }).sort({ createdAt: 1 });
    res.json(sites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── ADD a new tracked site ─────────────────────────────────────────────────
export const addSite = async (req, res) => {
  try {
    const { name, url, favicon } = req.body;
    if (!name || !url) return res.status(400).json({ message: "Name and URL required" });

    // Normalise URL — add https:// if missing
    let normUrl = url.trim();
    if (!/^https?:\/\//i.test(normUrl)) normUrl = "https://" + normUrl;

    const site = await TrackedSite.create({
      userId: req.user._id,
      name:   name.trim(),
      url:    normUrl,
      favicon: favicon || "",
    });
    res.status(201).json(site);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── DELETE a tracked site and all its sessions ─────────────────────────────
export const deleteSite = async (req, res) => {
  try {
    const site = await TrackedSite.findOne({ _id: req.params.id, userId: req.user._id });
    if (!site) return res.status(404).json({ message: "Site not found" });
    await Session.deleteMany({ siteId: site._id });
    await site.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── START a session ────────────────────────────────────────────────────────
export const startSession = async (req, res) => {
  try {
    const { siteId, startedAt } = req.body;
    const site = await TrackedSite.findOne({ _id: siteId, userId: req.user._id });
    if (!site) return res.status(404).json({ message: "Site not found" });

    // Close any previously open sessions for this user (safety net)
    const orphans = await Session.find({ userId: req.user._id, isOpen: true });
    for (const s of orphans) {
      const dur = Math.round((Date.now() - new Date(s.startedAt).getTime()) / 1000);
      s.isOpen   = false;
      s.endedAt  = new Date();
      s.duration = dur;
      await s.save();
      await TrackedSite.findByIdAndUpdate(s.siteId, { $inc: { totalTime: dur }, lastVisit: s.endedAt });
    }

    const session = await Session.create({
      userId:    req.user._id,
      siteId:    site._id,
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      isOpen:    true,
    });

    site.lastVisit = new Date();
    await site.save();

    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── END a session ──────────────────────────────────────────────────────────
export const endSession = async (req, res) => {
  try {
    const { sessionId, endedAt } = req.body;
    const session = await Session.findOne({ _id: sessionId, userId: req.user._id, isOpen: true });
    if (!session) return res.status(404).json({ message: "Session not found" });

    const end      = endedAt ? new Date(endedAt) : new Date();
    const duration = Math.max(1, Math.round((end.getTime() - new Date(session.startedAt).getTime()) / 1000));

    session.isOpen   = false;
    session.endedAt  = end;
    session.duration = duration;
    await session.save();

    // Accumulate into site total
    await TrackedSite.findByIdAndUpdate(session.siteId, {
      $inc: { totalTime: duration },
      lastVisit: end,
    });

    res.json({ message: "Session saved", duration });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── CLOSE any open sessions (called on return / unload) ────────────────────
export const closeOpenSessions = async (req, res) => {
  try {
    const { endedAt } = req.body;
    const end     = endedAt ? new Date(endedAt) : new Date();
    const orphans = await Session.find({ userId: req.user._id, isOpen: true });
    let saved = 0;
    for (const s of orphans) {
      const dur = Math.max(1, Math.round((end.getTime() - new Date(s.startedAt).getTime()) / 1000));
      s.isOpen   = false;
      s.endedAt  = end;
      s.duration = dur;
      await s.save();
      await TrackedSite.findByIdAndUpdate(s.siteId, { $inc: { totalTime: dur }, lastVisit: end });
      saved++;
    }
    res.json({ message: "Closed", saved });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET sessions for a specific site ──────────────────────────────────────
export const getSiteSessions = async (req, res) => {
  try {
    const site = await TrackedSite.findOne({ _id: req.params.id, userId: req.user._id });
    if (!site) return res.status(404).json({ message: "Site not found" });
    const sessions = await Session.find({ siteId: site._id, isOpen: false })
      .sort({ startedAt: -1 }).limit(20);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};