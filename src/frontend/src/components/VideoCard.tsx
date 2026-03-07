import { Heart, MessageCircle, Music2, Share2, Sparkles } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { MockVideo } from "../data/mockVideos";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface HeartBurst {
  id: number;
  x: number;
  y: number;
}

interface VideoCardProps {
  video: MockVideo;
}

export function VideoCard({ video }: VideoCardProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(video.likes);
  const [heartBursts, setHeartBursts] = useState<HeartBurst[]>([]);
  const lastTapRef = useRef<number>(0);
  const burstIdRef = useRef(0);

  const handleDoubleTap = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const now = Date.now();
      const timeDiff = now - lastTapRef.current;

      if (timeDiff < 300 && timeDiff > 0) {
        // Double tap detected
        const clientX =
          "touches" in e
            ? (e.changedTouches[0]?.clientX ?? 0)
            : (e as React.MouseEvent).clientX;
        const clientY =
          "touches" in e
            ? (e.changedTouches[0]?.clientY ?? 0)
            : (e as React.MouseEvent).clientY;

        const id = burstIdRef.current++;
        setHeartBursts((prev) => [...prev, { id, x: clientX, y: clientY }]);

        if (!liked) {
          setLiked(true);
          setLikeCount((c) => c + 1);
        }

        setTimeout(() => {
          setHeartBursts((prev) => prev.filter((h) => h.id !== id));
        }, 700);
      }

      lastTapRef.current = now;
    },
    [liked],
  );

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked((prev) => {
      setLikeCount((c) => (prev ? c - 1 : c + 1));
      return !prev;
    });
  };

  return (
    <div
      data-ocid="video.canvas_target"
      className="relative w-full h-full overflow-hidden select-none"
      onTouchEnd={handleDoubleTap}
      onClick={handleDoubleTap}
      onKeyDown={(e) => {
        if (e.key === "Enter")
          handleDoubleTap(e as unknown as React.MouseEvent);
      }}
      role="presentation"
    >
      {/* Gradient background video placeholder */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${video.gradientFrom} ${video.gradientTo}`}
      />

      {/* Subtle vignette patterns for visual interest */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl bg-white/5" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full blur-2xl bg-white/5" />
      </div>

      {/* Bottom dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />

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

      {/* Creator info — bottom left */}
      <div className="absolute bottom-24 left-4 right-20 z-10 pointer-events-none">
        <p className="text-white font-bold text-base mb-1">@{video.username}</p>
        <p className="text-white/90 text-sm leading-snug mb-2 line-clamp-2">
          {video.caption}
        </p>
        <div className="flex flex-wrap gap-1 mb-2">
          {video.hashtags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-medium"
              style={{ color: "#ff0050" }}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Music2 size={12} className="text-white/70 flex-shrink-0" />
          <p className="text-white/70 text-xs truncate">{video.music}</p>
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
            {formatCount(video.comments)}
          </span>
        </button>

        {/* Share */}
        <button
          type="button"
          data-ocid="video.share_button"
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
            {formatCount(video.shares)}
          </span>
        </button>

        {/* Gift */}
        <button
          type="button"
          data-ocid="video.gift_button"
          className="flex flex-col items-center gap-1 group"
          aria-label="Gift"
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
          <div
            className={`relative w-12 h-12 ${video.isLive ? "live-ring" : ""}`}
          >
            <img
              src={video.avatarUrl}
              alt={video.username}
              className={`w-12 h-12 rounded-full object-cover border-2 ${
                video.isLive ? "border-red-500" : "border-white/30"
              }`}
              loading="lazy"
            />
            {/* Plus badge on avatar */}
            {!video.isLive && (
              <div
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "#ff0050" }}
              >
                +
              </div>
            )}
          </div>
          {/* LIVE badge */}
          {video.isLive && (
            <span
              className="text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm tracking-wide"
              style={{ background: "#ff0050" }}
            >
              LIVE
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
