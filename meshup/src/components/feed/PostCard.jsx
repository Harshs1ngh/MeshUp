// 📁 src/components/feed/PostCard.jsx
import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import {
  likePost, toggleSave, deletePost,
  fetchComments, addComment, deleteComment,
  selectComments,
} from "../../store/slices/feedSlice";
import { selectUser } from "../../store/slices/authSlice";
import { selectMyProfile } from "../../store/slices/profileSlice";
import styles from "../../styles/feed.module.css";

const BASE      = "http://localhost:8000/uploads/";
const COLORS    = ["#7c3aed","#5b5bd6","#8b5cf6","#6d28d9","#4f46e5","#6d6de0"];
const colorFor  = (str) => COLORS[(str?.charCodeAt(0) || 0) % COLORS.length];
const getInitial = (name) => name?.[0]?.toUpperCase() || "?";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Single comment row ──────────────────────────────────────────────────────
function CommentRow({ comment, postId, myId }) {
  const dispatch   = useDispatch();
  const author     = comment.userId || {};
  const name       = author.name    || "Unknown";
  const pic        = author.profilePicture;
  const isMyComment = String(author._id) === String(myId?.userId?._id || myId?._id);

  return (
    <div className={styles.comment}>
      <div className={styles.commentAvatar} style={{ background: colorFor(name) }}>
        {pic
          ? <img src={`${BASE}${pic}`} alt={name} className={styles.commentAvatarImg} />
          : getInitial(name)
        }
      </div>
      <div className={styles.commentBubble}>
        <div className={styles.commentMeta}>
          <span className={styles.commentAuthor}>{name}</span>
          <span className={styles.commentTime}>{timeAgo(comment.createdAt)}</span>
          {isMyComment && (
            <button
              className={styles.commentDelete}
              onClick={() => dispatch(deleteComment({ commentId: comment._id, postId }))}
              title="Delete"
            >
              ×
            </button>
          )}
        </div>
        <p className={styles.commentText}>{comment.body}</p>
      </div>
    </div>
  );
}

// ── Main PostCard ────────────────────────────────────────────────────────────
export default function PostCard({ post }) {
  const dispatch   = useDispatch();
  const router     = useRouter();
  const me         = useSelector(selectUser);
  const myProfile  = useSelector(selectMyProfile);
  const commentData = useSelector(selectComments(post._id));

  const [showComments, setShowComments] = useState(false);
  const [commentText,  setCommentText]  = useState("");
  const [shareToast,   setShareToast]   = useState(false);
  const inputRef  = useRef();
  const bottomRef = useRef();

  const author      = post.userId || {};
  const authorName  = author.name || "Unknown";
  const avatarColor = colorFor(authorName);
  const content     = post.body    || "";
  const likesCount  = post.likesCount ?? post.likes?.length ?? 0;
  const likedByMe   = post.likedByMe  ?? false;
  const savedByMe   = post.savedByMe  ?? false;
  const postTime    = timeAgo(post.createdAt);
  const commentCount = post.commentCount ?? commentData.items.length;

  // Check if this post is mine
  const myId = me?.userId?._id || me?._id;
  const isMyPost = String(author._id) === String(myId);

  // My avatar for the comment input
  const myPic  = myProfile?.userId?.profilePicture || me?.userId?.profilePicture;
  const myName = myProfile?.userId?.name || me?.userId?.name || me?.name || "You";

  // ── Toggle comments section ───────────────────────────────────────────────
  const handleToggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    // Fetch comments the first time we open
    if (next && commentData.items.length === 0 && !commentData.isLoading) {
      dispatch(fetchComments(post._id));
    }
    // Focus input when opening
    if (next) setTimeout(() => inputRef.current?.focus(), 150);
  };

  // ── Auto-scroll to bottom when new comment added ─────────────────────────
  useEffect(() => {
    if (showComments) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [commentData.items.length, showComments]);

  // ── Submit comment ────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || commentData.isSubmitting) return;
    await dispatch(addComment({ postId: post._id, body: text }));
    setCommentText("");
    inputRef.current?.focus();
  };

  // ── Like ──────────────────────────────────────────────────────────────────
  const handleLike = () => dispatch(likePost(post._id));

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = () => dispatch(toggleSave(post._id));

  // ── Share ─────────────────────────────────────────────────────────────────
  const handleShare = () => {
    navigator.clipboard?.writeText(`${window.location.origin}/post/${post._id}`);
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2000);
  };

  // ── Delete post ───────────────────────────────────────────────────────────
  const handleDelete = () => {
    if (confirm("Delete this post?")) dispatch(deletePost(post._id));
  };

  return (
    <article className={styles.post}>

      {/* ── Header ── */}
      <div className={styles.postHeader}>
        <div
          className={styles.postAvatar}
          style={{ background: avatarColor, cursor: "pointer" }}
          onClick={() => router.push(`/users/${author.username}`)}
        >
          {author.profilePicture
            ? <img src={`${BASE}${author.profilePicture}`} alt={authorName} className={styles.postAvatarImg} />
            : getInitial(authorName)
          }
        </div>

        <div className={styles.postMeta}>
          <span
            className={styles.postName}
            onClick={() => router.push(`/users/${author.username}`)}
            style={{ cursor: "pointer" }}
          >
            {authorName}
          </span>
          <span className={styles.postRole}>@{author.username || "user"}</span>
          <span className={styles.postTime}>{postTime}</span>
        </div>

        {isMyPost && (
          <button className={styles.postMenu} onClick={handleDelete} title="Delete post">
            🗑
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {content && <p className={styles.postContent}>{content}</p>}

      {/* ── Media ── */}
      {post.media && post.mediaType === "image" && (
        <div className={styles.postMedia}>
          <img src={`${BASE}${post.media}`} alt="Post" className={styles.postMediaImg} />
        </div>
      )}
      {post.media && post.mediaType === "video" && (
        <div className={styles.postMedia}>
          <video src={`${BASE}${post.media}`} controls className={styles.postMediaVideo} />
        </div>
      )}

      {/* ── Action bar ── */}
      <div className={styles.postFooter}>
        {/* Like */}
        <button
          className={`${styles.postAction} ${likedByMe ? styles.postActionLiked : ""}`}
          onClick={handleLike}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill={likedByMe ? "currentColor" : "none"}>
            <path d="M8 13.5C8 13.5 1.5 9.5 1.5 5.5a3.5 3.5 0 016.5-1.8A3.5 3.5 0 0114.5 5.5c0 4-6.5 8-6.5 8z"
              stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
          {likesCount > 0 ? likesCount : ""}
        </button>

        {/* Comment */}
        <button
          className={`${styles.postAction} ${showComments ? styles.postActionActive : ""}`}
          onClick={handleToggleComments}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M14 10a2 2 0 01-2 2H5l-3 3V4a2 2 0 012-2h8a2 2 0 012 2v6z"
              stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
          {commentCount > 0 ? commentCount : "Comment"}
        </button>

        {/* Share */}
        <button className={styles.postAction} onClick={handleShare}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M12 2l3 3-3 3M1 11V9a5 5 0 015-5h9M4 14l-3-3 3-3"
              stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {shareToast ? "Copied!" : "Share"}
        </button>

        {/* Save */}
        <button
          className={`${styles.postActionSave} ${savedByMe ? styles.postActionSaved : ""}`}
          onClick={handleSave}
          title={savedByMe ? "Unsave" : "Save"}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill={savedByMe ? "currentColor" : "none"}>
            <path d="M3 2h10a1 1 0 011 1v11l-5-3-5 3V3a1 1 0 011-1z"
              stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ── Comments section ── */}
      {showComments && (
        <div className={styles.commentsSection}>

          {/* Loading state */}
          {commentData.isLoading && (
            <div className={styles.commentsLoading}>
              <span className={styles.commentsSpinner} />
              Loading comments…
            </div>
          )}

          {/* Empty state */}
          {!commentData.isLoading && commentData.items.length === 0 && (
            <p className={styles.commentsEmpty}>No comments yet — be the first!</p>
          )}

          {/* Comment list */}
          {commentData.items.map((c) => (
            <CommentRow key={c._id} comment={c} postId={post._id} myId={me} />
          ))}

          <div ref={bottomRef} />

          {/* Add comment form */}
          <form className={styles.commentForm} onSubmit={handleSubmit}>
            <div className={styles.commentInputAvatar} style={{ background: colorFor(myName) }}>
              {myPic
                ? <img src={`${BASE}${myPic}`} alt={myName} className={styles.commentAvatarImg} />
                : getInitial(myName)
              }
            </div>
            <input
              ref={inputRef}
              className={styles.commentInput}
              placeholder="Write a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSubmit(e); }}
              disabled={commentData.isSubmitting}
            />
            <button
              type="submit"
              className={styles.commentSubmit}
              disabled={!commentText.trim() || commentData.isSubmitting}
            >
              {commentData.isSubmitting ? "…" : "→"}
            </button>
          </form>
        </div>
      )}
    </article>
  );
}