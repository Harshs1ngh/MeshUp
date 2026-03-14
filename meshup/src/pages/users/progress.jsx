// 📁 src/pages/users/progress.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  fetchSites, addSite, deleteSite,
  startSession, endSession, closeOpenSessions,
  fetchSiteSessions, addTimeToSite, selectSites,
  selectSessions, selectProgressLoading,
} from "../../store/slices/progressSlice";
import styles from "../../styles/progress.module.css";

// ── Helpers ───────────────────────────────────────────────────────────────────

const LS_SESSION_KEY = "meshup_active_session";

function formatTime(totalSeconds) {
  if (!totalSeconds || totalSeconds < 1) return "0m";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function getFaviconUrl(url) {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${host}`;
  } catch {
    return "";
  }
}

function FaviconImg({ src, name, size = 44 }) {
  const [failed, setFailed] = useState(false);
  const initials = name?.slice(0, 2).toUpperCase() || "?";
  const hue = [...(name || "X")].reduce((n, c) => n + c.charCodeAt(0), 0) % 360;
  const bg  = `hsl(${hue}, 55%, 32%)`;

  if (!src || failed) {
    return (
      <div className={styles.favicon} style={{ width: size, height: size, background: bg, fontSize: size * 0.34 }}>
        {initials}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      className={styles.faviconImg}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

// ── Add Site Modal ─────────────────────────────────────────────────────────────
function AddSiteModal({ onClose, onAdd }) {
  const [name, setName]   = useState("");
  const [url,  setUrl]    = useState("");
  const [busy, setBusy]   = useState(false);
  const [err,  setErr]    = useState("");
  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleSubmit = async () => {
    const trimName = name.trim();
    const trimUrl  = url.trim();
    if (!trimName) { setErr("Please enter a website name."); return; }
    if (!trimUrl)  { setErr("Please enter a URL."); return; }
    setBusy(true);
    setErr("");
    try {
      let normUrl = trimUrl;
      if (!/^https?:\/\//i.test(normUrl)) normUrl = "https://" + normUrl;
      const favicon = getFaviconUrl(normUrl);
      await onAdd({ name: trimName, url: normUrl, favicon });
      onClose();
    } catch (e) {
      setErr(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>Add website to track</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <label className={styles.fieldLabel}>Website name</label>
          <input
            ref={nameRef}
            className={styles.input}
            placeholder="e.g. YouTube, Notion, GitHub"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKey}
            maxLength={60}
          />

          <label className={styles.fieldLabel} style={{ marginTop: 14 }}>URL</label>
          <input
            className={styles.input}
            placeholder="e.g. youtube.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKey}
          />

          {err && <p className={styles.modalErr}>{err}</p>}

          <div className={styles.modalPreview}>
            {(name || url) && (
              <>
                <FaviconImg src={url ? getFaviconUrl(/^https?:\/\//i.test(url) ? url : "https://" + url) : ""} name={name} size={32} />
                <span className={styles.modalPreviewName}>{name || "Website name"}</span>
              </>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnGhost} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} onClick={handleSubmit} disabled={busy}>
            {busy ? "Adding…" : "Add website"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Session History Drawer ─────────────────────────────────────────────────────
function SessionDrawer({ site, sessions, onClose }) {
  const list = sessions[site._id] || [];
  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitleRow}>
            <FaviconImg src={site.favicon} name={site.name} size={28} />
            <span className={styles.drawerTitle}>{site.name} — Sessions</span>
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.drawerTotal}>
          <span className={styles.drawerTotalLabel}>Total time</span>
          <span className={styles.drawerTotalVal}>{formatTime(site.totalTime)}</span>
        </div>

        {list.length === 0 ? (
          <p className={styles.drawerEmpty}>No sessions recorded yet.</p>
        ) : (
          <ul className={styles.sessionList}>
            {list.map((s) => {
              const start = new Date(s.startedAt);
              const date  = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              const time  = start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
              return (
                <li key={s._id} className={styles.sessionItem}>
                  <div className={styles.sessionDate}>{date} · {time}</div>
                  <div className={styles.sessionDur}>{formatTime(s.duration)}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Site Card ─────────────────────────────────────────────────────────────────
function SiteCard({ site, onLaunch, onDelete, onViewHistory }) {
  const [hovering, setHovering] = useState(false);
  return (
    <div
      className={styles.siteCard}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {hovering && (
        <button
          className={styles.deleteBtn}
          onClick={(e) => { e.stopPropagation(); onDelete(site._id); }}
          title="Remove"
        >✕</button>
      )}

      <button className={styles.siteCardInner} onClick={() => onLaunch(site)}>
        <div className={styles.siteLogoWrap}>
          <FaviconImg src={site.favicon} name={site.name} size={44} />
        </div>
        <div className={styles.siteName}>{site.name}</div>
        <div className={styles.siteTime}>{formatTime(site.totalTime)}</div>
        <div className={styles.siteTimeLabel}>total time</div>
      </button>

      <button className={styles.historyBtn} onClick={() => onViewHistory(site)}>
        Sessions ↗
      </button>
    </div>
  );
}

// ── Launch Confirmation Overlay ───────────────────────────────────────────────
function LaunchConfirm({ site, onConfirm, onCancel }) {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} style={{ maxWidth: 380 }}>
        <div className={styles.launchIcon}>
          <FaviconImg src={site.favicon} name={site.name} size={52} />
        </div>
        <h2 className={styles.launchTitle}>Opening {site.name}</h2>
        <p className={styles.launchSub}>
          Your session will start now and save automatically when you come back.
        </p>
        <div className={styles.modalFooter} style={{ marginTop: 20 }}>
          <button className={styles.btnGhost} onClick={onCancel}>Cancel</button>
          <button className={styles.btnPrimary} onClick={onConfirm}>Start session →</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProgressPage() {
  const dispatch   = useDispatch();
  const router     = useRouter();
  const sites      = useSelector(selectSites);
  const sessions   = useSelector(selectSessions);
  const isLoading  = useSelector(selectProgressLoading);

  const [showAddModal, setShowAddModal]       = useState(false);
  const [pendingLaunch, setPendingLaunch]     = useState(null);   // site to confirm launch
  const [historyTarget, setHistoryTarget]     = useState(null);   // site to show history for
  const [savedBanner, setSavedBanner]         = useState(null);   // "saved X min" toast

  // ── On mount: close any orphaned sessions from a previous tab/session ──────
  useEffect(() => {
    dispatch(fetchSites());

    const stored = localStorage.getItem(LS_SESSION_KEY);
    if (stored) {
      try {
        const { sessionId, siteId, startedAt } = JSON.parse(stored);
        const endedAt = new Date().toISOString();
        const dur = Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));

        // Save session to backend
        dispatch(endSession({ sessionId, endedAt }))
          .unwrap()
          .then(() => {
            dispatch(addTimeToSite({ siteId, seconds: dur }));
            setSavedBanner(`Saved ${formatTime(dur)} session`);
            setTimeout(() => setSavedBanner(null), 4000);
          })
          .catch(() => {
            // Backend failed — still update local state
            dispatch(addTimeToSite({ siteId, seconds: dur }));
          });
      } catch {}
      localStorage.removeItem(LS_SESSION_KEY);
    }
  }, [dispatch]);

  // ── Add site ──────────────────────────────────────────────────────────────
  const handleAddSite = useCallback(async (data) => {
    await dispatch(addSite(data)).unwrap();
  }, [dispatch]);

  // ── Delete site ───────────────────────────────────────────────────────────
  const handleDeleteSite = useCallback((id) => {
    if (window.confirm("Remove this website? All session history will be deleted.")) {
      dispatch(deleteSite(id));
    }
  }, [dispatch]);

  // ── Confirm and launch ────────────────────────────────────────────────────
  const handleConfirmLaunch = useCallback(async () => {
    const site = pendingLaunch;
    if (!site) return;
    setPendingLaunch(null);

    const startedAt = new Date().toISOString();

    // Start session on backend → get sessionId
    let sessionId = null;
    try {
      const result = await dispatch(startSession({ siteId: site._id, startedAt })).unwrap();
      sessionId = result._id;
    } catch {
      // Backend unavailable — generate a local placeholder
      sessionId = "local_" + Date.now();
    }

    // Persist active session to localStorage for recovery on return
    localStorage.setItem(LS_SESSION_KEY, JSON.stringify({
      sessionId,
      siteId: site._id,
      startedAt,
    }));

    // Navigate to the site
    window.open(site.url, "_blank", "noopener,noreferrer");
  }, [dispatch, pendingLaunch]);

  // ── View session history ─────────────────────────────────────────────────
  const handleViewHistory = useCallback((site) => {
    dispatch(fetchSiteSessions(site._id));
    setHistoryTarget(site);
  }, [dispatch]);

  // ── Page visibilitychange — save session when user returns ────────────────
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const stored = localStorage.getItem(LS_SESSION_KEY);
      if (!stored) return;
      try {
        const { sessionId, siteId, startedAt } = JSON.parse(stored);
        const endedAt = new Date().toISOString();
        const dur = Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));

        dispatch(endSession({ sessionId, endedAt }))
          .unwrap()
          .then(() => {
            dispatch(addTimeToSite({ siteId, seconds: dur }));
            dispatch(fetchSites());
            setSavedBanner(`Saved ${formatTime(dur)} session`);
            setTimeout(() => setSavedBanner(null), 4000);
          })
          .catch(() => {
            dispatch(addTimeToSite({ siteId, seconds: dur }));
          });

        localStorage.removeItem(LS_SESSION_KEY);
      } catch {
        localStorage.removeItem(LS_SESSION_KEY);
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [dispatch]);

  // ── beforeunload — fire and forget beacon to save session ────────────────
  useEffect(() => {
    const onUnload = () => {
      const stored = localStorage.getItem(LS_SESSION_KEY);
      if (!stored) return;
      try {
        const { sessionId, siteId, startedAt } = JSON.parse(stored);
        const endedAt = new Date().toISOString();
        // Use sendBeacon so the request survives page unload
        const payload = JSON.stringify({ sessionId, endedAt });
        navigator.sendBeacon?.(
          "/progress/sessions/end",
          new Blob([payload], { type: "application/json" })
        );
        // Keep in localStorage — if beacon fails, visibilitychange on next visit picks it up
      } catch {}
    };

    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  return (
    <DashboardLayout>
      <div className={styles.page}>

        {/* ── HEADER ── */}
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>Your Progress</h1>
            <p className={styles.pageSub}>Track intentional time on the websites that matter to you.</p>
          </div>
          <button className={styles.addBtn} onClick={() => setShowAddModal(true)} title="Add website">
            <span className={styles.addBtnPlus}>+</span>
            <span className={styles.addBtnLabel}>Add website</span>
          </button>
        </div>

        {/* ── TOAST ── */}
        {savedBanner && (
          <div className={styles.toast}>
            <span className={styles.toastIcon}>✓</span> {savedBanner}
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!isLoading && sites.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⏱</div>
            <h2 className={styles.emptyTitle}>Add your first website</h2>
            <p className={styles.emptySub}>
              Add any website you want to spend time on intentionally.<br />
              Click a card to start a tracked session.
            </p>
            <button className={styles.btnPrimary} onClick={() => setShowAddModal(true)}>
              + Add website
            </button>
          </div>
        )}

        {/* ── LOADING ── */}
        {isLoading && (
          <div className={styles.loadingRow}>
            {[1,2,3].map(n => <div key={n} className={styles.cardSkeleton} />)}
          </div>
        )}

        {/* ── SITE CARDS ── */}
        {!isLoading && sites.length > 0 && (
          <div className={styles.sitesGrid}>
            {sites.map((site) => (
              <SiteCard
                key={site._id}
                site={site}
                onLaunch={() => setPendingLaunch(site)}
                onDelete={handleDeleteSite}
                onViewHistory={handleViewHistory}
              />
            ))}
          </div>
        )}

        {/* ── HOW IT WORKS ── */}
        {!isLoading && sites.length > 0 && (
          <div className={styles.howItWorks}>
            <span className={styles.howIcon}>💡</span>
            Click a card to open that site in a new tab — your session starts automatically and saves when you return here.
          </div>
        )}
      </div>

      {/* ── MODALS / OVERLAYS ── */}
      {showAddModal && (
        <AddSiteModal onClose={() => setShowAddModal(false)} onAdd={handleAddSite} />
      )}

      {pendingLaunch && (
        <LaunchConfirm
          site={pendingLaunch}
          onConfirm={handleConfirmLaunch}
          onCancel={() => setPendingLaunch(null)}
        />
      )}

      {historyTarget && (
        <SessionDrawer
          site={historyTarget}
          sessions={sessions}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </DashboardLayout>
  );
}