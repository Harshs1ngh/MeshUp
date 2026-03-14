// 📁 src/pages/users/network.jsx
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import {
  fetchNetwork, sendConnection, acceptRequest, declineRequest, setFilter,
  selectSuggestions, selectRequests, selectConnected, selectPending,
  selectNetworkFilter, selectNetworkLoading,
} from "../../store/slices/networkSlice";
import DashboardLayout from "../../components/layout/DashboardLayout";
import styles from "../../styles/network.module.css";

const BASE   = "https://meshup-z0g6.onrender.com/uploads/";
const COLORS = ["#7c3aed","#5b5bd6","#8b5cf6","#6d28d9","#4f46e5","#6d6de0"];
const colorFor   = (str) => COLORS[(str?.charCodeAt(0) || 0) % COLORS.length];
const getInitial = (name) => name?.[0]?.toUpperCase() || "?";

// Skeleton card
function SkeletonCard() {
  return (
    <div className={styles.personCard} style={{ gap: 0 }}>
      <div className={styles.personCover} style={{ background: "#1a1a24" }} />
      <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: -28 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#252535", border: "3px solid #13131a" }} />
        <div style={{ height: 10, width: "60%", borderRadius: 5, background: "#1a1a24" }} />
        <div style={{ height: 9,  width: "80%", borderRadius: 5, background: "#1a1a24" }} />
        <div style={{ height: 28, width: "70%", borderRadius: 20, background: "#1a1a24", marginTop: 4 }} />
      </div>
    </div>
  );
}

export default function Network() {
  const dispatch    = useDispatch();
  const router      = useRouter();
  const suggestions = useSelector(selectSuggestions);
  const requests    = useSelector(selectRequests);
  const connected   = useSelector(selectConnected);
  const pending     = useSelector(selectPending);
  const filter      = useSelector(selectNetworkFilter);
  const isLoading   = useSelector(selectNetworkLoading);

  useEffect(() => { dispatch(fetchNetwork()); }, [dispatch]);

  // Filter suggestions — exclude already-connected and people who sent me a request
  const requestSenderIds = new Set(
    requests.map((r) => String(r.sender._id || r.sender))
  );

  const suggestions_filtered = suggestions.filter((p) => {
    const uid = String(p.userId?._id || p.userId);
    return !connected[uid] && !requestSenderIds.has(uid);
  });

  // ── Connection status helpers ─────────────────────────────────────────────
  const getStatus = (userId) => {
    const uid = String(userId);
    if (connected[uid]) return "connected";
    if (pending[uid])   return "pending";
    return "none";
  };

  const handleConnect = (userId) => {
    const uid = String(userId);
    if (getStatus(uid) === "none") dispatch(sendConnection(uid));
  };

  return (
    <DashboardLayout>
      <div className={styles.page}>

        {/* ── Pending incoming requests ── */}
        {(isLoading || requests.length > 0) && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Pending Requests
              {requests.length > 0 && (
                <span className={styles.sectionBadge}>{requests.length}</span>
              )}
            </h2>
            <div className={styles.requestsGrid}>
              {isLoading && requests.length === 0
                ? [1,2].map((n) => (
                    <div key={n} className={styles.requestCard}>
                      <div style={{ width:48, height:48, borderRadius:"50%", background:"#1a1a24", flexShrink:0 }} />
                      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
                        <div style={{ height:10, borderRadius:5, background:"#1a1a24", width:"40%" }} />
                        <div style={{ height:9,  borderRadius:5, background:"#1a1a24", width:"60%" }} />
                      </div>
                    </div>
                  ))
                : requests.map((req) => {
                    const sender = req.sender || {};
                    const name   = sender.name || "Unknown";
                    const pic    = sender.profilePicture;
                    const senderId = String(sender._id || sender);

                    return (
                      <div key={req._id} className={styles.requestCard}>
                        {/* Avatar */}
                        <div
                          className={styles.requestAvatar}
                          style={{ background: colorFor(name), cursor: "pointer" }}
                          onClick={() => router.push(`/users/${sender.username}`)}
                        >
                          {pic
                            ? <img src={`${BASE}${pic}`} alt={name} className={styles.requestAvatarImg} />
                            : getInitial(name)
                          }
                        </div>

                        {/* Info */}
                        <div className={styles.requestInfo}>
                          <span
                            className={styles.requestName}
                            onClick={() => router.push(`/users/${sender.username}`)}
                            style={{ cursor: "pointer" }}
                          >
                            {name}
                          </span>
                          <span className={styles.requestRole}>@{sender.username}</span>
                        </div>

                        {/* Accept / Decline */}
                        <div className={styles.requestActions}>
                          <button
                            className={styles.acceptBtn}
                            onClick={() => dispatch(acceptRequest(senderId))}
                          >
                            Accept
                          </button>
                          <button
                            className={styles.declineBtn}
                            onClick={() => dispatch(declineRequest(senderId))}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </section>
        )}

        {/* ── People you may know ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>People you may know</h2>

          {isLoading ? (
            <div className={styles.suggestionsGrid}>
              {[1,2,3,4,5,6].map((n) => <SkeletonCard key={n} />)}
            </div>
          ) : suggestions_filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <span style={{ fontSize: 32 }}>🤝</span>
              <p>You're connected with everyone!</p>
            </div>
          ) : (
            <div className={styles.suggestionsGrid}>
              {suggestions_filtered.map((profile) => {
                const user    = profile.userId || {};
                const userId  = String(user._id || user);
                const name    = user.name     || "Unknown";
                const pic     = user.profilePicture;
                const status  = getStatus(userId);

                return (
                  <div key={userId} className={styles.personCard}>
                    {/* Cover */}
                    <div className={styles.personCover} />

                    {/* Avatar */}
                    <div className={styles.personAvatarWrap}>
                      <div
                        className={styles.personAvatar}
                        style={{ background: colorFor(name), cursor: "pointer" }}
                        onClick={() => router.push(`/users/${user.username}`)}
                      >
                        {pic
                          ? <img src={`${BASE}${pic}`} alt={name} className={styles.personAvatarImg} />
                          : getInitial(name)
                        }
                      </div>
                    </div>

                    {/* Info */}
                    <div className={styles.personInfo}>
                      <span
                        className={styles.personName}
                        onClick={() => router.push(`/users/${user.username}`)}
                        style={{ cursor: "pointer" }}
                      >
                        {name}
                      </span>
                      <span className={styles.personRole}>
                        {profile.headline || `@${user.username}`}
                      </span>
                      {profile.location && (
                        <span className={styles.personMutual}>📍 {profile.location}</span>
                      )}
                      {profile.skills?.length > 0 && (
                        <div className={styles.personSkills}>
                          {profile.skills.slice(0, 2).map((s, i) => (
                            <span key={i} className={styles.personSkillTag}>{s}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Buttons */}
                    <div className={styles.personActions}>
                      <button
                        className={styles.viewProfileBtn}
                        onClick={() => router.push(`/users/${user.username}`)}
                      >
                        View profile
                      </button>
                      <button
                        className={`${styles.connectBtn} ${
                          status === "connected" ? styles.connectBtnDone :
                          status === "pending"   ? styles.connectBtnPending : ""
                        }`}
                        onClick={() => handleConnect(userId)}
                        disabled={status !== "none"}
                      >
                        {status === "connected" ? "✓ Connected" :
                         status === "pending"   ? "Pending…"   : "+ Connect"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── My Connections ── */}
        {Object.keys(connected).length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              My Connections
              <span className={styles.sectionBadge}>{Object.keys(connected).length}</span>
            </h2>
            <div className={styles.suggestionsGrid}>
              {suggestions
                .filter((p) => connected[String(p.userId?._id || p.userId)])
                .map((profile) => {
                  const user   = profile.userId || {};
                  const userId = String(user._id || user);
                  const name   = user.name || "Unknown";
                  const pic    = user.profilePicture;

                  return (
                    <div key={userId} className={styles.personCard}>
                      <div className={styles.personCover} />
                      <div className={styles.personAvatarWrap}>
                        <div
                          className={styles.personAvatar}
                          style={{ background: colorFor(name), cursor: "pointer" }}
                          onClick={() => router.push(`/users/${user.username}`)}
                        >
                          {pic
                            ? <img src={`${BASE}${pic}`} alt={name} className={styles.personAvatarImg} />
                            : getInitial(name)
                          }
                        </div>
                      </div>
                      <div className={styles.personInfo}>
                        <span
                          className={styles.personName}
                          onClick={() => router.push(`/users/${user.username}`)}
                          style={{ cursor: "pointer" }}
                        >
                          {name}
                        </span>
                        <span className={styles.personRole}>
                          {profile.headline || `@${user.username}`}
                        </span>
                      </div>
                      <div className={styles.personActions}>
                        <button
                          className={styles.viewProfileBtn}
                          onClick={() => router.push(`/users/${user.username}`)}
                        >
                          View profile
                        </button>
                        <span className={styles.connectedBadge}>✓ Connected</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

      </div>
    </DashboardLayout>
  );
}