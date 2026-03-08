import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronUp,
  CornerDownRight,
  Heart,
  Link,
  MessageCircle,
  Send,
  Share2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Comment, Video, VideoInteractionState } from "../backend.d";
import { useAuth } from "../context/AuthContext";
import { useVideoAspectRatio } from "../hooks/useVideoAspectRatio";
import { getDisplayName, getUsername } from "../lib/userFormat";
import { CommentItem } from "./VideoCard";

// ── Types ──────────────────────────────────────────────────────────────────────

interface HeartBurst {
  id: number;
  x: number;
  y: number;
}

interface ProfileVideoPlayerProps {
  videos: Video[];
  initialIndex: number;
  onClose: () => void;
  isAuthenticated: boolean;
  onNavigateToProfile?: (principal: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCount(n: bigint | number): string {
  const num = typeof n === "bigint" ? Number(n) : n;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

// ── Progress dot ───────────────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  // Clamp the visible window to avoid huge lists
  const maxVisible = 10;
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(0, current - half);
  const end = Math.min(total, start + maxVisible);
  start = Math.max(0, end - maxVisible);

  return (
    <div className="flex flex-col gap-1.5 items-center pointer-events-none">
      {Array.from({ length: end - start }).map((_, i) => {
        const idx = start + i;
        const isActive = idx === current;
        return (
          <div
            key={idx}
            className="w-1 rounded-full transition-all duration-300"
            style={{
              height: isActive ? "20px" : "6px",
              background: isActive ? "#ff0050" : "rgba(255,255,255,0.3)",
            }}
          />
        );
      })}
    </div>
  );
}

// ── Single video panel (rendered inside the player) ────────────────────────────

interface VideoPanelProps {
  video: Video;
  isAuthenticated: boolean;
  isMuted: boolean;
  onMuteChange: (m: boolean) => void;
  onNavigateToProfile?: (principal: string) => void;
}

function VideoPanel({
  video,
  isAuthenticated,
  isMuted,
  onMuteChange,
  onNavigateToProfile,
}: VideoPanelProps) {
  const { actor, userProfile } = useAuth();
  const queryClient = useQueryClient();

  const [heartBursts, setHeartBursts] = useState<HeartBurst[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [commentPanelOpen, setCommentPanelOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    id: bigint;
    username: string;
  } | null>(null);
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(
    new Set(),
  );

  const lastTapRef = useRef<number>(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTouchGestureRef = useRef(false);
  const burstIdRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const { aspectClass } = useVideoAspectRatio(videoRef);
  const creatorPrincipalStr = video.creator.toString();
  const callerPrincipal = userProfile?.email ?? "anon";

  // ── Interaction state ──────────────────────────────────────────────────────
  const interactionQueryKey = useMemo(
    () => ["videoInteraction", video.id.toString(), callerPrincipal],
    [video.id, callerPrincipal],
  );

  const { data: interactionState } = useQuery({
    queryKey: interactionQueryKey,
    queryFn: async () => {
      if (!actor || !isAuthenticated) return null;
      return actor.getVideoInteractionState(video.id);
    },
    enabled: !!actor && isAuthenticated,
    staleTime: 30_000,
  });

  const liked = interactionState?.liked ?? false;
  const likeCount =
    interactionState?.likeCount != null
      ? Number(interactionState.likeCount)
      : Number(video.likeCount);
  const commentCount =
    interactionState?.commentCount != null
      ? Number(interactionState.commentCount)
      : Number(video.commentCount);
  const shareCount =
    interactionState?.shareCount != null
      ? Number(interactionState.shareCount)
      : Number(video.shareCount);

  // ── Comments ───────────────────────────────────────────────────────────────
  const commentsQueryKey = useMemo(
    () => ["comments", video.id.toString()],
    [video.id],
  );
  const { data: realComments = [], isLoading: commentsLoading } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: async () => {
      if (!actor) return [];
      return actor.getComments(video.id);
    },
    enabled: !!actor && commentPanelOpen,
    staleTime: 10_000,
  });

  // ── Creator info ───────────────────────────────────────────────────────────
  const { data: creatorUser } = useQuery({
    queryKey: ["user", creatorPrincipalStr],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getUser(video.creator);
    },
    enabled: !!actor,
    staleTime: 120_000,
  });

  const displayName = creatorUser
    ? getDisplayName(creatorUser.name) ||
      getUsername(creatorUser.name) ||
      "USER"
    : "USER";
  const username = creatorUser ? getUsername(creatorUser.name) : "";
  const avatarUrl = creatorUser?.avatarUrl ?? "";
  const initials = avatarUrl ? "" : displayName.slice(0, 2).toUpperCase();

  // ── Like mutation ──────────────────────────────────────────────────────────
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return actor.toggleLikeVideo(video.id);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: interactionQueryKey });
      const prev = queryClient.getQueryData(interactionQueryKey);
      queryClient.setQueryData(
        interactionQueryKey,
        (old: VideoInteractionState | null | undefined) => {
          if (!old) return old;
          return {
            ...old,
            liked: !old.liked,
            likeCount: old.liked
              ? old.likeCount - BigInt(1)
              : old.likeCount + BigInt(1),
          };
        },
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(interactionQueryKey, ctx.prev);
      }
      toast.error("Failed to update like");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: interactionQueryKey });
    },
  });

  // ── Trigger heart burst + like-only on double-tap ──────────────────────────
  const triggerLike = useCallback(
    (x: number, y: number) => {
      const id = burstIdRef.current++;
      setHeartBursts((prev) => [...prev, { id, x, y }]);
      setTimeout(() => {
        setHeartBursts((prev) => prev.filter((h) => h.id !== id));
      }, 700);

      if (!liked && isAuthenticated && actor) {
        queryClient.setQueryData(
          interactionQueryKey,
          (old: VideoInteractionState | null | undefined) => {
            if (!old) return old;
            return {
              ...old,
              liked: true,
              likeCount: old.likeCount + BigInt(1),
            };
          },
        );
        actor
          .toggleLikeVideo(video.id)
          .then((newState) => {
            if (!newState) {
              void queryClient.invalidateQueries({
                queryKey: interactionQueryKey,
              });
            }
          })
          .catch(() => {
            void queryClient.invalidateQueries({
              queryKey: interactionQueryKey,
            });
          });
      }
    },
    [liked, isAuthenticated, actor, video.id, queryClient, interactionQueryKey],
  );

  // ── Gesture processing ─────────────────────────────────────────────────────
  const processTap = useCallback(
    (clientX: number, clientY: number) => {
      const now = Date.now();
      const timeDiff = now - lastTapRef.current;

      if (timeDiff < 300 && timeDiff > 0 && tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
        lastTapRef.current = 0;
        triggerLike(clientX, clientY);
      } else {
        lastTapRef.current = now;
        tapTimerRef.current = setTimeout(() => {
          tapTimerRef.current = null;
          if (videoRef.current) {
            if (videoRef.current.paused) {
              videoRef.current.play().catch(() => {});
              setIsPlaying(true);
            } else {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        }, 300);
      }
    },
    [triggerLike],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("button")) return;
      isTouchGestureRef.current = true;
      setTimeout(() => {
        isTouchGestureRef.current = false;
      }, 600);
      const touch = e.changedTouches[0];
      if (touch) processTap(touch.clientX, touch.clientY);
    },
    [processTap],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("button")) return;
      if (isTouchGestureRef.current) return;
      processTap(e.clientX, e.clientY);
    },
    [processTap],
  );

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuted = !isMuted;
    onMuteChange(newMuted);
    if (videoRef.current) videoRef.current.muted = newMuted;
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Log in to like videos");
      return;
    }
    likeMutation.mutate();
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    if (!isAuthenticated || !actor) {
      toast.error("Log in to comment");
      return;
    }
    const text = commentText.trim();
    const replyToId = replyingTo?.id ?? null;
    setCommentText("");
    setReplyingTo(null);
    try {
      await actor.addComment(video.id, text, replyToId);
      await queryClient.invalidateQueries({ queryKey: commentsQueryKey });
      await queryClient.invalidateQueries({ queryKey: interactionQueryKey });
    } catch {
      toast.error("Failed to post comment");
    }
  };

  const handleLikeComment = async (comment: Comment) => {
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
      if (isLiked) {
        await actor.unlikeComment(comment.id);
      } else {
        await actor.likeComment(comment.id);
      }
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
  };

  const handleReply = (comment: Comment, authorUsername: string) => {
    setReplyingTo({ id: comment.id, username: authorUsername });
    setCommentText(`@${authorUsername} `);
    setTimeout(() => commentInputRef.current?.focus(), 80);
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/video/${video.id.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
      if (actor && isAuthenticated) {
        void actor.recordShare(video.id);
        queryClient.setQueryData(
          interactionQueryKey,
          (old: VideoInteractionState | null | undefined) => {
            if (!old) return old;
            return { ...old, shareCount: old.shareCount + BigInt(1) };
          },
        );
      }
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleNativeShare = async () => {
    const url = `${window.location.origin}/video/${video.id.toString()}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title, url });
        if (actor && isAuthenticated) {
          void actor.recordShare(video.id);
          queryClient.setQueryData(
            interactionQueryKey,
            (old: VideoInteractionState | null | undefined) => {
              if (!old) return old;
              return { ...old, shareCount: old.shareCount + BigInt(1) };
            },
          );
        }
      } catch {
        // user dismissed
      }
    } else {
      toast.error("Sharing not supported on this browser");
    }
  };

  const handleCreatorTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigateToProfile?.(creatorPrincipalStr);
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: video feed uses touch/click for gesture detection
    <div
      className="relative w-full h-full overflow-hidden select-none bg-black"
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      role="presentation"
    >
      {/* ── Video ──────────────────────────────────────────────────────────── */}
      {video.videoUrl ? (
        <video
          ref={videoRef}
          src={video.videoUrl}
          className={`absolute inset-0 w-full h-full ${
            aspectClass === "vertical" ? "object-cover" : "object-contain"
          }`}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          poster={video.thumbnailUrl || undefined}
          onCanPlay={() => {
            if (videoRef.current) {
              videoRef.current.play().catch(() => {
                onMuteChange(true);
                if (videoRef.current) {
                  videoRef.current.muted = true;
                  videoRef.current.play().catch(() => {});
                }
              });
            }
          }}
        />
      ) : video.thumbnailUrl ? (
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="absolute inset-0 w-full h-full object-contain"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-rose-900 to-pink-800" />
      )}

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* Heart bursts */}
      {heartBursts.map((burst) => (
        <div
          key={burst.id}
          className="heart-burst absolute pointer-events-none z-30"
          style={{
            left: burst.x - 40,
            top: burst.y - 40,
            width: 80,
            height: 80,
          }}
        >
          <Heart size={80} fill="#ff0050" stroke="none" />
        </div>
      ))}

      {/* Play/Pause overlay */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.55)" }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="white"
                xmlns="http://www.w3.org/2000/svg"
                className="ml-1"
                aria-hidden="true"
                focusable="false"
              >
                <title>Play</title>
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mute button ────────────────────────────────────────────────────── */}
      <div className="absolute bottom-36 left-4 z-10">
        <button
          type="button"
          data-ocid="profile-player.mute_toggle"
          onClick={handleMuteToggle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX size={15} className="text-white" />
          ) : (
            <Volume2 size={15} className="text-white" />
          )}
        </button>
      </div>

      {/* ── Creator info ────────────────────────────────────────────────────── */}
      <div className="absolute bottom-24 left-4 right-20 z-10">
        <button
          type="button"
          onClick={handleCreatorTap}
          className="text-left mb-1 focus-visible:outline-none"
        >
          <p className="text-white font-bold text-base hover:text-white/80 transition-colors">
            {username ? `@${username}` : `@${displayName.toLowerCase()}`}
          </p>
        </button>
        <p className="text-white/90 text-sm leading-snug mb-2 line-clamp-2 pointer-events-none">
          {video.caption || video.title}
        </p>
        {video.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 pointer-events-none">
            {video.hashtags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium"
                style={{ color: "#ff0050" }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Right-side icon stack ────────────────────────────────────────────── */}
      <div className="absolute bottom-28 right-3 z-10 flex flex-col items-center gap-5">
        {/* Like */}
        <button
          type="button"
          data-ocid="profile-player.like_button"
          onClick={handleLike}
          className="flex flex-col items-center gap-1 group"
          aria-label="Like"
        >
          <div className="w-11 h-11 flex items-center justify-center">
            <Heart
              size={28}
              strokeWidth={2}
              fill={liked ? "#ff0050" : "none"}
              stroke={liked ? "#ff0050" : "white"}
              className="transition-all duration-150 group-active:scale-125"
            />
          </div>
          <span className="text-white text-xs font-medium">
            {formatCount(likeCount)}
          </span>
        </button>

        {/* Comment */}
        <button
          type="button"
          data-ocid="profile-player.comment_button"
          onClick={(e) => {
            e.stopPropagation();
            setCommentPanelOpen(true);
          }}
          className="flex flex-col items-center gap-1 group"
          aria-label="Comment"
        >
          <div className="w-11 h-11 flex items-center justify-center">
            <MessageCircle
              size={28}
              strokeWidth={2}
              stroke="white"
              className="transition-all duration-150 group-active:scale-125"
            />
          </div>
          <span className="text-white text-xs font-medium">
            {formatCount(commentCount)}
          </span>
        </button>

        {/* Share */}
        <button
          type="button"
          data-ocid="profile-player.share_button"
          onClick={(e) => {
            e.stopPropagation();
            setShareSheetOpen(true);
          }}
          className="flex flex-col items-center gap-1 group"
          aria-label="Share"
        >
          <div className="w-11 h-11 flex items-center justify-center">
            <Share2
              size={26}
              strokeWidth={2}
              stroke="white"
              className="transition-all duration-150 group-active:scale-125"
            />
          </div>
          <span className="text-white text-xs font-medium">
            {formatCount(shareCount)}
          </span>
        </button>

        {/* Creator avatar */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={handleCreatorTap}
            className="w-12 h-12 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label={`View ${displayName}'s profile`}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border-2 border-white/30"
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
                <span className="text-white text-sm font-bold">{initials}</span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* ── Comment panel ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {commentPanelOpen && (
          <>
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss */}
            <div
              className="fixed inset-0 z-[190]"
              style={{ background: "rgba(0,0,0,0.5)" }}
              onClick={(e) => {
                e.stopPropagation();
                setCommentPanelOpen(false);
              }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 z-[200] rounded-t-2xl flex flex-col"
              style={{
                background: "rgba(14,14,14,0.98)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
                maxHeight: "70vh",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.2)" }}
                />
              </div>
              <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
                <h3
                  className="text-white font-bold text-base"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  Comments
                </h3>
                <button
                  type="button"
                  data-ocid="profile-player.comment_panel_close_button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCommentPanelOpen(false);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                  aria-label="Close comments"
                >
                  <X size={16} />
                </button>
              </div>

              <div
                className="flex-1 overflow-y-auto px-4 pb-2"
                style={{ scrollbarWidth: "none" }}
              >
                {commentsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div
                      className="w-8 h-8 rounded-full animate-pulse"
                      style={{ background: "rgba(255,0,80,0.3)" }}
                    />
                    <p className="text-white/40 text-sm">Loading comments…</p>
                  </div>
                ) : realComments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <MessageCircle size={36} className="text-white/20" />
                    <p className="text-white/40 text-sm text-center">
                      No comments yet. Be the first!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {realComments.map((comment, idx) => (
                      <CommentItem
                        key={comment.id.toString()}
                        comment={comment}
                        idx={idx}
                        scope="profile-player"
                        isLiked={likedCommentIds.has(comment.id.toString())}
                        onLike={() => void handleLikeComment(comment)}
                        onReply={(username) => handleReply(comment, username)}
                        onNavigateToProfile={onNavigateToProfile}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Reply chip */}
              <AnimatePresence>
                {replyingTo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
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
                      data-ocid="profile-player.reply_to_clear_button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReplyingTo(null);
                        setCommentText("");
                      }}
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.1)" }}
                      aria-label="Cancel reply"
                    >
                      <X size={10} className="text-white/60" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation wrapper only */}
              <div
                className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(0,0,0,0.4)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  ref={commentInputRef}
                  type="text"
                  data-ocid="profile-player.comment_input"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSendComment();
                  }}
                  placeholder={
                    replyingTo
                      ? `Reply to @${replyingTo.username}…`
                      : "Add a comment…"
                  }
                  className="flex-1 px-3 py-2 rounded-full text-white text-sm placeholder:text-white/30 outline-none"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    caretColor: "#ff0050",
                    fontSize: "16px",
                  }}
                />
                <button
                  type="button"
                  data-ocid="profile-player.comment_submit_button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleSendComment();
                  }}
                  disabled={!commentText.trim()}
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
                  style={{
                    background: commentText.trim()
                      ? "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)"
                      : "rgba(255,255,255,0.1)",
                  }}
                  aria-label="Send comment"
                >
                  <Send size={15} className="text-white" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Share sheet ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {shareSheetOpen && (
          <>
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss */}
            <div
              className="fixed inset-0 z-[190]"
              style={{ background: "rgba(0,0,0,0.5)" }}
              onClick={(e) => {
                e.stopPropagation();
                setShareSheetOpen(false);
              }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 z-[200] rounded-t-2xl"
              style={{
                background: "rgba(14,14,14,0.98)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.2)" }}
                />
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <h3
                  className="text-white font-bold text-base"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  Share
                </h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShareSheetOpen(false);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                  aria-label="Close share sheet"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="px-4 pb-8 space-y-2">
                {[
                  {
                    icon: <Link size={20} className="text-white" />,
                    label: "Copy Link",
                    sub: "Copy video link to clipboard",
                    action: handleCopyLink,
                    ocid: "profile-player.share_copy_button",
                  },
                  {
                    icon: <Share2 size={20} className="text-white" />,
                    label: "Share to Platforms",
                    sub: "Use device share sheet",
                    action: handleNativeShare,
                    ocid: "profile-player.share_platforms_button",
                  },
                  {
                    icon: <Send size={20} className="text-white" />,
                    label: "Send to Friends",
                    sub: "Share via direct message",
                    action: () => {
                      toast.info("Coming soon!");
                      setShareSheetOpen(false);
                    },
                    ocid: "profile-player.share_friends_button",
                  },
                ].map(({ icon, label, sub, action, ocid }) => (
                  <button
                    key={label}
                    type="button"
                    data-ocid={ocid}
                    onClick={(e) => {
                      e.stopPropagation();
                      void action();
                      if (label !== "Share to Platforms")
                        setShareSheetOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98]"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(255,0,80,0.1)" }}
                    >
                      {icon}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p
                        className="text-white font-semibold text-sm"
                        style={{
                          fontFamily: "'Bricolage Grotesque', sans-serif",
                        }}
                      >
                        {label}
                      </p>
                      <p className="text-white/40 text-xs">{sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── VideoDurationBadge ─────────────────────────────────────────────────────────

export function VideoDurationBadge({ videoUrl }: { videoUrl: string }) {
  const [duration, setDuration] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    function onMeta() {
      if (!el || Number.isNaN(el.duration)) return;
      const totalSec = Math.floor(el.duration);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      setDuration(
        `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
      );
    }

    el.addEventListener("loadedmetadata", onMeta);
    if (el.readyState >= 1) onMeta();
    return () => el.removeEventListener("loadedmetadata", onMeta);
  }, []);

  if (!videoUrl) return null;

  return (
    <>
      {/* Hidden video just for metadata */}
      <video
        ref={videoRef}
        src={videoUrl}
        preload="metadata"
        className="hidden"
        muted
        playsInline
        tabIndex={-1}
        aria-label="Video duration loader"
      />
      {duration && (
        <span
          className="absolute bottom-1 right-1 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-sm pointer-events-none"
          style={{ background: "rgba(0,0,0,0.65)" }}
        >
          {duration}
        </span>
      )}
    </>
  );
}

// ── ProfileVideoPlayer ────────────────────────────────────────────────────────

export function ProfileVideoPlayer({
  videos,
  initialIndex,
  onClose,
  isAuthenticated,
  onNavigateToProfile,
}: ProfileVideoPlayerProps) {
  const { actor } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, Math.min(initialIndex, videos.length - 1)),
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const swipedRef = useRef(false);

  // Auto-hide swipe hint after 3 seconds
  useEffect(() => {
    if (!showSwipeHint) return;
    const timer = setTimeout(() => setShowSwipeHint(false), 3000);
    return () => clearTimeout(timer);
  }, [showSwipeHint]);

  // Increment view count when a video becomes active
  useEffect(() => {
    const video = videos[currentIndex];
    if (!video || !actor || !isAuthenticated) return;
    void actor.incrementViewCount(video.id).catch(() => {});
  }, [currentIndex, videos, actor, isAuthenticated]);

  const goToIndex = useCallback(
    (newIndex: number) => {
      if (isTransitioning) return;
      if (newIndex < 0 || newIndex >= videos.length) return;

      setIsTransitioning(true);
      setCurrentIndex(newIndex);
      setTimeout(() => setIsTransitioning(false), 350);
    },
    [isTransitioning, videos.length],
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // If a button was the target, skip
    if ((e.target as HTMLElement).closest("button")) return;
    touchStartY.current = e.touches[0]?.clientY ?? null;
    touchStartTime.current = Date.now();
    swipedRef.current = false;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current === null) return;
      if ((e.target as HTMLElement).closest("button")) return;

      const deltaY = touchStartY.current - (e.changedTouches[0]?.clientY ?? 0);
      const elapsed = Date.now() - touchStartTime.current;

      const isFastSwipe = elapsed < 200 && Math.abs(deltaY) > 25;
      const isSignificantSwipe = Math.abs(deltaY) > 60;

      if (isFastSwipe || isSignificantSwipe) {
        swipedRef.current = true;
        // Hide hint as soon as user swipes
        setShowSwipeHint(false);
        if (deltaY > 0) {
          goToIndex(currentIndex + 1);
        } else {
          goToIndex(currentIndex - 1);
        }
      }

      touchStartY.current = null;
    },
    [currentIndex, goToIndex],
  );

  const currentVideo = videos[currentIndex];
  if (!currentVideo) return null;

  return (
    <motion.div
      data-ocid="profile-player.canvas_target"
      className="fixed inset-0 z-50 bg-black"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Close button ──────────────────────────────────────────────────── */}
      <button
        type="button"
        data-ocid="profile-player.close_button"
        onClick={onClose}
        className="absolute top-12 left-4 z-[60] w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
        aria-label="Close player"
      >
        <X size={20} className="text-white" />
      </button>

      {/* ── Progress dots ─────────────────────────────────────────────────── */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-[60] pointer-events-none">
        <ProgressDots total={videos.length} current={currentIndex} />
      </div>

      {/* ── Video panel with fade transition ─────────────────────────────── */}
      <div
        className="w-full h-full transition-opacity duration-300"
        style={{ opacity: isTransitioning ? 0 : 1 }}
      >
        <VideoPanel
          key={currentVideo.id.toString()}
          video={currentVideo}
          isAuthenticated={isAuthenticated}
          isMuted={isMuted}
          onMuteChange={setIsMuted}
          onNavigateToProfile={onNavigateToProfile}
        />
      </div>

      {/* ── Swipe hint indicator ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showSwipeHint && currentIndex < videos.length - 1 && (
          <motion.div
            data-ocid="profile-player.swipe_hint"
            className="absolute bottom-20 left-0 right-0 flex flex-col items-center gap-1 pointer-events-none z-[55]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 1.1,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
              className="flex flex-col items-center gap-1"
            >
              <ChevronUp size={22} className="text-white/70" />
              <span
                className="text-white/60 text-xs font-medium px-3 py-1 rounded-full"
                style={{
                  background: "rgba(0,0,0,0.45)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                }}
              >
                Swipe up for next
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
