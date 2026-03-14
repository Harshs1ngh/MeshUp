// 📁 src/components/profile/WebsiteTime.jsx
// Shows tracked websites and their accumulated time — reusable on own + viewer profile
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import { selectSites } from "../../store/slices/progressSlice";
import styles from "../../styles/profile.module.css";

function formatTime(secs) {
  if (!secs || secs < 1) return "0m";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${secs % 60}s`;
}

function FaviconImg({ src, name }) {
  const [failed, setFailed] = useState(false);
  const initials = name?.slice(0, 2).toUpperCase() || "?";
  const hue = [...(name || "X")].reduce((n, c) => n + c.charCodeAt(0), 0) % 360;
  const bg  = `hsl(${hue}, 50%, 28%)`;

  if (!src || failed) {
    return (
      <div className={styles.wtFavicon} style={{ background: bg }}>
        {initials}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      className={styles.wtFaviconImg}
      onError={() => setFailed(true)}
    />
  );
}

// ── Own profile view — reads live from Redux ─────────────────────────────────
export function OwnWebsiteTime({ onGoToProgress }) {
  const sites  = useSelector(selectSites);
  const router = useRouter();

  const sorted = [...sites].sort((a, b) => (b.totalTime || 0) - (a.totalTime || 0));
  const top    = sorted.slice(0, 5);
  const total  = sites.reduce((s, x) => s + (x.totalTime || 0), 0);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>Website time</span>
        {sites.length > 0 && (
          <button
            className={styles.wtManageBtn}
            onClick={() => router.push("/users/progress")}
          >
            Manage →
          </button>
        )}
      </div>

      {sites.length === 0 ? (
        <div className={styles.wtEmpty}>
          <span className={styles.wtEmptyIcon}>⏱</span>
          <p className={styles.wtEmptyText}>No websites tracked yet.</p>
          <button
            className={styles.wtStartBtn}
            onClick={() => router.push("/users/progress")}
          >
            Start tracking
          </button>
        </div>
      ) : (
        <>
          <div className={styles.wtList}>
            {top.map(site => (
              <div key={site._id} className={styles.wtRow}>
                <FaviconImg src={site.favicon} name={site.name} />
                <div className={styles.wtInfo}>
                  <span className={styles.wtName}>{site.name}</span>
                  <div className={styles.wtBarWrap}>
                    <div
                      className={styles.wtBar}
                      style={{ width: total > 0 ? `${Math.round(((site.totalTime||0)/total)*100)}%` : "0%" }}
                    />
                  </div>
                </div>
                <span className={styles.wtTime}>{formatTime(site.totalTime)}</span>
              </div>
            ))}
          </div>
          {total > 0 && (
            <div className={styles.wtTotal}>
              Total tracked: <strong>{formatTime(total)}</strong>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Public viewer side — no live data, just show a static placeholder ─────────
// (we don't expose other users' tracked sites for privacy)
export function PublicWebsiteTime() {
  return null; // Privacy: don't expose other users' browsing time
}

export default OwnWebsiteTime;