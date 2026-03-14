// 📁 src/pages/users/notifications.jsx
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import {
  fetchNotifications, markRead, markAllRead, dismissNotification, setFilter,
  selectNotifications, selectUnreadCount, selectNotifsFilter, selectNotifsLoading,
  BASE, colorFor,
} from "../../store/slices/notificationsSlice";
import DashboardLayout from "../../components/layout/DashboardLayout";
import styles from "../../styles/notifications.module.css";

const FILTERS = ["All", "Unread", "Connections", "Mentions"];

function SkeletonNotif() {
  return (
    <div className={styles.notifItem} style={{ cursor: "default" }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#1a1a24", flexShrink: 0 }} />
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1a1a24", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ height: 12, borderRadius: 6, background: "#1a1a24", width: "60%" }} />
        <div style={{ height: 10, borderRadius: 6, background: "#1a1a24", width: "30%" }} />
      </div>
    </div>
  );
}

export default function Notifications() {
  const dispatch    = useDispatch();
  const router      = useRouter();
  const all         = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const filter      = useSelector(selectNotifsFilter);
  const isLoading   = useSelector(selectNotifsLoading);

  useEffect(() => { dispatch(fetchNotifications()); }, [dispatch]);

  const visible = all.filter((n) => {
    if (filter === "Unread")      return !n.read;
    if (filter === "Connections") return n.type === "connect_request" || n.type === "connect_accept";
    if (filter === "Mentions")    return n.type === "mention";
    return true;
  });

  const handleClick = (n) => {
    if (!n.read) dispatch(markRead(n.id));
    // Navigate to sender profile for connection notifications
    if ((n.type === "connect_request" || n.type === "connect_accept") && n.username) {
      router.push(`/users/${n.username}`);
    } else {
      router.push(n.link || "/");
    }
  };

  return (
    <DashboardLayout>
      <div className={styles.page}>

        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>
              Notifications
              {unreadCount > 0 && (
                <span className={styles.unreadBadge}>{unreadCount} new</span>
              )}
            </h1>
          </div>
          {unreadCount > 0 && (
            <button className={styles.markAllBtn} onClick={() => dispatch(markAllRead())}>
              Mark all as read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ""}`}
              onClick={() => dispatch(setFilter(f))}
            >
              {f}
              {f === "Unread" && unreadCount > 0 && (
                <span className={styles.filterCount}>{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className={styles.notifList}>
          {isLoading ? (
            [1,2,3,4,5].map((n) => <SkeletonNotif key={n} />)
          ) : visible.length === 0 ? (
            <div className={styles.empty}>
              <span style={{ fontSize: 36 }}>🎉</span>
              <p>{filter === "All" ? "You're all caught up!" : `No ${filter.toLowerCase()} notifications`}</p>
            </div>
          ) : (
            visible.map((n) => (
              <div
                key={n.id}
                className={`${styles.notifItem} ${!n.read ? styles.notifItemUnread : ""}`}
                onClick={() => handleClick(n)}
              >
                {/* Type icon badge */}
                <div className={styles.notifTypeIcon}>{n.icon}</div>

                {/* Sender avatar */}
                <div
                  className={styles.notifAvatar}
                  style={{ background: colorFor(n.actor) }}
                >
                  {n.profilePic
                    ? <img
                        src={`${BASE}${n.profilePic}`}
                        alt={n.actor}
                        className={styles.notifAvatarImg}
                      />
                    : n.avatar
                  }
                </div>

                {/* Content */}
                <div className={styles.notifBody}>
                  <p className={styles.notifText}>
                    <strong
                      className={styles.notifActor}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (n.username) router.push(`/users/${n.username}`);
                      }}
                    >
                      {n.actor}
                    </strong>
                    {" "}{n.text}
                  </p>
                  <span className={styles.notifTime}>{n.time}</span>
                </div>

                {/* Right: unread dot + dismiss */}
                <div className={styles.notifRight}>
                  {!n.read && <span className={styles.unreadDot} />}
                  <button
                    className={styles.dismissBtn}
                    title="Dismiss"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch(dismissNotification(n.id));
                    }}
                  >×</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}