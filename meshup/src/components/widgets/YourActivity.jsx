// 📁 src/components/widgets/YourActivity.jsx
import { useRouter } from "next/router";
import styles from "../../styles/widgets.module.css";

export default function YourActivity({ stats }) {
  const router = useRouter();

  const rows = [
    { icon: "🤝", bg: "rgba(124,58,237,.15)", label: "Connections",    value: stats?.connections     ?? 0 },
    { icon: "📝", bg: "rgba(59,130,246,.15)",  label: "Posts",          value: stats?.posts           ?? 0 },
    { icon: "❤️", bg: "rgba(239,68,68,.15)",   label: "Reactions",      value: stats?.likes           ?? 0 },
    { icon: "👁️", bg: "rgba(16,185,129,.15)",  label: "Profile views",  value: stats?.profileViews    ?? 0 },
    { icon: "✨", bg: "rgba(245,158,11,.15)",   label: "Impressions",    value: stats?.postImpressions ?? 0 },
  ];

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <span className={styles.widgetTitle}>Your activity</span>
        <button className={styles.widgetLink} onClick={() => router.push("/users/profile")}>
          View profile →
        </button>
      </div>

      <div className={styles.activityRows}>
        {rows.map((row) => (
          <div key={row.label} className={styles.activityRow}>
            <div className={styles.activityIcon} style={{ background: row.bg }}>
              {row.icon}
            </div>
            <span className={styles.activityRowLabel}>{row.label}</span>
            <span className={styles.activityRowVal}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}