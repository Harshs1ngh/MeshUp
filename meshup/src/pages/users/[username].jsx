// 📁 src/pages/users/[username].jsx
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import {
  fetchUserProfile, selectViewedProfile, selectProfileLoading,
} from "../../store/slices/profileSlice";
import { selectUser } from "../../store/slices/authSlice";
import { sendConnection, selectPending, selectConnected } from "../../store/slices/networkSlice";
import DashboardLayout from "../../components/layout/DashboardLayout";
import ActivityHeatmap from "../../components/profile/ActivityHeatmap";
import styles from "../../styles/profile.module.css";
import api from "../../services/api";

const BASE = "http://localhost:8000/uploads/";
const COLORS = ["#7c3aed","#5b5bd6","#8b5cf6","#6d28d9","#4f46e5"];
const colorFor = (s) => COLORS[(s?.charCodeAt(0)||0) % COLORS.length];

function Avatar({ pic, name, size = 96 }) {
  return (
    <div className={styles.avatarCircle} style={{ width: size, height: size, background: colorFor(name) }}>
      {pic
        ? <img src={`${BASE}${pic}`} alt={name} className={styles.avatarImg} />
        : <span style={{ fontSize: size * 0.38, fontWeight: 700, color: "#fff" }}>{name?.[0]?.toUpperCase()}</span>
      }
    </div>
  );
}


// Post card for public profile view
function PublicPostCard({ post, onLike }) {
  return (
    <div className={styles.postCard}>
      {post.media && post.mediaType === "image" && (
        <div className={styles.postMedia}>
          <img src={`${BASE}${post.media}`} alt="post" className={styles.postMediaImg} />
        </div>
      )}
      <div className={styles.postBody}>
        {post.body && <p className={styles.postText}>{post.body}</p>}
        <div className={styles.postMeta}>
          <button
            className={`${styles.postLikeBtn} ${post.likedByMe ? styles.postLikeBtnActive : ""}`}
            onClick={() => onLike(post._id)}
          >
            {post.likedByMe ? "❤️" : "🤍"} {post.likesCount ?? 0}
          </button>
          <span className={styles.postDate}>
            {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function UserProfile() {
  const dispatch = useDispatch();
  const router   = useRouter();
  const { username } = router.query;

  const profile   = useSelector(selectViewedProfile);
  const isLoading = useSelector(selectProfileLoading);
  const authUser  = useSelector(selectUser);
  const pending   = useSelector(selectPending);
  const connected = useSelector(selectConnected);

  const isAuthReady  = !!authUser;
  const myUsername   = authUser?.userId?.username || authUser?.username;
  const isOwnProfile = isAuthReady && username && username === myUsername;

  const [activeTab,    setActiveTab]    = useState("posts");
  const [connections,  setConnections]  = useState([]);
  const [loadingConn,  setLoadingConn]  = useState(false);
  const [posts,        setPosts]        = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    if (isOwnProfile) router.replace("/users/profile");
  }, [isOwnProfile]);

  useEffect(() => {
    if (isAuthReady && username && !isOwnProfile)
      dispatch(fetchUserProfile(username));
  }, [isAuthReady, username, isOwnProfile, dispatch]);

  // Load their posts
  useEffect(() => {
    const userId = profile?.userId?._id;
    if (!userId || activeTab !== "posts") return;
    setLoadingPosts(true);
    api.get(`/posts/user/${userId}`)
      .then(r => setPosts(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingPosts(false));
  }, [profile?.userId?._id, activeTab]);

  // Load their connections
  useEffect(() => {
    const userId = profile?.userId?._id;
    if (!userId || activeTab !== "connections") return;
    setLoadingConn(true);
    api.get(`/connections/user/${userId}`)
      .then(r => setConnections(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingConn(false));
  }, [profile?.userId?._id, activeTab]);

  const handleLike = async (postId) => {
    try {
      const res = await api.put(`/like/${postId}`);
      setPosts(prev => prev.map(p =>
        p._id === postId
          ? { ...p, likedByMe: res.data.liked, likesCount: res.data.likesCount }
          : p
      ));
    } catch {}
  };

  const viewedUserId  = String(profile?.userId?._id || "");
  const backendStatus = profile?.connectionStatus;
  const isConnected   = backendStatus === "connected"       || !!connected[viewedUserId];
  const isPendingSent = backendStatus === "pending_sent"    || !!pending[viewedUserId];
  const isPendingRcv  = backendStatus === "pending_received";

  const handleConnect = () => {
    if (!isConnected && !isPendingSent && viewedUserId)
      dispatch(sendConnection(viewedUserId));
  };
  const handleMessage = () => router.push(`/users/messages?with=${viewedUserId}`);

  if (!isAuthReady || isOwnProfile) return (
    <DashboardLayout><div className={styles.loadingCenter}><span className={styles.spinner} /></div></DashboardLayout>
  );
  if (isLoading) return (
    <DashboardLayout><div className={styles.loadingCenter}><span className={styles.spinner} /> Loading…</div></DashboardLayout>
  );
  if (!profile) return (
    <DashboardLayout><div className={styles.loadingCenter}>User not found</div></DashboardLayout>
  );

  const user       = profile.userId || {};
  const profilePic = user.profilePicture;
  const name       = user.name || "Unknown";

  const tabs = [
    { id: "posts",       label: `Posts (${profile.postCount ?? 0})` },
    { id: "about",       label: "About" },
    { id: "experience",  label: "Experience" },
    { id: "connections", label: `Connections (${profile.connectionCount || 0})` },
  ];

  return (
    <DashboardLayout>
      <div className={styles.profilePage}>

        {/* ── HERO ── */}
        <div className={styles.heroCard}>
          <div className={styles.coverBg}>
            {profile.coverPhoto
              ? <img src={`${BASE}${profile.coverPhoto}`} alt="cover" className={styles.coverImg} />
              : <div className={styles.coverGradient} />
            }
          </div>

          <div className={styles.heroAvatarRow}>
            <div className={styles.heroAvatarWrap}>
              <Avatar pic={profilePic} name={name} size={100} />
            </div>
            <div className={styles.heroActions}>
              <button className={styles.msgBtn} onClick={handleMessage}>
                💬 Message
              </button>
              <button
                className={`${styles.connectBtn} ${isConnected ? styles.connectBtnDone : ""} ${isPendingSent ? styles.connectBtnPending : ""}`}
                onClick={handleConnect}
                disabled={isConnected || isPendingSent}
              >
                {isConnected ? "✓ Connected" : isPendingSent ? "⏳ Pending" : isPendingRcv ? "Respond" : "+ Connect"}
              </button>
            </div>
          </div>

          <div className={styles.heroInfo}>
            <div className={styles.heroNameRow}>
              <h1 className={styles.heroName}>{name}</h1>
              <span className={styles.heroUsername}>@{user.username}</span>
            </div>
            {profile.headline && <p className={styles.heroHeadline}>{profile.headline}</p>}
            <div className={styles.heroMeta}>
              {profile.location && <span className={styles.metaChip}>📍 {profile.location}</span>}
              {profile.website  && <a href={profile.website} target="_blank" rel="noreferrer" className={styles.metaChip}>🔗 Website</a>}
              {profile.connectionCount > 0 && (
                <span className={styles.metaChip}>🤝 {profile.connectionCount} connection{profile.connectionCount !== 1 ? "s" : ""}</span>
              )}
            </div>
            {profile.skills?.length > 0 && (
              <div className={styles.heroSkillsRow}>
                {profile.skills.slice(0,5).map((s,i) => <span key={i} className={styles.skillPill}>{s}</span>)}
                {profile.skills.length > 5 && <span className={styles.skillPillMore}>+{profile.skills.length - 5}</span>}
              </div>
            )}
          </div>

          <div className={styles.tabNav}>
            {tabs.map(tab => (
              <button key={tab.id}
                className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ""}`}
                onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className={styles.contentGrid}>
          <div className={styles.mainCol}>

            {/* POSTS TAB */}
            {activeTab === "posts" && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>Posts</span>
                </div>
                {loadingPosts
                  ? <div className={styles.emptyState}><span className={styles.spinner} /></div>
                  : posts.length === 0
                  ? <div className={styles.emptyState}>
                      <span style={{fontSize:36}}>📝</span>
                      <p>{name} hasn't posted anything yet.</p>
                    </div>
                  : <div className={styles.postsList}>
                      {posts.map(p => <PublicPostCard key={p._id} post={p} onLike={handleLike} />)}
                    </div>
                }
              </div>
            )}

            {/* ABOUT TAB */}
            {activeTab === "about" && (<>
              {profile.bio && (
                <div className={styles.card}>
                  <div className={styles.cardHeader}><span className={styles.cardTitle}>About</span></div>
                  <p className={styles.bioText}>{profile.bio}</p>
                </div>
              )}
              {profile.skills?.length > 0 && (
                <div className={styles.card}>
                  <div className={styles.cardHeader}><span className={styles.cardTitle}>Skills</span></div>
                  <div className={styles.skillsGrid}>
                    {profile.skills.map((s,i) => (
                      <div key={i} className={styles.skillCard}><span className={styles.skillDot} />{s}</div>
                    ))}
                  </div>
                </div>
              )}
              {!profile.bio && !profile.skills?.length && (
                <div className={styles.card}>
                  <div className={styles.emptyState}>
                    <span style={{fontSize:32}}>👤</span>
                    <p>{name} hasn't filled out their profile yet.</p>
                  </div>
                </div>
              )}
            </>)}

            {/* EXPERIENCE TAB */}
            {activeTab === "experience" && (<>
              {profile.workExperience?.length > 0 && (
                <div className={styles.card}>
                  <div className={styles.cardHeader}><span className={styles.cardTitle}>Work Experience</span></div>
                  <div className={styles.timelineList}>
                    {profile.workExperience.map((w,i) => (
                      <div key={i} className={styles.timelineItem}>
                        <div className={styles.timelineDot} />
                        <div className={styles.timelineBody}>
                          <span className={styles.timelineTitle}>{w.position}</span>
                          <span className={styles.timelineCompany}>{w.company}</span>
                          <span className={styles.timelineDate}>
                            {w.startDate ? new Date(w.startDate).getFullYear() : ""}
                            {" – "}
                            {w.isCurrent ? "Present" : w.endDate ? new Date(w.endDate).getFullYear() : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {profile.education?.length > 0 && (
                <div className={styles.card}>
                  <div className={styles.cardHeader}><span className={styles.cardTitle}>Education</span></div>
                  <div className={styles.timelineList}>
                    {profile.education.map((e,i) => (
                      <div key={i} className={styles.timelineItem}>
                        <div className={styles.timelineDot} />
                        <div className={styles.timelineBody}>
                          <span className={styles.timelineTitle}>{e.school}</span>
                          <span className={styles.timelineCompany}>{e.degree}{e.fieldOfStudy ? ` · ${e.fieldOfStudy}` : ""}</span>
                          <span className={styles.timelineDate}>
                            {e.startDate ? new Date(e.startDate).getFullYear() : ""}
                            {e.endDate ? ` – ${new Date(e.endDate).getFullYear()}` : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!profile.workExperience?.length && !profile.education?.length && (
                <div className={styles.card}>
                  <div className={styles.emptyState}>
                    <span style={{fontSize:32}}>📋</span>
                    <p>No experience added yet.</p>
                  </div>
                </div>
              )}
            </>)}

            {/* CONNECTIONS TAB */}
            {activeTab === "connections" && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>Connections · {connections.length}</span>
                </div>
                {loadingConn
                  ? <div className={styles.emptyState}><span className={styles.spinner} /></div>
                  : connections.length === 0
                  ? <div className={styles.emptyState}><span style={{fontSize:32}}>🤝</span><p>No connections yet.</p></div>
                  : <div className={styles.connectionsGrid}>
                      {connections.map(c => (
                        <div key={c._id} className={styles.connectionCard} onClick={() => router.push(`/users/${c.username}`)}>
                          <Avatar pic={c.profilePicture} name={c.name} size={52} />
                          <div className={styles.connectionInfo}>
                            <span className={styles.connectionName}>{c.name}</span>
                            <span className={styles.connectionUser}>@{c.username}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                }
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className={styles.sideCol}>
            {/* Activity heatmap — public, shows their post activity */}
            <ActivityHeatmap userId={profile?.userId?._id} />

            <div className={styles.card}>
              <div className={styles.cardHeader}><span className={styles.cardTitle}>Activity</span></div>
              <div className={styles.actStats}>
                <div className={styles.actStat}>
                  <span className={styles.actStatNum}>{profile.connectionCount ?? 0}</span>
                  <span className={styles.actStatLabel}>Connections</span>
                </div>
                <div className={styles.actStat}>
                  <span className={styles.actStatNum}>{profile.postCount ?? 0}</span>
                  <span className={styles.actStatLabel}>Posts</span>
                </div>
                <div className={styles.actStat}>
                  <span className={styles.actStatNum}>{profile.totalLikes ?? 0}</span>
                  <span className={styles.actStatLabel}>Reactions</span>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}><span className={styles.cardTitle}>Quick actions</span></div>
              <div style={{ padding: "8px 20px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                <button className={styles.sideActionBtn} onClick={handleMessage}>💬 Send a message</button>
                {!isConnected && !isPendingSent && (
                  <button className={styles.sideActionBtn} onClick={handleConnect}>🤝 Connect</button>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noreferrer" className={styles.sideActionBtn}>🔗 Visit website</a>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}