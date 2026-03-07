import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import type { Video } from "../backend.d";
import { useAuth } from "../context/AuthContext";
import { EmptyFeedState } from "./EmptyFeedState";
import { VideoCard } from "./VideoCard";

interface VideoFeedProps {
  onOpenCreate?: () => void;
}

export function VideoFeed({ onOpenCreate }: VideoFeedProps) {
  const { actor, isAuthenticated } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);

  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ["allVideos"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllVideos();
    },
    enabled: !!actor,
    staleTime: 60_000,
  });

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
          <VideoCard
            key={currentVideo.id.toString()}
            video={currentVideo}
            isAuthenticated={isAuthenticated}
          />
        )}
      </div>

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
  );
}
