// 📁 src/pages/users/profile.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import {
  fetchMyProfile, updateProfile, updateUserInfo, uploadProfilePicture,
  selectMyProfile, selectProfileLoading, selectProfileSaving,
  selectProfileUploading, selectTasks, selectStrength, selectStats,
} from "../../store/slices/profileSlice";
import { selectUser } from "../../store/slices/authSlice";
import DashboardLayout from "../../components/layout/DashboardLayout";
import ActivityHeatmap from "../../components/profile/ActivityHeatmap";
import { OwnWebsiteTime } from "../../components/profile/WebsiteTime";
import { fetchSites } from "../../store/slices/progressSlice";
import styles from "../../styles/profile.module.css";
import api from "../../services/api";

// Cloudinary public_ids look like "meshup/avatars/abc123"
// Full upload URLs look like "https://res.cloudinary.com/..."
// Legacy local paths are plain filenames like "abc123.jpg"
const CLOUD = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;
const imgUrl = (val) => {
  if (!val) return null;
  if (val.startsWith("http")) return val;                    // already full URL
  if (val.startsWith("meshup/")) return `${CLOUD}/${val}`;  // Cloudinary public_id
  return `http://localhost:8000/uploads/${val}`;             // legacy local
};

const COLORS = ["#7c3aed","#5b5bd6","#8b5cf6","#6d28d9","#4f46e5"];
const colorFor = (s) => COLORS[(s?.charCodeAt(0)||0) % COLORS.length];

function Avatar({ pic, name, size = 96 }) {
  const url = imgUrl(pic);
  return (
    <div className={styles.avatarCircle} style={{ width: size, height: size, background: colorFor(name) }}>
      {url
        ? <img src={url} alt={name} className={styles.avatarImg} />
        : <span style={{ fontSize: size * 0.38, fontWeight: 700, color: "#fff" }}>{name?.[0]?.toUpperCase()}</span>
      }
    </div>
  );
}

// ─── Cover crop modal ──────────────────────────────────────────────────────────
// Full 2D drag + scroll/pinch zoom + rule-of-thirds guides
// Output canvas is 1200×400 (3:1) — matches Cloudinary COVER_OPTIONS exactly
const CROP_W = 1200;
const CROP_H = 400;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function CoverCropModal({ file, onConfirm, onCancel }) {
  const canvasRef    = useRef(null);
  const imgRef       = useRef(null);
  const containerRef = useRef(null);
  const rafRef       = useRef(null);
  const dragRef      = useRef({ active: false, startX: 0, startY: 0 });
  const stateRef     = useRef({ x: 0, y: 0, zoom: 1 }); // use ref for raf perf

  const [imgLoaded,  setImgLoaded]  = useState(false);
  const [zoom,       setZoom]       = useState(1);      // mirrors stateRef for slider UI
  const [showGuides, setShowGuides] = useState(true);
  const [dragging,   setDragging]   = useState(false);

  // Clamp pan so image always fills the canvas
  const clamp = useCallback((x, y, z) => {
    const img = imgRef.current;
    if (!img) return { x, y };
    const drawW = img.naturalWidth  * z;
    const drawH = img.naturalHeight * z;
    const minX  = CROP_W - drawW;
    const minY  = CROP_H - drawH;
    return {
      x: Math.min(0, Math.max(minX, x)),
      y: Math.min(0, Math.max(minY, y)),
    };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;

    const ctx  = canvas.getContext("2d");
    const { x, y, zoom: z } = stateRef.current;
    canvas.width  = CROP_W;
    canvas.height = CROP_H;
    ctx.clearRect(0, 0, CROP_W, CROP_H);
    ctx.drawImage(img, x, y, img.naturalWidth * z, img.naturalHeight * z);

    if (showGuides) {
      // Rule-of-thirds grid
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth   = 1;
      [CROP_W / 3, (CROP_W * 2) / 3].forEach(gx => {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, CROP_H); ctx.stroke();
      });
      [CROP_H / 3, (CROP_H * 2) / 3].forEach(gy => {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(CROP_W, gy); ctx.stroke();
      });
      // Corner brackets
      const b = 24, t = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth   = t;
      [[0,0],[CROP_W,0],[0,CROP_H],[CROP_W,CROP_H]].forEach(([cx,cy]) => {
        const sx = cx === 0 ? 1 : -1, sy = cy === 0 ? 1 : -1;
        ctx.beginPath(); ctx.moveTo(cx, cy + sy*b); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx*b, cy); ctx.stroke();
      });
    }
  }, [imgLoaded, showGuides]);

  // Re-draw whenever draw deps change
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [draw, zoom]); // zoom triggers re-draw via stateRef

  // Initialise pan to center the image when it loads
  const handleImgLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    // Fit zoom so image fills width at minimum
    const fitZoom = Math.max(
      CROP_W  / img.naturalWidth,
      CROP_H  / img.naturalHeight,
    );
    const initZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fitZoom));
    const cx = (CROP_W - img.naturalWidth  * initZoom) / 2;
    const cy = (CROP_H - img.naturalHeight * initZoom) / 2;
    const clamped = clamp(cx, cy, initZoom);
    stateRef.current = { x: clamped.x, y: clamped.y, zoom: initZoom };
    setZoom(initZoom);
    setImgLoaded(true);
  }, [clamp]);

  // ── Mouse drag ──────────────────────────────────────────────────────────────
  const onMouseDown = (e) => {
    e.preventDefault();
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY };
    setDragging(true);
  };
  const onMouseMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    const { x, y, zoom: z } = stateRef.current;
    const clamped = clamp(x + dx, y + dy, z);
    stateRef.current = { ...stateRef.current, ...clamped };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [clamp, draw]);
  const onMouseUp = () => { dragRef.current.active = false; setDragging(false); };

  // ── Touch drag ──────────────────────────────────────────────────────────────
  const lastTouchRef = useRef(null);
  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setDragging(true);
    }
  };
  const onTouchMove = useCallback((e) => {
    e.preventDefault();
    if (e.touches.length === 1 && lastTouchRef.current) {
      const dx = e.touches[0].clientX - lastTouchRef.current.x;
      const dy = e.touches[0].clientY - lastTouchRef.current.y;
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const { x, y, zoom: z } = stateRef.current;
      const clamped = clamp(x + dx, y + dy, z);
      stateRef.current = { ...stateRef.current, ...clamped };
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    }
  }, [clamp, draw]);
  const onTouchEnd = () => { lastTouchRef.current = null; setDragging(false); };

  // ── Scroll / pinch zoom ─────────────────────────────────────────────────────
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const delta    = e.deltaY > 0 ? -0.08 : 0.08;
    const newZoom  = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, stateRef.current.zoom + delta));
    // Zoom toward cursor position
    const rect     = canvasRef.current?.getBoundingClientRect();
    const mx       = rect ? (e.clientX - rect.left) / rect.width  * CROP_W : CROP_W / 2;
    const my       = rect ? (e.clientY - rect.top)  / rect.height * CROP_H : CROP_H / 2;
    const ratio    = newZoom / stateRef.current.zoom;
    const newX     = mx - ratio * (mx - stateRef.current.x);
    const newY     = my - ratio * (my - stateRef.current.y);
    const clamped  = clamp(newX, newY, newZoom);
    stateRef.current = { x: clamped.x, y: clamped.y, zoom: newZoom };
    setZoom(newZoom); // triggers re-draw via useEffect
  }, [clamp]);

  // Attach wheel with { passive:false } to allow preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  // ── Zoom slider ──────────────────────────────────────────────────────────────
  const handleSlider = (e) => {
    const newZoom = parseFloat(e.target.value);
    // Zoom toward center
    const { x, y, zoom: z } = stateRef.current;
    const ratio   = newZoom / z;
    const cx      = CROP_W / 2;
    const cy      = CROP_H / 2;
    const newX    = cx - ratio * (cx - x);
    const newY    = cy - ratio * (cy - y);
    const clamped = clamp(newX, newY, newZoom);
    stateRef.current = { x: clamped.x, y: clamped.y, zoom: newZoom };
    setZoom(newZoom);
  };

  // ── Export ───────────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    // Re-draw without guides for the final export
    const offscreen = document.createElement("canvas");
    offscreen.width  = CROP_W;
    offscreen.height = CROP_H;
    const ctx = offscreen.getContext("2d");
    const { x, y, zoom: z } = stateRef.current;
    ctx.drawImage(imgRef.current, x, y, imgRef.current.naturalWidth * z, imgRef.current.naturalHeight * z);
    offscreen.toBlob((blob) => {
      onConfirm(new File([blob], "cover.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.93);
  };

  const objectUrl = URL.createObjectURL(file);
  const zoomPct   = Math.round((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM) * 100);

  return (
    <div className={styles.cropOverlay} onClick={onCancel}>
      <div className={styles.cropModal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.cropHeader}>
          <div>
            <h3 className={styles.cropTitle}>Adjust cover photo</h3>
            <p className={styles.cropHint}>Drag to reposition · scroll to zoom</p>
          </div>
          <button className={styles.cropCloseBtn} onClick={onCancel}>✕</button>
        </div>

        {/* Hidden img source */}
        <img
          ref={imgRef}
          src={objectUrl}
          style={{ display: "none" }}
          onLoad={handleImgLoad}
          alt=""
          crossOrigin="anonymous"
        />

        {/* Canvas viewport */}
        <div
          ref={containerRef}
          className={styles.cropViewport}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ cursor: dragging ? "grabbing" : "grab" }}
        >
          <canvas ref={canvasRef} className={styles.cropCanvasEl} />
          {!imgLoaded && (
            <div className={styles.cropLoading}>
              <span className={styles.spinner} />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className={styles.cropControls}>
          <div className={styles.cropZoomRow}>
            <span className={styles.cropZoomIcon}>🔍</span>
            <input
              type="range"
              className={styles.cropSlider}
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={handleSlider}
            />
            <span className={styles.cropZoomLabel}>{zoomPct}%</span>
            <button
              className={`${styles.cropGuideBtn} ${showGuides ? styles.cropGuideBtnActive : ""}`}
              onClick={() => setShowGuides(g => !g)}
              title="Toggle rule-of-thirds grid"
            >
              ⊞ Grid
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.cropActions}>
          <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleConfirm} disabled={!imgLoaded}>
            Apply cover
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Post card (mini) ──────────────────────────────────────────────────────────
function PostCard({ post, onLike }) {
  return (
    <div className={styles.postCard}>
      {post.media && (
        <div className={styles.postMedia}>
          <img src={imgUrl(post.mediaUrl || post.media)} alt="post" className={styles.postMediaImg} />
        </div>
      )}
      <div className={styles.postBody}>
        <p className={styles.postText}>{post.body}</p>
        <div className={styles.postMeta}>
          <button className={`${styles.postLikeBtn} ${post.likedByMe ? styles.postLikeBtnActive : ""}`} onClick={() => onLike(post._id)}>
            {post.likedByMe ? "❤️" : "🤍"} {post.likesCount}
          </button>
          <span className={styles.postDate}>
            {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function MyProfile() {
  const dispatch    = useDispatch();
  const router      = useRouter();
  const profile     = useSelector(selectMyProfile);
  const authUser    = useSelector(selectUser);
  const isLoading   = useSelector(selectProfileLoading);
  const isSaving    = useSelector(selectProfileSaving);
  const isUploading = useSelector(selectProfileUploading);
  const tasks       = useSelector(selectTasks);
  const strength    = useSelector(selectStrength);
  const stats       = useSelector(selectStats);
  const picRef      = useRef();
  const coverRef    = useRef();

  const [editSection,    setEditSection]    = useState(null);
  const [saved,          setSaved]          = useState(false);
  const [activeTab,      setActiveTab]      = useState("posts");
  const [connections,    setConnections]    = useState([]);
  const [posts,          setPosts]          = useState([]);
  const [loadingPosts,   setLoadingPosts]   = useState(false);
  const [editWorkIdx,    setEditWorkIdx]    = useState(null);
  const [editEduIdx,     setEditEduIdx]     = useState(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [cropFile,       setCropFile]       = useState(null); // triggers crop modal

  const [form, setForm] = useState({
    name: "", username: "", headline: "", bio: "", location: "", website: "",
    skills: "",
    company: "", position: "", workStart: "", workEnd: "", isCurrent: false,
    school: "", degree: "", field: "", eduStart: "", eduEnd: "",
  });

  useEffect(() => { dispatch(fetchMyProfile()); dispatch(fetchSites()); }, [dispatch]);

  useEffect(() => {
    if (!profile) return;
    const u = profile.userId || {};
    setForm((f) => ({
      ...f,
      name: u.name || "", username: u.username || "",
      headline: profile.headline || "", bio: profile.bio || "",
      location: profile.location || "", website: profile.website || "",
      skills: (profile.skills || []).join(", "),
    }));
  }, [profile]);

  // Load posts
  useEffect(() => {
    const myId = profile?.userId?._id;
    if (!myId || activeTab !== "posts") return;
    setLoadingPosts(true);
    api.get(`/posts/user/${myId}`)
      .then(r => setPosts(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingPosts(false));
  }, [profile?.userId?._id, activeTab]);

  // Load connections
  useEffect(() => {
    const myId = profile?.userId?._id;
    if (!myId || activeTab !== "connections") return;
    api.get(`/connections/user/${myId}`).then(r => setConnections(r.data || [])).catch(() => {});
  }, [profile?.userId?._id, activeTab]);

  const user       = profile?.userId || {};
  const profilePic = user?.profilePicture;
  const name       = user?.name || authUser?.userId?.name || "Your Name";
  const username   = user?.username || authUser?.userId?.username || "username";

  const handlePicChange = (e) => {
    if (e.target.files[0]) dispatch(uploadProfilePicture(e.target.files[0]));
  };

  const handleCoverFileSelect = (e) => {
    if (e.target.files[0]) setCropFile(e.target.files[0]);
    e.target.value = "";
  };

  const handleCropConfirm = async (croppedFile) => {
    setCropFile(null);
    setCoverUploading(true);
    try {
      const fd = new FormData();
      fd.append("coverPhoto", croppedFile);
      const res = await api.post("/upload_coverPhoto", fd, { headers: { "Content-Type": "multipart/form-data" } });
      // Patch myProfile with new coverPhoto
      dispatch(fetchMyProfile());
    } catch (err) {
      console.error("Cover upload failed", err);
    } finally {
      setCoverUploading(false);
    }
  };

  const f = (key) => (e) =>
    setForm((p) => ({ ...p, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const openEditWork = (idx) => {
    if (idx === null) setForm(p => ({ ...p, company: "", position: "", workStart: "", workEnd: "", isCurrent: false }));
    else {
      const w = profile.workExperience[idx];
      setForm(p => ({ ...p, company: w.company, position: w.position,
        workStart: w.startDate?.slice(0,10) || "", workEnd: w.endDate?.slice(0,10) || "", isCurrent: w.isCurrent || false }));
    }
    setEditWorkIdx(idx); setEditSection("work");
  };

  const openEditEdu = (idx) => {
    if (idx === null) setForm(p => ({ ...p, school: "", degree: "", field: "", eduStart: "", eduEnd: "" }));
    else {
      const e = profile.education[idx];
      setForm(p => ({ ...p, school: e.school, degree: e.degree, field: e.fieldOfStudy || "",
        eduStart: e.startDate?.slice(0,10) || "", eduEnd: e.endDate?.slice(0,10) || "" }));
    }
    setEditEduIdx(idx); setEditSection("education");
  };

  const handleSave = async () => {
    if (editSection === "basic") {
      await dispatch(updateUserInfo({ name: form.name, username: form.username }));
      await dispatch(updateProfile({ headline: form.headline, location: form.location, website: form.website }));
    }
    if (editSection === "bio")    await dispatch(updateProfile({ bio: form.bio }));
    if (editSection === "skills") await dispatch(updateProfile({ skills: form.skills.split(",").map(s => s.trim()).filter(Boolean) }));
    if (editSection === "work") {
      const existing = [...(profile?.workExperience || [])];
      const entry = { company: form.company, position: form.position, startDate: form.workStart, endDate: form.isCurrent ? null : form.workEnd, isCurrent: form.isCurrent };
      if (editWorkIdx === null) existing.push(entry); else existing[editWorkIdx] = entry;
      await dispatch(updateProfile({ workExperience: existing }));
    }
    if (editSection === "education") {
      const existing = [...(profile?.education || [])];
      const entry = { school: form.school, degree: form.degree, fieldOfStudy: form.field, startDate: form.eduStart, endDate: form.eduEnd };
      if (editEduIdx === null) existing.push(entry); else existing[editEduIdx] = entry;
      await dispatch(updateProfile({ education: existing }));
    }
    setSaved(true);
    setTimeout(() => { setSaved(false); setEditSection(null); setEditWorkIdx(null); setEditEduIdx(null); }, 1200);
  };

  const handleDeleteWork = async (idx) =>
    dispatch(updateProfile({ workExperience: (profile?.workExperience || []).filter((_,i) => i !== idx) }));
  const handleDeleteEdu  = async (idx) =>
    dispatch(updateProfile({ education:      (profile?.education      || []).filter((_,i) => i !== idx) }));

  const handleLike = async (postId) => {
    await api.put(`/like/${postId}`);
    setPosts(prev => prev.map(p =>
      p._id === postId
        ? { ...p, likedByMe: !p.likedByMe, likesCount: p.likesCount + (p.likedByMe ? -1 : 1) }
        : p
    ));
  };

  const strengthColor = strength >= 80 ? "#34d399" : strength >= 50 ? "#a78bfa" : "#f97316";

  const TABS = [
    { id: "posts",       label: `Posts (${stats?.posts || 0})` },
    { id: "about",       label: "About" },
    { id: "experience",  label: "Experience" },
    { id: "connections", label: `Connections (${stats?.connections || 0})` },
  ];

  if (isLoading && !profile) return (
    <DashboardLayout><div className={styles.loadingCenter}><span className={styles.spinner} /></div></DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className={styles.profilePage}>

        {/* ── HERO ── */}
        <div className={styles.heroCard}>
          {/* Clickable cover */}
          <div
            className={styles.coverBg}
            onClick={() => coverRef.current?.click()}
            title="Click to change cover photo"
          >
            {profile?.coverPhoto
              ? <img src={imgUrl(profile.coverPhoto)} alt="cover" className={styles.coverImg} />
              : <div className={styles.coverGradient} />
            }
            <div className={styles.coverOverlay}>
              {coverUploading ? <><span className={styles.spinnerSm} /> Uploading…</> : <>📷 Change cover photo</>}
            </div>
            <input ref={coverRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleCoverFileSelect} />
          </div>

          {/* Avatar + actions */}
          <div className={styles.heroAvatarRow}>
            <div className={styles.heroAvatarWrap}>
              <Avatar pic={profilePic} name={name} size={100} />
              <button className={styles.picBtn} onClick={(e) => { e.stopPropagation(); picRef.current.click(); }} disabled={isUploading}>
                {isUploading ? <span className={styles.spinnerSm} /> : "📷"}
              </button>
              <input ref={picRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePicChange} />
            </div>
            <div className={styles.heroActions}>
              <button className={styles.editProfileBtn} onClick={() => setEditSection("basic")}>✏️ Edit profile</button>
              <button className={styles.viewPublicBtnHero} onClick={() => router.push(`/users/${username}`)}>View public ↗</button>
            </div>
          </div>

          {/* Name + info */}
          <div className={styles.heroInfo}>
            <div className={styles.heroNameRow}>
              <h1 className={styles.heroName}>{name}</h1>
              <span className={styles.heroUsername}>@{username}</span>
            </div>
            {profile?.headline
              ? <p className={styles.heroHeadline}>{profile.headline}</p>
              : <button className={styles.addHint} onClick={() => setEditSection("basic")}>+ Add headline</button>
            }

            {/* ✅ Better meta row */}
            <div className={styles.heroMeta}>
              {profile?.location && (
                <span className={styles.metaChip}>
                  <span className={styles.metaIcon}>📍</span> {profile.location}
                </span>
              )}
              {profile?.website && (
                <a href={profile.website} target="_blank" rel="noreferrer" className={`${styles.metaChip} ${styles.metaChipLink}`}>
                  <span className={styles.metaIcon}>🔗</span>
                  {profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              )}
              {(stats?.connections || 0) > 0 && (
                <button className={`${styles.metaChip} ${styles.metaChipClickable}`} onClick={() => setActiveTab("connections")}>
                  <span className={styles.metaIcon}>🤝</span> {stats.connections} connection{stats.connections !== 1 ? "s" : ""}
                </button>
              )}
            </div>

            {/* Skills preview */}
            {profile?.skills?.length > 0 && (
              <div className={styles.heroSkillsRow}>
                {profile.skills.slice(0,6).map((s,i) => <span key={i} className={styles.skillPill}>{s}</span>)}
                {profile.skills.length > 6 && <span className={styles.skillPillMore}>+{profile.skills.length - 6}</span>}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className={styles.tabNav}>
            {TABS.map(tab => (
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
                      <p>You haven't posted anything yet.</p>
                      <button className={styles.addBtn} onClick={() => router.push("/users")}>Create a post</button>
                    </div>
                  : <div className={styles.postsList}>
                      {posts.map(p => <PostCard key={p._id} post={p} onLike={handleLike} />)}
                    </div>
                }
              </div>
            )}

            {/* ABOUT TAB */}
            {activeTab === "about" && (<>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>About</span>
                  <button className={styles.iconBtn} onClick={() => setEditSection("bio")}>✏️</button>
                </div>
                {profile?.bio
                  ? <p className={styles.bioText}>{profile.bio}</p>
                  : <button className={styles.addDashed} onClick={() => setEditSection("bio")}>+ Write a bio</button>
                }
              </div>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>Skills</span>
                  <button className={styles.iconBtn} onClick={() => setEditSection("skills")}>✏️</button>
                </div>
                {profile?.skills?.length > 0
                  ? <div className={styles.skillsGrid}>
                      {profile.skills.map((s,i) => (
                        <div key={i} className={styles.skillCard}><span className={styles.skillDot} />{s}</div>
                      ))}
                    </div>
                  : <button className={styles.addDashed} onClick={() => setEditSection("skills")}>+ Add your skills</button>
                }
              </div>
            </>)}

            {/* EXPERIENCE TAB */}
            {activeTab === "experience" && (<>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>Work Experience</span>
                  <button className={styles.addBtn} onClick={() => openEditWork(null)}>+ Add</button>
                </div>
                {profile?.workExperience?.length > 0
                  ? <div className={styles.timelineList}>
                      {profile.workExperience.map((w,i) => (
                        <div key={i} className={styles.timelineItem}>
                          <div className={styles.timelineLine} />
                          <div className={styles.timelineDot} />
                          <div className={styles.timelineBody}>
                            <div className={styles.timelineHeader}>
                              <div>
                                <span className={styles.timelineTitle}>{w.position}</span>
                                <span className={styles.timelineCompany}>{w.company}</span>
                                <span className={styles.timelineDate}>
                                  {w.startDate ? new Date(w.startDate).getFullYear() : ""} – {w.isCurrent ? "Present" : w.endDate ? new Date(w.endDate).getFullYear() : ""}
                                </span>
                              </div>
                              <div className={styles.entryActions}>
                                <button className={styles.entryEditBtn} onClick={() => openEditWork(i)}>✏️</button>
                                <button className={styles.entryDeleteBtn} onClick={() => handleDeleteWork(i)}>🗑</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  : <button className={styles.addDashed} onClick={() => openEditWork(null)}>+ Add work experience</button>
                }
              </div>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>Education</span>
                  <button className={styles.addBtn} onClick={() => openEditEdu(null)}>+ Add</button>
                </div>
                {profile?.education?.length > 0
                  ? <div className={styles.timelineList}>
                      {profile.education.map((e,i) => (
                        <div key={i} className={styles.timelineItem}>
                          <div className={styles.timelineLine} />
                          <div className={styles.timelineDot} />
                          <div className={styles.timelineBody}>
                            <div className={styles.timelineHeader}>
                              <div>
                                <span className={styles.timelineTitle}>{e.school}</span>
                                <span className={styles.timelineCompany}>{e.degree}{e.fieldOfStudy ? ` · ${e.fieldOfStudy}` : ""}</span>
                                <span className={styles.timelineDate}>
                                  {e.startDate ? new Date(e.startDate).getFullYear() : ""}{e.endDate ? ` – ${new Date(e.endDate).getFullYear()}` : ""}
                                </span>
                              </div>
                              <div className={styles.entryActions}>
                                <button className={styles.entryEditBtn} onClick={() => openEditEdu(i)}>✏️</button>
                                <button className={styles.entryDeleteBtn} onClick={() => handleDeleteEdu(i)}>🗑</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  : <button className={styles.addDashed} onClick={() => openEditEdu(null)}>+ Add education</button>
                }
              </div>
            </>)}

            {/* CONNECTIONS TAB */}
            {activeTab === "connections" && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>Connections · {stats?.connections || 0}</span>
                </div>
                {connections.length === 0
                  ? <div className={styles.emptyState}>
                      <span style={{fontSize:36}}>🤝</span>
                      <p>No connections yet.</p>
                      <button className={styles.addBtn} onClick={() => router.push("/users/network")}>Find people</button>
                    </div>
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

          {/* SIDEBAR */}
          <aside className={styles.sideCol}>
            {strength < 100 && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>Profile strength</span>
                  <span className={styles.strengthNum} style={{ color: strengthColor }}>{strength}%</span>
                </div>
                <div className={styles.strengthBar}>
                  <div className={styles.strengthFill} style={{ width: `${strength}%`, background: strengthColor }} />
                </div>
                <div className={styles.taskList}>
                  {tasks.filter(t => !t.done).map(t => (
                    <div key={t.id} className={styles.taskRow}>
                      <div className={styles.taskCircle} />
                      <span className={styles.taskLabel}>{t.label}</span>
                      <span className={styles.taskPts}>+{t.weight}%</span>
                    </div>
                  ))}
                  {tasks.filter(t => t.done).map(t => (
                    <div key={t.id} className={`${styles.taskRow} ${styles.taskRowDone}`}>
                      <div className={styles.taskCheck}>✓</div>
                      <span className={styles.taskLabel}>{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity heatmap */}
            <ActivityHeatmap userId={profile?.userId?._id} />

            {/* Website time tracker */}
            <OwnWebsiteTime />

            {/* Activity stats */}
            <div className={styles.card}>
              <div className={styles.cardHeader}><span className={styles.cardTitle}>Activity</span></div>
              <div className={styles.activityStats}>
                <div className={styles.actStat}>
                  <span className={styles.actStatNum}>{stats?.connections ?? 0}</span>
                  <span className={styles.actStatLabel}>Connections</span>
                </div>
                <div className={styles.actStat}>
                  <span className={styles.actStatNum}>{stats?.posts ?? 0}</span>
                  <span className={styles.actStatLabel}>Posts</span>
                </div>
                <div className={styles.actStat}>
                  <span className={styles.actStatNum}>{stats?.likes ?? 0}</span>
                  <span className={styles.actStatLabel}>Reactions</span>
                </div>
              </div>
            </div>

            {/* Public link */}
            <div className={styles.card}>
              <div className={styles.cardHeader}><span className={styles.cardTitle}>Your public profile</span></div>
              <div style={{ padding: "4px 20px 16px" }}>
                <p className={styles.publicUrlText}>/users/{username}</p>
                <button className={styles.copyLinkBtn} onClick={() => navigator.clipboard.writeText(`${window.location.origin}/users/${username}`)}>
                  📋 Copy link
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editSection && (
        <div className={styles.modalOverlay} onClick={() => setEditSection(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editSection === "basic" ? "Edit profile" : editSection === "bio" ? "Edit about" :
                 editSection === "skills" ? "Edit skills" :
                 editSection === "work" ? (editWorkIdx === null ? "Add experience" : "Edit experience") :
                 (editEduIdx === null ? "Add education" : "Edit education")}
              </h2>
              <button className={styles.modalClose} onClick={() => setEditSection(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              {editSection === "basic" && (<>
                <label className={styles.label}>Full name</label>
                <input className={styles.input} value={form.name}     onChange={f("name")}     placeholder="Your name" />
                <label className={styles.label}>Username</label>
                <input className={styles.input} value={form.username} onChange={f("username")} placeholder="username" />
                <label className={styles.label}>Headline</label>
                <input className={styles.input} value={form.headline} onChange={f("headline")} placeholder="e.g. Full Stack Developer @ Google" />
                <label className={styles.label}>Location</label>
                <input className={styles.input} value={form.location} onChange={f("location")} placeholder="e.g. New York, NY" />
                <label className={styles.label}>Website</label>
                <input className={styles.input} value={form.website}  onChange={f("website")}  placeholder="https://yoursite.com" />
              </>)}
              {editSection === "bio" && (<>
                <label className={styles.label}>About you</label>
                <textarea className={styles.textarea} value={form.bio} onChange={f("bio")}
                  placeholder="Tell people about yourself…" rows={6} maxLength={500} />
                <span className={styles.charCount}>{form.bio.length} / 500</span>
              </>)}
              {editSection === "skills" && (<>
                <label className={styles.label}>Skills <span className={styles.labelHint}>(comma separated)</span></label>
                <input className={styles.input} value={form.skills} onChange={f("skills")} placeholder="React, Node.js, Design…" />
                {form.skills && (
                  <div className={styles.skillsPreview}>
                    {form.skills.split(",").map(s => s.trim()).filter(Boolean).map((s,i) => (
                      <span key={i} className={styles.skillPill}>{s}</span>
                    ))}
                  </div>
                )}
              </>)}
              {editSection === "work" && (<>
                <label className={styles.label}>Company</label>
                <input className={styles.input} value={form.company}  onChange={f("company")}  placeholder="Company name" />
                <label className={styles.label}>Position</label>
                <input className={styles.input} value={form.position} onChange={f("position")} placeholder="Your role" />
                <div className={styles.row2}>
                  <div><label className={styles.label}>Start date</label>
                    <input className={styles.input} type="date" value={form.workStart} onChange={f("workStart")} /></div>
                  <div><label className={styles.label}>End date</label>
                    <input className={styles.input} type="date" value={form.workEnd} onChange={f("workEnd")} disabled={form.isCurrent} /></div>
                </div>
                <label className={styles.checkLabel}>
                  <input type="checkbox" checked={form.isCurrent} onChange={f("isCurrent")} /> I currently work here
                </label>
              </>)}
              {editSection === "education" && (<>
                <label className={styles.label}>School</label>
                <input className={styles.input} value={form.school} onChange={f("school")} placeholder="University name" />
                <label className={styles.label}>Degree</label>
                <input className={styles.input} value={form.degree} onChange={f("degree")} placeholder="e.g. Bachelor of Science" />
                <label className={styles.label}>Field of study</label>
                <input className={styles.input} value={form.field}  onChange={f("field")}  placeholder="e.g. Computer Science" />
                <div className={styles.row2}>
                  <div><label className={styles.label}>Start</label>
                    <input className={styles.input} type="date" value={form.eduStart} onChange={f("eduStart")} /></div>
                  <div><label className={styles.label}>End</label>
                    <input className={styles.input} type="date" value={form.eduEnd} onChange={f("eduEnd")} /></div>
                </div>
              </>)}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setEditSection(null)}>Cancel</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
                {saved ? "✓ Saved!" : isSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CROP MODAL */}
      {cropFile && (
        <CoverCropModal
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}
    </DashboardLayout>
  );
}