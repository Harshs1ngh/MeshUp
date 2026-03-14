// 📁 src/components/profile/ActivityHeatmap.jsx
// GitHub-style activity heatmap — one cell per day, 53 weeks × 7 days
import { useEffect, useState } from "react";
import api from "../../services/api";
import styles from "../../styles/profile.module.css";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["","Mon","","Wed","","Fri",""];

// Build an array of 371 day slots (53 weeks × 7) aligned to Sunday start
function buildGrid() {
  const today = new Date();
  today.setHours(0,0,0,0);

  // Go back 52 full weeks + pad to previous Sunday
  const endDate   = new Date(today);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364); // ~1 year back
  // Align start to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const days = [];
  const cur  = new Date(startDate);
  while (cur <= endDate) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,"0")}-${String(cur.getDate()).padStart(2,"0")}`;
    days.push({ date: new Date(cur), key, isFuture: cur > today });
    cur.setDate(cur.getDate() + 1);
  }
  // Pad to complete last column
  while (days.length % 7 !== 0) {
    days.push({ date: null, key: null, isFuture: true });
  }
  return days;
}

// Group days into columns (weeks) for CSS grid rendering
function getWeeks(days) {
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

// Determine which month label goes above which column
function getMonthLabels(weeks) {
  const labels = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstReal = week.find(d => d.date && !d.isFuture);
    if (!firstReal) return;
    const m = firstReal.date.getMonth();
    if (m !== lastMonth) { labels.push({ wi, label: MONTHS[m] }); lastMonth = m; }
  });
  return labels;
}

function cellColor(count) {
  if (!count || count === 0) return "var(--heat-0, #1a1a27)";
  if (count === 1)            return "var(--heat-1, #3b1f7a)";
  if (count === 2)            return "var(--heat-2, #5b2fa0)";
  if (count <= 4)             return "var(--heat-3, #7c3aed)";
  return                             "var(--heat-4, #a78bfa)";
}

export default function ActivityHeatmap({ userId }) {
  const [data,      setData]      = useState({});   // { "2025-03-01": 2, ... }
  const [loading,   setLoading]   = useState(true);
  const [tooltip,   setTooltip]   = useState(null); // { text, x, y }

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    api.get(`/posts/heatmap/${userId}`)
      .then(r => setData(r.data || {}))
      .catch(() => setData({}))
      .finally(() => setLoading(false));
  }, [userId]);

  const days   = buildGrid();
  const weeks  = getWeeks(days);
  const months = getMonthLabels(weeks);

  const totalPosts = Object.values(data).reduce((s, v) => s + v, 0);
  const activeDays = Object.keys(data).length;

  const handleMouseEnter = (e, day) => {
    if (!day.date || day.isFuture) return;
    const count = data[day.key] || 0;
    const d = day.date;
    const label = `${d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} · ${count} post${count !== 1 ? "s" : ""}`;
    const rect  = e.target.getBoundingClientRect();
    setTooltip({ text: label, x: rect.left + rect.width/2, y: rect.top - 8 });
  };

  return (
    <div className={styles.heatmapCard}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>Activity</span>
        {!loading && (
          <span className={styles.heatmapMeta}>
            {totalPosts} post{totalPosts !== 1 ? "s" : ""} · {activeDays} active day{activeDays !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <div className={styles.heatmapLoading}>
          <span className={styles.miniSpinner} />
        </div>
      ) : (
        <div className={styles.heatmapWrap}>
          {/* Month labels row */}
          <div className={styles.heatmapMonthRow}>
            <div className={styles.heatmapDayLabels} />
            <div className={styles.heatmapCols}>
              {weeks.map((_, wi) => {
                const lbl = months.find(m => m.wi === wi);
                return (
                  <div key={wi} className={styles.heatmapMonthCell}>
                    {lbl ? lbl.label : ""}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid */}
          <div className={styles.heatmapGrid}>
            {/* Day labels */}
            <div className={styles.heatmapDayLabels}>
              {DAYS.map((d, i) => (
                <div key={i} className={styles.heatmapDayLabel}>{d}</div>
              ))}
            </div>

            {/* Week columns */}
            <div className={styles.heatmapCols}>
              {weeks.map((week, wi) => (
                <div key={wi} className={styles.heatmapCol}>
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className={styles.heatCell}
                      style={{
                        background: day.isFuture || !day.date ? "transparent" : cellColor(data[day.key] || 0),
                        opacity: day.isFuture ? 0 : 1,
                      }}
                      title={day.date && !day.isFuture
                        ? `${day.date.toLocaleDateString("en-US",{month:"short",day:"numeric"})} · ${data[day.key] || 0} posts`
                        : undefined
                      }
                      onMouseEnter={(e) => handleMouseEnter(e, day)}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className={styles.heatmapLegend}>
            <span className={styles.legendLabel}>Less</span>
            {["var(--heat-0,#1a1a27)","var(--heat-1,#3b1f7a)","var(--heat-2,#5b2fa0)","var(--heat-3,#7c3aed)","var(--heat-4,#a78bfa)"].map((c,i) => (
              <div key={i} className={styles.legendCell} style={{ background: c }} />
            ))}
            <span className={styles.legendLabel}>More</span>
          </div>
        </div>
      )}

      {/* Floating tooltip rendered at cursor level via fixed position */}
      {tooltip && (
        <div
          className={styles.heatTooltip}
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}