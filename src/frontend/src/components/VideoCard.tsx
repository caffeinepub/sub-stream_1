import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  CornerDownRight,
  Gift,
  Heart,
  Link,
  MessageCircle,
  Music2,
  Play,
  Send,
  Share2,
  Smile,
  Sparkles,
  Star,
  UserCheck,
  Volume2,
  VolumeX,
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
import type { Comment, Video, VideoInteractionState } from "../backend.d";
import { useAuth } from "../context/AuthContext";
import { useVideoAspectRatio } from "../hooks/useVideoAspectRatio";
import { getDisplayName, getUsername } from "../lib/userFormat";
import { getDistributionStage } from "../utils/recommendationEngine";
import { OnlineDot } from "./OnlineDot";

// Gradient palette for video placeholders
const GRADIENTS = [
  { from: "from-rose-900", to: "to-pink-800" },
  { from: "from-violet-900", to: "to-purple-800" },
  { from: "from-blue-900", to: "to-indigo-900" },
  { from: "from-emerald-900", to: "to-teal-900" },
  { from: "from-amber-900", to: "to-orange-900" },
  { from: "from-cyan-900", to: "to-blue-900" },
];

function getGradient(id: bigint) {
  const idx = Number(id % BigInt(GRADIENTS.length));
  return GRADIENTS[idx]!;
}

function formatCount(n: bigint | number): string {
  const num = typeof n === "bigint" ? Number(n) : n;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

function formatRelativeTime(nsBigInt: bigint): string {
  const ms = Number(nsBigInt / BigInt(1_000_000));
  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if (diffSec < 60) return `${diffSec}s`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  return `${Math.floor(diffSec / 86400)}d`;
}

interface HeartBurst {
  id: number;
  x: number;
  y: number;
}

interface VideoCardProps {
  video: Video;
  isAuthenticated?: boolean;
  onNavigateToProfile?: (principal: string) => void;
  isMuted: boolean;
  onMuteChange: (muted: boolean) => void;
  /** Called when a like action occurs — passes video hashtags for interest tracking */
  onLike?: (hashtags: string[]) => void;
  /** Called when the comment panel opens/closes so the parent can hide BottomNav */
  onCommentPanelChange?: (open: boolean) => void;
}

// ─── Gift catalog ─────────────────────────────────────────────────────────────
const GIFTS = [
  { id: "rose", emoji: "🌹", name: "Rose", coins: 1 },
  { id: "heart", emoji: "❤️", name: "Heart", coins: 1 },
  { id: "fire", emoji: "🔥", name: "Fire", coins: 5 },
  { id: "star", emoji: "⭐", name: "Star", coins: 5 },
  { id: "diamond", emoji: "💎", name: "Diamond", coins: 30 },
  { id: "crown", emoji: "👑", name: "Crown", coins: 99 },
  { id: "rocket", emoji: "🚀", name: "Rocket", coins: 199 },
  { id: "lion", emoji: "🦁", name: "Lion", coins: 499 },
  { id: "phoenix", emoji: "🦅", name: "Phoenix", coins: 999 },
] as const;

// ─── Emoji picker data ────────────────────────────────────────────────────────
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

// ─── Sticker data ─────────────────────────────────────────────────────────────
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

export function VideoCard({
  video,
  isAuthenticated = false,
  onNavigateToProfile,
  isMuted,
  onMuteChange,
  onLike,
  onCommentPanelChange,
}: VideoCardProps) {
  const { actor, userProfile } = useAuth();
  const queryClient = useQueryClient();
  const [heartBursts, setHeartBursts] = useState<HeartBurst[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [commentPanelOpen, setCommentPanelOpen] = useState(false);
  const [giftPanelOpen, setGiftPanelOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [stickerPanelOpen, setStickerPanelOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const commentScrollRef = useRef<HTMLDivElement>(null);
  // Reply state
  const [replyingTo, setReplyingTo] = useState<{
    id: bigint;
    username: string;
  } | null>(null);
  // Locally tracked liked comment IDs (session only)
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(
    new Set(),
  );
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Swipe-to-close motion value for the comment panel
  const panelY = useMotionValue(0);
  const panelOpacity = useTransform(panelY, [0, 200], [1, 0]);
  const swipeStartY = useRef<number | null>(null);

  // Notify parent when panel opens/closes
  // biome-ignore lint/correctness/useExhaustiveDependencies: onCommentPanelChange is a callback ref — adding it would cause infinite loops
  useEffect(() => {
    onCommentPanelChange?.(commentPanelOpen);
  }, [commentPanelOpen]);

  // Refs for tap detection
  const lastTapRef = useRef<number>(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether the most recent gesture originated from a touch event,
  // so the trailing synthetic onClick can be suppressed (avoids double-fire).
  const isTouchGestureRef = useRef(false);
  const burstIdRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { aspectClass } = useVideoAspectRatio(videoRef);
  const gradient = getGradient(video.id);
  const creatorPrincipalStr = video.creator.toString();

  // ─── Caller principal (for scoping query keys) ───────────────────────────
  const callerPrincipal = userProfile?.email ?? "anon";

  // ─── Video interaction state (real backend) ──────────────────────────────
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

  // Derive display values from real backend state; fall back to video counts
  const liked = interactionState?.liked ?? false;
  const bookmarked = interactionState?.bookmarked ?? false;
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

  // ─── Real comments ───────────────────────────────────────────────────────
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

  // Auto-scroll to newest comments when panel opens or new comment arrives
  // biome-ignore lint/correctness/useExhaustiveDependencies: commentScrollRef is a stable ref
  useEffect(() => {
    if (commentPanelOpen && commentScrollRef.current) {
      const el = commentScrollRef.current;
      setTimeout(() => {
        el.scrollTop = el.scrollHeight;
      }, 80);
    }
  }, [commentPanelOpen, realComments.length]);

  // ─── Creator info ────────────────────────────────────────────────────────
  const { data: creatorUser } = useQuery({
    queryKey: ["user", creatorPrincipalStr],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getUser(video.creator);
    },
    enabled: !!actor,
    staleTime: 120_000,
  });

  const { data: isFollowingCreator = false } = useQuery({
    queryKey: ["isFollowing", creatorPrincipalStr],
    queryFn: async () => {
      if (!actor || !isAuthenticated) return false;
      return actor.isFollowing(video.creator);
    },
    enabled: !!actor && isAuthenticated,
    staleTime: 30_000,
  });

  const isOwnVideo =
    creatorUser && userProfile
      ? creatorUser.name === userProfile.name &&
        creatorUser.email === userProfile.email
      : false;

  const displayName = creatorUser
    ? getDisplayName(creatorUser.name) ||
      getUsername(creatorUser.name) ||
      creatorPrincipalStr.split("-")[0] ||
      "USER"
    : creatorPrincipalStr.split("-")[0] || "USER";
  const username = creatorUser ? getUsername(creatorUser.name) : "";
  const avatarUrl = creatorUser?.avatarUrl ?? "";
  const isOnline = creatorUser?.isOnline ?? false;
  const initials = avatarUrl ? "" : displayName.slice(0, 2).toUpperCase();

  // ─── Mutations ───────────────────────────────────────────────────────────

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      if (isFollowingCreator) {
        await actor.unfollow(video.creator);
      } else {
        await actor.follow(video.creator);
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ["isFollowing", creatorPrincipalStr],
      });
      queryClient.setQueryData(
        ["isFollowing", creatorPrincipalStr],
        !isFollowingCreator,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["isFollowing", creatorPrincipalStr],
      });
      void queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      toast.success(isFollowingCreator ? "Unfollowed" : "Following!");
    },
    onError: () => {
      queryClient.setQueryData(
        ["isFollowing", creatorPrincipalStr],
        isFollowingCreator,
      );
      toast.error("Failed to update follow status");
    },
  });

  // Like toggle mutation (right-side button) — full toggle with optimistic update
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

  // Bookmark toggle mutation with optimistic update
  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return actor.toggleBookmarkVideo(video.id);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: interactionQueryKey });
      const prev = queryClient.getQueryData(interactionQueryKey);
      queryClient.setQueryData(
        interactionQueryKey,
        (old: VideoInteractionState | null | undefined) => {
          if (!old) return old;
          return { ...old, bookmarked: !old.bookmarked };
        },
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(interactionQueryKey, ctx.prev);
      }
      toast.error("Failed to update bookmark");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: interactionQueryKey });
    },
  });

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Log in to follow creators");
      return;
    }
    followMutation.mutate();
  };

  const handleCreatorTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigateToProfile?.(creatorPrincipalStr);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Log in to like videos");
      return;
    }
    onLike?.(video.hashtags);
    likeMutation.mutate();
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Log in to bookmark videos");
      return;
    }
    bookmarkMutation.mutate();
  };

  // Trigger heart burst animation + like-only action (double-tap: never unlike)
  const triggerLike = useCallback(
    (x: number, y: number) => {
      const id = burstIdRef.current++;
      setHeartBursts((prev) => [...prev, { id, x, y }]);
      setTimeout(() => {
        setHeartBursts((prev) => prev.filter((h) => h.id !== id));
      }, 700);

      // Only like if not already liked; double-tap should never unlike
      if (!liked && isAuthenticated && actor) {
        onLike?.(video.hashtags);
        // Optimistic UI
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
            // If backend says not liked (shouldn't happen), sync back
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
    // biome-ignore lint/correctness/useExhaustiveDependencies: onLike and video.hashtags are stable per render; adding them would cause unnecessary re-creation
    [
      liked,
      isAuthenticated,
      actor,
      video.id,
      video.hashtags,
      onLike,
      queryClient,
      interactionQueryKey,
    ],
  );

  // ─── Core gesture logic ──────────────────────────────────────────────────
  // Called once per physical tap, regardless of whether it came from touch or mouse.
  const processTap = useCallback(
    (clientX: number, clientY: number) => {
      const now = Date.now();
      const timeDiff = now - lastTapRef.current;

      if (timeDiff < 300 && timeDiff > 0 && tapTimerRef.current) {
        // ── Double tap ──
        // Cancel the pending single-tap action so play/pause never fires.
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
        lastTapRef.current = 0;
        triggerLike(clientX, clientY);
      } else {
        // ── Potential single tap — wait 300ms to confirm no second tap follows ──
        lastTapRef.current = now;
        tapTimerRef.current = setTimeout(() => {
          tapTimerRef.current = null;
          // Single tap confirmed: toggle play/pause only
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

  // Touch path — fires on touchend; marks isTouchGestureRef so onClick is skipped.
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("button")) return;
      isTouchGestureRef.current = true;
      // Reset the flag after the synthetic click delay (~300ms) has passed.
      setTimeout(() => {
        isTouchGestureRef.current = false;
      }, 600);
      const touch = e.changedTouches[0];
      if (touch) processTap(touch.clientX, touch.clientY);
    },
    [processTap],
  );

  // Mouse path — only fires when the gesture was NOT from touch.
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("button")) return;
      // Suppress the synthetic click that browsers emit after touchend.
      if (isTouchGestureRef.current) return;
      processTap(e.clientX, e.clientY);
    },
    [processTap],
  );

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuted = !isMuted;
    onMuteChange(newMuted);
    if (videoRef.current) {
      videoRef.current.muted = newMuted;
    }
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
      // Scroll to bottom after posting
      setTimeout(() => {
        if (commentScrollRef.current) {
          commentScrollRef.current.scrollTop =
            commentScrollRef.current.scrollHeight;
        }
      }, 150);
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
    // Optimistic UI
    setLikedCommentIds((prev) => {
      const next = new Set(prev);
      if (isLiked) {
        next.delete(idStr);
      } else {
        next.add(idStr);
      }
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
      // Rollback
      setLikedCommentIds((prev) => {
        const next = new Set(prev);
        if (isLiked) {
          next.add(idStr);
        } else {
          next.delete(idStr);
        }
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

  const handleSendGift = (gift: (typeof GIFTS)[number]) => {
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
    toast.success(`${gift.emoji} Gift sent!`);
    setGiftPanelOpen(false);
  };

  const handleSendSticker = async (sticker: string) => {
    if (!isAuthenticated || !actor) {
      toast.error("Log in to send stickers");
      return;
    }
    setStickerPanelOpen(false);
    try {
      await actor.addComment(video.id, sticker, null);
      await queryClient.invalidateQueries({ queryKey: commentsQueryKey });
      await queryClient.invalidateQueries({ queryKey: interactionQueryKey });
      setTimeout(() => {
        if (commentScrollRef.current) {
          commentScrollRef.current.scrollTop =
            commentScrollRef.current.scrollHeight;
        }
      }, 150);
    } catch {
      toast.error("Failed to send sticker");
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/video/${video.id.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
      // Fire-and-forget share record
      if (actor && isAuthenticated) {
        void actor.recordShare(video.id);
        // Optimistically bump share count
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

  return (
    <div
      data-ocid="video.canvas_target"
      className="relative w-full h-full overflow-hidden select-none bg-black"
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (videoRef.current) {
            if (videoRef.current.paused) {
              videoRef.current.play().catch(() => {});
              setIsPlaying(true);
            } else {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        }
      }}
      role="presentation"
    >
      {/* Video or gradient background */}
      {video.videoUrl ? (
        <video
          ref={videoRef}
          src={video.videoUrl}
          className="absolute inset-0 w-full h-full object-contain"
          autoPlay
          loop
          muted={isMuted}
          playsInline
          poster={video.thumbnailUrl || undefined}
          onCanPlay={() => {
            if (videoRef.current) {
              videoRef.current.play().catch(() => {
                // Autoplay blocked — fall back to muted
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
        <div
          className={`absolute inset-0 bg-gradient-to-b ${gradient.from} ${gradient.to}`}
        />
      )}

      {/* Subtle vignette patterns */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl bg-white/5" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full blur-2xl bg-white/5" />
      </div>

      {/* Bottom dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />

      {/* Top gradient for nav readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent pointer-events-none" />

      {/* Heart burst animations */}
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

      {/* Play indicator — shown when video is paused */}
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
              <Play size={28} className="text-white" fill="white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Aspect ratio debug hint — only for non-vertical so user understands black bars */}
      {aspectClass === "horizontal" && video.videoUrl && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <span
            className="text-[10px] text-white/30 px-2 py-0.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.3)" }}
          >
            16:9
          </span>
        </div>
      )}

      {/* Mute toggle — bottom left, above creator info */}
      <div className="absolute bottom-36 left-4 z-10">
        <button
          type="button"
          data-ocid="video.mute_toggle"
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

      {/* Creator info — bottom left */}
      <div className="absolute bottom-24 left-4 right-20 z-10">
        {/* Clickable creator name */}
        <button
          type="button"
          onClick={handleCreatorTap}
          className="text-left mb-1 focus-visible:outline-none"
          data-ocid="video.creator_link"
        >
          <p className="text-white font-bold text-base hover:text-white/80 transition-colors">
            {username ? `@${username}` : `@${displayName.toLowerCase()}`}
          </p>
        </button>
        <p className="text-white/90 text-sm leading-snug mb-2 line-clamp-2 pointer-events-none">
          {video.caption || video.title}
        </p>
        <div className="flex flex-wrap gap-1 mb-2 pointer-events-none">
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
        <div className="flex items-center gap-2 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <Music2 size={12} className="text-white/70 flex-shrink-0" />
            <p className="text-white/70 text-xs truncate">Original audio</p>
          </div>
          {/* Distribution stage badge */}
          {getDistributionStage(video) === 4 && (
            <span
              className="px-1.5 py-0.5 rounded-full text-white font-black uppercase"
              style={{
                background: "#ff0050",
                fontSize: 8,
                letterSpacing: "0.05em",
              }}
            >
              VIRAL
            </span>
          )}
          {getDistributionStage(video) === 3 && (
            <span className="text-xs">🔥</span>
          )}
        </div>
      </div>

      {/* Right side icon stack */}
      <div className="absolute bottom-28 right-3 z-10 flex flex-col items-center gap-5">
        {/* Like */}
        <button
          type="button"
          data-ocid="video.like_button"
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
          data-ocid="video.comment_button"
          className="flex flex-col items-center gap-1 group"
          aria-label="Comment"
          onClick={(e) => {
            e.stopPropagation();
            setCommentPanelOpen(true);
          }}
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
          data-ocid="video.share_button"
          className="flex flex-col items-center gap-1 group"
          aria-label="Share"
          onClick={(e) => {
            e.stopPropagation();
            setShareSheetOpen(true);
          }}
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

        {/* Bookmark */}
        <button
          type="button"
          data-ocid="video.bookmark_button"
          className="flex flex-col items-center gap-1 group"
          aria-label="Bookmark"
          onClick={handleBookmark}
        >
          <div className="w-11 h-11 flex items-center justify-center">
            <Bookmark
              size={26}
              strokeWidth={2}
              fill={bookmarked ? "#ff0050" : "none"}
              stroke={bookmarked ? "#ff0050" : "white"}
              className="transition-all duration-150 group-active:scale-125"
            />
          </div>
          <span
            className="text-xs font-medium"
            style={{ color: bookmarked ? "#ff0050" : "white" }}
          >
            Save
          </span>
        </button>

        {/* Gift */}
        <button
          type="button"
          data-ocid="video.gift_button"
          className="flex flex-col items-center gap-1 group"
          aria-label="Gift"
          onClick={(e) => {
            e.stopPropagation();
            setCommentPanelOpen(true);
            setGiftPanelOpen(true);
          }}
        >
          <div className="w-11 h-11 flex items-center justify-center">
            <Sparkles
              size={26}
              strokeWidth={2}
              stroke="#ff0050"
              className="transition-all duration-150 group-active:scale-125"
            />
          </div>
          <span className="text-xs font-medium" style={{ color: "#ff0050" }}>
            Gift
          </span>
        </button>

        {/* Creator profile circle */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            data-ocid="video.creator_avatar"
            onClick={handleCreatorTap}
            className="relative w-12 h-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-full"
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
            {/* Online dot */}
            <OnlineDot isOnline={isOnline} size={10} />
          </button>

          {/* Follow button — only show if not own video */}
          {!isOwnVideo && isAuthenticated && (
            <button
              type="button"
              data-ocid="video.follow_button"
              onClick={handleFollow}
              disabled={followMutation.isPending}
              className="px-2 py-0.5 rounded-full text-[10px] font-bold transition-all mt-0.5"
              style={
                isFollowingCreator
                  ? {
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.4)",
                      color: "rgba(255,255,255,0.7)",
                    }
                  : {
                      background:
                        "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
                      border: "none",
                      color: "white",
                      boxShadow: "0 2px 8px rgba(255,0,80,0.4)",
                    }
              }
              aria-label={isFollowingCreator ? "Unfollow" : "Follow"}
            >
              {followMutation.isPending ? (
                <span className="flex items-center gap-0.5">
                  <span className="w-2 h-2 rounded-full animate-pulse bg-white/60" />
                </span>
              ) : isFollowingCreator ? (
                <span className="flex items-center gap-0.5">
                  <UserCheck size={9} />
                </span>
              ) : (
                "+"
              )}
            </button>
          )}

          {/* Plus badge for unauthenticated */}
          {!isAuthenticated && (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold -mt-3 relative z-10"
              style={{ background: "#ff0050" }}
            >
              +
            </div>
          )}
        </div>
      </div>

      {/* Comment panel bottom sheet */}
      <AnimatePresence>
        {commentPanelOpen && (
          <>
            {/* Backdrop */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss */}
            <div
              className="fixed inset-0 z-[190]"
              style={{
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setCommentPanelOpen(false);
                setGiftPanelOpen(false);
                setEmojiPickerOpen(false);
                setStickerPanelOpen(false);
              }}
            />
            <motion.div
              data-ocid="video.comment_panel"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 z-[200] rounded-t-3xl flex flex-col"
              onTouchStart={(e) => {
                // Only initiate swipe from the drag handle / header area
                const target = e.target as HTMLElement;
                if (target.closest("[data-drag-handle]")) {
                  swipeStartY.current = e.touches[0]?.clientY ?? null;
                }
              }}
              onTouchMove={(e) => {
                if (swipeStartY.current === null) return;
                const currentY = e.touches[0]?.clientY ?? 0;
                const delta = currentY - swipeStartY.current;
                if (delta > 0) {
                  panelY.set(delta);
                }
              }}
              onTouchEnd={(e) => {
                if (swipeStartY.current === null) return;
                const currentY = e.changedTouches[0]?.clientY ?? 0;
                const delta = currentY - swipeStartY.current;
                swipeStartY.current = null;
                if (delta > 80) {
                  panelY.set(0);
                  setCommentPanelOpen(false);
                  setGiftPanelOpen(false);
                  setEmojiPickerOpen(false);
                  setStickerPanelOpen(false);
                } else {
                  panelY.set(0);
                }
              }}
              style={{
                background: "rgba(10,10,10,0.97)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderBottom: "none",
                height: "85vh",
                y: panelY,
                opacity: panelOpacity,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle — initiates swipe-to-close */}
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
                    {realComments.length > 0 ? realComments.length : ""}
                  </span>
                </h3>
                <button
                  type="button"
                  data-ocid="video.comment_panel_close_button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCommentPanelOpen(false);
                    setGiftPanelOpen(false);
                    setEmojiPickerOpen(false);
                    setStickerPanelOpen(false);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                  aria-label="Close comments"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Comments list — newest at bottom, oldest at top */}
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation wrapper only */}
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
                    data-ocid="video.comments_loading_state"
                    className="flex flex-col items-center justify-center py-12 gap-3"
                  >
                    <div
                      className="w-8 h-8 rounded-full animate-pulse"
                      style={{ background: "rgba(255,0,80,0.3)" }}
                    />
                    <p className="text-white/40 text-sm">Loading comments…</p>
                  </div>
                ) : realComments.length === 0 ? (
                  <div
                    data-ocid="video.comments_empty_state"
                    className="flex flex-col items-center justify-center py-16 gap-3"
                  >
                    <MessageCircle size={40} className="text-white/15" />
                    <p className="text-white/40 text-sm text-center">
                      No comments yet.{"\n"}Be the first to say something!
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5 pt-2 pb-4">
                    {/* Oldest first so newest appear at bottom */}
                    {[...realComments]
                      .sort((a, b) => Number(a.createdAt - b.createdAt))
                      .map((comment, idx) => (
                        <CommentItem
                          key={comment.id.toString()}
                          comment={comment}
                          idx={idx}
                          scope="video"
                          isLiked={likedCommentIds.has(comment.id.toString())}
                          onLike={() => void handleLikeComment(comment)}
                          onReply={(username) => handleReply(comment, username)}
                          onNavigateToProfile={onNavigateToProfile}
                        />
                      ))}
                  </div>
                )}
              </div>

              {/* Gift panel sub-sheet */}
              <AnimatePresence>
                {giftPanelOpen && (
                  <motion.div
                    data-ocid="video.gift_panel"
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute bottom-0 left-0 right-0 rounded-t-3xl flex flex-col z-10"
                    style={{
                      background: "rgba(18,18,18,0.99)",
                      backdropFilter: "blur(24px)",
                      WebkitBackdropFilter: "blur(24px)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderBottom: "none",
                      maxHeight: "70%",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Gift panel header */}
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
                        <span className="text-white/40 text-xs">
                          🪙{" "}
                          {(userProfile as { coinBalance?: number })
                            ?.coinBalance ?? 0}{" "}
                          coins
                        </span>
                        <button
                          type="button"
                          data-ocid="video.gift_panel_close_button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setGiftPanelOpen(false);
                          }}
                          className="w-7 h-7 rounded-full flex items-center justify-center"
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
                            data-ocid={`video.gift.${gift.id}_button`}
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
                              style={{ color: "#ff0050" }}
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

              {/* Emoji picker sub-panel */}
              <AnimatePresence>
                {emojiPickerOpen && !giftPanelOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 pt-3 pb-2 flex-shrink-0"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-10 gap-1">
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
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sticker panel sub-panel */}
              <AnimatePresence>
                {stickerPanelOpen && !giftPanelOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 pt-3 pb-2 flex-shrink-0"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-white/40 text-[10px] mb-2 uppercase tracking-wider font-semibold">
                      Stickers
                    </p>
                    <div className="grid grid-cols-6 gap-2">
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
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reply chip */}
              <AnimatePresence>
                {replyingTo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 px-5 py-2 flex-shrink-0"
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
                      data-ocid="video.reply_to_clear_button"
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

              {/* Gift row — above input bar */}
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation wrapper only */}
              <div
                className="flex items-center gap-2 px-5 py-2 flex-shrink-0"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  data-ocid="video.comment_gift_button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setGiftPanelOpen((prev) => !prev);
                    setEmojiPickerOpen(false);
                    setStickerPanelOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background: giftPanelOpen
                      ? "rgba(255,0,80,0.2)"
                      : "rgba(255,255,255,0.07)",
                    border: `1px solid ${giftPanelOpen ? "rgba(255,0,80,0.4)" : "rgba(255,255,255,0.1)"}`,
                    color: giftPanelOpen ? "#ff0050" : "rgba(255,255,255,0.7)",
                  }}
                  aria-label="Send a gift"
                >
                  <Gift size={13} />
                  Gift
                </button>
              </div>

              {/* Input bar */}
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation wrapper only */}
              <div
                className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(0,0,0,0.5)",
                  paddingBottom:
                    "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Emoji button */}
                <button
                  type="button"
                  data-ocid="video.comment_emoji_button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEmojiPickerOpen((prev) => !prev);
                    setStickerPanelOpen(false);
                    setGiftPanelOpen(false);
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 transition-all active:scale-90"
                  style={{
                    background: emojiPickerOpen
                      ? "rgba(255,0,80,0.15)"
                      : "rgba(255,255,255,0.07)",
                  }}
                  aria-label="Emoji picker"
                >
                  <Smile
                    size={18}
                    style={{
                      color: emojiPickerOpen
                        ? "#ff0050"
                        : "rgba(255,255,255,0.6)",
                    }}
                  />
                </button>

                {/* Sticker button */}
                <button
                  type="button"
                  data-ocid="video.comment_sticker_button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStickerPanelOpen((prev) => !prev);
                    setEmojiPickerOpen(false);
                    setGiftPanelOpen(false);
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 transition-all active:scale-90"
                  style={{
                    background: stickerPanelOpen
                      ? "rgba(255,0,80,0.15)"
                      : "rgba(255,255,255,0.07)",
                  }}
                  aria-label="Sticker picker"
                >
                  <Star
                    size={18}
                    style={{
                      color: stickerPanelOpen
                        ? "#ff0050"
                        : "rgba(255,255,255,0.6)",
                    }}
                  />
                </button>

                {/* Text input */}
                <input
                  ref={commentInputRef}
                  type="text"
                  data-ocid="video.comment_input"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSendComment();
                  }}
                  onFocus={() => {
                    setEmojiPickerOpen(false);
                    setStickerPanelOpen(false);
                  }}
                  placeholder={
                    replyingTo
                      ? `Reply to @${replyingTo.username}…`
                      : "Add a comment…"
                  }
                  className="flex-1 px-4 py-2.5 rounded-full text-white text-sm placeholder:text-white/30 outline-none"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    caretColor: "#ff0050",
                    fontSize: "16px",
                  }}
                />

                {/* Send button */}
                <button
                  type="button"
                  data-ocid="video.comment_submit_button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleSendComment();
                  }}
                  disabled={!commentText.trim()}
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-35 transition-all active:scale-90"
                  style={{
                    background: commentText.trim()
                      ? "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)"
                      : "rgba(255,255,255,0.08)",
                    boxShadow: commentText.trim()
                      ? "0 2px 12px rgba(255,0,80,0.4)"
                      : "none",
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

      {/* Share sheet */}
      <AnimatePresence>
        {shareSheetOpen && (
          <>
            {/* Backdrop */}
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
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.2)" }}
                />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3">
                <h3
                  className="text-white font-bold text-base"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  Share
                </h3>
                <button
                  type="button"
                  data-ocid="video.share_sheet_close_button"
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

              {/* Options */}
              <div className="px-4 pb-8 space-y-2">
                {[
                  {
                    icon: <Link size={20} className="text-white" />,
                    label: "Copy Link",
                    sub: "Copy video link to clipboard",
                    action: handleCopyLink,
                    ocid: "video.share_copy_button",
                  },
                  {
                    icon: <Share2 size={20} className="text-white" />,
                    label: "Share to Platforms",
                    sub: "Use device share sheet",
                    action: handleNativeShare,
                    ocid: "video.share_platforms_button",
                  },
                  {
                    icon: <Send size={20} className="text-white" />,
                    label: "Send to Friends",
                    sub: "Share via direct message",
                    action: () => {
                      toast.info("Coming soon!");
                      setShareSheetOpen(false);
                    },
                    ocid: "video.share_friends_button",
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

// ── CommentItem: shared comment row with real user profile ────────────────────

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
  const totalLikes = isLiked
    ? Number(comment.likeCount) + (isLiked ? 0 : 0) // already accounted for
    : Number(comment.likeCount);

  return (
    <div
      data-ocid={`${scope}.comment.item.${idx + 1}`}
      className="flex items-start gap-3"
    >
      {/* Avatar — tappable */}
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
        <p className="text-white/80 text-sm leading-snug">{comment.text}</p>
        {/* Reply button */}
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

      {/* Like button */}
      <button
        type="button"
        data-ocid={`${scope}.comment.like_button.${idx + 1}`}
        onClick={onLike}
        className="flex-shrink-0 flex flex-col items-center gap-0.5"
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
