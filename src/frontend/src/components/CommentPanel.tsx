import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AtSign,
  CornerDownRight,
  Gift,
  Heart,
  ImageIcon,
  MessageCircle,
  Send,
  Smile,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Comment } from "../backend.d";
import { useAuth } from "../context/AuthContext";
import { getDisplayName, getUsername } from "../lib/userFormat";

// Heights
const NAV_HEIGHT = 80; // bottom nav
const INPUT_HEIGHT = 64; // input bar height
const INPUT_BOTTOM = NAV_HEIGHT; // input sits directly above nav
const PANEL_BOTTOM = NAV_HEIGHT + INPUT_HEIGHT; // panel sits above input bar

// ─── Gift catalog ─────────────────────────────────────────────────────────────
const GIFTS = [
  { id: "rose", emoji: "🌹", name: "Rose", coins: 1 },
  { id: "heart", emoji: "❤️", name: "Heart", coins: 5 },
  { id: "diamond", emoji: "💎", name: "Diamond", coins: 30 },
  { id: "rocket", emoji: "🚀", name: "Rocket", coins: 99 },
  { id: "crown", emoji: "👑", name: "Crown", coins: 199 },
  { id: "lion", emoji: "🦁", name: "Lion", coins: 499 },
  { id: "party", emoji: "🎉", name: "Party", coins: 25 },
] as const;

type GiftItem = (typeof GIFTS)[number];

// ─── Emoji / Sticker data ─────────────────────────────────────────────────────
const EMOJIS = [
  "😂",
  "❤️",
  "😍",
  "🤣",
  "😊",
  "🙏",
  "💕",
  "😭",
  "😘",
  "👍",
  "😅",
  "👏",
  "😁",
  "🔥",
  "🥰",
  "💯",
  "🤦",
  "🤷",
  "😢",
  "🙄",
  "😏",
  "🎉",
  "👀",
  "✨",
  "😔",
  "💪",
  "🤩",
  "😎",
  "🤔",
  "🥳",
];

const STICKERS = [
  "🥳",
  "🤯",
  "💀",
  "👻",
  "🤡",
  "👽",
  "🤖",
  "😈",
  "🎃",
  "💩",
  "🤬",
  "🥸",
];

// ─── Utility ─────────────────────────────────────────────────────────────────
function formatRelativeTime(nsBigInt: bigint): string {
  const ms = Number(nsBigInt / BigInt(1_000_000));
  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if (diffSec < 60) return `${diffSec}s`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  return `${Math.floor(diffSec / 86400)}d`;
}

function formatCount(n: bigint | number): string {
  const num = typeof n === "bigint" ? Number(n) : n;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

function isImageContent(text: string): boolean {
  return (
    text.startsWith("data:image") ||
    /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(text)
  );
}

// ─── CommentItem ─────────────────────────────────────────────────────────────

interface CommentItemProps {
  comment: Comment;
  idx: number;
  scope: string;
  isLiked: boolean;
  onLike: () => void;
  onReply: (username: string) => void;
  onNavigateToProfile?: (principal: string) => void;
}

export function CommentItem({
  comment,
  idx,
  scope,
  isLiked,
  onLike,
  onReply,
  onNavigateToProfile,
}: CommentItemProps) {
  const { actor } = useAuth();
  const authorStr = comment.author.toString();

  const { data: authorProfile } = useQuery({
    queryKey: ["userProfile", authorStr],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getUserProfile(comment.author);
    },
    enabled: !!actor,
    staleTime: 120_000,
  });

  const displayName = authorProfile
    ? getDisplayName(authorProfile.name) || getUsername(authorProfile.name)
    : authorStr.slice(0, 8);
  const username = authorProfile ? getUsername(authorProfile.name) : "";
  const avatarUrl = authorProfile?.avatarUrl ?? "";
  const initials = (displayName || "U").slice(0, 2).toUpperCase();
  const relTime = formatRelativeTime(comment.createdAt);
  const totalLikes = Number(comment.likeCount);
  const isImg = isImageContent(comment.text);

  return (
    <div
      data-ocid={`${scope}.comment.item.${idx + 1}`}
      className="flex items-start gap-3"
    >
      {/* Avatar */}
      <button
        type="button"
        onClick={() => onNavigateToProfile?.(authorStr)}
        className="flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0050] rounded-full"
        aria-label={`View ${displayName}'s profile`}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden"
          style={{
            background: avatarUrl
              ? "transparent"
              : "linear-gradient(135deg, #ff0050, #ff6b35)",
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white text-[10px] font-bold">{initials}</span>
          )}
        </div>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <button
            type="button"
            onClick={() => onNavigateToProfile?.(authorStr)}
            className="text-left focus-visible:outline-none"
          >
            <span
              className="text-white font-bold text-xs hover:underline"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              {displayName}
            </span>
            {username && (
              <span className="text-white/40 text-[10px] ml-1">
                @{username}
              </span>
            )}
          </button>
          <span className="text-white/30 text-[10px]">{relTime}</span>
        </div>

        {isImg ? (
          <img
            src={comment.text}
            alt="Shared by user"
            className="max-h-32 rounded-xl object-cover mt-1"
          />
        ) : (
          <p className="text-white/80 text-sm leading-snug">{comment.text}</p>
        )}

        <button
          type="button"
          data-ocid={`${scope}.comment.reply_button.${idx + 1}`}
          onClick={() => onReply(username || displayName.toLowerCase())}
          className="flex items-center gap-1 mt-1.5"
          aria-label="Reply to comment"
        >
          <span className="text-white/40 text-[10px] hover:text-white/70 transition-colors">
            Reply
          </span>
        </button>
      </div>

      {/* Like */}
      <button
        type="button"
        data-ocid={`${scope}.comment.like_button.${idx + 1}`}
        onClick={onLike}
        className="flex-shrink-0 flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
        aria-label={isLiked ? "Unlike comment" : "Like comment"}
      >
        <Heart
          size={14}
          fill={isLiked ? "#ff0050" : "none"}
          stroke={isLiked ? "#ff0050" : "rgba(255,255,255,0.4)"}
          className="transition-colors"
        />
        {totalLikes > 0 && (
          <span
            className="text-[10px]"
            style={{ color: isLiked ? "#ff0050" : "rgba(255,255,255,0.4)" }}
          >
            {formatCount(totalLikes)}
          </span>
        )}
      </button>
    </div>
  );
}

// ─── CommentPanel props ───────────────────────────────────────────────────────

interface CommentPanelProps {
  videoId: bigint;
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onNavigateToProfile?: (principal: string) => void;
  /** When true, automatically opens the gift sub-panel when the panel becomes visible */
  openGift?: boolean;
}

// ─── CommentPanel ─────────────────────────────────────────────────────────────

export function CommentPanel({
  videoId,
  isOpen,
  onClose,
  isAuthenticated,
  onNavigateToProfile,
  openGift = false,
}: CommentPanelProps) {
  const { actor, userProfile } = useAuth();
  const queryClient = useQueryClient();

  // ── State ──────────────────────────────────────────────────────────────────
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    id: bigint;
    username: string;
  } | null>(null);
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(
    new Set(),
  );
  const [giftPanelOpen, setGiftPanelOpen] = useState(false);
  const [emojiTabOpen, setEmojiTabOpen] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [emojiTab, setEmojiTab] = useState<"emoji" | "stickers">("emoji");
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(
    new Set(),
  );
  const [giftAnimation, setGiftAnimation] = useState<{
    emoji: string;
    id: number;
  } | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const commentScrollRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const swipeStartY = useRef<number | null>(null);

  // ── Motion ─────────────────────────────────────────────────────────────────
  const panelY = useMotionValue(0);
  const panelOpacity = useTransform(panelY, [0, 200], [1, 0]);

  // ── Query keys ─────────────────────────────────────────────────────────────
  const callerPrincipal = userProfile?.email ?? "anon";
  const commentsQueryKey = useMemo(
    () => ["comments", videoId.toString()],
    [videoId],
  );
  const interactionQueryKey = useMemo(
    () => ["videoInteraction", videoId.toString(), callerPrincipal],
    [videoId, callerPrincipal],
  );

  // ── Fetch comments ─────────────────────────────────────────────────────────
  const { data: allComments = [], isLoading: commentsLoading } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: async () => {
      if (!actor) return [];
      return actor.getComments(videoId);
    },
    enabled: !!actor && isOpen,
    staleTime: 10_000,
  });

  // Separate top-level vs replies
  const { topLevelComments, repliesByParent } = useMemo(() => {
    const sorted = [...allComments].sort((a, b) =>
      Number(a.createdAt - b.createdAt),
    );
    const topLevel: Comment[] = [];
    const byParent = new Map<string, Comment[]>();

    for (const c of sorted) {
      if (!c.replyToId) {
        topLevel.push(c);
      } else {
        const key = c.replyToId.toString();
        const arr = byParent.get(key) ?? [];
        arr.push(c);
        byParent.set(key, arr);
      }
    }
    return { topLevelComments: topLevel, repliesByParent: byParent };
  }, [allComments]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: commentScrollRef is a stable ref
  useEffect(() => {
    if (isOpen && commentScrollRef.current) {
      const el = commentScrollRef.current;
      setTimeout(() => {
        el.scrollTop = el.scrollHeight;
      }, 80);
    }
  }, [isOpen, allComments.length]);

  // Reset sub-panels when closing
  useEffect(() => {
    if (!isOpen) {
      setGiftPanelOpen(false);
      setEmojiTabOpen(false);
      setReplyingTo(null);
      setCommentText("");
    }
  }, [isOpen]);

  // Auto-open gift panel when triggered from the teaser bar
  useEffect(() => {
    if (isOpen && openGift) {
      setGiftPanelOpen(true);
    }
  }, [isOpen, openGift]);

  // ── Keyboard offset ────────────────────────────────────────────────────────
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardOffset(Math.max(0, offset));
    };
    vv.addEventListener("resize", handler);
    vv.addEventListener("scroll", handler);
    return () => {
      vv.removeEventListener("resize", handler);
      vv.removeEventListener("scroll", handler);
    };
  }, []);

  // ── Swipe-to-close handlers ────────────────────────────────────────────────
  const handleDragStart = useCallback((clientY: number) => {
    swipeStartY.current = clientY;
  }, []);

  const handleDragMove = useCallback(
    (clientY: number) => {
      if (swipeStartY.current === null) return;
      const delta = clientY - swipeStartY.current;
      if (delta > 0) panelY.set(delta);
    },
    [panelY],
  );

  const handleDragEnd = useCallback(
    (clientY: number) => {
      if (swipeStartY.current === null) return;
      const delta = clientY - swipeStartY.current;
      swipeStartY.current = null;
      if (delta > 80) {
        panelY.set(0);
        onClose();
      } else {
        panelY.set(0);
      }
    },
    [panelY, onClose],
  );

  // ── Trigger gift animation ─────────────────────────────────────────────────
  const triggerGiftAnimation = useCallback((emoji: string) => {
    setGiftAnimation({ emoji, id: Date.now() });
  }, []);

  // ── Send comment ───────────────────────────────────────────────────────────
  const handleSendComment = useCallback(async () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    if (!isAuthenticated || !actor) {
      toast.error("Log in to comment");
      return;
    }

    const replyToId = replyingTo?.id ?? null;
    setCommentText("");
    setReplyingTo(null);

    try {
      await actor.addComment(videoId, trimmed, replyToId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: commentsQueryKey }),
        queryClient.invalidateQueries({ queryKey: interactionQueryKey }),
      ]);
      setTimeout(() => {
        if (commentScrollRef.current) {
          commentScrollRef.current.scrollTop =
            commentScrollRef.current.scrollHeight;
        }
      }, 150);
    } catch {
      toast.error("Failed to post comment");
    }
  }, [
    commentText,
    isAuthenticated,
    actor,
    videoId,
    replyingTo,
    queryClient,
    commentsQueryKey,
    interactionQueryKey,
  ]);

  // ── Like/unlike comment ────────────────────────────────────────────────────
  const handleLikeComment = useCallback(
    async (comment: Comment) => {
      if (!isAuthenticated || !actor) {
        toast.error("Log in to like comments");
        return;
      }
      const idStr = comment.id.toString();
      const isLiked = likedCommentIds.has(idStr);
      setLikedCommentIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.delete(idStr);
        else next.add(idStr);
        return next;
      });
      try {
        if (isLiked) await actor.unlikeComment(comment.id);
        else await actor.likeComment(comment.id);
        await queryClient.invalidateQueries({ queryKey: commentsQueryKey });
      } catch {
        setLikedCommentIds((prev) => {
          const next = new Set(prev);
          if (isLiked) next.add(idStr);
          else next.delete(idStr);
          return next;
        });
        toast.error("Failed to update like");
      }
    },
    [isAuthenticated, actor, likedCommentIds, queryClient, commentsQueryKey],
  );

  // ── Reply ──────────────────────────────────────────────────────────────────
  const handleReply = useCallback(
    (comment: Comment, authorUsername: string) => {
      setReplyingTo({ id: comment.id, username: authorUsername });
      setCommentText(`@${authorUsername} `);
      setGiftPanelOpen(false);
      setEmojiTabOpen(false);
      setTimeout(() => commentInputRef.current?.focus(), 80);
    },
    [],
  );

  // ── Send gift ──────────────────────────────────────────────────────────────
  const handleSendGift = useCallback(
    (gift: GiftItem) => {
      if (!isAuthenticated) {
        toast.error("Log in to send gifts");
        return;
      }
      const coins = userProfile
        ? ((userProfile as { coinBalance?: number }).coinBalance ?? 0)
        : 0;
      if (coins < gift.coins) {
        toast.error("Not enough coins. Recharge to continue.");
        return;
      }
      triggerGiftAnimation(gift.emoji);
      toast.success(`${gift.emoji} ${gift.name} sent!`);
      setGiftPanelOpen(false);
    },
    [isAuthenticated, userProfile, triggerGiftAnimation],
  );

  // ── Quick rose gift ────────────────────────────────────────────────────────
  const handleQuickRose = useCallback(() => {
    const rose = GIFTS.find((g) => g.id === "rose");
    if (rose) handleSendGift(rose);
  }, [handleSendGift]);

  // ── Send sticker ───────────────────────────────────────────────────────────
  const handleSendSticker = useCallback(
    async (sticker: string) => {
      if (!isAuthenticated || !actor) {
        toast.error("Log in to send stickers");
        return;
      }
      setEmojiTabOpen(false);
      try {
        await actor.addComment(videoId, sticker, null);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: commentsQueryKey }),
          queryClient.invalidateQueries({ queryKey: interactionQueryKey }),
        ]);
        setTimeout(() => {
          if (commentScrollRef.current) {
            commentScrollRef.current.scrollTop =
              commentScrollRef.current.scrollHeight;
          }
        }, 150);
      } catch {
        toast.error("Failed to send sticker");
      }
    },
    [
      isAuthenticated,
      actor,
      videoId,
      queryClient,
      commentsQueryKey,
      interactionQueryKey,
    ],
  );

  // ── Image upload ───────────────────────────────────────────────────────────
  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!isAuthenticated || !actor) {
        toast.error("Log in to upload images");
        return;
      }
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) return;
        try {
          await actor.addComment(videoId, dataUrl, replyingTo?.id ?? null);
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: commentsQueryKey }),
            queryClient.invalidateQueries({ queryKey: interactionQueryKey }),
          ]);
          setReplyingTo(null);
          setTimeout(() => {
            if (commentScrollRef.current) {
              commentScrollRef.current.scrollTop =
                commentScrollRef.current.scrollHeight;
            }
          }, 150);
        } catch {
          toast.error("Failed to upload image");
        }
      };
      reader.readAsDataURL(file);
    },
    [
      isAuthenticated,
      actor,
      videoId,
      replyingTo,
      queryClient,
      commentsQueryKey,
      interactionQueryKey,
    ],
  );

  // ── Toggle thread ──────────────────────────────────────────────────────────
  const toggleThread = useCallback((commentId: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }, []);

  const canSend = commentText.trim().length > 0;
  const coinBalance =
    (userProfile as { coinBalance?: number })?.coinBalance ?? 0;

  // Computed bottom values accounting for keyboard
  const inputBottom = INPUT_BOTTOM + keyboardOffset;
  const panelBottom = PANEL_BOTTOM + keyboardOffset;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ─────────────────────────────────────────────────── */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss */}
          <div
            className="fixed inset-x-0 top-0 z-[199]"
            style={{
              bottom: inputBottom + INPUT_HEIGHT,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          />

          {/* ── Gift float animation (screen-level) ──────────────────────── */}
          <AnimatePresence>
            {giftAnimation && (
              <motion.div
                key={giftAnimation.id}
                initial={{ opacity: 1, y: 0, scale: 1 }}
                animate={{ opacity: 0, y: -180, scale: 1.6 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="fixed left-1/2 z-[230] pointer-events-none"
                style={{
                  bottom: panelBottom + 80,
                  transform: "translateX(-50%)",
                }}
                onAnimationComplete={() => setGiftAnimation(null)}
              >
                <span className="text-5xl drop-shadow-lg">
                  {giftAnimation.emoji}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Comment panel ────────────────────────────────────────────── */}
          <motion.div
            data-ocid="comment.panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-0 right-0 z-[200] flex flex-col rounded-t-3xl overflow-hidden"
            style={{
              bottom: panelBottom,
              height: "55vh",
              background: "rgba(10,10,10,0.97)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderBottom: "none",
              y: panelY,
              opacity: panelOpacity,
            }}
            onTouchStart={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest("[data-drag-handle]")) {
                handleDragStart(e.touches[0]?.clientY ?? 0);
              }
            }}
            onTouchMove={(e) => {
              handleDragMove(e.touches[0]?.clientY ?? 0);
            }}
            onTouchEnd={(e) => {
              handleDragEnd(e.changedTouches[0]?.clientY ?? 0);
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div
              data-drag-handle
              className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
            >
              <div
                className="w-12 h-1.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.25)" }}
              />
            </div>

            {/* Header */}
            <div
              data-drag-handle
              className="flex items-center justify-between px-5 py-3 flex-shrink-0"
            >
              <h3
                className="text-white font-bold text-base"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                Comments{" "}
                <span className="text-white/40 font-normal text-sm">
                  {allComments.length > 0 ? allComments.length : ""}
                </span>
              </h3>
              <button
                type="button"
                data-ocid="comment.close_button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors active:scale-90"
                style={{ background: "rgba(255,255,255,0.07)" }}
                aria-label="Close comments"
              >
                <X size={16} />
              </button>
            </div>

            {/* Comments list */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation wrapper */}
            <div
              ref={commentScrollRef}
              className="flex-1 overflow-y-auto px-5 pb-2"
              style={{
                scrollbarWidth: "none",
                overscrollBehavior: "contain",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {commentsLoading ? (
                <div
                  data-ocid="comment.loading_state"
                  className="flex flex-col items-center justify-center py-12 gap-3"
                >
                  <div
                    className="w-8 h-8 rounded-full animate-pulse"
                    style={{ background: "rgba(255,0,80,0.3)" }}
                  />
                  <p className="text-white/40 text-sm">Loading comments…</p>
                </div>
              ) : topLevelComments.length === 0 ? (
                <div
                  data-ocid="comment.empty_state"
                  className="flex flex-col items-center justify-center py-16 gap-3"
                >
                  <MessageCircle size={40} className="text-white/15" />
                  <p className="text-white/40 text-sm text-center">
                    No comments yet. Be the first! 😄
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-5 pt-2 pb-4">
                  {topLevelComments.map((comment, idx) => {
                    const replies =
                      repliesByParent.get(comment.id.toString()) ?? [];
                    const isExpanded = expandedThreads.has(
                      comment.id.toString(),
                    );

                    return (
                      <div key={comment.id.toString()}>
                        <CommentItem
                          comment={comment}
                          idx={idx}
                          scope="comment"
                          isLiked={likedCommentIds.has(comment.id.toString())}
                          onLike={() => void handleLikeComment(comment)}
                          onReply={(username) => handleReply(comment, username)}
                          onNavigateToProfile={onNavigateToProfile}
                        />

                        {/* Replies */}
                        {replies.length > 0 && (
                          <div className="ml-9 mt-2">
                            <button
                              type="button"
                              data-ocid={`comment.reply.toggle.${idx + 1}`}
                              onClick={() =>
                                toggleThread(comment.id.toString())
                              }
                              className="flex items-center gap-1.5 mb-2 transition-colors"
                            >
                              <div
                                className="w-4 h-px"
                                style={{
                                  background: "rgba(255,255,255,0.2)",
                                }}
                              />
                              <span
                                className="text-[11px] font-semibold"
                                style={{
                                  color: isExpanded
                                    ? "#ff0050"
                                    : "rgba(255,255,255,0.4)",
                                }}
                              >
                                {isExpanded ? "Hide" : `View ${replies.length}`}{" "}
                                {replies.length === 1 ? "reply" : "replies"}
                              </span>
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="flex flex-col gap-4 border-l-2 pl-3"
                                  style={{
                                    borderColor: "rgba(255,255,255,0.1)",
                                  }}
                                >
                                  {replies.map((reply, rIdx) => (
                                    <CommentItem
                                      key={reply.id.toString()}
                                      comment={reply}
                                      idx={rIdx}
                                      scope="comment.reply"
                                      isLiked={likedCommentIds.has(
                                        reply.id.toString(),
                                      )}
                                      onLike={() =>
                                        void handleLikeComment(reply)
                                      }
                                      onReply={(username) =>
                                        handleReply(reply, username)
                                      }
                                      onNavigateToProfile={onNavigateToProfile}
                                    />
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Emoji / Sticker panel — fixed above input bar ─────────────── */}
          <AnimatePresence>
            {emojiTabOpen && !giftPanelOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="fixed left-0 right-0 z-[215] rounded-t-2xl"
                style={{
                  bottom: inputBottom + INPUT_HEIGHT,
                  background: "rgba(14,14,14,0.99)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Tab bar */}
                <div className="flex gap-2 px-4 pt-3 pb-2">
                  {(["emoji", "stickers"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setEmojiTab(tab)}
                      className="px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-95"
                      style={{
                        background:
                          emojiTab === tab
                            ? "rgba(255,0,80,0.2)"
                            : "rgba(255,255,255,0.07)",
                        color:
                          emojiTab === tab
                            ? "#ff0050"
                            : "rgba(255,255,255,0.5)",
                        border:
                          emojiTab === tab
                            ? "1px solid rgba(255,0,80,0.3)"
                            : "1px solid transparent",
                      }}
                    >
                      {tab === "emoji" ? "Emoji" : "Stickers"}
                    </button>
                  ))}
                </div>

                {emojiTab === "emoji" ? (
                  <div className="grid grid-cols-10 gap-1 px-4 pb-3">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="text-xl leading-none py-1 rounded-lg transition-all active:scale-90 hover:bg-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCommentText((prev) => prev + emoji);
                          commentInputRef.current?.focus();
                        }}
                        aria-label={`Insert ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-6 gap-2 px-4 pb-3">
                    {STICKERS.map((sticker) => (
                      <button
                        key={sticker}
                        type="button"
                        className="text-3xl leading-none py-2 rounded-xl transition-all active:scale-90 hover:bg-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleSendSticker(sticker);
                        }}
                        aria-label={`Send sticker ${sticker}`}
                      >
                        {sticker}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Gift drawer — fixed above input bar ──────────────────────── */}
          <AnimatePresence>
            {giftPanelOpen && (
              <motion.div
                data-ocid="comment.gift.panel"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="fixed left-0 right-0 z-[220] rounded-t-2xl flex flex-col"
                style={{
                  bottom: inputBottom + INPUT_HEIGHT,
                  maxHeight: "50vh",
                  background: "rgba(16,16,16,0.99)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderBottom: "none",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Gift drawer header */}
                <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Gift size={16} style={{ color: "#ff0050" }} />
                    <span
                      className="text-white font-bold text-sm"
                      style={{
                        fontFamily: "'Bricolage Grotesque', sans-serif",
                      }}
                    >
                      Send a Gift
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                      style={{
                        background: "rgba(255,193,7,0.12)",
                        border: "1px solid rgba(255,193,7,0.25)",
                      }}
                    >
                      <span className="text-sm">🪙</span>
                      <span
                        className="text-xs font-bold"
                        style={{ color: "#ffd700" }}
                      >
                        {coinBalance.toLocaleString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      data-ocid="comment.gift.close_button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setGiftPanelOpen(false);
                      }}
                      className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                      style={{ background: "rgba(255,255,255,0.07)" }}
                      aria-label="Close gifts"
                    >
                      <X size={14} className="text-white/60" />
                    </button>
                  </div>
                </div>

                {/* Gift grid */}
                <div
                  className="overflow-y-auto px-4 pb-6"
                  style={{ scrollbarWidth: "none" }}
                >
                  <div className="grid grid-cols-4 gap-3">
                    {GIFTS.map((gift) => (
                      <button
                        key={gift.id}
                        type="button"
                        data-ocid={`comment.gift.${gift.id}_button`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendGift(gift);
                        }}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <span className="text-2xl">{gift.emoji}</span>
                        <span className="text-white/80 text-[10px] font-medium truncate w-full text-center">
                          {gift.name}
                        </span>
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: "#ffd700" }}
                        >
                          🪙 {gift.coins}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Input bar — fixed directly above nav ─────────────────────── */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation wrapper */}
          <div
            className="fixed left-0 right-0 z-[210]"
            style={{ bottom: inputBottom }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Hidden file input */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImageUpload(file);
                e.target.value = "";
              }}
            />

            {/* Reply chip */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 px-5 py-2"
                  style={{
                    background: "rgba(255,0,80,0.08)",
                    borderTop: "1px solid rgba(255,0,80,0.15)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <CornerDownRight size={13} style={{ color: "#ff0050" }} />
                  <span className="text-white/60 text-xs flex-1">
                    Replying to{" "}
                    <span style={{ color: "#ff0050" }}>
                      @{replyingTo.username}
                    </span>
                  </span>
                  <button
                    type="button"
                    data-ocid="comment.reply_to.close_button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReplyingTo(null);
                      setCommentText("");
                    }}
                    className="w-5 h-5 rounded-full flex items-center justify-center active:scale-90"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                    aria-label="Cancel reply"
                  >
                    <X size={10} className="text-white/60" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input row */}
            <div
              className="flex items-center gap-1.5 px-3"
              style={{
                height: INPUT_HEIGHT,
                background: "rgba(0,0,0,0.92)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                borderTop: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* 1. Text input */}
              <input
                ref={commentInputRef}
                type="text"
                data-ocid="comment.input"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSendComment();
                }}
                onFocus={() => setEmojiTabOpen(false)}
                placeholder={
                  replyingTo
                    ? `Reply to @${replyingTo.username}…`
                    : "Add comment..."
                }
                className="flex-1 min-w-0 px-3 py-2 rounded-full text-white text-sm placeholder:text-white/35 outline-none"
                style={{
                  background: "rgba(255,255,255,0.09)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  caretColor: "#ff0050",
                  fontSize: "16px",
                }}
              />

              {/* 2. Image upload */}
              <button
                type="button"
                data-ocid="comment.upload_button"
                onClick={(e) => {
                  e.stopPropagation();
                  imageInputRef.current?.click();
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 transition-all active:scale-90"
                style={{ background: "rgba(255,255,255,0.07)" }}
                aria-label="Upload image"
              >
                <ImageIcon size={16} className="text-white/60" />
              </button>

              {/* 3. Emoji picker */}
              <button
                type="button"
                data-ocid="comment.emoji_button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEmojiTabOpen((prev) => !prev);
                  setGiftPanelOpen(false);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 transition-all active:scale-90"
                style={{
                  background: emojiTabOpen
                    ? "rgba(255,0,80,0.15)"
                    : "rgba(255,255,255,0.07)",
                }}
                aria-label="Emoji picker"
              >
                <Smile
                  size={16}
                  style={{
                    color: emojiTabOpen ? "#ff0050" : "rgba(255,255,255,0.6)",
                  }}
                />
              </button>

              {/* 4. Mention user */}
              <button
                type="button"
                data-ocid="comment.mention_button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCommentText((prev) => `${prev}@`);
                  setTimeout(() => commentInputRef.current?.focus(), 50);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 transition-all active:scale-90"
                style={{ background: "rgba(255,255,255,0.07)" }}
                aria-label="Mention a user"
              >
                <AtSign size={16} className="text-white/60" />
              </button>

              {/* 5. Quick Rose gift */}
              <button
                type="button"
                data-ocid="comment.rose_button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickRose();
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 transition-all active:scale-90 text-base leading-none"
                style={{ background: "rgba(255,255,255,0.07)" }}
                aria-label="Send Rose gift"
              >
                🌹
              </button>

              {/* 6. Gift panel */}
              <button
                type="button"
                data-ocid="comment.gift_button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGiftPanelOpen((prev) => !prev);
                  setEmojiTabOpen(false);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 transition-all active:scale-90"
                style={{
                  background: giftPanelOpen
                    ? "rgba(255,0,80,0.15)"
                    : "rgba(255,255,255,0.07)",
                }}
                aria-label="Open gift panel"
              >
                <Gift
                  size={16}
                  style={{
                    color: giftPanelOpen ? "#ff0050" : "rgba(255,255,255,0.6)",
                  }}
                />
              </button>

              {/* 7. Send comment */}
              <button
                type="button"
                data-ocid="comment.submit_button"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleSendComment();
                }}
                disabled={!canSend}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-35 transition-all active:scale-90"
                style={{
                  background: canSend
                    ? "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)"
                    : "rgba(255,255,255,0.08)",
                  boxShadow: canSend ? "0 2px 12px rgba(255,0,80,0.4)" : "none",
                }}
                aria-label="Send comment"
              >
                <Send size={14} className="text-white" />
              </button>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
