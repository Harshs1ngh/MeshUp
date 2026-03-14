
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import {
  fetchConversations, fetchMessages, sendMessage,
  editMessage, deleteMessage,
  openConversation, setActiveConversation,
  selectConversations, selectActiveConversation,
  selectMessages, selectIsSending, selectTypingUsers,
  socketMessageReceived, socketMessageUpdated, socketMessageRemoved,
  socketTypingStart, socketTypingStop,
  BASE, colorFor, timeAgo, canEdit, FIVE_HOURS,
} from "../../store/slices/messagesSlice";
import { selectUser }      from "../../store/slices/authSlice";
import { selectMyProfile } from "../../store/slices/profileSlice";
import { getSocket }       from "../../hooks/useSocket";
import api from "../../services/api";
import DashboardLayout from "../../components/layout/DashboardLayout";
import styles from "../../styles/messages.module.css";

const timeStr = (d) => d
  ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  : "";

// ─── Typing dots animation ────────────────────────────────────────────────────
function TypingIndicator({ name }) {
  return (
    <div className={styles.typingRow}>
      <div className={styles.typingBubble}>
        <span className={styles.typingDot} />
        <span className={styles.typingDot} />
        <span className={styles.typingDot} />
      </div>
      <span className={styles.typingLabel}>{name} is typing…</span>
    </div>
  );
}

// ─── Message row ─────────────────────────────────────────────────────────────
function MessageRow({ msg, isMe, myPic, myName, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const senderPic    = msg.sender?.profilePicture;
  const senderName   = msg.sender?.name || "";
  const isDeleted    = msg.isDeleted && msg.deletedFor === "everyone";
  const withinWindow = Date.now() - new Date(msg.createdAt).getTime() <= FIVE_HOURS;

  useEffect(() => {
    if (!showMenu) return;
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMenu]);

  return (
    <div className={`${styles.message} ${isMe ? styles.messageMine : styles.messageTheirs}`}>
      {!isMe && (
        <div className={styles.msgAvatar} style={{ background: colorFor(senderName) }}>
          {senderPic
            ? <img src={`${BASE}${senderPic}`} alt={senderName} className={styles.avatarImg} />
            : senderName[0]?.toUpperCase()
          }
        </div>
      )}

      <div className={styles.msgContent}>
        <div className={styles.msgBubbleRow}>
          <div className={`${styles.messageBubble} ${isDeleted ? styles.messageBubbleDeleted : ""}`}>
            {msg.body}
          </div>

          {isMe && !isDeleted && (
            <div className={styles.msgActions} ref={menuRef}>
              <button className={styles.msgMenuBtn} onClick={() => setShowMenu((v) => !v)}>⋯</button>
              {showMenu && (
                <div className={styles.msgMenu}>
                  {withinWindow && (
                    <button className={styles.msgMenuItem} onClick={() => { setShowMenu(false); onEdit(msg); }}>
                       Edit
                    </button>
                  )}
                  {withinWindow && (
                    <button className={`${styles.msgMenuItem} ${styles.msgMenuDanger}`}
                      onClick={() => { setShowMenu(false); onDelete(msg, "everyone"); }}>
                      🗑 Delete for everyone
                    </button>
                  )}
                  <button className={`${styles.msgMenuItem} ${styles.msgMenuDanger}`}
                    onClick={() => { setShowMenu(false); onDelete(msg, "me"); }}>
                    🗑 Delete for me
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <span className={styles.messageTime}>
          {timeStr(msg.createdAt)}
          {msg.editedAt && !isDeleted && <span className={styles.editedTag}> · edited</span>}
        </span>
      </div>

      {isMe && (
        <div className={styles.msgAvatar} style={{ background: colorFor(myName) }}>
          {(senderPic || myPic)
            ? <img src={`${BASE}${senderPic || myPic}`} alt={myName} className={styles.avatarImg} />
            : myName[0]?.toUpperCase()
          }
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Messages() {
  const dispatch      = useDispatch();
  const router        = useRouter();
  const conversations = useSelector(selectConversations);
  const activeId      = useSelector(selectActiveConversation);
  const isSending     = useSelector(selectIsSending);
  const authUser      = useSelector(selectUser);
  const myProfile     = useSelector(selectMyProfile);
  const messages      = useSelector(selectMessages(activeId));
  const typingUsers   = useSelector(selectTypingUsers(activeId));

  const [text,          setText]          = useState("");
  const [showNewMsg,    setShowNewMsg]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching,   setIsSearching]   = useState(false);
  const [editingMsg,    setEditingMsg]    = useState(null);
  const [editText,      setEditText]      = useState("");
  const [deleteTarget,  setDeleteTarget]  = useState(null);

  const bottomRef      = useRef(null);
  const inputRef       = useRef(null);
  const editRef        = useRef(null);
  const debounceRef    = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef    = useRef(false);
  const activeIdRef    = useRef(activeId); // stable ref for socket callbacks

  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const myId   = myProfile?.userId?._id || authUser?.userId?._id || authUser?._id;
  const myPic  = myProfile?.userId?.profilePicture;
  const myName = myProfile?.userId?.name || "Me";

  const getOtherUser = (conv) => {
    if (!conv) return {};
    if (conv.otherUser) return conv.otherUser;
    return (conv.participants || []).find((p) => String(p._id || p) !== String(myId)) || {};
  };

  // ── Socket.io setup ───────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    // ✅ New message arrives from other user
    socket.on("new_message", ({ conversationId, message }) => {
      dispatch(socketMessageReceived({ conversationId, message }));
    });

    // ✅ Other user edited a message
    socket.on("message_updated", ({ conversationId, message }) => {
      dispatch(socketMessageUpdated({ conversationId, message }));
    });

    // ✅ Other user deleted a message
    socket.on("message_removed", ({ conversationId, messageId, deletedFor, body }) => {
      dispatch(socketMessageRemoved({ conversationId, messageId, deletedFor, body }));
    });

    // ✅ Typing events
    socket.on("user_typing", ({ conversationId, userId, name }) => {
      dispatch(socketTypingStart({ conversationId, userId, name }));
    });
    socket.on("user_stopped_typing", ({ conversationId, userId }) => {
      dispatch(socketTypingStop({ conversationId, userId }));
    });

    return () => {
      socket.off("new_message");
      socket.off("message_updated");
      socket.off("message_removed");
      socket.off("user_typing");
      socket.off("user_stopped_typing");
    };
  }, [dispatch]);

  // ── Join conversation room when active changes ────────────────────────────
  useEffect(() => {
    if (!activeId) return;
    const socket = getSocket();
    socket.emit("join_conversation", activeId);
  }, [activeId]);

  // ── Data fetching ─────────────────────────────────────────────────────────
  useEffect(() => { dispatch(fetchConversations()); }, [dispatch]);

  useEffect(() => {
    const { with: withUserId } = router.query;
    if (withUserId && myId) {
      dispatch(openConversation(withUserId)).then((res) => {
        if (res.payload?._id) dispatch(fetchMessages(res.payload._id));
      });
    }
  }, [router.query.with, myId]);

  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      dispatch(setActiveConversation(conversations[0]._id));
      dispatch(fetchMessages(conversations[0]._id));
    }
  }, [conversations.length, activeId, dispatch]);

  useEffect(() => {
    if (activeId && (!messages || messages.length === 0)) dispatch(fetchMessages(activeId));
  }, [activeId]);

  // ── Auto-scroll on new messages ───────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, activeId]);

  useEffect(() => {
    if (activeId) setTimeout(() => inputRef.current?.focus(), 100);
  }, [activeId]);

  useEffect(() => {
    if (editingMsg) setTimeout(() => editRef.current?.focus(), 50);
  }, [editingMsg]);

  // ── People search ─────────────────────────────────────────────────────────
  const handleSearchChange = async (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get("/users");
        const q   = val.toLowerCase();
        const matched = (res.data || [])
          .filter((p) => {
            const u = p.userId || {};
            return u.name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q);
          })
          .slice(0, 6)
          .map((p) => {
            const u = p.userId || {};
            const rawId = u._id;
            const id = rawId ? (typeof rawId === "object" ? rawId.toString() : String(rawId)) : null;
            return { id, name: u.name || "Unknown", username: u.username || "", headline: p.headline || "", pic: u.profilePicture || null };
          })
          .filter((r) => r.id && r.id !== String(myId));
        setSearchResults(matched);
      } catch { setSearchResults([]); }
      finally { setIsSearching(false); }
    }, 300);
  };

  const handleStartConversation = async (userId) => {
    setShowNewMsg(false); setSearchQuery(""); setSearchResults([]);
    const res = await dispatch(openConversation(userId));
    if (openConversation.fulfilled.match(res) && res.payload?._id)
      dispatch(fetchMessages(res.payload._id));
  };

  const handleSelectConv = (convId) => {
    dispatch(setActiveConversation(convId));
    dispatch(fetchMessages(convId));
  };

  // ── Typing emit ───────────────────────────────────────────────────────────
  const emitTyping = (conversationId) => {
    const socket = getSocket();
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing_start", { conversationId });
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("typing_stop", { conversationId });
    }, 2000); // stop typing after 2s idle
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !activeId || isSending) return;
    setText("");

    // Stop typing indicator immediately
    clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    getSocket().emit("typing_stop", { conversationId: activeId });

    const res = await dispatch(sendMessage({ conversationId: activeId, body: trimmed }));
    if (sendMessage.fulfilled.match(res)) {
      // ✅ Broadcast to other user via socket
      getSocket().emit("message_sent", {
        conversationId: activeId,
        message: res.payload.message,
      });
    }
  };

  // ── Edit handlers ─────────────────────────────────────────────────────────
  const handleEditStart  = (msg) => { setEditingMsg(msg); setEditText(msg.body); };
  const handleEditCancel = ()    => setEditingMsg(null);
  const handleEditSave   = async () => {
    if (!editText.trim() || editText.trim() === editingMsg.body) { setEditingMsg(null); return; }
    const res = await dispatch(editMessage({ messageId: editingMsg._id, conversationId: activeId, body: editText.trim() }));
    if (editMessage.fulfilled.match(res)) {
      // ✅ Broadcast edit to other user
      getSocket().emit("message_edited", { conversationId: activeId, message: res.payload.message });
    }
    setEditingMsg(null);
  };

  // ── Delete handlers ───────────────────────────────────────────────────────
  const handleDeleteRequest = (msg, deleteFor) => setDeleteTarget({ msg, deleteFor });
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const res = await dispatch(deleteMessage({ messageId: deleteTarget.msg._id, conversationId: activeId, deleteFor: deleteTarget.deleteFor }));
    if (deleteMessage.fulfilled.match(res)) {
      // ✅ Broadcast delete to other user
      getSocket().emit("message_deleted", {
        conversationId: activeId,
        messageId:  deleteTarget.msg._id,
        deletedFor: res.payload.deleteFor,
        body:       "🚫 This message was deleted",
      });
    }
    setDeleteTarget(null);
  };

  // ── Typing names ──────────────────────────────────────────────────────────
  const typingNames = Object.values(typingUsers);

  const activeConv = conversations.find((c) => c._id === activeId);
  const otherUser  = getOtherUser(activeConv);

  return (
    <DashboardLayout>
      <div className={styles.messagesPage}>

        {/* ── Sidebar ── */}
        <aside className={styles.convList}>
          <div className={styles.convListHeader}>
            <h2 className={styles.convListTitle}>Messages</h2>
            <button className={styles.newMsgBtn} onClick={() => { setShowNewMsg((v) => !v); setSearchQuery(""); setSearchResults([]); }}>🔎</button>
          </div>

          {showNewMsg && (
            <div className={styles.newMsgSearch}>
              <input autoFocus className={styles.newMsgInput} placeholder="Search by name…" value={searchQuery} onChange={handleSearchChange} />
              {isSearching && <div className={styles.searchingHint}>Searching…</div>}
              {!isSearching && searchQuery && searchResults.length === 0 && <div className={styles.searchingHint}>No users found</div>}
              {searchResults.length > 0 && (
                <div className={styles.newMsgResults}>
                  {searchResults.map((r) => (
                    <button key={r.id} className={styles.newMsgResult} onClick={() => handleStartConversation(r.id)}>
                      <div className={styles.newMsgAvatar} style={{ background: colorFor(r.name) }}>
                        {r.pic ? <img src={`${BASE}${r.pic}`} alt={r.name} className={styles.avatarImg} /> : r.name[0]?.toUpperCase()}
                      </div>
                      <div className={styles.newMsgInfo}>
                        <span className={styles.newMsgName}>{r.name}</span>
                        <span className={styles.newMsgRole}>{r.headline || `@${r.username}`}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto" }}>
            {conversations.length === 0 ? (
              <div className={styles.convEmpty}>
                <p>No conversations yet</p>
                <button className={styles.startConvBtn} onClick={() => setShowNewMsg(true)}>Start a conversation</button>
              </div>
            ) : conversations.map((conv) => {
              const other    = getOtherUser(conv);
              const name     = other?.name || "Unknown";
              const pic      = other?.profilePicture;
              const lastBody = conv.lastMessage?.body || "";
              const unread   = conv.myUnread || 0;
              // Show typing in sidebar too
              const convTyping = Object.keys(typingUsers).length > 0 && conv._id === activeId;
              return (
                <button key={conv._id} className={`${styles.convItem} ${conv._id === activeId ? styles.convItemActive : ""}`} onClick={() => handleSelectConv(conv._id)}>
                  <div className={styles.convAvatar} style={{ background: colorFor(name) }}>
                    {pic ? <img src={`${BASE}${pic}`} alt={name} className={styles.avatarImg} /> : name[0]?.toUpperCase()}
                  </div>
                  <div className={styles.convInfo}>
                    <div className={styles.convTop}>
                      <span className={styles.convName}>{name}</span>
                      <span className={styles.convTime}>{timeAgo(conv.updatedAt || conv.createdAt)}</span>
                    </div>
                    <div className={styles.convBottom}>
                      <span className={`${styles.convLast} ${convTyping ? styles.convTyping : ""}`}>
                        {convTyping ? "typing…" : (lastBody ? lastBody.slice(0, 36) + (lastBody.length > 36 ? "…" : "") : "Say hello 👋")}
                      </span>
                      {unread > 0 && <span className={styles.convUnread}>{unread}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── Chat panel ── */}
        <div className={styles.chatPanel}>
          {activeConv && otherUser?._id ? (
            <>
              <div className={styles.chatHeader}>
                <div className={styles.chatAvatar} style={{ background: colorFor(otherUser.name || ""), cursor: "pointer" }} onClick={() => otherUser.username && router.push(`/users/${otherUser.username}`)}>
                  {otherUser.profilePicture
                    ? <img src={`${BASE}${otherUser.profilePicture}`} alt={otherUser.name} className={styles.avatarImg} />
                    : otherUser.name?.[0]?.toUpperCase()
                  }
                </div>
                <div className={styles.chatHeaderInfo}>
                  <span className={styles.chatName} style={{ cursor: "pointer" }} onClick={() => otherUser.username && router.push(`/users/${otherUser.username}`)}>{otherUser.name}</span>
                  <span className={styles.chatStatus}>
                    {typingNames.length > 0 ? (
                      <span className={styles.typingStatus}>typing…</span>
                    ) : (
                      `@${otherUser.username}`
                    )}
                  </span>
                </div>
              </div>

              <div className={styles.messages}>
                {messages.length === 0
                  ? <div className={styles.chatEmptyInner}>Say hello to {otherUser.name}! 👋</div>
                  : messages.map((msg) => {
                      const isMe = String(msg.sender?._id || msg.sender) === String(myId);

                      // Inline edit mode
                      if (editingMsg?._id === msg._id) {
                        return (
                          <div key={msg._id} className={`${styles.message} ${styles.messageMine}`}>
                            <div className={styles.msgContent}>
                              <div className={styles.editInline}>
                                <input ref={editRef} className={styles.editInlineInput} value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") handleEditSave(); if (e.key === "Escape") handleEditCancel(); }}
                                />
                                <div className={styles.editInlineActions}>
                                  <button className={styles.editSaveBtn} onClick={handleEditSave}>Save</button>
                                  <button className={styles.editCancelBtn} onClick={handleEditCancel}>Cancel</button>
                                </div>
                                <span className={styles.editHint}>Enter to save · Esc to cancel</span>
                              </div>
                            </div>
                            <div className={styles.msgAvatar} style={{ background: colorFor(myName) }}>
                              {myPic ? <img src={`${BASE}${myPic}`} alt={myName} className={styles.avatarImg} /> : myName[0]?.toUpperCase()}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <MessageRow key={msg._id} msg={msg} isMe={isMe}
                          myPic={myPic} myName={myName}
                          onEdit={handleEditStart} onDelete={handleDeleteRequest}
                        />
                      );
                    })
                }

                {/* ✅ Live typing indicator */}
                {typingNames.length > 0 && (
                  <TypingIndicator name={typingNames[0]} />
                )}

                <div ref={bottomRef} />
              </div>

              <form className={styles.chatInput} onSubmit={handleSend}>
                <input
                  ref={inputRef}
                  className={styles.chatInputField}
                  placeholder={`Message ${otherUser.name}…`}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (e.target.value.trim()) emitTyping(activeId);
                  }}
                  disabled={isSending}
                />
                <button type="submit" className={styles.chatSendBtn} disabled={!text.trim() || isSending}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 8L2 2l3 6-3 6 12-6z" fill="currentColor" /></svg>
                </button>
              </form>
            </>
          ) : (
            <div className={styles.chatEmpty}>
              <span style={{ fontSize: 36 }}>💬</span>
              <p>Select a conversation or start a new one</p>
              <button className={styles.startConvBtn} onClick={() => setShowNewMsg(true)}>New message</button>
            </div>
          )}
        </div>
      </div>

      {/* Delete modal */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div className={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.deleteModalTitle}>Delete message?</h3>
            <p className={styles.deleteModalText}>
              {deleteTarget.deleteFor === "everyone"
                ? "This message will be removed for everyone in this conversation."
                : "This message will only be removed from your view."}
            </p>
            <div className={styles.deleteModalActions}>
              <button className={styles.deleteCancelBtn} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className={styles.deleteConfirmBtn} onClick={handleDeleteConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}