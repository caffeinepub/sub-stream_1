import {
  Eye,
  Heart,
  Loader2,
  Mic,
  MicOff,
  Monitor,
  Power,
  Send,
  Settings,
  Share2,
  Smile,
  SwitchCamera,
  Swords,
  Target,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BattleConfetti } from "../components/BattleConfetti";
import { BattleMultiplierOverlay } from "../components/BattleMultiplierOverlay";
import type { GiftItem } from "../components/GiftAnimation";
import { GiftAnimation } from "../components/GiftAnimation";
import { LiveChatMessage } from "../components/LiveChatMessage";
import { MvpCrownAnimation } from "../components/MvpCrownAnimation";
import { useAuth } from "../context/AuthContext";
import { useCoinWallet } from "../context/CoinWalletContext";
import type { LiveStream } from "../data/liveStreams";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  getLiveStatusStatic,
  setLiveStatusStatic,
} from "../hooks/useLiveStatus";
import { markLiveSignalInactive } from "../utils/recommendationEngine";

// ─── Gift catalog ────────────────────────────────────────────────────────────

const GIFT_CATALOG: Array<
  GiftItem & { coins: number; tier: "regular" | "premium" }
> = [
  // Regular
  { emoji: "🌹", name: "Rose", coins: 1, tier: "regular" },
  { emoji: "💕", name: "Heart Me", coins: 1, tier: "regular" },
  { emoji: "⭐", name: "Go Popular", coins: 1, tier: "regular" },
  { emoji: "🤌", name: "Finger Heart", coins: 5, tier: "regular" },
  { emoji: "🍩", name: "Doughnut", coins: 30, tier: "regular" },
  { emoji: "🎩", name: "Hat & Mustache", coins: 99, tier: "regular" },
  { emoji: "🧢", name: "Cap", coins: 99, tier: "regular" },
  { emoji: "🫧", name: "Bubble Gum", coins: 99, tier: "regular" },
  { emoji: "🕶️", name: "Sunglasses", coins: 199, tier: "regular" },
  { emoji: "🦸‍♀️", name: "Superwoman", coins: 450, tier: "regular" },
  // Premium
  { emoji: "🦁", name: "Lion", coins: 29999, tier: "premium" },
  { emoji: "🌌", name: "TikTok Universe", coins: 44999, tier: "premium" },
  { emoji: "🦄", name: "Pegasus", coins: 42999, tier: "premium" },
  { emoji: "🔥", name: "Fire Phoenix", coins: 41999, tier: "premium" },
  { emoji: "⚡", name: "Thunder Falcon", coins: 39999, tier: "premium" },
  { emoji: "🚀", name: "Premium Shuttle", coins: 20000, tier: "premium" },
];

const REGULAR_GIFTS = GIFT_CATALOG.filter((g) => g.tier === "regular");
const PREMIUM_GIFTS = GIFT_CATALOG.filter((g) => g.tier === "premium");

const EMOJI_PICKER = [
  "😂",
  "❤️",
  "🔥",
  "👏",
  "😍",
  "🎉",
  "💯",
  "🙏",
  "😭",
  "✨",
];

const MAX_ENGAGEMENT_LIKES = 1000;
const BATTLE_DURATION_SEC = 300;

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatEntry {
  id: string;
  username: string;
  message: string;
  avatarUrl?: string;
  isGift?: boolean;
  giftEmoji?: string;
}

interface GiftAnimEntry {
  id: string;
  gift: GiftItem & { tier?: "regular" | "premium" };
  senderName?: string;
}

interface HeartBurst {
  id: number;
  x: number;
  y: number;
}

interface FloatingHeart {
  id: number;
  offsetX: number;
  delay: number;
}

interface InviteUser {
  principal: string;
  name: string;
  avatarUrl: string;
}

interface GoalState {
  giftName: string;
  targetCount: number;
  currentCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatViewers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCoins(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return String(n);
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function getUserGradient(username: string): string {
  const gradients = [
    "linear-gradient(135deg, #ff0050, #ff6b35)",
    "linear-gradient(135deg, #7c3aed, #4f46e5)",
    "linear-gradient(135deg, #0ea5e9, #2563eb)",
    "linear-gradient(135deg, #059669, #0d9488)",
    "linear-gradient(135deg, #d97706, #ea580c)",
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length]!;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AvatarCircle({
  url,
  name,
  size = 32,
  showLiveRing = false,
}: {
  url?: string;
  name: string;
  size?: number;
  showLiveRing?: boolean;
}) {
  const ringStyle = showLiveRing
    ? { boxShadow: "0 0 0 2px #ff0050, 0 0 12px rgba(255,0,80,0.5)" }
    : {};
  return (
    <div
      className="rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-bold"
      style={{
        width: size,
        height: size,
        background: url ? "transparent" : getUserGradient(name),
        fontSize: Math.floor(size * 0.35),
        ...ringStyle,
      }}
    >
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}

function GlassButton({
  onClick,
  children,
  className = "",
  "aria-label": ariaLabel,
  "data-ocid": dataOcid,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
  "data-ocid"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      data-ocid={dataOcid}
      className={`flex items-center justify-center transition-all duration-150 active:scale-90 ${className}`}
      style={{
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.15)",
      }}
    >
      {children}
    </button>
  );
}

// ─── Gift Sheet ───────────────────────────────────────────────────────────────

interface GiftSheetProps {
  onClose: () => void;
  onSendGift: (gift: (typeof GIFT_CATALOG)[number]) => void;
  onOpenRecharge: () => void;
  isBattle?: boolean;
  hostName?: string;
  guestName?: string;
  giftTarget?: "host" | "guest";
  onSetGiftTarget?: (t: "host" | "guest") => void;
}

function GiftSheet({
  onClose,
  onSendGift,
  onOpenRecharge,
  isBattle,
  hostName,
  guestName,
  giftTarget,
  onSetGiftTarget,
}: GiftSheetProps) {
  const { coinBalance } = useCoinWallet();
  const [shakeGift, setShakeGift] = useState<string | null>(null);
  const [insufficientMsg, setInsufficientMsg] = useState<string | null>(null);

  const handleGiftTap = (gift: (typeof GIFT_CATALOG)[number]) => {
    if (coinBalance < gift.coins) {
      setShakeGift(gift.name);
      setInsufficientMsg(gift.name);
      setTimeout(() => {
        setShakeGift(null);
        setInsufficientMsg(null);
      }, 1800);
      return;
    }
    onSendGift(gift);
  };

  const noBalance = coinBalance === 0;

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[70]"
        style={{ background: "rgba(0,0,0,0.6)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role="presentation"
      />
      <motion.div
        data-ocid="livestream.gift_sheet"
        className="fixed bottom-0 left-0 right-0 z-[80] rounded-t-3xl overflow-hidden"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        style={{
          background: "linear-gradient(to bottom, #1a1a1a, #111)",
          maxHeight: "80vh",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-white font-bold text-base">Send a Gift</h3>
            <p className="text-white/40 text-xs mt-0.5">
              Support the creator with coins
            </p>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.3)",
            }}
          >
            <span className="text-sm">🪙</span>
            <span className="font-bold text-sm" style={{ color: "#f59e0b" }}>
              {coinBalance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Battle side selector */}
        {isBattle && onSetGiftTarget && (
          <div className="px-5 pt-3 flex gap-2">
            <button
              type="button"
              data-ocid="battle.support_host_button"
              onClick={() => onSetGiftTarget("host")}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
              style={{
                background:
                  giftTarget === "host" ? "#ff0050" : "rgba(255,0,80,0.1)",
                border: `1px solid ${giftTarget === "host" ? "#ff0050" : "rgba(255,0,80,0.3)"}`,
                color: giftTarget === "host" ? "white" : "#ff6b6b",
              }}
            >
              ❤️ Support {hostName ?? "Host"}
            </button>
            <button
              type="button"
              data-ocid="battle.support_guest_button"
              onClick={() => onSetGiftTarget("guest")}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
              style={{
                background:
                  giftTarget === "guest" ? "#3b82f6" : "rgba(59,130,246,0.1)",
                border: `1px solid ${giftTarget === "guest" ? "#3b82f6" : "rgba(59,130,246,0.3)"}`,
                color: giftTarget === "guest" ? "white" : "#60a5fa",
              }}
            >
              ❤️ Support {guestName ?? "Guest"}
            </button>
          </div>
        )}

        {/* Zero balance warning */}
        {noBalance && (
          <div
            className="mx-5 mt-4 px-4 py-3 rounded-2xl flex items-center justify-between gap-3"
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.3)",
            }}
          >
            <p className="text-amber-400 text-sm font-medium">
              Recharge coins to send gifts.
            </p>
            <button
              type="button"
              data-ocid="livestream.recharge_from_gift_button"
              onClick={() => {
                onClose();
                onOpenRecharge();
              }}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: "#ff0050", color: "white" }}
            >
              Recharge
            </button>
          </div>
        )}

        {/* Insufficient coins message */}
        <AnimatePresence>
          {insufficientMsg && (
            <motion.div
              className="mx-5 mt-3 px-4 py-2.5 rounded-xl text-sm text-center"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#f87171",
              }}
            >
              Not enough coins. Recharge to continue.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable catalog */}
        <div className="overflow-y-auto pb-8" style={{ maxHeight: "60vh" }}>
          {/* Regular gifts */}
          <div className="px-5 pt-4">
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">
              Regular Gifts
            </p>
            <div className="grid grid-cols-4 gap-2">
              {REGULAR_GIFTS.map((gift) => {
                const canAfford = coinBalance >= gift.coins;
                const isShaking = shakeGift === gift.name;
                return (
                  <motion.button
                    key={gift.name}
                    type="button"
                    data-ocid="livestream.gift_item_button"
                    onClick={() => handleGiftTap(gift)}
                    animate={isShaking ? { x: [0, -5, 5, -4, 4, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-all active:scale-90"
                    style={{
                      background: canAfford
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      opacity: canAfford ? 1 : 0.45,
                    }}
                    aria-label={`Send ${gift.name} for ${gift.coins} coins`}
                    disabled={noBalance}
                  >
                    <span className="text-2xl">{gift.emoji}</span>
                    <span className="text-white/60 text-[9px] font-medium leading-tight text-center">
                      {gift.name}
                    </span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: "rgba(255,0,80,0.18)",
                        color: "#ff6b6b",
                      }}
                    >
                      {formatCoins(gift.coins)}c
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Premium gifts */}
          <div className="px-5 pt-5 pb-4">
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
              <span
                className="text-amber-400"
                style={{ textShadow: "0 0 8px rgba(245,158,11,0.5)" }}
              >
                ✦
              </span>
              Premium Gifts
            </p>
            <div className="grid grid-cols-4 gap-2">
              {PREMIUM_GIFTS.map((gift) => {
                const canAfford = coinBalance >= gift.coins;
                const isShaking = shakeGift === gift.name;
                return (
                  <motion.button
                    key={gift.name}
                    type="button"
                    data-ocid="livestream.gift_premium_button"
                    onClick={() => handleGiftTap(gift)}
                    animate={isShaking ? { x: [0, -5, 5, -4, 4, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-all active:scale-90"
                    style={{
                      background: canAfford
                        ? "rgba(245,158,11,0.06)"
                        : "rgba(255,255,255,0.03)",
                      border: canAfford
                        ? "1px solid rgba(245,158,11,0.3)"
                        : "1px solid rgba(255,255,255,0.06)",
                      opacity: canAfford ? 1 : 0.45,
                    }}
                    aria-label={`Send ${gift.name} for ${formatCoins(gift.coins)} coins`}
                    disabled={noBalance}
                  >
                    <span className="text-2xl">{gift.emoji}</span>
                    <span className="text-white/60 text-[9px] font-medium leading-tight text-center">
                      {gift.name}
                    </span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: "rgba(245,158,11,0.18)",
                        color: "#f59e0b",
                      }}
                    >
                      {formatCoins(gift.coins)}c
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Goal Modal ───────────────────────────────────────────────────────────────

interface GoalModalProps {
  onClose: () => void;
  onSetGoal: (giftName: string, targetCount: number) => void;
}

function GoalModal({ onClose, onSetGoal }: GoalModalProps) {
  const [giftName, setGiftName] = useState("");
  const [targetCount, setTargetCount] = useState("");

  const handleSubmit = () => {
    const count = Number.parseInt(targetCount, 10);
    if (!giftName.trim() || !count || count < 1) return;
    onSetGoal(giftName.trim(), count);
    onClose();
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[80]"
        style={{ background: "rgba(0,0,0,0.7)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role="presentation"
      />
      <motion.div
        data-ocid="livestream.goal_modal"
        className="fixed bottom-0 left-0 right-0 z-[90] rounded-t-3xl pb-10 overflow-hidden"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        style={{ background: "#1a1a1a" }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="px-5 pb-3 border-b border-white/5">
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <Target size={16} stroke="#ff0050" />
            Set Gift Goal
          </h3>
          <p className="text-white/40 text-xs mt-0.5">
            Show viewers your gift goal during the stream
          </p>
        </div>
        <div className="px-5 pt-4 space-y-3">
          <div>
            <label
              htmlFor="goal-gift"
              className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5 block"
            >
              Gift Name
            </label>
            <input
              id="goal-gift"
              data-ocid="livestream.goal_gift_input"
              type="text"
              placeholder="e.g. Rose, Lion, Heart Me"
              value={giftName}
              onChange={(e) => setGiftName(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-white/5 text-white text-sm outline-none placeholder:text-white/25 border border-white/10"
              style={{ fontSize: "16px" }}
            />
          </div>
          <div>
            <label
              htmlFor="goal-count"
              className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5 block"
            >
              Target Count
            </label>
            <input
              id="goal-count"
              data-ocid="livestream.goal_count_input"
              type="number"
              inputMode="numeric"
              placeholder="e.g. 500"
              min="1"
              value={targetCount}
              onChange={(e) => setTargetCount(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-white/5 text-white text-sm outline-none placeholder:text-white/25 border border-white/10"
              style={{ fontSize: "16px" }}
            />
          </div>
          <button
            type="button"
            data-ocid="livestream.goal_set_button"
            onClick={handleSubmit}
            disabled={!giftName.trim() || !targetCount}
            className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ background: "#ff0050" }}
          >
            Set Goal
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Battle challenge row sub-component ──────────────────────────────────────

interface BattleChallengeRowProps {
  user: InviteUser;
  idx: number;
  streamId: string;
  onChallenge: () => void;
}

function BattleChallengeSentRow({
  user,
  idx,
  onChallenge,
}: BattleChallengeRowProps) {
  const [sent, setSent] = useState(false);
  return (
    <div
      data-ocid={`battle.opponent_row.${idx + 1}`}
      className="flex items-center gap-3 px-2 py-3 rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold overflow-hidden"
        style={{
          background: user.avatarUrl
            ? "transparent"
            : getUserGradient(user.name),
          fontSize: 14,
        }}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-full h-full object-cover"
          />
        ) : (
          getInitials(user.name)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">{user.name}</p>
        <p className="text-white/40 text-xs truncate">
          {user.principal.slice(0, 12)}…
        </p>
      </div>
      <button
        type="button"
        data-ocid={`battle.challenge_button.${idx + 1}`}
        onClick={() => {
          setSent(true);
          onChallenge();
        }}
        disabled={sent}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-60"
        style={
          sent
            ? {
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.5)",
              }
            : {
                background: "linear-gradient(135deg, #ff0050, #ff6b35)",
                color: "white",
              }
        }
      >
        {sent ? (
          "Sent ✓"
        ) : (
          <>
            <Swords size={12} strokeWidth={2.5} /> Challenge
          </>
        )}
      </button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface LiveStreamViewPageProps {
  stream: LiveStream;
  isHost?: boolean;
  mediaStream?: MediaStream;
  onBack: () => void;
  onEnd?: (stats: {
    totalLikes: number;
    totalGifts: number;
    totalViewers: number;
    startedAt: number;
  }) => void;
  onOpenRecharge?: () => void;
}

export function LiveStreamViewPage({
  stream,
  isHost = false,
  mediaStream,
  onBack,
  onEnd,
  onOpenRecharge,
}: LiveStreamViewPageProps) {
  const { actor, isAuthenticated } = useAuth();
  const { coinBalance, deductCoins, addDiamonds, recordGift } = useCoinWallet();
  const { identity } = useInternetIdentity();

  // ── Chat ────────────────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatEntry[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  // ── Gift ────────────────────────────────────────────────────────────────────
  const [giftAnimations, setGiftAnimations] = useState<GiftAnimEntry[]>([]);
  const [giftSheetOpen, setGiftSheetOpen] = useState(false);
  const [giftCount, setGiftCount] = useState(stream.giftCount ?? 0);

  // ── Engagement ──────────────────────────────────────────────────────────────
  const [likeCount, setLikeCount] = useState(stream.likeCount ?? 0);

  // ── Follow ──────────────────────────────────────────────────────────────────
  const [followed, setFollowed] = useState(false);

  // ── Host controls ───────────────────────────────────────────────────────────
  const [micMuted, setMicMuted] = useState(false);
  const [hostControlsOpen, setHostControlsOpen] = useState(false);
  const [inviteSheetOpen, setInviteSheetOpen] = useState(false);
  const [liveSettingsOpen, setLiveSettingsOpen] = useState(false);
  const [battleChallengeOpen, setBattleChallengeOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);

  // ── Camera state ────────────────────────────────────────────────────────────
  const [mirrored, setMirrored] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [videoPausedByHost, setVideoPausedByHost] = useState(false);
  const [noiseReduction, setNoiseReduction] = useState(false);

  // ── Settings toggles ────────────────────────────────────────────────────────
  const [allowGuestRequests, setAllowGuestRequests] = useState(true);
  const [allowViewerSuggestions, setAllowViewerSuggestions] = useState(true);
  const [notifyFriendsGoLive, setNotifyFriendsGoLive] = useState(true);
  const [notifySuggestedCreators, setNotifySuggestedCreators] = useState(false);

  // ── Invite ──────────────────────────────────────────────────────────────────
  const [allUsers, setAllUsers] = useState<InviteUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());

  // ── Battle mode ─────────────────────────────────────────────────────────────
  const [localStream, setLocalStream] = useState(stream);
  const [battleTimer, setBattleTimer] = useState(BATTLE_DURATION_SEC);
  const [battleLeftScore, setBattleLeftScore] = useState(0);
  const [battleRightScore, setBattleRightScore] = useState(0);
  const [giftTarget, setGiftTarget] = useState<"host" | "guest">("host");
  const [battleEnded, setBattleEnded] = useState(false);
  const [battleEndScores, setBattleEndScores] = useState<{
    left: number;
    right: number;
  }>({ left: 0, right: 0 });
  const [showMvpCrown, setShowMvpCrown] = useState(false);
  // Supporter tracking for battle bar
  const [topSupporters, setTopSupporters] = useState<{
    left: string[];
    right: string[];
  }>({ left: [], right: [] });

  // ── Multiplier state ─────────────────────────────────────────────────────────
  const [activeMultiplier, setActiveMultiplier] = useState<1 | 2 | 3>(1);
  const [multiplierTimeLeft, setMultiplierTimeLeft] = useState(0);
  const [multiplierPhase, setMultiplierPhase] = useState<
    "starting" | "active" | null
  >(null);
  const multiplierTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Heart bursts ────────────────────────────────────────────────────────────
  const [heartBursts, setHeartBursts] = useState<HeartBurst[]>([]);
  const lastTapRef = useRef<number>(0);
  const burstIdRef = useRef(0);
  const isTouchGestureRef = useRef(false);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Floating hearts ─────────────────────────────────────────────────────────
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const heartIdRef = useRef(0);

  // ── Video ───────────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPaused, setVideoPaused] = useState(false);

  // ── Viewer count ────────────────────────────────────────────────────────────
  const [viewerCount] = useState(stream.viewerCount);

  // ── Start time ──────────────────────────────────────────────────────────────
  const startedAtRef = useRef<number>(stream.startedAt ?? Date.now());

  // ── Share toast ─────────────────────────────────────────────────────────────
  const [shareToast, setShareToast] = useState(false);

  // ── Power menu (top-right) ────────────────────────────────────────────────
  const [powerMenuOpen, setPowerMenuOpen] = useState(false);

  // ── More toolbar menu ─────────────────────────────────────────────────────
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // ── Comment action sheet ──────────────────────────────────────────────────
  const [commentActionMsg, setCommentActionMsg] = useState<ChatEntry | null>(
    null,
  );

  // ── Chat scroll ─────────────────────────────────────────────────────────────
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Goal system ─────────────────────────────────────────────────────────────
  const [goal, setGoal] = useState<GoalState | null>(null);

  // ── Not enough coins dialog ─────────────────────────────────────────────────
  const [showNoCoinsDialog, setShowNoCoinsDialog] = useState(false);

  // ── Assign media stream to video ────────────────────────────────────────────
  useEffect(() => {
    if (mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      void videoRef.current.play().catch(() => {});
    }
    return () => {
      if (mediaStream) {
        for (const t of mediaStream.getTracks()) t.stop();
      }
    };
  }, [mediaStream]);

  // ── Mic mute ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mediaStream) return;
    for (const track of mediaStream.getAudioTracks()) {
      track.enabled = !micMuted;
    }
  }, [micMuted, mediaStream]);

  // ── Chat polling ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!actor || !stream.hostPrincipal) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const { Principal } = await import("@icp-sdk/core/principal");
        const msgs = await actor.getConversation(
          Principal.fromText(stream.hostPrincipal!),
        );
        if (cancelled) return;
        const entries: ChatEntry[] = msgs
          .filter((m) => !m.text.startsWith("LIVE_INVITE:"))
          .map((m) => ({
            id: m.id.toString(),
            username: m.fromUser.toText().slice(0, 8),
            message: m.text,
          }));
        setChatMessages(entries.slice(-50));
      } catch {
        // silent
      }
    };
    void poll();
    const interval = setInterval(() => void poll(), 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [actor, stream.hostPrincipal]);

  // ── Auto-scroll chat ────────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  // ── Battle timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!localStream.battleMode || battleEnded) return;
    const tick = setInterval(() => {
      setBattleTimer((prev) => {
        if (prev <= 1) {
          clearInterval(tick);
          // Capture final scores and mark battle as ended
          setBattleLeftScore((ls) => {
            setBattleRightScore((rs) => {
              setBattleEndScores({ left: ls, right: rs });
              return rs;
            });
            return ls;
          });
          setBattleEnded(true);
          setShowMvpCrown(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [localStream.battleMode, battleEnded]);

  // ── Load invite users ───────────────────────────────────────────────────────
  useEffect(() => {
    if ((!inviteSheetOpen && !battleChallengeOpen) || !actor) return;
    setLoadingUsers(true);
    void (async () => {
      try {
        const ids = await actor.getAllUserids();
        const profiles = await Promise.all(
          ids.slice(0, 20).map(async (id) => {
            const profile = await actor.getUserProfile(id);
            return profile
              ? {
                  principal: id.toText(),
                  name: profile.name,
                  avatarUrl: profile.avatarUrl,
                }
              : null;
          }),
        );
        setAllUsers(profiles.filter(Boolean) as InviteUser[]);
      } catch {
        setAllUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, [inviteSheetOpen, battleChallengeOpen, actor]);

  // ── Flip camera ─────────────────────────────────────────────────────────────
  const switchCameraFacing = useCallback(async () => {
    if (!mediaStream) return;
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode },
        audio: true,
      });
      if (videoRef.current) videoRef.current.srcObject = newStream;
      for (const t of mediaStream.getTracks()) t.stop();
    } catch {
      // silent
    }
  }, [facingMode, mediaStream]);

  // ── Send chat message ───────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    setEmojiPickerOpen(false);

    if (actor && stream.hostPrincipal) {
      try {
        const { Principal } = await import("@icp-sdk/core/principal");
        await actor.sendMessage(Principal.fromText(stream.hostPrincipal), text);
      } catch {
        setChatMessages((prev) => [
          ...prev.slice(-49),
          { id: `local-${Date.now()}`, username: "You", message: text },
        ]);
      }
    } else {
      setChatMessages((prev) => [
        ...prev.slice(-49),
        { id: `local-${Date.now()}`, username: "You", message: text },
      ]);
    }
  }, [chatInput, actor, stream.hostPrincipal]);

  // ── Like ────────────────────────────────────────────────────────────────────
  const handleLike = useCallback(() => {
    setLikeCount((prev) => prev + 1);
    const count = 5 + Math.floor(Math.random() * 4);
    const newHearts: FloatingHeart[] = Array.from(
      { length: count },
      (_, i) => ({
        id: heartIdRef.current++,
        offsetX: (Math.random() - 0.5) * 40,
        delay: i * 0.08,
      }),
    );
    setFloatingHearts((prev) => [...prev, ...newHearts]);
  }, []);

  const handleHeartGone = useCallback((id: number) => {
    setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // ── Send gift ───────────────────────────────────────────────────────────────
  const sendGift = useCallback(
    (gift: (typeof GIFT_CATALOG)[number]) => {
      // Check balance
      if (coinBalance < gift.coins) {
        setShowNoCoinsDialog(true);
        return;
      }

      // Deduct coins
      const success = deductCoins(gift.coins);
      if (!success) {
        setShowNoCoinsDialog(true);
        return;
      }

      setGiftSheetOpen(false);
      setGiftCount((prev) => prev + 1);

      // Add diamonds to creator (100 coins sent = 50 diamonds)
      addDiamonds(Math.floor(gift.coins / 2));

      // Record in history
      recordGift({
        giftName: gift.name,
        coinCost: gift.coins,
        sentAt: Date.now(),
        recipientName: stream.hostName,
      });

      // Battle score — route to selected side + track supporters (apply multiplier)
      if (localStream.battleMode) {
        const pts = gift.coins * activeMultiplier;
        if (giftTarget === "host") {
          setBattleLeftScore((prev) => prev + pts);
          setTopSupporters((prev) => ({
            ...prev,
            left: Array.from(new Set(["You", ...prev.left])).slice(0, 3),
          }));
        } else {
          setBattleRightScore((prev) => prev + pts);
          setTopSupporters((prev) => ({
            ...prev,
            right: Array.from(new Set(["You", ...prev.right])).slice(0, 3),
          }));
        }
      }

      // Update goal counter
      if (goal && gift.name.toLowerCase() === goal.giftName.toLowerCase()) {
        setGoal((prev) =>
          prev
            ? {
                ...prev,
                currentCount: Math.min(prev.currentCount + 1, prev.targetCount),
              }
            : prev,
        );
      }

      // Chat notification
      setChatMessages((prev) => [
        ...prev.slice(-49),
        {
          id: `gift-${Date.now()}`,
          username: "You",
          message: "",
          isGift: true,
          giftEmoji: gift.emoji,
        },
      ]);

      // Queue animation
      const animId = `anim-${Date.now()}`;
      setGiftAnimations((prev) => {
        // Premium goes to front
        if (gift.tier === "premium") {
          return [{ id: animId, gift, senderName: "You" }, ...prev];
        }
        return [...prev, { id: animId, gift, senderName: "You" }];
      });
    },
    [
      coinBalance,
      deductCoins,
      addDiamonds,
      recordGift,
      stream.hostName,
      localStream.battleMode,
      giftTarget,
      goal,
      activeMultiplier,
    ],
  );

  const handleGiftComplete = useCallback((id: string) => {
    setGiftAnimations((prev) => prev.filter((g) => g.id !== id));
  }, []);

  // ── Follow ──────────────────────────────────────────────────────────────────
  const handleFollow = useCallback(async () => {
    setFollowed((v) => !v);
    if (actor && stream.hostPrincipal) {
      try {
        const { Principal } = await import("@icp-sdk/core/principal");
        const p = Principal.fromText(stream.hostPrincipal);
        if (!followed) await actor.follow(p);
        else await actor.unfollow(p);
      } catch {
        // silent
      }
    }
  }, [actor, stream.hostPrincipal, followed]);

  // ── Invite ──────────────────────────────────────────────────────────────────
  const inviteUser = useCallback(
    async (principalStr: string) => {
      if (!actor) return;
      try {
        const { Principal } = await import("@icp-sdk/core/principal");
        await actor.sendMessage(
          Principal.fromText(principalStr),
          `LIVE_INVITE:${stream.id}`,
        );
        setInvitedUsers((prev) => new Set([...prev, principalStr]));
      } catch {
        // silent
      }
    },
    [actor, stream.id],
  );

  // ── Double tap heart ────────────────────────────────────────────────────────
  const fireDoubleTap = useCallback(
    (clientX: number, clientY: number) => {
      const id = burstIdRef.current++;
      setHeartBursts((prev) => [...prev, { id, x: clientX, y: clientY }]);
      setLikeCount((prev) => prev + 1);
      // Apply multiplier to battle score on double tap
      if (localStream.battleMode) {
        const pts = 1 * activeMultiplier;
        if (giftTarget === "host") {
          setBattleLeftScore((prev) => prev + pts);
        } else {
          setBattleRightScore((prev) => prev + pts);
        }
      }
      setTimeout(() => {
        setHeartBursts((prev) => prev.filter((h) => h.id !== id));
      }, 700);
    },
    [localStream.battleMode, activeMultiplier, giftTarget],
  );

  const handleVideoTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      isTouchGestureRef.current = true;
      const touch = e.changedTouches[0];
      const clientX = touch?.clientX ?? 0;
      const clientY = touch?.clientY ?? 0;
      const now = Date.now();
      const diff = now - lastTapRef.current;
      lastTapRef.current = now;

      if (diff < 300 && diff > 0) {
        if (singleTapTimerRef.current) {
          clearTimeout(singleTapTimerRef.current);
          singleTapTimerRef.current = null;
        }
        fireDoubleTap(clientX, clientY);
      } else {
        if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = setTimeout(() => {
          const el = videoRef.current;
          if (el) {
            if (el.paused) {
              void el.play();
              setVideoPaused(false);
            } else {
              el.pause();
              setVideoPaused(true);
            }
          }
        }, 310);
      }
    },
    [fireDoubleTap],
  );

  const handleVideoClick = useCallback(
    (e: React.MouseEvent) => {
      if (isTouchGestureRef.current) {
        isTouchGestureRef.current = false;
        return;
      }
      const now = Date.now();
      const diff = now - lastTapRef.current;
      lastTapRef.current = now;

      if (diff < 300 && diff > 0) {
        if (singleTapTimerRef.current) {
          clearTimeout(singleTapTimerRef.current);
          singleTapTimerRef.current = null;
        }
        fireDoubleTap(e.clientX, e.clientY);
      } else {
        if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = setTimeout(() => {
          const el = videoRef.current;
          if (el) {
            if (el.paused) {
              void el.play();
              setVideoPaused(false);
            } else {
              el.pause();
              setVideoPaused(true);
            }
          }
        }, 310);
      }
    },
    [fireDoubleTap],
  );

  // ── Share ───────────────────────────────────────────────────────────────────
  const handleShare = useCallback(() => {
    if (navigator.share) {
      void navigator
        .share({
          title: stream.title,
          text: `Watch ${stream.hostName} live on SUB STREAM!`,
        })
        .catch(() => {});
    } else {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    }
  }, [stream.hostName, stream.title]);

  // ── End stream ──────────────────────────────────────────────────────────────
  const handleEndStream = useCallback(() => {
    setHostControlsOpen(false);
    // Clear live status in localStorage + mark signal inactive
    const myPrincipal = identity?.getPrincipal().toString();
    if (myPrincipal) {
      setLiveStatusStatic(myPrincipal, false);
      // Mark all signals by this host as inactive so they stop appearing in discovery
      markLiveSignalInactive(stream.id);
    }
    onEnd?.({
      totalLikes: likeCount,
      totalGifts: giftCount,
      totalViewers: viewerCount,
      startedAt: startedAtRef.current,
    });
  }, [onEnd, likeCount, giftCount, viewerCount, identity, stream.id]);

  // ── Pause / resume stream ───────────────────────────────────────────────────
  const handlePauseResumeStream = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setVideoPausedByHost(false);
      setVideoPaused(false);
    } else {
      el.pause();
      setVideoPausedByHost(true);
      setVideoPaused(true);
    }
  }, []);

  // ── Multiplier activation ────────────────────────────────────────────────────
  const activateMultiplier = useCallback((mult: 2 | 3) => {
    if (multiplierTimerRef.current) clearTimeout(multiplierTimerRef.current);
    setActiveMultiplier(mult);
    setMultiplierPhase("starting");
    setMultiplierTimeLeft(45);
    setTimeout(() => setMultiplierPhase("active"), 2000);
    multiplierTimerRef.current = setTimeout(() => {
      setActiveMultiplier(1);
      setMultiplierPhase(null);
      setMultiplierTimeLeft(0);
    }, 45000);
  }, []);

  // ── Multiplier countdown ─────────────────────────────────────────────────────
  useEffect(() => {
    if (multiplierTimeLeft <= 0) return;
    const t = setInterval(() => {
      setMultiplierTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [multiplierTimeLeft]);

  // ── Cleanup multiplier timer on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      if (multiplierTimerRef.current) clearTimeout(multiplierTimerRef.current);
    };
  }, []);

  // ── Seed follow state from backend on mount ───────────────────────────────
  useEffect(() => {
    if (!actor || !stream.hostPrincipal || !isAuthenticated || isHost) return;
    void (async () => {
      try {
        const { Principal } = await import("@icp-sdk/core/principal");
        const alreadyFollowing = await actor.isFollowing(
          Principal.fromText(stream.hostPrincipal!),
        );
        setFollowed(alreadyFollowing);
      } catch {
        // silent
      }
    })();
  }, [actor, stream.hostPrincipal, isAuthenticated, isHost]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const engagementProgress = Math.min(
    (likeCount / MAX_ENGAGEMENT_LIKES) * 100,
    100,
  );
  const isBattle = localStream.battleMode === true;
  const hasCohost = localStream.cohosts && localStream.cohosts.length > 0;
  const numCohosts = localStream.cohosts?.length ?? 0;
  const battleTotal = battleLeftScore + battleRightScore || 1;
  const hasRealStream = isHost && !!mediaStream;
  // Derived battle winner from final scores
  const battleWinner =
    battleEndScores.left >= battleEndScores.right
      ? stream.hostName
      : (localStream.battleOpponentName ?? "Guest");
  const battleWinnerSide: "left" | "right" =
    battleEndScores.left >= battleEndScores.right ? "left" : "right";

  return (
    <div
      data-ocid="livestream.page"
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ background: "#000" }}
    >
      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 0 — CAMERA VIDEO (full screen background)
          Only render gradient when NO real stream
      ═══════════════════════════════════════════════════════════════════ */}

      {hasCohost ? (
        <div
          className={`absolute inset-0 ${numCohosts === 1 ? "grid grid-cols-2" : "grid grid-cols-2 grid-rows-2"} gap-0.5`}
          style={{ zIndex: 0 }}
        >
          {/* Host panel */}
          <div className="relative overflow-hidden bg-black">
            {hasRealStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isHost}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: mirrored ? "scaleX(-1)" : "none",
                  willChange: "transform",
                }}
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background: isBattle
                    ? "linear-gradient(135deg, rgba(255,0,80,0.2), rgba(0,0,0,0.8))"
                    : "linear-gradient(135deg, #1a1a2e, #0d0d1a)",
                }}
              />
            )}
            {/* Host name label */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <span
                className="text-white text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,0,80,0.75)" }}
              >
                {stream.hostName}
              </span>
              {isBattle && (
                <span
                  className="text-white text-xs font-black px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,0,80,0.4)" }}
                >
                  ❤️ {battleLeftScore}
                </span>
              )}
            </div>
          </div>

          {/* Guest panels */}
          {(localStream.cohosts ?? []).map((cohost, ci) => (
            <div
              key={cohost.name}
              className="relative overflow-hidden bg-black"
            >
              {/* Gradient fallback with avatar */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  background: isBattle
                    ? "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(0,0,0,0.8))"
                    : "linear-gradient(135deg, #0d1a2e, #0d0d1a)",
                }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-black"
                  style={{
                    background: getUserGradient(cohost.name),
                    boxShadow: "0 0 24px rgba(0,0,0,0.5)",
                  }}
                >
                  {getInitials(cohost.name)}
                </div>
              </div>
              {/* Guest name + remove button */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span
                  className="text-white text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(0,0,0,0.65)" }}
                >
                  {cohost.name}
                </span>
                <div className="flex items-center gap-1">
                  {isBattle && (
                    <span
                      className="text-white text-xs font-black px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(59,130,246,0.4)" }}
                    >
                      ❤️ {battleRightScore}
                    </span>
                  )}
                  {isHost && (
                    <button
                      type="button"
                      data-ocid={`livestream.remove_cohost.${ci + 1}`}
                      onClick={() => {
                        setLocalStream((prev) => ({
                          ...prev,
                          cohosts: (prev.cohosts ?? []).filter(
                            (c) => c.name !== cohost.name,
                          ),
                        }));
                      }}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs transition-all active:scale-90"
                      style={{
                        background: "rgba(255,0,80,0.5)",
                        border: "1px solid rgba(255,0,80,0.4)",
                      }}
                      aria-label={`Remove ${cohost.name}`}
                    >
                      <X size={12} stroke="white" strokeWidth={3} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          data-ocid="livestream.canvas_target"
          className="absolute inset-0"
          style={{ zIndex: 0 }}
          onTouchEnd={handleVideoTouchEnd}
          onClick={handleVideoClick}
          onKeyDown={(e) => {
            if (e.key === " ") {
              const el = videoRef.current;
              if (el) {
                if (el.paused) {
                  void el.play();
                  setVideoPaused(false);
                } else {
                  el.pause();
                  setVideoPaused(true);
                }
              }
            }
          }}
          role="presentation"
          aria-label="Live stream — double tap to like"
        >
          {/* Gradient fallback (only shown when no real camera video) */}
          {!hasRealStream && (
            <>
              <div
                className={`absolute inset-0 bg-gradient-to-b ${stream.gradientFrom} ${stream.gradientTo}`}
              />
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full blur-3xl bg-white/10" />
                <div className="absolute bottom-1/2 right-1/4 w-48 h-48 rounded-full blur-2xl bg-white/10" />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
                <span
                  className="text-white/5 text-7xl font-black tracking-widest"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  LIVE
                </span>
              </div>
            </>
          )}

          {/* Camera video — is the background when hasRealStream */}
          {hasRealStream && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isHost}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: mirrored ? "scaleX(-1)" : "none",
                zIndex: 0,
                willChange: "transform",
              }}
            />
          )}

          {/* Pause overlay */}
          <AnimatePresence>
            {(videoPaused || videoPausedByHost) && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ zIndex: 1 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="white"
                    aria-label="Play"
                    role="img"
                  >
                    <title>Play</title>
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 10 — readability gradients (semi-transparent, no solid bg)
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 10,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.35) 35%, rgba(0,0,0,0.08) 55%, transparent 75%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 10,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 28%)",
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 30 — HEART BURSTS
      ═══════════════════════════════════════════════════════════════════ */}
      {heartBursts.map((burst) => (
        <div
          key={burst.id}
          className="heart-burst absolute pointer-events-none"
          style={{
            left: burst.x - 40,
            top: burst.y - 40,
            width: 80,
            height: 80,
            zIndex: 30,
          }}
        >
          <Heart size={80} fill="#ff0050" stroke="none" />
        </div>
      ))}

      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 30 — GIFT ANIMATIONS
      ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {giftAnimations.map((anim) => (
          <GiftAnimation
            key={anim.id}
            id={anim.id}
            gift={anim.gift}
            senderName={anim.senderName}
            onComplete={handleGiftComplete}
          />
        ))}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════
          LAYER 20 — ALL UI OVERLAYS (transparent backgrounds only)
      ═══════════════════════════════════════════════════════════════════ */}

      {/* TOP ROW */}
      <div
        className="absolute top-0 left-0 right-0 flex items-start px-4 pt-12 pb-0 gap-3"
        style={{ zIndex: 20 }}
      >
        {/* TOP-LEFT: host info */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <AvatarCircle
            url={stream.hostAvatarUrl}
            name={stream.hostName}
            size={36}
            showLiveRing
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-white font-bold text-sm truncate leading-tight"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              {stream.hostName}
            </p>
          </div>
          {!isHost && (
            <button
              type="button"
              data-ocid="livestream.follow_button"
              onClick={() => void handleFollow()}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95"
              style={
                followed
                  ? {
                      background: "rgba(255,0,80,0.15)",
                      border: "1.5px solid rgba(255,0,80,0.5)",
                      color: "#ff6b6b",
                    }
                  : { background: "#ff0050", color: "white" }
              }
            >
              {followed ? (
                "✓ Following"
              ) : (
                <>
                  <UserPlus size={11} strokeWidth={2.5} />
                  Follow
                </>
              )}
            </button>
          )}
        </div>

        {/* TOP-CENTER: LIVE badge + viewers */}
        <div className="absolute left-1/2 -translate-x-1/2 top-12 flex flex-col items-center gap-1">
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{ background: "#ff0050" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0"
              style={{ animation: "livePulse 1.5s ease-in-out infinite" }}
            />
            <span className="text-white text-xs font-black tracking-widest">
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Eye size={10} stroke="rgba(255,255,255,0.75)" strokeWidth={2} />
            <span className="text-white/75 text-[11px] font-medium">
              {formatViewers(viewerCount)}
            </span>
          </div>
        </div>

        {/* TOP-RIGHT: power menu + close */}
        <div className="flex items-center gap-2 flex-shrink-0 relative">
          <GlassButton
            onClick={() => setPowerMenuOpen((v) => !v)}
            className="w-9 h-9 rounded-full"
            aria-label="Stream options"
            data-ocid="livestream.power_menu_button"
          >
            <Power size={16} stroke="white" strokeWidth={2} />
          </GlassButton>
          <GlassButton
            onClick={onBack}
            className="w-9 h-9 rounded-full"
            aria-label="Close live"
            data-ocid="livestream.close_button"
          >
            <X size={18} stroke="white" strokeWidth={2.5} />
          </GlassButton>

          {/* Power dropdown menu */}
          <AnimatePresence>
            {powerMenuOpen && (
              <>
                {/* Backdrop to close */}
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss */}
                <div
                  className="fixed inset-0"
                  style={{ zIndex: 59 }}
                  onClick={() => setPowerMenuOpen(false)}
                />
                <motion.div
                  data-ocid="livestream.power_menu_dropdown"
                  initial={{ opacity: 0, scale: 0.92, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-11 right-0 rounded-2xl overflow-hidden"
                  style={{
                    zIndex: 60,
                    background: "rgba(18,18,18,0.97)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    minWidth: 168,
                  }}
                >
                  {isHost && (
                    <button
                      type="button"
                      data-ocid="livestream.end_live_menu_button"
                      onClick={() => {
                        setPowerMenuOpen(false);
                        handleEndStream();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-left hover:bg-white/5 transition-colors"
                      style={{ color: "#ff0050" }}
                    >
                      <span>⏹</span> End Live
                    </button>
                  )}
                  {isHost && (
                    <button
                      type="button"
                      data-ocid="livestream.stream_settings_menu_button"
                      onClick={() => {
                        setPowerMenuOpen(false);
                        setLiveSettingsOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-left hover:bg-white/5 transition-colors"
                      style={{ color: "rgba(255,255,255,0.85)" }}
                    >
                      <span>⚙️</span> Stream Settings
                    </button>
                  )}
                  <button
                    type="button"
                    data-ocid="livestream.live_info_menu_button"
                    onClick={() => setPowerMenuOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-left hover:bg-white/5 transition-colors"
                    style={{ color: "rgba(255,255,255,0.85)" }}
                  >
                    <span>ℹ️</span> Live Info · {formatViewers(viewerCount)}{" "}
                    viewers
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ENGAGEMENT BAR */}
      {!isBattle && (
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2"
          style={{ top: "calc(3rem + 68px)", zIndex: 20 }}
        >
          <span className="text-white text-xs font-semibold">
            ❤️ x{likeCount}
          </span>
          <div
            className="w-24 h-1.5 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #ff0050, #ff6b35)" }}
              animate={{ width: `${engagementProgress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* CREATOR GOAL BAR */}
      <AnimatePresence>
        {goal && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
            style={{ top: "calc(3rem + 100px)", zIndex: 20, minWidth: 200 }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-white/80 text-xs">
                {goal.giftName} Goal: {goal.currentCount} / {goal.targetCount}
              </span>
            </div>
            <div
              className="w-40 h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
                }}
                animate={{
                  width: `${(goal.currentCount / goal.targetCount) * 100}%`,
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <span className="text-white/40 text-[10px]">
              {Math.round((goal.currentCount / goal.targetCount) * 100)}%
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BATTLE TOP BAR — spans full screen in split view */}
      {isBattle && hasCohost && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2"
          style={{
            zIndex: 40,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black" style={{ color: "#ff0050" }}>
                ❤️ {battleLeftScore}
              </span>
              <span className="text-xs font-bold text-white/70 max-w-[80px] truncate">
                {stream.hostName}
              </span>
            </div>
            {/* Left supporters */}
            {topSupporters.left.length > 0 && (
              <div
                data-ocid="battle.left_supporters"
                className="flex items-center gap-0.5"
              >
                {topSupporters.left.map((name) => (
                  <div
                    key={`ls-${name}`}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white font-black overflow-hidden flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #ff0050, #ff6b35)",
                      fontSize: 7,
                    }}
                  >
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-0.5">
            <span
              className={battleTimer <= 30 ? "battle-timer-urgent" : ""}
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 900,
                fontSize: "1rem",
                color: battleTimer <= 30 ? "#ff0050" : "white",
                transition: "color 0.3s",
              }}
            >
              {String(Math.floor(battleTimer / 60)).padStart(2, "0")}:
              {String(battleTimer % 60).padStart(2, "0")}
            </span>
            {activeMultiplier > 1 && (
              <span
                className="text-xs font-black px-2 py-0.5 rounded-full"
                style={{
                  background:
                    activeMultiplier === 2
                      ? "rgba(245,158,11,0.3)"
                      : "rgba(168,85,247,0.3)",
                  color: activeMultiplier === 2 ? "#fbbf24" : "#c084fc",
                }}
              >
                x{activeMultiplier} {multiplierTimeLeft}s
              </span>
            )}
          </div>

          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white/70 max-w-[80px] truncate text-right">
                {localStream.battleOpponentName ?? "Guest"}
              </span>
              <span className="text-sm font-black" style={{ color: "#3b82f6" }}>
                {battleRightScore} ❤️
              </span>
            </div>
            {/* Right supporters */}
            {topSupporters.right.length > 0 && (
              <div
                data-ocid="battle.right_supporters"
                className="flex items-center justify-end gap-0.5"
              >
                {topSupporters.right.map((name) => (
                  <div
                    key={`rs-${name}`}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white font-black overflow-hidden flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                      fontSize: 7,
                    }}
                  >
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BATTLE MODE OVERLAY */}
      {isBattle && (
        <div
          className="absolute left-0 right-0 top-24 flex flex-col items-center gap-2 px-4"
          style={{ zIndex: 20 }}
        >
          <div
            className="absolute left-4 top-0 flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{ background: "rgba(255,0,80,0.7)" }}
          >
            <span className="text-white text-xs font-bold">
              {stream.hostName}
            </span>
          </div>
          <div
            className="absolute right-4 top-0 flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{ background: "rgba(59,130,246,0.7)" }}
          >
            <span className="text-white text-xs font-bold">
              {localStream.battleOpponentName ?? "Opponent"}
            </span>
          </div>
          <div className="mt-8 flex flex-col items-center gap-1">
            <span
              className={
                battleTimer <= 30 ? "battle-timer-urgent" : "battle-pulse"
              }
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 900,
                fontSize: "1.5rem",
                color: battleTimer <= 30 ? "#ff0050" : "white",
                transition: "color 0.3s",
              }}
            >
              {String(Math.floor(battleTimer / 60)).padStart(2, "0")}:
              {String(battleTimer % 60).padStart(2, "0")}
            </span>
            <span className="text-white/50 text-[10px] uppercase tracking-widest">
              Battle
            </span>
          </div>
          <div
            className="w-64 h-3 rounded-full overflow-hidden flex mt-1"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <motion.div
              className="h-full rounded-l-full"
              style={{ background: "#ff0050" }}
              animate={{ width: `${(battleLeftScore / battleTotal) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
            <motion.div
              className="h-full rounded-r-full ml-auto"
              style={{ background: "#3b82f6" }}
              animate={{ width: `${(battleRightScore / battleTotal) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between w-64">
            <span className="text-white/60 text-xs">{battleLeftScore} 🏆</span>
            <span className="text-white/60 text-xs">🏆 {battleRightScore}</span>
          </div>
        </div>
      )}

      {/* Floating hearts — anchored bottom-right area */}
      <div
        className="absolute pointer-events-none"
        style={{ bottom: "9rem", right: "1.25rem", zIndex: 20, width: 64 }}
      >
        {floatingHearts.map((h) => (
          <FloatingHeartEl
            key={h.id}
            id={h.id}
            offsetX={h.offsetX}
            delay={h.delay}
            onDone={handleHeartGone}
          />
        ))}
      </div>

      {/* BOTTOM-LEFT — chat messages */}
      <div
        className="absolute flex flex-col justify-end overflow-hidden"
        style={{
          bottom: "8.5rem",
          left: "0.75rem",
          maxWidth: "72%",
          maxHeight: "45vh",
          zIndex: 20,
        }}
      >
        {chatMessages.length === 0 ? (
          <p
            className="text-white/35 text-xs italic px-1"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}
          >
            Be the first to say something!
          </p>
        ) : (
          <div
            className="overflow-y-auto no-scrollbar flex flex-col justify-end gap-0.5 pr-2"
            style={{ maxHeight: "45vh" }}
          >
            {chatMessages.map((msg) => (
              <button
                key={msg.id}
                type="button"
                data-ocid="livestream.chat_message_button"
                onClick={() => setCommentActionMsg(msg)}
                className="text-left w-full transition-opacity active:opacity-70"
              >
                <LiveChatMessage
                  username={msg.username}
                  message={msg.message}
                  avatarUrl={msg.avatarUrl}
                  isGift={msg.isGift}
                  giftEmoji={msg.giftEmoji}
                />
              </button>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS AREA */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          zIndex: 40,
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
        }}
      >
        {/* Horizontal icon toolbar — above the message input */}
        <div
          className="flex items-center gap-1.5 px-3 pb-2 pt-1 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Like pill */}
          <ToolbarPill
            icon="❤️"
            label={formatViewers(likeCount)}
            onClick={handleLike}
            ocid="livestream.like_button"
          />
          {/* Gift */}
          <ToolbarPill
            icon="🎁"
            label={giftCount > 0 ? formatViewers(giftCount) : "Gift"}
            onClick={() => setGiftSheetOpen(true)}
            ocid="livestream.gift_button"
          />
          {/* Co-host (host only) */}
          {isHost && (
            <ToolbarPill
              icon="👥"
              label="Co-host"
              onClick={() => setInviteSheetOpen(true)}
              ocid="livestream.cohost_button"
            />
          )}
          {/* Share */}
          <ToolbarPill
            icon="🔗"
            label="Share"
            onClick={handleShare}
            ocid="livestream.share_toolbar_button"
          />
          {/* Effects placeholder */}
          <ToolbarPill
            icon="✨"
            label="Effects"
            onClick={() => {}}
            ocid="livestream.effects_button"
          />
          {/* More */}
          <ToolbarPill
            icon="···"
            label="More"
            onClick={() => setMoreMenuOpen(true)}
            ocid="livestream.more_toolbar_button"
          />
        </div>

        {/* Message input row */}
        <div className="flex items-center gap-2 px-3 pb-3">
          {/* Emoji */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              data-ocid="livestream.emoji_button"
              onClick={() => setEmojiPickerOpen((v) => !v)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
              aria-label="Emoji"
            >
              <Smile size={17} stroke="white" strokeWidth={2} />
            </button>

            <AnimatePresence>
              {emojiPickerOpen && (
                <motion.div
                  data-ocid="livestream.emoji_popover"
                  className="absolute bottom-12 left-0 flex flex-wrap gap-1.5 p-3 rounded-2xl"
                  style={{
                    zIndex: 50,
                    background: "rgba(20,20,20,0.95)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    width: "200px",
                  }}
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                >
                  {EMOJI_PICKER.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setChatInput((prev) => prev + emoji);
                        setEmojiPickerOpen(false);
                      }}
                      className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-white/10 transition-colors"
                      aria-label={`Insert ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input */}
          <div
            className="flex-1 flex items-center rounded-full overflow-hidden"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <input
              data-ocid="livestream.chat_input"
              type="text"
              placeholder="Type a message…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSendMessage();
              }}
              className="flex-1 bg-transparent text-white text-sm px-3 py-2.5 outline-none placeholder:text-white/40"
              style={{ fontSize: "16px" }}
            />
          </div>

          {/* Send */}
          <button
            type="button"
            data-ocid="livestream.chat_send_button"
            onClick={() => void handleSendMessage()}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
            style={{
              background: chatInput.trim()
                ? "linear-gradient(135deg, #ff0050, #ff6b35)"
                : "rgba(255,255,255,0.1)",
            }}
            aria-label="Send message"
          >
            <Send size={15} stroke="white" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ═══ SHEETS / MODALS (z-70+) ═══ */}

      {/* MORE MENU SHEET */}
      <AnimatePresence>
        {moreMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 70 }}
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreMenuOpen(false)}
            />
            <motion.div
              data-ocid="livestream.more_menu_sheet"
              className="fixed bottom-0 left-0 right-0 rounded-t-3xl pb-10 overflow-hidden"
              style={{
                zIndex: 80,
                background: "linear-gradient(to bottom, #1a1a1a, #111)",
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              <div className="px-5 pb-3 border-b border-white/5">
                <h3 className="text-white font-bold text-base">More Options</h3>
              </div>
              <div className="px-4 pt-3 space-y-2">
                <button
                  type="button"
                  data-ocid="livestream.more_switch_camera_button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    void switchCameraFacing();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium text-white transition-all active:scale-[0.98]"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <SwitchCamera
                    size={18}
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth={2}
                  />
                  Switch Camera
                </button>
                <button
                  type="button"
                  data-ocid="livestream.more_gift_box_button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setGiftSheetOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium text-white transition-all active:scale-[0.98]"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <span className="text-base">🎁</span>
                  Gift Box
                </button>
                <button
                  type="button"
                  data-ocid="livestream.more_mic_button"
                  onClick={() => {
                    setMicMuted((v) => !v);
                    setMoreMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all active:scale-[0.98]"
                  style={{
                    background: micMuted
                      ? "rgba(255,0,80,0.1)"
                      : "rgba(255,255,255,0.05)",
                    border: micMuted ? "1px solid rgba(255,0,80,0.25)" : "none",
                    color: micMuted ? "#ff6b6b" : "white",
                  }}
                >
                  {micMuted ? (
                    <MicOff size={18} stroke="#ff6b6b" strokeWidth={2} />
                  ) : (
                    <Mic
                      size={18}
                      stroke="rgba(255,255,255,0.7)"
                      strokeWidth={2}
                    />
                  )}
                  {micMuted ? "Unmute Microphone" : "Mute Microphone"}
                </button>
                {isHost && (
                  <>
                    <button
                      type="button"
                      data-ocid="livestream.more_end_live_button"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        handleEndStream();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]"
                      style={{
                        background: "rgba(255,0,80,0.12)",
                        border: "1px solid rgba(255,0,80,0.3)",
                        color: "#ff4466",
                      }}
                    >
                      <span className="text-base">⏹</span> End Live
                    </button>
                    <button
                      type="button"
                      data-ocid="livestream.more_stream_settings_button"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        setLiveSettingsOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium text-white transition-all active:scale-[0.98]"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      <Settings
                        size={18}
                        stroke="rgba(255,255,255,0.7)"
                        strokeWidth={2}
                      />
                      Stream Settings
                    </button>
                  </>
                )}
                <button
                  type="button"
                  data-ocid="livestream.more_cancel_button"
                  onClick={() => setMoreMenuOpen(false)}
                  className="w-full py-4 rounded-2xl text-sm font-semibold mt-1"
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* COMMENT ACTION SHEET */}
      <AnimatePresence>
        {commentActionMsg && (
          <>
            <motion.div
              className="fixed inset-0"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 70 }}
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCommentActionMsg(null)}
            />
            <motion.div
              data-ocid="livestream.comment_action_sheet"
              className="fixed bottom-0 left-0 right-0 rounded-t-3xl pb-10 overflow-hidden"
              style={{
                zIndex: 80,
                background: "linear-gradient(to bottom, #1a1a1a, #111)",
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              <div className="px-5 pb-3 border-b border-white/5">
                <p className="text-white font-bold text-sm truncate">
                  @{commentActionMsg.username}
                </p>
                {commentActionMsg.message && (
                  <p className="text-white/50 text-xs mt-0.5 truncate">
                    {commentActionMsg.message}
                  </p>
                )}
              </div>
              <div className="px-4 pt-3 space-y-2">
                {[
                  {
                    icon: "🔇",
                    label: "Mute user",
                    ocid: "livestream.comment_mute_button",
                    action: () => {
                      setCommentActionMsg(null);
                    },
                  },
                  {
                    icon: "🛡️",
                    label: "Make moderator",
                    ocid: "livestream.comment_mod_button",
                    action: () => {
                      setCommentActionMsg(null);
                    },
                  },
                  {
                    icon: "🗑️",
                    label: "Remove comment",
                    ocid: "livestream.comment_remove_button",
                    action: () => {
                      setChatMessages((prev) =>
                        prev.filter((m) => m.id !== commentActionMsg.id),
                      );
                      setCommentActionMsg(null);
                    },
                  },
                  {
                    icon: "🚫",
                    label: "Block user",
                    ocid: "livestream.comment_block_button",
                    action: () => {
                      setCommentActionMsg(null);
                    },
                    danger: true,
                  },
                ].map(({ icon, label, ocid, action, danger }) => (
                  <button
                    key={label}
                    type="button"
                    data-ocid={ocid}
                    onClick={action}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all active:scale-[0.98]"
                    style={{
                      background: danger
                        ? "rgba(255,0,80,0.06)"
                        : "rgba(255,255,255,0.04)",
                      border: danger ? "1px solid rgba(255,0,80,0.15)" : "none",
                      color: danger ? "#ff0050" : "rgba(255,255,255,0.85)",
                    }}
                  >
                    <span className="text-base">{icon}</span>
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  data-ocid="livestream.comment_action_cancel_button"
                  onClick={() => setCommentActionMsg(null)}
                  className="w-full py-4 rounded-2xl text-sm font-semibold mt-1"
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* GIFT SHEET */}
      <AnimatePresence>
        {giftSheetOpen && (
          <GiftSheet
            onClose={() => setGiftSheetOpen(false)}
            onSendGift={sendGift}
            onOpenRecharge={() => onOpenRecharge?.()}
            isBattle={isBattle}
            hostName={stream.hostName}
            guestName={localStream.battleOpponentName ?? "Guest"}
            giftTarget={giftTarget}
            onSetGiftTarget={setGiftTarget}
          />
        )}
      </AnimatePresence>

      {/* GOAL MODAL */}
      <AnimatePresence>
        {goalModalOpen && (
          <GoalModal
            onClose={() => setGoalModalOpen(false)}
            onSetGoal={(giftName, targetCount) => {
              setGoal({ giftName, targetCount, currentCount: 0 });
            }}
          />
        )}
      </AnimatePresence>

      {/* NOT ENOUGH COINS DIALOG */}
      <AnimatePresence>
        {showNoCoinsDialog && (
          <>
            <motion.div
              className="fixed inset-0"
              style={{ background: "rgba(0,0,0,0.7)", zIndex: 90 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNoCoinsDialog(false)}
              role="presentation"
            />
            <motion.div
              data-ocid="livestream.no_coins_dialog"
              className="fixed bottom-0 left-0 right-0 rounded-t-3xl pb-10 overflow-hidden"
              style={{ zIndex: 91, background: "#1a1a1a" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="flex justify-center pt-3 pb-4">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              <div className="px-5 pb-6 flex flex-col items-center gap-4 text-center">
                <span className="text-5xl">🪙</span>
                <div>
                  <p className="text-white font-bold text-lg">
                    Not enough coins
                  </p>
                  <p className="text-white/50 text-sm mt-1">
                    Recharge to continue sending gifts.
                  </p>
                </div>
                <button
                  type="button"
                  data-ocid="livestream.no_coins_recharge_button"
                  onClick={() => {
                    setShowNoCoinsDialog(false);
                    setGiftSheetOpen(false);
                    onOpenRecharge?.();
                  }}
                  className="w-full py-4 rounded-2xl text-white font-bold text-base"
                  style={{ background: "#ff0050" }}
                >
                  🪙 Recharge Coins
                </button>
                <button
                  type="button"
                  data-ocid="livestream.no_coins_cancel_button"
                  onClick={() => setShowNoCoinsDialog(false)}
                  className="text-white/40 text-sm"
                >
                  Maybe later
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* HOST CONTROLS SHEET */}
      <AnimatePresence>
        {hostControlsOpen && (
          <>
            <motion.div
              className="fixed inset-0"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 70 }}
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHostControlsOpen(false)}
            />
            <motion.div
              data-ocid="livestream.host_controls_sheet"
              className="fixed bottom-0 left-0 right-0 rounded-t-3xl pb-10 overflow-hidden"
              style={{
                zIndex: 80,
                background: "linear-gradient(to bottom, #1a1a1a, #111)",
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
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
                  {
                    label: "Flip Camera",
                    icon: (
                      <SwitchCamera
                        size={18}
                        stroke="rgba(255,255,255,0.7)"
                        strokeWidth={2}
                      />
                    ),
                    action: () => {
                      void switchCameraFacing();
                      setHostControlsOpen(false);
                    },
                    ocid: "livestream.flip_camera_button",
                  },
                  {
                    label: mirrored ? "Mirror: On" : "Mirror: Off",
                    icon: (
                      <Monitor
                        size={18}
                        stroke={mirrored ? "#ff6b6b" : "rgba(255,255,255,0.7)"}
                        strokeWidth={2}
                      />
                    ),
                    action: () => setMirrored((v) => !v),
                    ocid: "livestream.mirror_toggle",
                    active: mirrored,
                  },
                  {
                    label: micMuted ? "Unmute Mic" : "Mute Mic",
                    icon: micMuted ? (
                      <MicOff size={18} stroke="#ff6b6b" strokeWidth={2} />
                    ) : (
                      <Mic
                        size={18}
                        stroke="rgba(255,255,255,0.7)"
                        strokeWidth={2}
                      />
                    ),
                    action: () => setMicMuted((v) => !v),
                    ocid: "livestream.mic_control_button",
                    active: micMuted,
                  },
                  {
                    label: noiseReduction
                      ? "Noise Reduction: On"
                      : "Noise Reduction: Off",
                    icon: <span className="text-base">🔇</span>,
                    action: () => setNoiseReduction((v) => !v),
                    ocid: "livestream.noise_reduction_toggle",
                    active: noiseReduction,
                    activeColor: "rgba(99,102,241,0.15)",
                    activeBorder: "rgba(99,102,241,0.35)",
                  },
                  {
                    label: videoPausedByHost ? "Resume Stream" : "Pause Stream",
                    icon: (
                      <span className="text-base">
                        {videoPausedByHost ? "▶️" : "⏸"}
                      </span>
                    ),
                    action: () => {
                      handlePauseResumeStream();
                      setHostControlsOpen(false);
                    },
                    ocid: "livestream.pause_stream_button",
                  },
                  {
                    label: "Set Gift Goal",
                    icon: (
                      <Target
                        size={18}
                        stroke="rgba(255,255,255,0.7)"
                        strokeWidth={2}
                      />
                    ),
                    action: () => {
                      setHostControlsOpen(false);
                      setGoalModalOpen(true);
                    },
                    ocid: "livestream.set_goal_button",
                  },
                  {
                    label:
                      activeMultiplier === 2 && multiplierTimeLeft > 0
                        ? `x2 Active (${multiplierTimeLeft}s)`
                        : "Activate x2 Multiplier",
                    icon: (
                      <span
                        className="text-base font-black"
                        style={{ color: "#f59e0b" }}
                      >
                        x2
                      </span>
                    ),
                    action: () => {
                      activateMultiplier(2);
                      setHostControlsOpen(false);
                    },
                    ocid: "livestream.x2_multiplier_button",
                    active: activeMultiplier === 2,
                    activeColor: "rgba(245,158,11,0.15)",
                    activeBorder: "rgba(245,158,11,0.35)",
                  },
                  {
                    label:
                      activeMultiplier === 3 && multiplierTimeLeft > 0
                        ? `x3 Active (${multiplierTimeLeft}s)`
                        : "Activate x3 Multiplier",
                    icon: (
                      <span
                        className="text-base font-black"
                        style={{ color: "#a855f7" }}
                      >
                        x3
                      </span>
                    ),
                    action: () => {
                      activateMultiplier(3);
                      setHostControlsOpen(false);
                    },
                    ocid: "livestream.x3_multiplier_button",
                    active: activeMultiplier === 3,
                    activeColor: "rgba(168,85,247,0.15)",
                    activeBorder: "rgba(168,85,247,0.35)",
                  },
                  {
                    label: "Start Battle",
                    icon: (
                      <Swords
                        size={18}
                        stroke="rgba(255,255,255,0.7)"
                        strokeWidth={2}
                      />
                    ),
                    action: () => {
                      setHostControlsOpen(false);
                      setBattleChallengeOpen(true);
                    },
                    ocid: "livestream.battle_button",
                  },
                  {
                    label: "Live Settings",
                    icon: (
                      <Settings
                        size={18}
                        stroke="rgba(255,255,255,0.7)"
                        strokeWidth={2}
                      />
                    ),
                    action: () => {
                      setHostControlsOpen(false);
                      setLiveSettingsOpen(true);
                    },
                    ocid: "livestream.live_settings_button",
                  },
                ].map((item) => (
                  <button
                    key={item.ocid}
                    type="button"
                    data-ocid={item.ocid}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium text-white transition-all active:scale-[0.98]"
                    style={{
                      background: item.active
                        ? (item.activeColor ?? "rgba(255,0,80,0.12)")
                        : "rgba(255,255,255,0.05)",
                      border: item.active
                        ? `1px solid ${item.activeBorder ?? "rgba(255,0,80,0.25)"}`
                        : "none",
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}

                <button
                  type="button"
                  data-ocid="livestream.end_stream_confirm_button"
                  onClick={handleEndStream}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]"
                  style={{
                    background: "rgba(255,0,80,0.15)",
                    border: "1px solid rgba(255,0,80,0.3)",
                    color: "#ff4466",
                  }}
                >
                  <span className="text-base">🛑</span>End Stream
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* LIVE SETTINGS SHEET */}
      <AnimatePresence>
        {liveSettingsOpen && (
          <>
            <motion.div
              className="fixed inset-0"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 70 }}
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLiveSettingsOpen(false)}
            />
            <motion.div
              data-ocid="livestream.live_settings_sheet"
              className="fixed bottom-0 left-0 right-0 rounded-t-3xl pb-10 overflow-hidden"
              style={{
                zIndex: 80,
                background: "linear-gradient(to bottom, #1a1a1a, #111)",
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              <div className="px-5 pb-3 border-b border-white/5">
                <h3 className="text-white font-bold text-base">
                  Live Settings
                </h3>
              </div>
              <div className="px-5 pt-2 divide-y divide-white/5">
                {[
                  {
                    label: "Allow Guest Requests",
                    desc: "Let creators request to co-host",
                    value: allowGuestRequests,
                    onChange: setAllowGuestRequests,
                    id: "live_guest_req",
                  },
                  {
                    label: "Allow Viewer Suggestions",
                    desc: "Accept topic suggestions from viewers",
                    value: allowViewerSuggestions,
                    onChange: setAllowViewerSuggestions,
                    id: "live_viewer_sug",
                  },
                  {
                    label: "Notify Friends",
                    desc: "Alert your friends when you're live",
                    value: notifyFriendsGoLive,
                    onChange: setNotifyFriendsGoLive,
                    id: "live_notify_friends",
                  },
                  {
                    label: "Notify Suggested Creators",
                    desc: "Alert suggested creators about your stream",
                    value: notifySuggestedCreators,
                    onChange: setNotifySuggestedCreators,
                    id: "live_notify_suggested",
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-4"
                  >
                    <div>
                      <p className="text-white text-sm font-semibold">
                        {item.label}
                      </p>
                      <p className="text-white/40 text-xs mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                    <div
                      className={`w-12 h-6 rounded-full relative cursor-pointer transition-all duration-200 ${item.value ? "bg-[#ff0050]" : "bg-white/15"}`}
                      onClick={() => item.onChange(!item.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          item.onChange(!item.value);
                      }}
                      role="switch"
                      aria-checked={item.value}
                      tabIndex={0}
                      data-ocid={`livestream.${item.id}_toggle`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${item.value ? "right-0.5" : "left-0.5"}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* INVITE SHEET */}
      <AnimatePresence>
        {inviteSheetOpen && (
          <>
            <motion.div
              className="fixed inset-0"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 70 }}
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInviteSheetOpen(false)}
            />
            <motion.div
              data-ocid="livestream.invite_sheet"
              className="fixed bottom-0 left-0 right-0 rounded-t-3xl pb-10 overflow-hidden"
              style={{
                zIndex: 80,
                background: "linear-gradient(to bottom, #1a1a1a, #111)",
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              <div className="px-5 pb-4 border-b border-white/5">
                <h3 className="text-white font-bold text-base">Invite Guest</h3>
                <p className="text-white/40 text-xs mt-0.5">
                  Co-host your live stream
                </p>
              </div>
              {loadingUsers ? (
                <div className="flex items-center justify-center py-12 gap-3">
                  <Loader2
                    size={22}
                    stroke="rgba(255,255,255,0.4)"
                    className="animate-spin"
                  />
                  <p className="text-white/40 text-sm">Loading users…</p>
                </div>
              ) : allUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Users
                    size={36}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth={1.5}
                  />
                  <p
                    data-ocid="livestream.invite_empty_state"
                    className="text-white/40 text-sm"
                  >
                    No users found
                  </p>
                  <button
                    type="button"
                    data-ocid="livestream.invite_close_button"
                    onClick={() => setInviteSheetOpen(false)}
                    className="px-6 py-2.5 rounded-full text-sm font-semibold"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div
                  className="overflow-y-auto no-scrollbar"
                  style={{ maxHeight: "50vh" }}
                >
                  {allUsers.map((user, idx) => (
                    <div
                      key={user.principal}
                      data-ocid={`livestream.invite_user.${idx + 1}`}
                      className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 last:border-0"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold overflow-hidden"
                        style={{
                          background: user.avatarUrl
                            ? "transparent"
                            : getUserGradient(user.name),
                          fontSize: 14,
                        }}
                      >
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getInitials(user.name)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">
                          {user.name}
                        </p>
                        <p className="text-white/40 text-xs truncate">
                          {user.principal.slice(0, 12)}…
                        </p>
                      </div>
                      <button
                        type="button"
                        data-ocid={`livestream.invite_user_button.${idx + 1}`}
                        onClick={() => void inviteUser(user.principal)}
                        disabled={invitedUsers.has(user.principal)}
                        className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 disabled:opacity-70"
                        style={
                          invitedUsers.has(user.principal)
                            ? {
                                background: "rgba(255,255,255,0.07)",
                                color: "rgba(255,255,255,0.5)",
                              }
                            : {
                                background:
                                  "linear-gradient(135deg, #ff0050, #ff6b35)",
                                color: "white",
                              }
                        }
                      >
                        {invitedUsers.has(user.principal)
                          ? "Invited ✓"
                          : "Invite"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* BATTLE CHALLENGE SHEET */}
      <AnimatePresence>
        {battleChallengeOpen && (
          <>
            <motion.div
              className="fixed inset-0"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 70 }}
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBattleChallengeOpen(false)}
            />
            <motion.div
              data-ocid="livestream.battle_sheet"
              className="fixed bottom-0 left-0 right-0 rounded-t-3xl pb-10 overflow-hidden"
              style={{
                zIndex: 80,
                background: "linear-gradient(to bottom, #1a1a1a, #111)",
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              <div className="px-5 pb-3 border-b border-white/5">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <Swords size={18} stroke="#ff0050" strokeWidth={2} />
                  Battle Mode
                </h3>
                <p className="text-white/40 text-xs mt-0.5">
                  Challenge another creator — 5-minute battle, gift scoring
                </p>
              </div>
              <div className="px-5 pt-4 pb-2">
                <p className="text-white/50 text-sm mb-4">
                  Viewers send gifts to increase your score.
                </p>
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8 gap-3">
                    <Loader2
                      size={20}
                      stroke="rgba(255,255,255,0.4)"
                      className="animate-spin"
                    />
                    <p className="text-white/40 text-sm">Loading creators…</p>
                  </div>
                ) : (
                  (() => {
                    // Only show creators who are currently live
                    const liveUsers = allUsers.filter((u) =>
                      getLiveStatusStatic(u.principal),
                    );
                    return liveUsers.length === 0 ? (
                      <div className="flex flex-col items-center py-8 gap-3">
                        <Users
                          size={32}
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth={1.5}
                        />
                        <p
                          data-ocid="battle.empty_state"
                          className="text-white/40 text-sm text-center"
                        >
                          No creators are live right now to battle
                        </p>
                      </div>
                    ) : (
                      <div
                        className="overflow-y-auto no-scrollbar flex flex-col gap-2"
                        style={{ maxHeight: "45vh" }}
                      >
                        {liveUsers.map((user, idx) => (
                          <BattleChallengeSentRow
                            key={user.principal}
                            user={user}
                            idx={idx}
                            streamId={stream.id}
                            onChallenge={() => {
                              // Send a BATTLE_INVITE DM so the poller detects it
                              if (actor) {
                                void (async () => {
                                  try {
                                    const { Principal } = await import(
                                      "@icp-sdk/core/principal"
                                    );
                                    await actor.sendMessage(
                                      Principal.fromText(user.principal),
                                      `BATTLE_INVITE:${stream.id}`,
                                    );
                                  } catch {
                                    // silent
                                  }
                                })();
                              }
                              setLocalStream((prev) => ({
                                ...prev,
                                battleMode: true,
                                battleOpponentName: user.name,
                              }));
                              setBattleTimer(BATTLE_DURATION_SEC);
                              setBattleLeftScore(0);
                              setBattleRightScore(0);
                              setBattleEnded(false);
                              setTopSupporters({ left: [], right: [] });
                              setBattleChallengeOpen(false);
                            }}
                          />
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* BATTLE MULTIPLIER OVERLAY */}
      {activeMultiplier > 1 && (
        <BattleMultiplierOverlay
          multiplier={activeMultiplier as 2 | 3}
          phase={multiplierPhase}
        />
      )}

      {/* BATTLE ENDED OVERLAY — rematch / exit */}
      <AnimatePresence>
        {battleEnded && (
          <motion.div
            data-ocid="battle.end_overlay"
            className="fixed inset-0 flex flex-col items-center justify-center"
            style={{ zIndex: 50, background: "rgba(0,0,0,0.82)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Confetti particles */}
            <BattleConfetti
              winnerName={battleWinner}
              hostScore={battleEndScores.left}
              guestScore={battleEndScores.right}
              onClose={() => {
                // Handled by the explicit buttons below — this just ensures
                // BattleConfetti's auto-close doesn't run first
              }}
            />

            {/* Winner card */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{
                type: "spring",
                damping: 18,
                stiffness: 200,
                delay: 0.2,
              }}
              className="relative flex flex-col items-center gap-4 px-8 py-8 rounded-3xl mx-6 text-center"
              style={{
                background: "rgba(18,18,18,0.98)",
                border: "1.5px solid rgba(245,158,11,0.5)",
                boxShadow:
                  "0 0 60px rgba(245,158,11,0.2), 0 24px 60px rgba(0,0,0,0.8)",
                backdropFilter: "blur(20px)",
                maxWidth: 320,
                width: "100%",
                zIndex: 51,
              }}
            >
              {/* Crown + winner */}
              <span className="text-6xl leading-none">👑</span>
              <div>
                <p
                  className="text-xs font-black uppercase tracking-[0.25em] mb-1"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  WINS THE BATTLE!
                </p>
                <p
                  className="text-white font-black text-2xl"
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    textShadow: "0 0 20px rgba(245,158,11,0.6)",
                  }}
                >
                  {battleWinner}
                </p>
              </div>
              {/* Scores */}
              <p className="text-white/60 text-sm font-semibold">
                Host:{" "}
                <span style={{ color: "#ff0050" }}>
                  {battleEndScores.left} pts
                </span>{" "}
                | Opp:{" "}
                <span style={{ color: "#3b82f6" }}>
                  {battleEndScores.right} pts
                </span>
              </p>

              {/* Action buttons */}
              <div className="flex gap-3 w-full mt-2">
                <button
                  type="button"
                  data-ocid="battle.rematch_button"
                  onClick={() => {
                    setBattleEnded(false);
                    setBattleTimer(BATTLE_DURATION_SEC);
                    setBattleLeftScore(0);
                    setBattleRightScore(0);
                    setBattleEndScores({ left: 0, right: 0 });
                    setTopSupporters({ left: [], right: [] });
                  }}
                  className="flex-1 py-3.5 rounded-2xl text-white font-bold text-sm transition-all active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #ff0050, #ff6b35)",
                    boxShadow: "0 2px 14px rgba(255,0,80,0.35)",
                  }}
                >
                  ⚔️ Rematch
                </button>
                <button
                  type="button"
                  data-ocid="battle.exit_button"
                  onClick={() => {
                    setBattleEnded(false);
                    setLocalStream((prev) => ({
                      ...prev,
                      battleMode: false,
                      battleOpponentName: undefined,
                    }));
                    setBattleTimer(BATTLE_DURATION_SEC);
                    setBattleLeftScore(0);
                    setBattleRightScore(0);
                    setBattleEndScores({ left: 0, right: 0 });
                    setTopSupporters({ left: [], right: [] });
                  }}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.75)",
                  }}
                >
                  Exit Battle
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MVP CROWN ANIMATION */}
      <AnimatePresence>
        {showMvpCrown && battleEnded && (
          <MvpCrownAnimation
            winnerName={battleWinner}
            winnerSide={battleWinnerSide}
            onComplete={() => setShowMvpCrown(false)}
          />
        )}
      </AnimatePresence>

      {/* SHARE TOAST */}
      <AnimatePresence>
        {shareToast && (
          <motion.div
            data-ocid="livestream.share_toast"
            className="fixed top-24 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-white text-sm font-semibold"
            style={{
              zIndex: 90,
              background: "rgba(20,20,20,0.95)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            🔗 Link copied!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Toolbar Pill ─────────────────────────────────────────────────────────────

function ToolbarPill({
  icon,
  label,
  onClick,
  ocid,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  ocid?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-ocid={ocid}
      className="flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all active:scale-90"
      style={{
        background: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.12)",
        minWidth: 52,
      }}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="text-white/70 text-[10px] font-medium leading-tight">
        {label}
      </span>
    </button>
  );
}

// ─── Floating Heart ──────────────────────────────────────────────────────────

function FloatingHeartEl({
  id,
  offsetX,
  delay,
  onDone,
}: {
  id: number;
  offsetX: number;
  delay: number;
  onDone: (id: number) => void;
}) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: `calc(50% + ${offsetX}px)`, bottom: 0 }}
      initial={{ opacity: 1, y: 0, scale: 0.8, rotate: offsetX * 0.3 }}
      animate={{
        opacity: [1, 1, 0.7, 0],
        y: [-10, -60, -120, -170],
        scale: [0.8, 1.1, 0.9, 0.6],
        rotate: [offsetX * 0.3, offsetX * 0.15, offsetX * -0.15, offsetX * 0.3],
      }}
      transition={{ duration: 1.5, delay, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => onDone(id)}
    >
      <Heart size={22} fill="#ff0050" stroke="none" />
    </motion.div>
  );
}
