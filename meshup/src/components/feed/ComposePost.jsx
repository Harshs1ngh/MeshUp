// 📁 src/components/feed/ComposePost.jsx
import { useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createPost, selectIsPosting } from "../../store/slices/feedSlice";
import { selectUser } from "../../store/slices/authSlice";
import { selectMyProfile } from "../../store/slices/profileSlice";
import styles from "../../styles/feed.module.css";

const BASE = "http://localhost:8000/uploads/";

export default function ComposePost() {
  const dispatch  = useDispatch();
  const user      = useSelector(selectUser);
  const myProfile = useSelector(selectMyProfile);    // ← also check profileSlice
  const isPosting = useSelector(selectIsPosting);

  const [text,      setText]      = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [preview,   setPreview]   = useState(null);
  const [posted,    setPosted]    = useState(false);
  const fileRef = useRef();

  // ✅ Try multiple places for the profile pic — whichever is available first
  const profilePic =
    myProfile?.userId?.profilePicture ||   // from profileSlice (most reliable)
    user?.userId?.profilePicture       ||   // from authSlice rehydrate
    user?.profilePicture               ||   // fallback
    null;

  const authorName = myProfile?.userId?.name || user?.userId?.name || user?.name || "You";
  const initial    = authorName[0]?.toUpperCase() || "Y";

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setMediaFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handlePost = async () => {
    if (!text.trim() && !mediaFile) return;
    const result = await dispatch(createPost({ content: text.trim(), media: mediaFile }));
    if (createPost.fulfilled.match(result)) {
      setText("");
      removeMedia();
      setPosted(true);
      setTimeout(() => setPosted(false), 2000);
    }
  };

  return (
    <div className={styles.compose}>
      {/* Avatar */}
      <div className={styles.composeAvatar}>
        {profilePic ? (
          <img src={`${BASE}${profilePic}`} alt={authorName} className={styles.composeAvatarImg} />
        ) : (
          initial
        )}
      </div>

      <div className={styles.composeRight}>
        <textarea
          className={styles.composeInput}
          placeholder="Share something with your network…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={text ? 3 : 1}
        />

        {/* Media preview */}
        {preview && (
          <div className={styles.mediaPreview}>
            {mediaFile?.type.startsWith("image") ? (
              <img src={preview} alt="preview" className={styles.mediaPreviewImg} />
            ) : (
              <video src={preview} className={styles.mediaPreviewImg} controls />
            )}
            <button className={styles.removeMedia} onClick={removeMedia}>×</button>
          </div>
        )}

        {(text || mediaFile) && (
          <div className={styles.composeActions}>
            <button className={styles.composeMediaBtn} type="button" onClick={() => fileRef.current.click()}>
              📷 Photo / Video
            </button>
            <button
              className={styles.composeSubmit}
              onClick={handlePost}
              disabled={isPosting || (!text.trim() && !mediaFile)}
            >
              {posted ? "✓ Posted!" : isPosting ? "Posting…" : "Post"}
            </button>
          </div>
        )}

        {!text && !mediaFile && (
          <button className={styles.composeMediaBtnIdle} type="button" onClick={() => fileRef.current.click()}>
            📷 Photo / Video
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}