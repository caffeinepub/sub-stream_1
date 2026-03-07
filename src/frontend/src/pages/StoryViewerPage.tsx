import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Story } from "../backend.d";
import { useAuth } from "../context/AuthContext";

export interface StoryWithUser extends Story {
  userProfile: {
    displayName: string;
    username: string;
    avatarUrl: string;
  };
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
  const { actor } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, Math.min(initialStoryIndex, stories.length - 1)),
  );
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1

  const progressRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const videoDurationRef = useRef<number>(PHOTO_DURATION);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const currentStory = stories[currentIndex];

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
        startTimeRef.current = performance.now();
        pausedAtRef.current = progressRef.current * videoDurationRef.current;
      } else {
        pausedAtRef.current = progressRef.current * videoDurationRef.current;
      }
      setIsPaused((p) => !p);
    }
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
            className="absolute inset-0"
          >
            {currentStory.mediaType === "video" ? (
              <video
                ref={videoRef}
                src={currentStory.mediaUrl}
                autoPlay
                muted
                loop={false}
                playsInline
                className="w-full h-full object-cover"
                onLoadedMetadata={handleVideoLoadedMetadata}
              >
                <track kind="captions" />
              </video>
            ) : (
              <img
                src={currentStory.mediaUrl}
                alt="Story"
                className="w-full h-full object-cover"
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
          {isPaused && (
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
      </div>
    </motion.div>
  );
}
