import { Eye, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Story, UserProfile } from "../backend.d";
import { useAuth } from "../context/AuthContext";
import { useVideoAspectRatio } from "../hooks/useVideoAspectRatio";

export interface StoryWithUser extends Story {
  userProfile: {
    displayName: string;
    username: string;
    avatarUrl: string;
  };
}

interface StoryViewer {
  principal: string;
  profile: UserProfile | null;
}

interface StoryViewerPageProps {
  stories: StoryWithUser[];
  initialStoryIndex: number;
  onClose: () => void;
}

const PHOTO_DURATION = 5000; // 5 seconds

function timeAgo(createdAt: bigint): string {
  const nowMs = Date.now();
  // createdAt is in nanoseconds from IC
  const createdMs = Number(createdAt) / 1_000_000;
  const diffSec = Math.floor((nowMs - createdMs) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function StoryViewerPage({
  stories,
  initialStoryIndex,
  onClose,
}: StoryViewerPageProps) {
  const { actor, userProfile: myProfile } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, Math.min(initialStoryIndex, stories.length - 1)),
  );
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);

  const progressRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const videoDurationRef = useRef<number>(PHOTO_DURATION);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const { aspectClass: storyAspectClass } = useVideoAspectRatio(videoRef);

  const currentStory = stories[currentIndex];

  // Check if the current user owns this story
  const myPrincipal =
    (
      myProfile as unknown as { id?: { toText?: () => string } }
    )?.id?.toText?.() ?? "";
  const isMyStory = currentStory
    ? currentStory.creator.toText() === myPrincipal
    : false;

  const goToNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  // Mark viewed + reset progress when story changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: actor ref is stable, currentStory identity changes with currentIndex
  useEffect(() => {
    if (!currentStory) return;

    // Mark viewed
    if (actor) {
      void actor.markStoryViewed(currentStory.id).catch(() => {});
    }

    // Determine duration (will be updated by video metadata if applicable)
    if (currentStory.mediaType !== "video") {
      videoDurationRef.current = PHOTO_DURATION;
    }

    progressRef.current = 0;
    setProgress(0);
    startTimeRef.current = performance.now();
    pausedAtRef.current = 0;
    setShowViewers(false);
    setViewers([]);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [currentIndex, currentStory]);

  // Progress animation loop
  // biome-ignore lint/correctness/useExhaustiveDependencies: goToNext is stable callback, videoDurationRef is a ref
  useEffect(() => {
    if (isPaused) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const duration = videoDurationRef.current;

    const tick = (now: number) => {
      if (!startTimeRef.current) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current + pausedAtRef.current;
      const pct = Math.min(elapsed / duration, 1);
      progressRef.current = pct;
      setProgress(pct);

      if (pct < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        goToNext();
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [currentIndex, isPaused, goToNext]);

  // When video loads, update duration
  function handleVideoLoadedMetadata() {
    if (videoRef.current) {
      videoDurationRef.current = videoRef.current.duration * 1000;
      // Reset progress to use actual video duration
      progressRef.current = 0;
      setProgress(0);
      startTimeRef.current = performance.now();
      pausedAtRef.current = 0;
    }
  }

  // Touch navigation
  function handleTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartXRef.current === null || touchStartYRef.current === null)
      return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartXRef.current;
    const dy = (e.changedTouches[0]?.clientY ?? 0) - touchStartYRef.current;

    // Horizontal swipe (left/right user switch) — prioritize
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  }

  function handleScreenTap(e: React.MouseEvent) {
    if (showViewers) return; // Don't navigate when viewers panel is open
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;
    const relX = x / w;

    if (relX < 0.4) {
      // Left side — previous
      goToPrev();
    } else if (relX > 0.6) {
      // Right side — next
      goToNext();
    } else {
      // Center — pause/resume
      if (isPaused) {
        startTimeRef.current = performance.now() - pausedAtRef.current;
        pausedAtRef.current = 0;
      } else {
        pausedAtRef.current =
          performance.now() - startTimeRef.current + pausedAtRef.current;
      }
      setIsPaused((p) => !p);
    }
  }

  async function openViewers() {
    if (!actor || !currentStory) return;
    setShowViewers(true);
    setIsPaused(true);
    pausedAtRef.current =
      performance.now() - startTimeRef.current + pausedAtRef.current;
    setViewersLoading(true);
    try {
      const result = await actor.getStoryViewers(currentStory.id);
      setViewers(
        result.map((r) => ({
          principal: r.principal.toText(),
          profile: r.profile ?? null,
        })),
      );
    } catch {
      setViewers([]);
    } finally {
      setViewersLoading(false);
    }
  }

  function closeViewers() {
    setShowViewers(false);
    // Resume
    startTimeRef.current = performance.now() - pausedAtRef.current;
    pausedAtRef.current = 0;
    setIsPaused(false);
  }

  if (!currentStory) {
    onClose();
    return null;
  }

  const { userProfile } = currentStory;

  // Build same-user story segments for the progress bar
  // Group stories by user principal for segment logic
  const userPrincipalStr = currentStory.creator.toText();
  const sameUserStories = stories.filter(
    (s) => s.creator.toText() === userPrincipalStr,
  );
  const currentUserStoryIndex = sameUserStories.findIndex(
    (s) => s.id === currentStory.id,
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[110] bg-black flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "none" }}
    >
      {/* Media container */}
      <div className="relative w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={`story-${currentStory.id.toString()}`}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black flex items-center justify-center"
          >
            {currentStory.mediaType === "video" ? (
              <video
                ref={videoRef}
                src={currentStory.mediaUrl}
                autoPlay
                loop={false}
                playsInline
                className={
                  storyAspectClass === "vertical"
                    ? "w-full h-full object-contain"
                    : "w-full h-full object-contain"
                }
                onLoadedMetadata={handleVideoLoadedMetadata}
                onCanPlay={() => {
                  if (videoRef.current) {
                    videoRef.current.play().catch(() => {
                      // Autoplay blocked — try muted
                      if (videoRef.current) {
                        videoRef.current.muted = true;
                        videoRef.current.play().catch(() => {});
                      }
                    });
                  }
                }}
              >
                <track kind="captions" />
              </video>
            ) : (
              <img
                src={currentStory.mediaUrl}
                alt="Story"
                className="w-full h-full object-contain"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Gradient overlays for readability */}
        <div
          className="absolute inset-x-0 top-0 h-40 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
          }}
        />

        {/* Top area */}
        <div className="absolute top-0 left-0 right-0 pt-12 px-3 z-10">
          {/* Progress bars */}
          <div className="flex gap-1 mb-3">
            {sameUserStories.map((s, i) => {
              let segProgress = 0;
              if (i < currentUserStoryIndex) segProgress = 1;
              else if (i === currentUserStoryIndex) segProgress = progress;
              return (
                <div
                  key={s.id.toString()}
                  className="flex-1 h-[3px] rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.3)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${segProgress * 100}%`,
                      background: "white",
                      transition: isPaused ? "none" : undefined,
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Profile row */}
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{
                background: userProfile.avatarUrl
                  ? "transparent"
                  : "linear-gradient(135deg, #ff0050, #ff6b35)",
                border: "2px solid rgba(255,255,255,0.3)",
              }}
            >
              {userProfile.avatarUrl ? (
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-xs font-bold">
                  {getInitials(userProfile.displayName || "?")}
                </span>
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <p
                className="text-white font-bold text-sm leading-tight truncate"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                {userProfile.displayName}
              </p>
              <div className="flex items-center gap-1.5">
                {userProfile.username && (
                  <span
                    className="text-white/60 text-xs truncate"
                    style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                  >
                    @{userProfile.username}
                  </span>
                )}
                <span className="text-white/40 text-[10px]">·</span>
                <span className="text-white/40 text-[10px]">
                  {timeAgo(currentStory.createdAt)}
                </span>
              </div>
            </div>

            {/* Close */}
            <button
              type="button"
              data-ocid="story_viewer.close_button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors flex-shrink-0"
              style={{ background: "rgba(0,0,0,0.45)" }}
              aria-label="Close story"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Text overlay */}
        {currentStory.textOverlay && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-8 z-10">
            <p
              className="text-white text-2xl font-bold text-center leading-snug"
              style={{
                textShadow:
                  "0 2px 16px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.7)",
                fontFamily: "'Bricolage Grotesque', sans-serif",
              }}
            >
              {currentStory.textOverlay}
            </p>
          </div>
        )}

        {/* Viewers button — only show for own stories */}
        {isMyStory && (
          <button
            type="button"
            data-ocid="story_viewer.viewers_button"
            onClick={(e) => {
              e.stopPropagation();
              openViewers();
            }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold"
            style={{
              background: "rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.2)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Eye size={15} />
            <span>{Number(currentStory.viewerCount)} viewers</span>
          </button>
        )}

        {/* Tap zones (invisible but interactive) */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: story tap navigation handled via touch events */}
        <div
          className="absolute inset-0 flex z-20"
          onClick={handleScreenTap}
          style={{ cursor: "pointer" }}
        >
          <div
            data-ocid="story_viewer.tap_left"
            className="w-[40%] h-full"
            aria-label="Previous story"
          />
          <div className="w-[20%] h-full" aria-label="Pause/resume" />
          <div
            data-ocid="story_viewer.tap_right"
            className="w-[40%] h-full"
            aria-label="Next story"
          />
        </div>

        {/* Paused indicator */}
        <AnimatePresence>
          {isPaused && !showViewers && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.6)" }}
              >
                <div className="flex gap-1.5">
                  <div className="w-2 h-7 bg-white rounded-sm" />
                  <div className="w-2 h-7 bg-white rounded-sm" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Viewers list panel */}
        <AnimatePresence>
          {showViewers && (
            <motion.div
              data-ocid="story_viewer.viewers_panel"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="absolute inset-x-0 bottom-0 z-40 rounded-t-3xl overflow-hidden"
              style={{
                background: "rgba(18,18,18,0.97)",
                backdropFilter: "blur(20px)",
                maxHeight: "60vh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  <Eye size={16} className="text-white/60" />
                  <span className="text-white font-semibold text-base">
                    {viewersLoading
                      ? "Loading..."
                      : `${viewers.length} viewer${viewers.length !== 1 ? "s" : ""}`}
                  </span>
                </div>
                <button
                  type="button"
                  data-ocid="story_viewer.viewers_close_button"
                  onClick={closeViewers}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-white/60 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Viewers list */}
              <div className="flex-1 overflow-y-auto pb-8">
                {viewersLoading ? (
                  <div className="flex flex-col gap-3 px-5 py-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 animate-pulse"
                      >
                        <div className="w-10 h-10 rounded-full bg-white/10" />
                        <div className="flex-1">
                          <div className="h-3 w-28 rounded bg-white/10 mb-1.5" />
                          <div className="h-2.5 w-20 rounded bg-white/10" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : viewers.length === 0 ? (
                  <div
                    data-ocid="story_viewer.viewers_empty_state"
                    className="flex flex-col items-center justify-center py-12 text-white/40"
                  >
                    <Eye size={32} className="mb-3 opacity-40" />
                    <p className="text-sm">No viewers yet</p>
                  </div>
                ) : (
                  <ul className="px-5 py-2 flex flex-col gap-1">
                    {viewers.map((v, idx) => {
                      const name = v.profile?.name ?? "Unknown";
                      const parts = name.split("|");
                      const displayName = parts[0] || "Unknown";
                      const username = parts[1] || "";
                      const avatar = v.profile?.avatarUrl ?? "";
                      return (
                        <li
                          key={v.principal}
                          data-ocid={`story_viewer.viewers_item.${idx + 1}`}
                          className="flex items-center gap-3 py-2.5"
                        >
                          <div
                            className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
                            style={{
                              background: avatar
                                ? "transparent"
                                : "linear-gradient(135deg, #ff0050, #ff6b35)",
                            }}
                          >
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white text-xs font-bold">
                                {getInitials(displayName)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-semibold truncate leading-tight">
                              {displayName}
                            </p>
                            {username && (
                              <p className="text-white/50 text-xs truncate">
                                @{username}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
