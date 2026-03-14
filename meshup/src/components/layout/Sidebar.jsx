// 📁 src/components/layout/Sidebar.jsx
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import Image from "next/image";
import { selectUser } from "../../store/slices/authSlice";
import { selectTotalUnread } from "../../store/slices/messagesSlice";
import { selectUnreadCount } from "../../store/slices/notificationsSlice";
import styles from "../../styles/layout.module.css";

const NAV_ITEMS = [
  { id: "home",          label: "Home",     icon: "⌂", href: "/users"                },
  { id: "network",       label: "Network",  icon: "◈", href: "/users/network"        },
  { id: "progress",      label: "Progress", icon: "◈", href: "/users/progress"      },
  { id: "messages",      label: "Messages", icon: "◉", href: "/users/messages",      badgeKey: "messages"      },
  { id: "notifications", label: "Alerts",   icon: "◎", href: "/users/notifications", badgeKey: "notifications" },
];

export default function Sidebar({ isOpen, onClose, onLogout }) {
  const router      = useRouter();
  const user        = useSelector(selectUser);
  const msgCount    = useSelector(selectTotalUnread);
  const notifsCount = useSelector(selectUnreadCount);

  const badgeMap = { messages: msgCount, notifications: notifsCount };

  // Get real name + pic from backend user object
  const userObj    = user?.userId || user || {};
  const name       = userObj?.name || "You";
  const username   = userObj?.username || "";
  const profilePic = userObj?.profilePicture;
  const initial    = name[0]?.toUpperCase() || "?";

  const isActive = (href) =>
    href === "/users"
      ? router.pathname === "/users"
      : router.pathname.startsWith(href);

  const navigate = (href) => { router.push(href); onClose?.(); };

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}>

      {/* Logo */}
      <div className={styles.sidebarLogo} onClick={() => navigate("/")}>
        <Image src="/MeshUp.png" alt="MeshUp" width={45} height={30} className={styles.sidebarLogoImg} />
        <span className={styles.sidebarLogoText}>MeshUp</span>
      </div>

      {/* Nav items */}
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const badge = item.badgeKey ? badgeMap[item.badgeKey] : 0;
          return (
            <button
              key={item.id}
              className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ""}`}
              onClick={() => navigate(item.href)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
              {badge > 0 && <span className={styles.navBadge}>{badge}</span>}
            </button>
          );
        })}
      </nav>

      {/* Profile card at bottom */}
      <div className={styles.sidebarProfile}>
        {/* Avatar — shows real profile pic if available */}
        <div
          className={styles.sidebarAvatar}
          onClick={() => navigate("/users/profile")}
          style={{ cursor: "pointer", overflow: "hidden" }}
        >
          {profilePic
            ? <img
                src={`https://meshup-z0g6.onrender.com/uploads/${profilePic}`}
                alt={name}
                style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }}
              />
            : initial
          }
        </div>

        <div className={styles.sidebarProfileInfo}>
          <span className={styles.sidebarProfileName}>{name}</span>
          {/* ← "View profile" now goes to real profile page */}
          <span
            className={styles.sidebarProfileRole}
            onClick={() => navigate("/users/profile")}
          >
            View profile →
          </span>
        </div>

        <button className={styles.logoutBtn} onClick={onLogout} title="Sign out">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </aside>
  );
}