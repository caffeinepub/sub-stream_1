import { Eye } from "lucide-react";
import { useState } from "react";
import type { LiveStream } from "../data/liveStreams";

interface LiveStreamCardProps {
  stream: LiveStream;
  onTap: (stream: LiveStream) => void;
  index: number;
}

function formatViewers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function getInitials(name: string): string {
  const parts = name.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Deterministic gradient for avatar
function getAvatarGradient(name: string): string {
  const gradients = [
    "linear-gradient(135deg, #ff0050, #ff6b35)",
    "linear-gradient(135deg, #7c3aed, #4f46e5)",
    "linear-gradient(135deg, #0ea5e9, #2563eb)",
    "linear-gradient(135deg, #059669, #0d9488)",
    "linear-gradient(135deg, #d97706, #ea580c)",
    "linear-gradient(135deg, #db2777, #9333ea)",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length]!;
}

export function LiveStreamCard({ stream, onTap, index }: LiveStreamCardProps) {
  const [following, setFollowing] = useState(false);
  const lastTapRef = { current: 0 };

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const diff = now - lastTapRef.current;
    lastTapRef.current = now;

    if (diff < 300 && diff > 0) {
      // Double-tap — toggle following
      setFollowing(true);
      return;
    }

    // Single tap
    if ("touches" in e) return; // wait for click on mobile
    onTap(stream);
  };

  return (
    <button
      type="button"
      data-ocid={`live.stream.item.${index}`}
      className="flex flex-col gap-1.5 cursor-pointer group text-left bg-transparent border-0 p-0 w-full"
      onClick={() => onTap(stream)}
      aria-label={`Watch ${stream.hostName} live: ${stream.title}`}
    >
      {/* Card */}
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        style={{ aspectRatio: "9/16" }}
        onTouchEnd={handleTap}
      >
        {/* Gradient background (simulated live video) */}
        <div
          className={`absolute inset-0 bg-gradient-to-b ${stream.gradientFrom} ${stream.gradientTo}`}
        />

        {/* Animated overlay pattern — subtle noise */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/3 left-1/4 w-32 h-32 rounded-full blur-2xl bg-white/20" />
          <div className="absolute bottom-1/3 right-1/4 w-24 h-24 rounded-full blur-xl bg-white/15" />
        </div>

        {/* Bottom dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Top-left: LIVE badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-bold tracking-wider"
            style={{ background: "#ff0050" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-white"
              style={{ animation: "livePulse 1.5s ease-in-out infinite" }}
            />
            LIVE
          </div>
        </div>

        {/* Top-right: viewer count */}
        <div className="absolute top-2.5 right-2.5">
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-semibold"
            style={{
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          >
            <Eye size={10} stroke="white" strokeWidth={2} />
            <span>{formatViewers(stream.viewerCount)}</span>
          </div>
        </div>

        {/* Bottom: avatar + username */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${stream.isHost ? "live-ring" : ""}`}
            style={{ background: getAvatarGradient(stream.hostName) }}
          >
            {getInitials(stream.hostName)}
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-sm">
            @{stream.hostName}
          </span>
        </div>

        {/* Following flash overlay */}
        {following && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              animation:
                "fadeIn 0.15s ease-out, fadeOut 0.3s ease-in 0.4s forwards",
            }}
          >
            <div
              className="px-4 py-2 rounded-full text-white text-sm font-bold"
              style={{ background: "rgba(255,0,80,0.8)" }}
            >
              Following ✓
            </div>
          </div>
        )}
      </div>

      {/* Stream title below card */}
      <p className="text-white text-xs font-medium leading-tight line-clamp-1 px-0.5">
        {stream.title}
      </p>
    </button>
  );
}
