import {
  ArrowLeft,
  Eye,
  Gift,
  Heart,
  Send,
  Settings,
  Share2,
  UserPlus,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GiftItem } from "../components/GiftAnimation";
import { GiftAnimation } from "../components/GiftAnimation";
import { LiveChatMessage } from "../components/LiveChatMessage";
import type { LiveStream } from "../data/liveStreams";

// ─── Gift catalogue ────────────────────────────────────────────────────────────
const GIFTS: Array<GiftItem & { coins: number }> = [
  { emoji: "🌹", name: "Rose", coins: 5 },
  { emoji: "❤️", name: "Heart", coins: 10 },
  { emoji: "💎", name: "Diamond", coins: 50 },
  { emoji: "🚀", name: "Rocket", coins: 100 },
  { emoji: "👑", name: "Crown", coins: 500 },
];

// ─── Simulated chat pool ───────────────────────────────────────────────────────
const CHAT_POOL = [
  { username: "CosmicDancer", message: "Let's gooo 🔥🔥" },
  { username: "NightRider99", message: "this is amazing!" },
  { username: "StarGazer_7", message: "followed! keep it up ✨" },
  { username: "TrendWatcher", message: "first time here, love this" },
  { username: "EliteViewer", message: "can you do that again?" },
  { username: "MidnightSnack", message: "literally obsessed rn 😭" },
  { username: "PixelPioneer", message: "the vibes are immaculate" },
  { username: "SkylineChaser", message: "what's the song??" },
  { username: "VibeCurator", message: "W stream as always 👏" },
  { username: "FrostByte", message: "just joined, catching up!" },
  { username: "ZenMoment", message: "drop the link for this 🙏" },
  { username: "LunarTide", message: "can't stop watching 😭💙" },
];

interface ChatEntry {
  id: string;
  username: string;
  message: string;
  isGift?: boolean;
  giftEmoji?: string;
}

interface GiftAnimEntry {
  id: string;
  gift: GiftItem;
}

interface HeartBurst {
  id: number;
  x: number;
  y: number;
}

function formatViewers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface LiveStreamViewPageProps {
  stream: LiveStream;
  isHost?: boolean;
  onBack: () => void;
  onEnd?: () => void;
}

export function LiveStreamViewPage({
  stream,
  isHost = false,
  onBack,
  onEnd,
}: LiveStreamViewPageProps) {
  const [chatMessages, setChatMessages] = useState<ChatEntry[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [giftAnimations, setGiftAnimations] = useState<GiftAnimEntry[]>([]);
  const [giftSheetOpen, setGiftSheetOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [heartBursts, setHeartBursts] = useState<HeartBurst[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);
  const burstIdRef = useRef(0);
  const chatPoolIdx = useRef(0);

  // Auto-scroll chat to bottom whenever messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  // Simulate incoming chat messages
  useEffect(() => {
    const interval = setInterval(
      () => {
        const entry = CHAT_POOL[chatPoolIdx.current % CHAT_POOL.length];
        if (!entry) return;
        chatPoolIdx.current++;
        const newMsg: ChatEntry = {
          id: `auto-${Date.now()}-${chatPoolIdx.current}`,
          username: entry.username,
          message: entry.message,
        };
        setChatMessages((prev) => [...prev.slice(-40), newMsg]);
      },
      3000 + Math.random() * 1000,
    );
    return () => clearInterval(interval);
  }, []);

  const sendGift = useCallback((gift: (typeof GIFTS)[number]) => {
    setGiftSheetOpen(false);

    // Add gift notification to chat
    const chatEntry: ChatEntry = {
      id: `gift-${Date.now()}`,
      username: "You",
      message: "",
      isGift: true,
      giftEmoji: gift.emoji,
    };
    setChatMessages((prev) => [...prev.slice(-40), chatEntry]);

    // Trigger floating animation
    const animId = `anim-${Date.now()}`;
    setGiftAnimations((prev) => [...prev, { id: animId, gift }]);
  }, []);

  const handleGiftComplete = useCallback((id: string) => {
    setGiftAnimations((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const handleSendMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    const newMsg: ChatEntry = {
      id: `user-${Date.now()}`,
      username: "You",
      message: text,
    };
    setChatMessages((prev) => [...prev.slice(-40), newMsg]);
    setChatInput("");
  };

  const handleDoubleTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Only fire on the main canvas area
      const now = Date.now();
      const diff = now - lastTapRef.current;
      lastTapRef.current = now;

      if (diff < 300 && diff > 0) {
        const clientX =
          "touches" in e
            ? ((e as React.TouchEvent).changedTouches[0]?.clientX ?? 0)
            : (e as React.MouseEvent).clientX;
        const clientY =
          "touches" in e
            ? ((e as React.TouchEvent).changedTouches[0]?.clientY ?? 0)
            : (e as React.MouseEvent).clientY;

        const id = burstIdRef.current++;
        setHeartBursts((prev) => [...prev, { id, x: clientX, y: clientY }]);
        setTimeout(() => {
          setHeartBursts((prev) => prev.filter((h) => h.id !== id));
        }, 700);
      }
    },
    [],
  );

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      {/* ── Layer 1: Fullscreen gradient background (simulated live video) ── */}
      <div
        data-ocid="livestream.canvas_target"
        className={`absolute inset-0 bg-gradient-to-b ${stream.gradientFrom} ${stream.gradientTo}`}
        onTouchEnd={handleDoubleTap}
        onClick={handleDoubleTap}
        onKeyDown={(e) =>
          e.key === "Enter" && handleDoubleTap(e as unknown as React.MouseEvent)
        }
        role="presentation"
        aria-label="Live stream video — double tap to send a heart"
      >
        {/* Animated visual noise layers */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full blur-3xl bg-white/10" />
          <div className="absolute bottom-1/2 right-1/4 w-48 h-48 rounded-full blur-2xl bg-white/10" />
          <div className="absolute top-1/2 left-1/6 w-32 h-32 rounded-full blur-xl bg-white/5" />
        </div>
        {/* LIVE watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
          <span
            className="text-white/5 text-7xl font-black tracking-widest"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            LIVE
          </span>
        </div>
      </div>

      {/* Bottom gradient overlay for chat readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

      {/* ── Heart bursts ── */}
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

      {/* ── Gift animations ── */}
      <AnimatePresence>
        {giftAnimations.map((anim) => (
          <GiftAnimation
            key={anim.id}
            id={anim.id}
            gift={anim.gift}
            onComplete={handleGiftComplete}
          />
        ))}
      </AnimatePresence>

      {/* ── Layer 2: Top overlay ── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-start justify-between px-4 pt-12 pb-4">
        {/* Back button + stream info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            type="button"
            data-ocid="livestream.back_button"
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-150 active:scale-90"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
            }}
            aria-label="Go back"
          >
            <ArrowLeft size={18} stroke="white" strokeWidth={2} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-white font-bold text-sm truncate"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                {stream.hostName}
              </span>
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[9px] font-bold tracking-wider flex-shrink-0"
                style={{ background: "#ff0050" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full bg-white"
                  style={{ animation: "livePulse 1.5s ease-in-out infinite" }}
                />
                LIVE
              </div>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Eye size={10} stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
              <span className="text-white/60 text-[11px]">
                {formatViewers(stream.viewerCount)} watching
              </span>
            </div>
          </div>
        </div>

        {/* Host controls button */}
        {isHost && (
          <button
            type="button"
            data-ocid="livestream.host_controls_button"
            onClick={() => setControlsOpen(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ml-2 transition-all duration-150 active:scale-90"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
            }}
            aria-label="Host controls"
          >
            <Settings size={16} stroke="white" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* ── Layer 3: Right side icons ── */}
      <div className="absolute right-3 top-1/3 z-20 flex flex-col items-center gap-5">
        <button
          type="button"
          data-ocid="livestream.like_button"
          className="flex flex-col items-center gap-1 group"
          aria-label="Like"
        >
          <div className="w-10 h-10 flex items-center justify-center">
            <Heart
              size={26}
              strokeWidth={2}
              stroke="white"
              className="transition-all duration-150 group-active:scale-125 group-active:fill-[#ff0050] group-active:stroke-[#ff0050]"
            />
          </div>
        </button>

        <button
          type="button"
          data-ocid="livestream.share_button"
          className="flex flex-col items-center gap-1 group"
          aria-label="Share"
        >
          <div className="w-10 h-10 flex items-center justify-center">
            <Share2
              size={24}
              strokeWidth={2}
              stroke="white"
              className="transition-all duration-150 group-active:scale-125"
            />
          </div>
        </button>

        <button
          type="button"
          data-ocid="livestream.gift_button"
          onClick={() => setGiftSheetOpen(true)}
          className="flex flex-col items-center gap-1 group"
          aria-label="Send gift"
        >
          <div className="w-10 h-10 flex items-center justify-center">
            <Gift
              size={24}
              strokeWidth={2}
              stroke="#ff0050"
              className="transition-all duration-150 group-active:scale-125"
            />
          </div>
        </button>

        <button
          type="button"
          data-ocid="livestream.follow_button"
          onClick={() => setFollowed((v) => !v)}
          className="flex flex-col items-center gap-1 group"
          aria-label={followed ? "Unfollow" : "Follow"}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150 group-active:scale-110"
            style={{
              background: followed ? "#ff0050" : "rgba(255,255,255,0.15)",
              border: "1.5px solid rgba(255,255,255,0.3)",
            }}
          >
            <UserPlus size={18} stroke="white" strokeWidth={2} />
          </div>
          <span className="text-white/70 text-[10px]">
            {followed ? "✓" : "Follow"}
          </span>
        </button>
      </div>

      {/* ── Layer 4: Chat area ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 flex flex-col"
        style={{ maxHeight: "45%" }}
      >
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-2 flex flex-col justify-end">
          {chatMessages.map((msg) => (
            <LiveChatMessage
              key={msg.id}
              username={msg.username}
              message={msg.message}
              isGift={msg.isGift}
              giftEmoji={msg.giftEmoji}
            />
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input */}
        <div
          className="flex items-center gap-2 px-3 pb-8 pt-2"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)",
          }}
        >
          <div
            className="flex-1 flex items-center rounded-full overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <input
              data-ocid="livestream.chat_input"
              type="text"
              placeholder="Say something…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1 bg-transparent text-white text-sm px-4 py-2.5 outline-none placeholder:text-white/40"
              style={{ fontSize: "16px" }}
            />
          </div>
          <button
            type="button"
            data-ocid="livestream.chat_submit_button"
            onClick={handleSendMessage}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-150 active:scale-90"
            style={{
              background: chatInput.trim()
                ? "linear-gradient(135deg, #ff0050, #ff6b35)"
                : "rgba(255,255,255,0.1)",
            }}
            aria-label="Send message"
          >
            <Send size={16} stroke="white" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ── Gift sheet ── */}
      <AnimatePresence>
        {giftSheetOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-[70]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGiftSheetOpen(false)}
            />
            <motion.div
              data-ocid="livestream.gift_sheet"
              className="fixed bottom-0 left-0 right-0 z-[80] rounded-t-3xl pb-10 overflow-hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              style={{
                background: "linear-gradient(to bottom, #1a1a1a, #111)",
              }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              <div className="px-5 pb-2 border-b border-white/5">
                <h3 className="text-white font-bold text-base">Send a Gift</h3>
                <p className="text-white/40 text-xs mt-0.5">
                  Support the creator with coins
                </p>
              </div>

              <div className="flex items-center justify-around px-4 pt-5 pb-3">
                {GIFTS.map((gift) => (
                  <button
                    key={gift.name}
                    type="button"
                    onClick={() => sendGift(gift)}
                    className="flex flex-col items-center gap-1.5 group transition-all duration-150 active:scale-90"
                    aria-label={`Send ${gift.name} for ${gift.coins} coins`}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-150 group-active:scale-110"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      {gift.emoji}
                    </div>
                    <span className="text-white/70 text-[10px] font-medium">
                      {gift.name}
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(255,0,80,0.2)",
                        color: "#ff6b6b",
                      }}
                    >
                      {gift.coins}c
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Host controls sheet ── */}
      <AnimatePresence>
        {controlsOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-[70]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setControlsOpen(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[80] rounded-t-3xl pb-10 overflow-hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              style={{
                background: "linear-gradient(to bottom, #1a1a1a, #111)",
              }}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              <div className="px-5 pb-3 border-b border-white/5">
                <h3 className="text-white font-bold text-base">
                  Host Controls
                </h3>
              </div>

              <div className="px-4 pt-3 space-y-2">
                {[
                  { label: "📌 Pin Comment", accent: false },
                  { label: "🔇 Mute Chat", accent: false },
                  { label: "🛡 Add Moderator", accent: false },
                  { label: "🚫 Remove User", accent: false },
                ].map(({ label, accent }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setControlsOpen(false)}
                    className="w-full text-left px-4 py-3.5 rounded-2xl text-sm font-medium text-white transition-all duration-150 active:scale-[0.98]"
                    style={{
                      background: accent
                        ? "rgba(255,0,80,0.1)"
                        : "rgba(255,255,255,0.05)",
                    }}
                  >
                    {label}
                  </button>
                ))}

                {/* End stream */}
                <button
                  type="button"
                  data-ocid="livestream.end_stream_button"
                  onClick={() => {
                    setControlsOpen(false);
                    onEnd?.();
                  }}
                  className="w-full text-left px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-150 active:scale-[0.98]"
                  style={{
                    background: "rgba(255,0,80,0.15)",
                    border: "1px solid rgba(255,0,80,0.3)",
                    color: "#ff4466",
                  }}
                >
                  🛑 End Stream
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
