import { useCallback, useRef, useState } from "react";
import type { MockVideo } from "../data/mockVideos";
import { EmptyFeedState } from "./EmptyFeedState";
import { VideoCard } from "./VideoCard";

interface VideoFeedProps {
  videos?: MockVideo[];
  onOpenCreate?: () => void;
}

export function VideoFeed({ videos = [], onOpenCreate }: VideoFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);

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

      // Require either significant movement (>60px) or fast swipe (>25px in <200ms)
      const isFastSwipe = elapsed < 200 && Math.abs(deltaY) > 25;
      const isSignificantSwipe = Math.abs(deltaY) > 60;

      if (isFastSwipe || isSignificantSwipe) {
        if (deltaY > 0) {
          // Swipe up → next video
          goToIndex(currentIndex + 1);
        } else {
          // Swipe down → previous video
          goToIndex(currentIndex - 1);
        }
      }

      touchStartY.current = null;
    },
    [currentIndex, goToIndex],
  );

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

  return (
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
          <VideoCard key={currentVideo.id} video={currentVideo} />
        )}
      </div>

      {/* Progress dots indicator */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 pointer-events-none">
        {videos.map((video, i) => (
          <div
            key={video.id}
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
  );
}
