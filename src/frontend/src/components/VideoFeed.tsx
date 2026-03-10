import { useQuery } from "@tanstack/react-query";
import { Flame, Play, TrendingUp, UserPlus, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Story, User, Video } from "../backend.d";
import { useAuth } from "../context/AuthContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { getDisplayName, getUsername } from "../lib/userFormat";
import { StoryCreatorPage } from "../pages/StoryCreatorPage";
import { StoryViewerPage, type StoryWithUser } from "../pages/StoryViewerPage";
import {
  getDistributionStage,
  getTrendingVideos,
  rankFollowingFeed,
  rankVideosForUser,
  updateUserInterests,
} from "../utils/recommendationEngine";
import { EmptyFeedState } from "./EmptyFeedState";
import { FollowingLiveRow } from "./FollowingLiveRow";
import { StoryRing } from "./StoryRing";
import type { TopNavTab } from "./TopNav";
import { VideoCard } from "./VideoCard";

interface VideoFeedProps {
  onOpenCreate?: () => void;
  onNavigateToProfile?: (principal: string) => void;
  onJoinLiveStream?: (principalStr: string, displayName: string) => void;
  feedTab?: TopNavTab;
  onCommentPanelChange?: (open: boolean) => void;
}

interface StoryUserEntry {
  principal: string;
  stories: Story[];
  user: User | null;
}

// ─── Explore Grid Card ────────────────────────────────────────────────────────

function ExploreVideoCard({
  video,
  onPlay,
  index,
}: {
  video: Video;
  onPlay: () => void;
  index: number;
}) {
  const stage = getDistributionStage(video);
  const views = Number(video.viewCount);

  function formatCount(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }

  // Gradient palette matching VideoCard
  const GRADIENTS = [
    "from-rose-900 to-pink-800",
    "from-violet-900 to-purple-800",
    "from-blue-900 to-indigo-900",
    "from-emerald-900 to-teal-900",
    "from-amber-900 to-orange-900",
    "from-cyan-900 to-blue-900",
  ];
  const gradientClass =
    GRADIENTS[Number(video.id % BigInt(GRADIENTS.length))] ?? GRADIENTS[0];

  return (
    <motion.button
      type="button"
      data-ocid={`explore.video.item.${index}`}
      onClick={onPlay}
      className="relative aspect-[9/16] rounded-xl overflow-hidden w-full group active:scale-95 transition-transform"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      {video.thumbnailUrl ? (
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className={`w-full h-full bg-gradient-to-b ${gradientClass}`} />
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

      {/* Play icon on hover/focus */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <Play size={18} fill="white" stroke="none" />
        </div>
      </div>

      {/* Stage badge */}
      {stage >= 3 && (
        <div className="absolute top-1.5 left-1.5 z-10">
          {stage === 4 ? (
            <span
              className="px-1.5 py-0.5 rounded-md text-[9px] font-black text-white uppercase tracking-wide"
              style={{ background: "#ff0050", fontSize: 9 }}
            >
              VIRAL
            </span>
          ) : (
            <span className="text-sm">🔥</span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10 flex items-center justify-between">
        <span
          className="text-white/80 text-[10px] font-medium"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          {formatCount(views)} views
        </span>
      </div>
    </motion.button>
  );
}

// ─── Empty Following State ────────────────────────────────────────────────────

function FollowingEmptyState({
  onExplore,
}: {
  onExplore: () => void;
}) {
  return (
    <div
      data-ocid="feed.following_empty_state"
      className="w-full h-screen flex flex-col items-center justify-center bg-black px-8 text-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-5"
      >
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{
            background: "rgba(255,0,80,0.1)",
            border: "1px solid rgba(255,0,80,0.25)",
          }}
        >
          <Users size={32} style={{ color: "#ff0050" }} strokeWidth={1.5} />
        </div>
        <div>
          <h3
            className="text-white font-bold text-xl mb-2"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            No videos yet
          </h3>
          <p className="text-white/50 text-sm leading-relaxed">
            Follow creators to see their videos here
          </p>
        </div>
        <button
          type="button"
          data-ocid="feed.explore_creators_button"
          onClick={onExplore}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-semibold text-sm transition-all active:scale-95"
          style={{
            background: "linear-gradient(135deg, #ff0050, #ff6b35)",
            boxShadow: "0 4px 20px rgba(255,0,80,0.35)",
          }}
        >
          <UserPlus size={16} />
          Explore creators
        </button>
      </motion.div>
    </div>
  );
}

// ─── VideoFeed ─────────────────────────────────────────────────────────────────

export function VideoFeed({
  onOpenCreate,
  onNavigateToProfile,
  onJoinLiveStream,
  feedTab = "For You",
  onCommentPanelChange,
}: VideoFeedProps) {
  const { actor, isAuthenticated, userProfile } = useAuth();
  const { identity } = useInternetIdentity();
  const callerPrincipal = identity?.getPrincipal().toString() ?? "";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Mute state lives here so it persists across swipes
  const [isMuted, setIsMuted] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [viewerStories, setViewerStories] = useState<StoryWithUser[]>([]);
  // Explore mode: when a video is tapped from the grid, enter fullscreen
  const [exploreFullscreenIndex, setExploreFullscreenIndex] = useState<
    number | null
  >(null);
  // Track video entry time for skip/watch detection
  const videoEntryTime = useRef<number>(Date.now());

  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ["allVideos"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllVideos();
    },
    enabled: !!actor,
    staleTime: 0,
  });

  // Following principals for the following feed
  const { data: followingPrincipals = [] } = useQuery<string[]>({
    queryKey: ["followingPrincipals", callerPrincipal],
    queryFn: async () => {
      if (!actor || !callerPrincipal) return [];
      const principals = await actor.getFollowing(identity!.getPrincipal());
      return principals.map((p) => p.toString());
    },
    enabled: !!actor && !!callerPrincipal && feedTab === "Following",
    staleTime: 60_000,
  });

  // Active stories for the stories row
  const { data: activeStories = [] } = useQuery<Story[]>({
    queryKey: ["stories", "active"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActiveStories();
    },
    enabled: !!actor,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  // My stories
  const { data: myStories = [] } = useQuery<Story[]>({
    queryKey: ["stories", "mine"],
    queryFn: async () => {
      if (!actor || !isAuthenticated) return [];
      return actor.getMyStories();
    },
    enabled: !!actor && isAuthenticated,
    staleTime: 60_000,
  });

  // ─── Ranked video lists ──────────────────────────────────────────────────
  const rankedVideos = (() => {
    if (feedTab === "Explore") {
      return getTrendingVideos(videos, 20);
    }
    if (feedTab === "Following") {
      return rankFollowingFeed(videos, followingPrincipals);
    }
    // "For You" and default
    if (callerPrincipal) {
      return rankVideosForUser(videos, callerPrincipal);
    }
    return videos;
  })();

  // Reset index when tab changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: setCurrentIndex and setExploreFullscreenIndex are stable setState setters
  useEffect(() => {
    setCurrentIndex(0);
    setExploreFullscreenIndex(null);
  }, [feedTab]);

  // ─── Engagement tracking ──────────────────────────────────────────────────
  // Track when the current video starts — used to detect skips vs watches
  // biome-ignore lint/correctness/useExhaustiveDependencies: currentIndex is the trigger; videoEntryTime.current is a ref mutation, not state
  useEffect(() => {
    videoEntryTime.current = Date.now();
  }, [currentIndex]);

  // Group active stories by creator principal (excluding own)
  const otherCreatorStories = (() => {
    const map = new Map<string, Story[]>();
    for (const s of activeStories) {
      const key = s.creator.toText();
      const existing = map.get(key) ?? [];
      existing.push(s);
      map.set(key, existing);
    }
    return Array.from(map.entries()).map(([principalStr, stories]) => ({
      principalStr,
      stories,
    }));
  })();

  // Fetch user profiles for story creators
  const { data: storyUsers = [] } = useQuery<StoryUserEntry[]>({
    queryKey: [
      "story-users",
      otherCreatorStories.map((c) => c.principalStr).join(","),
    ],
    queryFn: async () => {
      if (!actor || otherCreatorStories.length === 0) return [];
      const results = await Promise.all(
        otherCreatorStories.map(async ({ principalStr, stories }) => {
          try {
            const principal = stories[0].creator;
            const user = await actor.getUser(principal);
            return { principal: principalStr, stories, user };
          } catch {
            return { principal: principalStr, stories, user: null };
          }
        }),
      );
      return results;
    },
    enabled: !!actor && otherCreatorStories.length > 0,
    staleTime: 120_000,
  });

  function openStoryViewer(entries: StoryUserEntry[]) {
    const flat: StoryWithUser[] = entries.flatMap(({ stories, user }) =>
      stories.map((s) => ({
        ...s,
        userProfile: {
          displayName: user ? getDisplayName(user.name) || "USER" : "USER",
          username: user ? getUsername(user.name) : "",
          avatarUrl: user?.avatarUrl ?? "",
        },
      })),
    );
    if (flat.length > 0) {
      setViewerStories(flat);
      setStoryViewerOpen(true);
    }
  }

  function openOwnStory() {
    if (myStories.length === 0) {
      setStoryCreatorOpen(true);
      return;
    }
    const flat: StoryWithUser[] = myStories.map((s) => ({
      ...s,
      userProfile: {
        displayName: getDisplayName(userProfile?.name || "") || "YOU",
        username: getUsername(userProfile?.name || ""),
        avatarUrl: userProfile?.avatarUrl ?? "",
      },
    }));
    setViewerStories(flat);
    setStoryViewerOpen(true);
  }

  const goToIndex = useCallback(
    (newIndex: number, currentVideos: Video[]) => {
      if (isTransitioning) return;
      if (newIndex < 0 || newIndex >= currentVideos.length) return;

      // Engagement: detect skip (< 1 second) vs watch (> 3 seconds)
      const elapsed = Date.now() - videoEntryTime.current;
      const currentVideo = currentVideos[currentIndex];
      if (currentVideo && callerPrincipal) {
        if (elapsed < 1000) {
          updateUserInterests(callerPrincipal, currentVideo.hashtags, "skip");
        } else if (elapsed > 3000) {
          updateUserInterests(callerPrincipal, currentVideo.hashtags, "watch");
        }
      }

      setIsTransitioning(true);
      setCurrentIndex(newIndex);

      setTimeout(() => {
        setIsTransitioning(false);
      }, 350);
    },
    [isTransitioning, currentIndex, callerPrincipal],
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
    touchStartTime.current = Date.now();
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current === null) return;

      const deltaY = touchStartY.current - (e.changedTouches[0]?.clientY ?? 0);
      const elapsed = Date.now() - touchStartTime.current;

      const isFastSwipe = elapsed < 200 && Math.abs(deltaY) > 25;
      const isSignificantSwipe = Math.abs(deltaY) > 60;

      if (isFastSwipe || isSignificantSwipe) {
        if (deltaY > 0) {
          goToIndex(currentIndex + 1, rankedVideos);
        } else {
          goToIndex(currentIndex - 1, rankedVideos);
        }
      }

      touchStartY.current = null;
    },
    [currentIndex, goToIndex, rankedVideos],
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div
        data-ocid="feed.loading_state"
        className="w-full h-screen relative overflow-hidden bg-black flex items-center justify-center"
      >
        <div
          className="w-16 h-16 rounded-full animate-pulse"
          style={{
            background:
              "radial-gradient(circle, rgba(255,0,80,0.4) 0%, rgba(255,0,80,0.05) 100%)",
          }}
        />
      </div>
    );
  }

  // ─── Explore tab — 2-column grid layout ──────────────────────────────────
  if (feedTab === "Explore" && exploreFullscreenIndex === null) {
    const trendingVideos = rankedVideos;
    return (
      <>
        <div
          data-ocid="explore.section"
          className="w-full h-screen overflow-y-auto bg-black pb-24 no-scrollbar"
          style={{ paddingTop: 100 }}
        >
          {/* Header */}
          <div className="px-4 pb-3 flex items-center gap-2">
            <TrendingUp size={18} style={{ color: "#ff0050" }} />
            <h2
              className="text-white font-bold text-lg"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Trending Now 🔥
            </h2>
          </div>

          {trendingVideos.length === 0 ? (
            <div
              data-ocid="explore.empty_state"
              className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8 gap-4"
            >
              <Flame size={40} className="text-white/20" />
              <p className="text-white/50 text-sm">
                No videos yet — be the first to upload!
              </p>
            </div>
          ) : (
            <div className="px-3 grid grid-cols-2 gap-2">
              {trendingVideos.map((video, i) => (
                <ExploreVideoCard
                  key={video.id.toString()}
                  video={video}
                  index={i + 1}
                  onPlay={() => {
                    setExploreFullscreenIndex(i);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Story overlays */}
        <AnimatePresence>
          {storyCreatorOpen && (
            <StoryCreatorPage
              key="feed-story-creator"
              onClose={() => setStoryCreatorOpen(false)}
              onStoryPosted={() => setStoryCreatorOpen(false)}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {storyViewerOpen && viewerStories.length > 0 && (
            <StoryViewerPage
              key="feed-story-viewer"
              stories={viewerStories}
              initialStoryIndex={0}
              onClose={() => setStoryViewerOpen(false)}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  // ─── Explore fullscreen player ────────────────────────────────────────────
  if (feedTab === "Explore" && exploreFullscreenIndex !== null) {
    const trendingVideos = rankedVideos;
    const currentVideo = trendingVideos[exploreFullscreenIndex];

    return (
      <>
        <div
          data-ocid="explore.fullscreen.canvas_target"
          className="w-full h-screen relative overflow-hidden bg-black"
          onTouchStart={handleTouchStart}
          onTouchEnd={(e) => {
            if (touchStartY.current === null) return;
            const deltaY =
              touchStartY.current - (e.changedTouches[0]?.clientY ?? 0);
            const elapsed = Date.now() - touchStartTime.current;
            const isFast = elapsed < 200 && Math.abs(deltaY) > 25;
            const isBig = Math.abs(deltaY) > 60;
            if (isFast || isBig) {
              const next =
                deltaY > 0
                  ? exploreFullscreenIndex + 1
                  : exploreFullscreenIndex - 1;
              if (next < 0) {
                setExploreFullscreenIndex(null);
              } else if (next >= trendingVideos.length) {
                // Stay at end
              } else {
                setExploreFullscreenIndex(next);
              }
            }
            touchStartY.current = null;
          }}
        >
          {/* Back to grid button */}
          <button
            type="button"
            data-ocid="explore.back_to_grid_button"
            onClick={() => setExploreFullscreenIndex(null)}
            className="absolute top-12 left-4 z-50 w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
            aria-label="Back to explore grid"
          >
            <span className="text-white text-xl">←</span>
          </button>

          {currentVideo && (
            <div
              className="w-full h-full transition-opacity duration-300"
              style={{ opacity: isTransitioning ? 0 : 1 }}
            >
              <VideoCard
                key={currentVideo.id.toString()}
                video={currentVideo}
                isAuthenticated={isAuthenticated}
                onNavigateToProfile={onNavigateToProfile}
                isMuted={isMuted}
                onMuteChange={setIsMuted}
                onCommentPanelChange={onCommentPanelChange}
                onLike={(hashtags) => {
                  if (callerPrincipal) {
                    updateUserInterests(callerPrincipal, hashtags, "like");
                  }
                }}
              />
            </div>
          )}
        </div>
      </>
    );
  }

  // ─── Following tab — empty state ──────────────────────────────────────────
  if (feedTab === "Following" && rankedVideos.length === 0 && !isLoading) {
    return (
      <FollowingEmptyState
        onExplore={() => {
          // The parent will need to handle switching to explore — we just navigate to profile
          onOpenCreate?.();
        }}
      />
    );
  }

  // ─── For You tab — no public videos yet ──────────────────────────────────
  if (feedTab === "For You" && rankedVideos.length === 0 && !isLoading) {
    return (
      <div
        data-ocid="feed.empty_state"
        className="w-full h-screen flex flex-col items-center justify-center bg-black gap-4 px-8"
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          📹
        </div>
        <p
          className="text-white/60 text-base font-semibold text-center"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          No content available yet
        </p>
        <p className="text-white/30 text-sm text-center">
          Be the first to upload a video!
        </p>
      </div>
    );
  }

  // ─── No videos at all ─────────────────────────────────────────────────────
  if (rankedVideos.length === 0) {
    return (
      <div
        data-ocid="feed.canvas_target"
        className="w-full h-screen relative overflow-hidden bg-black"
      >
        <EmptyFeedState onUpload={onOpenCreate ?? (() => {})} />
      </div>
    );
  }

  const currentVideo = rankedVideos[currentIndex];
  const ownAvatarUrl = userProfile?.avatarUrl ?? "";
  const ownDisplayName = getDisplayName(userProfile?.name ?? "") || "YOU";
  const hasOwnStory = myStories.length > 0;

  return (
    <>
      <div
        data-ocid="feed.canvas_target"
        className="w-full h-screen relative overflow-hidden bg-black"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Current video card with fade transition */}
        <div
          className="w-full h-full transition-opacity duration-300"
          style={{ opacity: isTransitioning ? 0 : 1 }}
        >
          {currentVideo && (
            <VideoCard
              key={currentVideo.id.toString()}
              video={currentVideo}
              isAuthenticated={isAuthenticated}
              onNavigateToProfile={onNavigateToProfile}
              isMuted={isMuted}
              onMuteChange={setIsMuted}
              onCommentPanelChange={onCommentPanelChange}
              onLike={(hashtags) => {
                if (callerPrincipal) {
                  updateUserInterests(callerPrincipal, hashtags, "like");
                }
              }}
            />
          )}
        </div>

        {/* Feed mode badge */}
        {feedTab !== "For You" && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <motion.div
              key={feedTab}
              initial={{ opacity: 0, y: -8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="px-3 py-1 rounded-full text-white text-[11px] font-semibold"
              style={{
                background: "rgba(255,0,80,0.25)",
                border: "1px solid rgba(255,0,80,0.4)",
                backdropFilter: "blur(8px)",
              }}
            >
              {feedTab === "Following" ? "👥 Following" : "📈 Trending"}
            </motion.div>
          </div>
        )}

        {/* Distribution stage badge — over view count */}
        {currentVideo && getDistributionStage(currentVideo) >= 3 && (
          <div className="absolute top-16 right-4 z-20 pointer-events-none">
            {getDistributionStage(currentVideo) === 4 ? (
              <span
                className="px-2 py-0.5 rounded-full text-white text-[10px] font-black uppercase"
                style={{ background: "#ff0050", fontSize: 9 }}
              >
                VIRAL
              </span>
            ) : (
              <span className="text-base">🔥</span>
            )}
          </div>
        )}

        {/* Stories row — floats above video at top, below TopNav */}
        {isAuthenticated && (
          <div
            className="absolute left-0 right-0 z-10 flex items-center gap-3 px-4 overflow-x-auto no-scrollbar"
            style={{
              top: 72,
              paddingBottom: 8,
              paddingTop: 4,
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {/* Own avatar */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <StoryRing
                avatarUrl={ownAvatarUrl}
                displayName={ownDisplayName}
                size={52}
                hasStory={hasOwnStory}
                allViewed={false}
                isOwn={true}
                showPlusBadge={!hasOwnStory}
                onTap={openOwnStory}
              />
              <span
                className="text-white text-[10px] font-medium truncate max-w-[52px]"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                You
              </span>
            </div>

            {/* Other users with stories */}
            {storyUsers.map((entry) => {
              const uName = entry.user
                ? getDisplayName(entry.user.name) || "USER"
                : "USER";
              return (
                <div
                  key={entry.principal}
                  className="flex flex-col items-center gap-1 flex-shrink-0"
                >
                  <StoryRing
                    avatarUrl={entry.user?.avatarUrl ?? ""}
                    displayName={uName}
                    size={52}
                    hasStory={true}
                    allViewed={false}
                    isOwn={false}
                    onTap={() => openStoryViewer([entry])}
                  />
                  <span
                    className="text-white text-[10px] font-medium truncate max-w-[52px]"
                    style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                  >
                    {uName.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Following live row — floats below stories row */}
        {isAuthenticated && (
          <div className="absolute left-0 right-0 z-10" style={{ top: 132 }}>
            <FollowingLiveRow
              onJoinStream={(principalStr, displayName) =>
                onJoinLiveStream?.(principalStr, displayName)
              }
              onOpenProfile={(principalStr) =>
                onNavigateToProfile?.(principalStr)
              }
            />
          </div>
        )}

        {/* Progress dots indicator */}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 pointer-events-none">
          {rankedVideos.map((video, i) => (
            <div
              key={video.id.toString()}
              className="w-1 rounded-full transition-all duration-300"
              style={{
                height: i === currentIndex ? "20px" : "6px",
                background:
                  i === currentIndex ? "#ff0050" : "rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Story Creator overlay */}
      <AnimatePresence>
        {storyCreatorOpen && (
          <StoryCreatorPage
            key="feed-story-creator"
            onClose={() => setStoryCreatorOpen(false)}
            onStoryPosted={() => setStoryCreatorOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Story Viewer overlay */}
      <AnimatePresence>
        {storyViewerOpen && viewerStories.length > 0 && (
          <StoryViewerPage
            key="feed-story-viewer"
            stories={viewerStories}
            initialStoryIndex={0}
            onClose={() => setStoryViewerOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
