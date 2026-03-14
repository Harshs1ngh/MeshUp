// 📁 src/components/layout/Topbar.jsx
import { useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import { selectUser } from "../../store/slices/authSlice";
import { selectMyProfile } from "../../store/slices/profileSlice";
import {
  performSearch, setQuery, clearSearch,
  selectSearchQuery, selectSearchResults, selectSearchOpen, selectSearchLoading,
} from "../../store/slices/searchSlice";
import { selectUnreadCount, fetchNotifications } from "../../store/slices/notificationsSlice";
import styles from "../../styles/layout.module.css";

const BASE = "https://meshup-z0g6.onrender.com/uploads/";
const COLORS = ["#7c3aed","#5b5bd6","#8b5cf6","#6d28d9","#4f46e5"];
const colorFor = (str) => COLORS[(str?.charCodeAt(0) || 0) % COLORS.length];

export default function Topbar({ onMenuClick }) {
  const dispatch    = useDispatch();
  const router      = useRouter();
  const user        = useSelector(selectUser);
  const myProfile   = useSelector(selectMyProfile);
  const query       = useSelector(selectSearchQuery);
  const results     = useSelector(selectSearchResults);
  const isOpen      = useSelector(selectSearchOpen);
  const isLoading   = useSelector(selectSearchLoading);
  const unread      = useSelector(selectUnreadCount);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // ✅ Fix: get name and pic from correct place in user object
  const userObj    = myProfile?.userId || user?.userId || user || {};
  const name       = userObj?.name || "User";
  const profilePic = userObj?.profilePicture;
  const initial    = name[0]?.toUpperCase() || "U";

  const handleSearchChange = (e) => {
    const val = e.target.value;
    dispatch(setQuery(val));
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val.trim()) dispatch(performSearch(val));
    }, 250);
  };

  // ✅ Fetch real unread count on mount so badge is accurate
  useEffect(() => { dispatch(fetchNotifications()); }, [dispatch]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        dispatch(clearSearch());
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dispatch]);

  const handleResultClick = (result) => {
    dispatch(clearSearch());
    // ✅ Navigate to actual profile page, not just network
    if (result.type === "person" && result.username) {
      router.push(`/users/${result.username}`);
    } else if (result.type === "job") {
      router.push("/users/jobs");
    }
  };

  return (
    <header className={styles.topbar}>
      <button className={styles.menuBtn} onClick={onMenuClick}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Search */}
      <div className={styles.searchContainer} ref={dropdownRef}>
        <div className={`${styles.searchWrap} ${isOpen ? styles.searchWrapActive : ""}`}>
          {isLoading ? (
            <span className={styles.searchSpinner} />
          ) : (
            <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          )}
          <input
            className={styles.searchInput}
            placeholder="Search people, jobs, companies…"
            value={query}
            onChange={handleSearchChange}
            onFocus={() => query && dispatch(performSearch(query))}
          />
          {query && (
            <button className={styles.searchClear} onClick={() => dispatch(clearSearch())}>×</button>
          )}
        </div>

        {isOpen && (
          <div className={styles.searchDropdown}>
            {results.length === 0 ? (
              <div className={styles.searchEmpty}>No results for "{query}"</div>
            ) : (
              results.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  className={styles.searchResult}
                  onClick={() => handleResultClick(r)}
                >
                  <div className={styles.searchResultAvatar} style={{ background: r.avatarColor || colorFor(r.name) }}>
                    {r.profilePic
                      ? <img src={`${BASE}${r.profilePic}`} alt={r.name} style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }} />
                      : (r.avatar || r.name?.[0]?.toUpperCase())
                    }
                  </div>
                  <div className={styles.searchResultInfo}>
                    <span className={styles.searchResultName}>{r.name}</span>
                    <span className={styles.searchResultRole}>{r.role}</span>
                  </div>
                  <span className={styles.searchResultType}>{r.type === "person" ? "👤" : "💼"}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right */}
      <div className={styles.topbarRight}>
        <button
          className={styles.topbarBtn}
          onClick={() => router.push("/users/notifications")}
          title="Notifications"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1a5 5 0 015 5c0 3 1 4 1 4H2s1-1 1-4a5 5 0 015-5zM6.5 13a1.5 1.5 0 003 0"
              stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          {unread > 0 && <span className={styles.topbarBtnBadge}>{unread > 9 ? "9+" : unread}</span>}
        </button>

        {/* ✅ Fixed avatar — shows real pic or initial */}
        <div
          className={styles.topbarAvatar}
          style={{ background: colorFor(name), overflow: "hidden", cursor: "pointer" }}
          onClick={() => router.push("/users/profile")}
          title="My profile"
        >
          {profilePic
            ? <img src={`${BASE}${profilePic}`} alt={name} style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }} />
            : initial
          }
        </div>
      </div>
    </header>
  );
}