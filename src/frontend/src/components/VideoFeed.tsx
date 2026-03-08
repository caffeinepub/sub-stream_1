import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import { useCallback, useRef, useState } from "react";
import type { Story, User, Video } from "../backend.d";
import { useAuth } from "../context/AuthContext";
import { getDisplayName, getUsername } from "../lib/userFormat";
import { StoryCreatorPage } from "../pages/StoryCreatorPage";
import { StoryViewerPage, type StoryWithUser } from "../pages/StoryViewerPage";
import { EmptyFeedState } from "./EmptyFeedState";
import { FollowingLiveRow } from "./FollowingLiveRow";
import { StoryRing } from "./StoryRing";
import { VideoCard } from "./VideoCard";

interface VideoFeedProps {
  onOpenCreate?: () => void;
  onNavigateToProfile?: (principal: string) => void;
  onJoinLiveStream?: (principalStr: string, displayName: string) => void;
}

interface StoryUserEntry {
  principal: string;
  stories: Story[];
  user: User | null;
}

export function VideoFeed({
  onOpenCreate,
  onNavigateToProfile,
  onJoinLiveStream,
}: VideoFeedProps) {
  const { actor, isAuthenticated, userProfile } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Mute state lives here so it persists across swipes
  const [isMuted, setIsMuted] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [viewerStories, setViewerStories] = useState<StoryWithUser[]>([]);

  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ["allVideos"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllVideos();
    },
    enabled: !!actor,
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
    (newIndex: number) => {
      if (isTransitioning) return;
      if (newIndex < 0 || newIndex >= videos.length) return;

      setIsTransitioning(true);
      setCurrentIndex(newIndex);

      setTimeout(() => {
        setIsTransitioning(false);
      }, 350);
    },
    [isTransitioning, videos.length],
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
          goToIndex(currentIndex + 1);
        } else {
          goToIndex(currentIndex - 1);
        }
      }

      touchStartY.current = null;
    },
    [currentIndex, goToIndex],
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

  // Empty state — no videos available yet
  if (videos.length === 0) {
    return (
      <div
        data-ocid="feed.canvas_target"
        className="w-full h-screen relative overflow-hidden bg-black"
      >
        <EmptyFeedState onUpload={onOpenCreate ?? (() => {})} />
      </div>
    );
  }

  const currentVideo = videos[currentIndex];
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
            />
          )}
        </div>

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
          {videos.map((video, i) => (
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
