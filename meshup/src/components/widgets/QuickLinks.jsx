// 📁 src/components/widgets/QuickLinks.jsx
import { useRouter } from "next/router";
import styles from "../../styles/widgets.module.css";

const LINKS = [
  { icon: "👤", label: "My Profile",    path: "/users/profile"       },
  { icon: "⏱",  label: "Progress",      path: "/users/progress"      },
  { icon: "🔔", label: "Notifications", path: "/users/notifications" },
  { icon: "💬", label: "Messages",      path: "/users/messages"      },
  { icon: "🌐", label: "Network",       path: "/users/network"       },
];

export default function QuickLinks() {
  const router = useRouter();
  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <span className={styles.widgetTitle}>Quick links</span>
      </div>
      <div className={styles.quickLinks}>
        {LINKS.map(({ icon, label, path }) => (
          <button key={path} className={styles.quickLink} onClick={() => router.push(path)}>
            <span className={styles.quickLinkIcon}>{icon}</span>
            <span className={styles.quickLinkText}>{label}</span>
            <span className={styles.quickLinkArrow}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}