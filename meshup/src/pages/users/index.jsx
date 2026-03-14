import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchFeed, setActiveTab,
  selectPosts, selectActiveTab, selectFeedLoading,
} from "../../store/slices/feedSlice";
import { selectStats } from "../../store/slices/profileSlice";
import { selectUser } from "../../store/slices/authSlice";
import DashboardLayout from "../../components/layout/DashboardLayout";
import ComposePost from "../../components/feed/ComposePost";
import PostCard from "../../components/feed/PostCard";
import ProfileStrength from "../../components/widgets/ProfileStrength";
import PeopleToConnect from "../../components/widgets/PeopleToConnect";
import TrendingTopics from "../../components/widgets/TrendingTopics";
import styles from "../../styles/users.module.css";

const TABS = ["For you", "Following", "Trending"];

// Skeleton loader for posts
function PostSkeleton() {
  return (
    <div style={{
      background:"#13131a", border:"1px solid rgba(255,255,255,.07)",
      borderRadius:14, padding:18, display:"flex", flexDirection:"column", gap:12
    }}>
      <div style={{ display:"flex", gap:12, alignItems:"center" }}>
        <div style={{ width:42, height:42, borderRadius:"50%", background:"#1a1a24" }} />
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
          <div style={{ height:10, borderRadius:5, background:"#1a1a24", width:"40%" }} />
          <div style={{ height:10, borderRadius:5, background:"#1a1a24", width:"60%" }} />
        </div>
      </div>
      <div style={{ height:12, borderRadius:5, background:"#1a1a24" }} />
      <div style={{ height:12, borderRadius:5, background:"#1a1a24", width:"80%" }} />
    </div>
  );
}

export default function Dashboard() {
  const dispatch   = useDispatch();
  const user       = useSelector(selectUser);
  const posts      = useSelector(selectPosts);
  const stats      = useSelector(selectStats);
  const activeTab  = useSelector(selectActiveTab);
  const isLoading  = useSelector(selectFeedLoading);

  // Get display name from real backend user object
  const displayName = user?.userId?.name || user?.name || "Alex";

  useEffect(() => {
    dispatch(fetchFeed());
  }, [dispatch]);

  // Tab filtering
  const visiblePosts = posts.filter((p) => {
    if (activeTab === "Trending") return (p.likesCount ?? p.likes?.length ?? 0) > 10;
    return true;
  });

  return (
    <DashboardLayout>
      <div className={styles.content}>

        {/* CENTER */}
        <div className={styles.center}>

          {/* Welcome */}
          <div className={styles.welcomeBanner}>
            <div className={styles.welcomeText}>
              <h2 className={styles.welcomeTitle}>
                Good morning, <span className={styles.welcomeName}>{displayName}</span> 👋
              </h2>
              <p className={styles.welcomeSub}>
                Welcome back to your network.
              </p>
            </div>
            <div className={styles.welcomeStats}>
              {[
                { num: stats.connections,     label: "Connections"      },
                { num: stats.profileViews >= 1000 ? "1.2k" : stats.profileViews, label: "Profile views" },
                { num: stats.postImpressions, label: "Impressions"      },
              ].map((s, i) => (
                <div key={i} className={styles.welcomeStatGroup}>
                  {i > 0 && <div className={styles.welcomeStatDivider} />}
                  <div className={styles.welcomeStat}>
                    <span className={styles.welcomeStatNum}>{s.num}</span>
                    <span className={styles.welcomeStatLabel}>{s.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Compose */}
          <ComposePost />

          {/* Tabs */}
          <div className={styles.feedTabs}>
            {TABS.map((tab) => (
              <button
                key={tab}
                className={`${styles.feedTab} ${activeTab === tab ? styles.feedTabActive : ""}`}
                onClick={() => dispatch(setActiveTab(tab))}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Feed */}
          {isLoading ? (
            // Skeleton loaders while fetching
            [1,2,3].map((n) => <PostSkeleton key={n} />)
          ) : visiblePosts.length === 0 ? (
            <div style={{
              textAlign:"center", padding:"48px 24px",
              color:"#7878a0", fontSize:14,
              background:"#13131a",
              border:"1px dashed rgba(255,255,255,.08)",
              borderRadius:14,
            }}>
              <span style={{ fontSize:32, display:"block", marginBottom:12 }}>📭</span>
              No posts yet — be the first to share something!
            </div>
          ) : (
            visiblePosts.map((post) => <PostCard key={post._id} post={post} />)
          )}
        </div>

        {/* RIGHT */}
        <aside className={styles.rightCol}>
          <ProfileStrength />
          <PeopleToConnect />
          <TrendingTopics />
        </aside>
      </div>
    </DashboardLayout>
  );
}