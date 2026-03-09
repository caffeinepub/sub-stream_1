import { Radio, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { LiveStreamCard } from "../components/LiveStreamCard";
import {
  CATEGORIES,
  type LiveCategory,
  type LiveStream,
  mockLiveStreams,
} from "../data/liveStreams";
import {
  type LiveSignal,
  getRankedLiveSignals,
} from "../utils/recommendationEngine";

// ─── useLiveRankings hook ─────────────────────────────────────────────────────

function useLiveRankings() {
  const [signals, setSignals] = useState<LiveSignal[]>([]);

  useEffect(() => {
    // Load immediately
    setSignals(getRankedLiveSignals());

    // Refresh every 15 seconds
    const interval = setInterval(() => {
      setSignals(getRankedLiveSignals());
    }, 15_000);

    return () => clearInterval(interval);
  }, []);

  return signals;
}

// Convert a LiveSignal to a LiveStream card model
function signalToStream(signal: LiveSignal): LiveStream {
  return {
    id: signal.streamId,
    hostName: signal.hostName,
    hostAvatar: "",
    title: signal.title,
    category: signal.category,
    viewerCount: signal.viewerCount,
    gradientFrom: "from-rose-900",
    gradientTo: "to-pink-900",
    isHost: false,
    giftCount: signal.giftCount,
    startedAt: signal.startedAt,
  };
}

// ─── LiveDiscoveryPage ─────────────────────────────────────────────────────────

interface LiveDiscoveryPageProps {
  onOpenStream: (stream: LiveStream) => void;
  onGoLive: () => void;
}

export function LiveDiscoveryPage({
  onOpenStream,
  onGoLive,
}: LiveDiscoveryPageProps) {
  const [activeCategory, setActiveCategory] = useState<LiveCategory>("All");
  const liveSignals = useLiveRankings();

  // Convert real signals to LiveStream cards + append mock fallbacks
  const realStreams: LiveStream[] = liveSignals.map(signalToStream);
  // Only show mock fallbacks if no real streams exist
  const allStreams: LiveStream[] =
    realStreams.length > 0 ? realStreams : mockLiveStreams;

  const filtered =
    activeCategory === "All"
      ? allStreams
      : allStreams.filter((s) => s.category === activeCategory);

  return (
    <div
      data-ocid="live.page"
      className="relative w-full h-screen overflow-y-auto bg-black no-scrollbar pb-24"
    >
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-sm pt-12 pb-0">
        {/* Title row */}
        <div className="flex items-center gap-2.5 px-4 pt-2 pb-3">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full bg-[#ff0050] flex-shrink-0"
              style={{ animation: "livePulse 1.5s ease-in-out infinite" }}
            />
            <h1
              className="text-white text-2xl font-bold tracking-tight"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              LIVE
            </h1>
          </div>
          <span className="text-white/40 text-sm ml-auto">
            {filtered.length > 0 ? `${filtered.length} streaming now` : ""}
          </span>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat}
              type="button"
              data-ocid={`live.category_filter.tab.${i + 1}`}
              onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95"
              style={
                activeCategory === cat
                  ? {
                      background: "#ff0050",
                      color: "white",
                    }
                  : {
                      background: "rgba(255,255,255,0.07)",
                      color: "rgba(255,255,255,0.6)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }
              }
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Stream grid or empty state */}
      <div className="px-3 pt-3">
        {filtered.length === 0 ? (
          <div
            data-ocid="live.empty_state"
            className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{
                background: "rgba(255,0,80,0.1)",
                border: "1px solid rgba(255,0,80,0.3)",
              }}
            >
              <Video size={28} style={{ color: "#ff0050" }} strokeWidth={1.5} />
            </div>
            <p className="text-white font-semibold text-base mb-1.5">
              No live streams right now
            </p>
            <p className="text-white/40 text-sm mb-6 leading-relaxed">
              No one is live in this category yet. Be the first to go live!
            </p>
            <button
              type="button"
              data-ocid="live.go_live_button"
              onClick={onGoLive}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-semibold text-sm transition-all duration-200 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #ff0050, #ff6b35)",
                boxShadow: "0 4px 24px rgba(255,0,80,0.4)",
              }}
            >
              <Radio size={16} stroke="white" strokeWidth={2} />
              Go Live
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((stream, i) => (
              <LiveStreamCard
                key={stream.id}
                stream={stream}
                onTap={onOpenStream}
                index={i + 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Go Live button */}
      <button
        type="button"
        data-ocid="live.go_live_button"
        onClick={onGoLive}
        className="fixed bottom-24 right-4 z-40 flex items-center gap-2 px-5 py-3 rounded-full text-white font-bold text-sm shadow-lg transition-all duration-200 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #ff0050, #ff6b35)",
          boxShadow: "0 4px 28px rgba(255,0,80,0.5)",
        }}
        aria-label="Go Live"
      >
        <Radio size={16} stroke="white" strokeWidth={2} />
        Go Live
      </button>
    </div>
  );
}
