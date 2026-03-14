// 📁 src/components/widgets/PeopleToConnect.jsx
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import {
  fetchNetwork, sendConnection,
  selectSuggestions, selectPending, selectConnected,
  selectRequests, selectNetworkLoading,
} from "../../store/slices/networkSlice";
import styles from "../../styles/widgets.module.css";

const BASE     = "https://meshup-z0g6.onrender.com/uploads/";
const COLORS   = ["#7c3aed","#5b5bd6","#8b5cf6","#6d28d9","#4f46e5"];
const colorFor = (str) => COLORS[(str?.charCodeAt(0) || 0) % COLORS.length];

export default function PeopleToConnect() {
  const dispatch  = useDispatch();
  const router    = useRouter();
  const all       = useSelector(selectSuggestions);
  const pending   = useSelector(selectPending);
  const connected = useSelector(selectConnected);
  const requests  = useSelector(selectRequests);
  const isLoading = useSelector(selectNetworkLoading);

  useEffect(() => { dispatch(fetchNetwork()); }, [dispatch]);

  // Exclude already connected and people who sent me a request
  const requestSenderIds = new Set(
    requests.map((r) => String(r.sender?._id || r.sender))
  );

  const people = all
    .filter((p) => {
      const uid = String(p.userId?._id || p.userId);
      return !connected[uid] && !requestSenderIds.has(uid);
    })
    .slice(0, 3);

  if (isLoading) return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <span className={styles.widgetTitle}>People to connect</span>
      </div>
      {[1,2,3].map((n) => (
        <div key={n} className={styles.suggestionItem} style={{ gap: 10 }}>
          <div style={{ width:40, height:40, borderRadius:"50%", background:"#1a1a24", flexShrink:0 }} />
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}>
            <div style={{ height:10, borderRadius:5, background:"#1a1a24", width:"60%" }} />
            <div style={{ height:9,  borderRadius:5, background:"#1a1a24", width:"80%" }} />
          </div>
        </div>
      ))}
    </div>
  );

  if (people.length === 0) return null;

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <span className={styles.widgetTitle}>People to connect</span>
        <button className={styles.widgetLink} onClick={() => router.push("/users/network")}>
          See all
        </button>
      </div>

      {people.map((profile) => {
        const user      = profile.userId || {};
        const userId    = String(user._id || user);
        const name      = user.name || "Unknown";
        const username  = user.username || "";
        const pic       = user.profilePicture;
        const isPending  = !!pending[userId];
        const isConnected = !!connected[userId];

        return (
          <div key={userId} className={styles.suggestionItem}>
            <div
              className={styles.suggestionAvatar}
              style={{ background: colorFor(name), cursor: "pointer" }}
              onClick={() => router.push(`/users/${username}`)}
            >
              {pic
                ? <img src={`${BASE}${pic}`} alt={name} className={styles.suggestionAvatarImg} />
                : name[0]?.toUpperCase()
              }
            </div>

            <div className={styles.suggestionInfo}>
              <span
                className={styles.suggestionName}
                onClick={() => router.push(`/users/${username}`)}
                style={{ cursor: "pointer" }}
              >
                {name}
              </span>
              {profile.headline && (
                <span className={styles.suggestionRole}>{profile.headline}</span>
              )}
            </div>

            <button
              className={`${styles.connectBtn} ${
                isConnected ? styles.connectBtnDone :
                isPending   ? styles.connectBtnPending : ""
              }`}
              onClick={() => !isPending && !isConnected && dispatch(sendConnection(userId))}
              disabled={isPending || isConnected}
            >
              {isConnected ? "✓" : isPending ? "…" : "+"}
            </button>
          </div>
        );
      })}
    </div>
  );
}