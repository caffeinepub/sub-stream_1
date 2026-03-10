import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AtSign,
  Bell,
  ChevronLeft,
  Film,
  ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Search,
  Send,
  Smile,
  Sparkles,
  UserPlus,
  Volume2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  ConversationSummary,
  DirectMessage,
  UserProfile,
} from "../backend.d";
import { useAuth } from "../context/AuthContext";
import { getDisplayName, getUsername } from "../lib/userFormat";
import { checkRateLimit } from "../utils/rateLimiter";

// ─── LiveNowSection ────────────────────────────────────────────────────────────

interface LiveCreatorEntry {
  principalStr: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  viewerCount: number;
}

function LiveNowSection({
  onJoinStream,
}: {
  onJoinStream: (principalStr: string, displayName: string) => void;
}) {
  const { actor } = useAuth();

  const { data: allUserIds = [], isLoading: idsLoading } = useQuery<
    Principal[]
  >({
    queryKey: ["allUserIds-inbox-live"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUserids();
    },
    enabled: !!actor,
    staleTime: 120_000,
  });

  const { data: onlineStatuses = [], isLoading: statusLoading } = useQuery<
    boolean[]
  >({
    queryKey: [
      "onlineStatus-inbox-live",
      allUserIds.map((id) => id.toText()).join(","),
    ],
    queryFn: async () => {
      if (!actor || allUserIds.length === 0) return [];
      return actor.getOnlineStatus(allUserIds);
    },
    enabled: !!actor && allUserIds.length > 0,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const onlineUserIds = allUserIds.filter((_, i) => onlineStatuses[i] === true);

  const { data: liveCreators = [], isLoading: profilesLoading } = useQuery<
    LiveCreatorEntry[]
  >({
    queryKey: [
      "inbox-live-creators",
      onlineUserIds.map((id) => id.toText()).join(","),
    ],
    queryFn: async () => {
      if (!actor || onlineUserIds.length === 0) return [];
      const results = await Promise.all(
        onlineUserIds.map(async (principal) => {
          const principalStr = principal.toText();
          try {
            const [profile, isFollowing] = await Promise.all([
              actor.getUserProfile(principal),
              actor.isFollowing(principal),
            ]);
            if (!isFollowing) return null;
            const displayName =
              getDisplayName(profile?.name ?? "") ||
              `${principalStr.slice(0, 6)}…`;
            const username = getUsername(profile?.name ?? "");
            // Deterministic viewer count seeded from principal string
            const seed = Array.from(principalStr).reduce(
              (acc, c) => acc + c.charCodeAt(0),
              0,
            );
            const viewerCount = 100 + (seed % 4901);
            return {
              principalStr,
              displayName,
              username,
              avatarUrl: profile?.avatarUrl ?? "",
              viewerCount,
            } satisfies LiveCreatorEntry;
          } catch {
            return null;
          }
        }),
      );
      return results.filter((r): r is LiveCreatorEntry => r !== null);
    },
    enabled: !!actor && onlineUserIds.length > 0,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const isLoading = idsLoading || statusLoading || profilesLoading;

  function formatViewers(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  }

  return (
    <div className="px-4 pt-4 pb-1">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
          style={{ background: "#ff0050" }}
        />
        <h2
          className="text-white font-bold text-sm uppercase tracking-wider"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Live Now
        </h2>
      </div>

      {isLoading ? (
        <div
          className="flex gap-3 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 flex-shrink-0 rounded-2xl px-3 py-3"
              style={{
                background: "rgba(255,255,255,0.04)",
                minWidth: 84,
              }}
            >
              <div
                className="w-14 h-14 rounded-full animate-pulse"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />
              <div
                className="w-14 h-2.5 rounded-full animate-pulse"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
              <div
                className="w-10 h-2 rounded-full animate-pulse"
                style={{ background: "rgba(255,255,255,0.04)" }}
              />
            </div>
          ))}
        </div>
      ) : liveCreators.length === 0 ? (
        <div data-ocid="inbox.live_empty_state" className="py-4 text-center">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            No creators are live right now.
          </p>
        </div>
      ) : (
        <div
          className="flex gap-3 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {liveCreators.map((creator, i) => {
            const [from, to] = (() => {
              const hash = Array.from(creator.principalStr).reduce(
                (acc, c) => acc + c.charCodeAt(0),
                0,
              );
              const hues = [0, 30, 60, 120, 160, 200, 240, 270, 320];
              const h1 = hues[hash % hues.length];
              const h2 = hues[(hash + 4) % hues.length];
              return [`hsl(${h1},70%,50%)`, `hsl(${h2},70%,40%)`];
            })();
            const initials = (() => {
              const parts = creator.displayName.trim().split(/\s+/);
              if (parts.length >= 2)
                return (parts[0][0] + parts[1][0]).toUpperCase();
              return (creator.displayName[0] ?? "?").toUpperCase();
            })();

            return (
              <motion.button
                key={creator.principalStr}
                type="button"
                data-ocid={`inbox.live_item.${i + 1}`}
                onClick={() =>
                  onJoinStream(creator.principalStr, creator.displayName)
                }
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center gap-2 flex-shrink-0 rounded-2xl px-3 py-3 focus-visible:outline-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  minWidth: 84,
                }}
              >
                {/* Avatar with ring */}
                <div className="relative" style={{ width: 60, height: 60 }}>
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      border: "2px solid #ff0050",
                      boxShadow: "0 0 8px rgba(255,0,80,0.5)",
                    }}
                  />
                  <div
                    className="absolute rounded-full overflow-hidden flex items-center justify-center"
                    style={{
                      inset: 3,
                      background: creator.avatarUrl
                        ? "transparent"
                        : `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
                    }}
                  >
                    {creator.avatarUrl ? (
                      <img
                        src={creator.avatarUrl}
                        alt={creator.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span
                        className="text-white font-bold select-none"
                        style={{ fontSize: 16 }}
                      >
                        {initials}
                      </span>
                    )}
                  </div>
                  {/* LIVE badge */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 rounded-full flex items-center justify-center"
                    style={{
                      bottom: -6,
                      background: "#ff0050",
                      paddingLeft: 5,
                      paddingRight: 5,
                      paddingTop: 2,
                      paddingBottom: 2,
                      zIndex: 2,
                      minWidth: 32,
                    }}
                  >
                    <span
                      className="text-white font-bold tracking-wider"
                      style={{ fontSize: 8, lineHeight: "12px" }}
                    >
                      LIVE
                    </span>
                  </div>
                </div>

                {/* Name */}
                <p
                  className="text-white font-semibold text-xs truncate w-full text-center mt-1"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  {creator.displayName.split(" ")[0]}
                </p>
                {creator.username && (
                  <p
                    className="text-xs truncate w-full text-center -mt-1.5"
                    style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}
                  >
                    @{creator.username}
                  </p>
                )}

                {/* Viewer count */}
                <p
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  {formatViewers(creator.viewerCount)} viewers
                </p>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert nanosecond bigint timestamp to relative time string */
function relativeTime(nanos: bigint): string {
  const ms = Number(nanos / BigInt(1_000_000));
  const diff = Date.now() - ms;
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d`;
  return new Date(ms).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

/** Convert nanosecond bigint timestamp to HH:MM string */
function formatTime(nanos: bigint): string {
  const ms = Number(nanos / BigInt(1_000_000));
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Generate gradient colors from a string */
function gradientFromString(s: string): [string, string] {
  const hash = Array.from(s).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hues = [0, 30, 60, 120, 160, 200, 240, 270, 320];
  const h1 = hues[hash % hues.length];
  const h2 = hues[(hash + 4) % hues.length];
  return [`hsl(${h1},70%,50%)`, `hsl(${h2},70%,40%)`];
}

/** Get initials from a display name or username */
function getInitials(display: string, username: string): string {
  if (display?.trim()) {
    const parts = display.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return display[0].toUpperCase();
  }
  return (username[0] ?? "?").toUpperCase();
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveChat {
  otherUserPrincipal: Principal;
  otherUserProfile: UserProfile | null;
}

type ActivitySheet = "followers" | "notifications" | "mentions" | null;

// ─── UserAvatar component ─────────────────────────────────────────────────────

function UserAvatar({
  profile,
  principalText,
  size = 44,
  showOnline = true,
}: {
  profile: UserProfile | null;
  principalText: string;
  size?: number;
  showOnline?: boolean;
}) {
  const display = getDisplayName(profile?.name ?? "");
  const username = getUsername(profile?.name ?? "");
  const initials = getInitials(display, username || principalText.slice(0, 4));
  const [from, to] = gradientFromString(principalText);
  const dotSize = Math.round(size * 0.27);

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <div
        className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
        style={{
          background: profile?.avatarUrl
            ? "transparent"
            : `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
        }}
      >
        {profile?.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={display || username}
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            className="font-bold text-white"
            style={{ fontSize: Math.round(size * 0.36) }}
          >
            {initials}
          </span>
        )}
      </div>
      {showOnline && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-black"
          style={{
            width: dotSize,
            height: dotSize,
            background: profile?.isOnline ? "#22c55e" : "#6b7280",
          }}
        />
      )}
    </div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div
      className="flex items-center gap-3 px-3 py-3.5 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      <div
        className="w-12 h-12 rounded-full flex-shrink-0 animate-pulse"
        style={{ background: "rgba(255,255,255,0.1)" }}
      />
      <div className="flex-1 space-y-2">
        <div
          className="h-3.5 rounded-full animate-pulse w-1/3"
          style={{ background: "rgba(255,255,255,0.1)" }}
        />
        <div
          className="h-3 rounded-full animate-pulse w-2/3"
          style={{ background: "rgba(255,255,255,0.07)" }}
        />
      </div>
    </div>
  );
}

// ─── ConversationRow ─────────────────────────────────────────────────────────

function ConversationRow({
  summary,
  index,
  onOpen,
}: {
  summary: ConversationSummary;
  index: number;
  onOpen: (principal: Principal, profile: UserProfile | null) => void;
}) {
  const { actor } = useAuth();
  const principalText = summary.otherUser.toText();

  const { data: profile = null } = useQuery<UserProfile | null>({
    queryKey: ["userProfile", principalText],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getUserProfile(summary.otherUser);
    },
    enabled: !!actor,
    staleTime: 30_000,
  });

  const display = getDisplayName(profile?.name ?? "");
  const username = getUsername(profile?.name ?? "");
  const hasUnread = summary.unreadCount > BigInt(0);

  return (
    <motion.button
      type="button"
      data-ocid={`inbox.item.${index}`}
      onClick={() => onOpen(summary.otherUser, profile)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + (index - 1) * 0.06, duration: 0.3 }}
      whileTap={{ scale: 0.985 }}
      className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl text-left transition-colors"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      {/* Unread indicator */}
      <div className="flex-shrink-0 w-2 flex justify-center">
        {hasUnread && (
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "#ff0050" }}
          />
        )}
      </div>

      <UserAvatar profile={profile} principalText={principalText} size={48} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="min-w-0">
            <p
              className="font-semibold text-white text-sm truncate leading-tight"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              {display || username || `${principalText.slice(0, 8)}…`}
            </p>
            {username && (
              <p
                className="text-xs truncate leading-tight"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                @{username}
              </p>
            )}
          </div>
          <span
            className="text-xs flex-shrink-0"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            {relativeTime(summary.lastMessageAt)}
          </span>
        </div>
        <p
          className="text-sm truncate mt-0.5"
          style={{
            color: hasUnread
              ? "rgba(255,255,255,0.75)"
              : "rgba(255,255,255,0.4)",
            fontWeight: hasUnread ? 500 : 400,
          }}
        >
          {summary.lastMessage || "Start a conversation"}
        </p>
      </div>
    </motion.button>
  );
}

// ─── UserPickerModal ──────────────────────────────────────────────────────────

function UserPickerModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (principal: Principal, profile: UserProfile | null) => void;
}) {
  const { actor } = useAuth();
  const [search, setSearch] = useState("");

  const { data: allIds = [], isLoading: idsLoading } = useQuery<Principal[]>({
    queryKey: ["allUserIds"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUserids();
    },
    enabled: !!actor,
    staleTime: 60_000,
  });

  // Fetch all profiles in parallel
  const { data: profiles = [], isLoading: profilesLoading } = useQuery<
    Array<{ principal: Principal; profile: UserProfile | null }>
  >({
    queryKey: ["allUserProfiles", allIds.map((id) => id.toText()).join(",")],
    queryFn: async () => {
      if (!actor || allIds.length === 0) return [];
      // Batch in groups of 10
      const results: Array<{
        principal: Principal;
        profile: UserProfile | null;
      }> = [];
      for (let i = 0; i < allIds.length; i += 10) {
        const batch = allIds.slice(i, i + 10);
        const batchResults = await Promise.all(
          batch.map(async (id) => ({
            principal: id,
            profile: await actor.getUserProfile(id),
          })),
        );
        results.push(...batchResults);
      }
      return results;
    },
    enabled: !!actor && allIds.length > 0,
    staleTime: 30_000,
  });

  const isLoading = idsLoading || profilesLoading;

  const filtered = useMemo(() => {
    if (!search.trim()) return profiles;
    const q = search.toLowerCase();
    return profiles.filter(({ profile }) => {
      if (!profile) return false;
      const display = getDisplayName(profile.name).toLowerCase();
      const username = getUsername(profile.name).toLowerCase();
      return display.includes(q) || username.includes(q);
    });
  }, [profiles, search]);

  return (
    <motion.div
      key="user-picker"
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#000" }}
      data-ocid="inbox.modal"
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-12 pb-3 flex-shrink-0"
        style={{
          background: "rgba(0,0,0,0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          type="button"
          data-ocid="inbox.close_button"
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.07)" }}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <h2
          className="flex-1 text-white font-bold text-lg"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          New Message
        </h2>
      </div>

      {/* Search */}
      <div
        className="px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "rgba(255,255,255,0.35)" }}
          />
          <input
            data-ocid="inbox.search_input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full bg-transparent text-white placeholder:text-white/30 text-sm outline-none py-2.5 pl-9 pr-4 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: "16px",
            }}
          />
        </div>
      </div>

      {/* User list */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
        style={{ overscrollBehavior: "contain" }}
      >
        {isLoading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : filtered.length === 0 ? (
          <div
            data-ocid="inbox.empty_state"
            className="flex flex-col items-center justify-center py-16 text-center gap-3"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,0,80,0.08)" }}
            >
              <Search size={22} style={{ color: "#ff0050" }} />
            </div>
            <p className="text-white/50 text-sm">
              {search ? "No users found." : "No users yet."}
            </p>
          </div>
        ) : (
          filtered.map(({ principal, profile }, i) => {
            const principalText = principal.toText();
            const display = getDisplayName(profile?.name ?? "");
            const username = getUsername(profile?.name ?? "");
            return (
              <motion.button
                key={principalText}
                type="button"
                data-ocid={`inbox.item.${i + 1}`}
                onClick={() => onSelect(principal, profile)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
                whileTap={{ scale: 0.985 }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-colors"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <UserAvatar
                  profile={profile}
                  principalText={principalText}
                  size={46}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-white text-sm truncate"
                    style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                  >
                    {display || username || `${principalText.slice(0, 8)}…`}
                  </p>
                  {username && (
                    <p
                      className="text-xs truncate"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      @{username}
                    </p>
                  )}
                </div>
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background: profile?.isOnline ? "#22c55e" : "#6b7280",
                  }}
                />
              </motion.button>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

// ─── ChatView ─────────────────────────────────────────────────────────────────

function ChatView({
  otherUserPrincipal,
  otherUserProfile,
  onBack,
}: {
  otherUserPrincipal: Principal;
  otherUserProfile: UserProfile | null;
  onBack: () => void;
}) {
  const { actor, userProfile } = useAuth();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const principalText = otherUserPrincipal.toText();

  const display = getDisplayName(otherUserProfile?.name ?? "");
  const username = getUsername(otherUserProfile?.name ?? "");

  // Load messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery<
    DirectMessage[]
  >({
    queryKey: ["conversation", principalText],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getConversation(otherUserPrincipal);
    },
    enabled: !!actor,
    refetchInterval: 3000,
  });

  // Mark as read when opening
  useEffect(() => {
    if (!actor) return;
    void actor
      .markConversationRead(otherUserPrincipal)
      .then(() =>
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
      )
      .catch(() => {});
  }, [actor, otherUserPrincipal, queryClient]);

  // Scroll to bottom on new messages
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally scroll on message count change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Send mutation
  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.sendMessage(otherUserPrincipal, text);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["conversation", principalText],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  function handleSend() {
    const text = inputText.trim();
    if (!text || sendMutation.isPending) return;
    const myPrincipalText = userProfile?.email ?? "anon";
    const { allowed, warningMessage } = checkRateLimit(
      "message",
      myPrincipalText,
    );
    if (!allowed) {
      toast.error(warningMessage ?? "Sending too fast");
      return;
    }
    setInputText("");
    sendMutation.mutate(text);
  }

  return (
    <motion.div
      key="chat"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#000" }}
    >
      {/* Chat Header */}
      <div
        className="flex items-center gap-3 px-4 pt-12 pb-3 flex-shrink-0"
        style={{
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          type="button"
          data-ocid="chat.back_button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.07)" }}
          aria-label="Back to inbox"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <UserAvatar
            profile={otherUserProfile}
            principalText={principalText}
            size={38}
            showOnline
          />
          <div className="min-w-0" data-ocid="chat.online_status">
            <h2
              className="text-white font-bold text-base leading-tight truncate"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              {display || username || `${principalText.slice(0, 8)}…`}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background: otherUserProfile?.isOnline
                    ? "#22c55e"
                    : "#6b7280",
                }}
              />
              <p
                className="text-xs"
                style={{
                  color: otherUserProfile?.isOnline
                    ? "#22c55e"
                    : "rgba(255,255,255,0.35)",
                }}
              >
                {otherUserProfile?.isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.07)" }}
          aria-label="More options"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ overscrollBehavior: "contain" }}
        data-ocid="chat.panel"
      >
        {messagesLoading ? (
          <div
            data-ocid="chat.loading_state"
            className="flex flex-col items-center justify-center h-full py-16 gap-3"
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "#ff0050", borderTopColor: "transparent" }}
            />
          </div>
        ) : messages.length === 0 ? (
          <div
            data-ocid="chat.empty_state"
            className="flex flex-col items-center justify-center h-full py-16 gap-3 text-center"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,0,80,0.08)" }}
            >
              <MessageCircle size={24} style={{ color: "#ff0050" }} />
            </div>
            <p className="text-white/40 text-sm">Start the conversation</p>
          </div>
        ) : (
          messages.map((msg) => {
            // Messages NOT from the other user are ours
            const isMine = msg.fromUser.toText() !== principalText;
            return (
              <motion.div
                key={msg.id.toString()}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div className="flex flex-col gap-0.5 max-w-[75%]">
                  <div
                    className="px-4 py-2.5 text-white text-sm leading-relaxed"
                    style={{
                      background: isMine
                        ? "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)"
                        : "rgba(255,255,255,0.08)",
                      borderRadius: isMine
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                      boxShadow: isMine
                        ? "0 4px 16px rgba(255,0,80,0.25)"
                        : "none",
                    }}
                  >
                    {msg.text}
                  </div>
                  <span
                    className="text-[10px] px-1"
                    style={{
                      color: "rgba(255,255,255,0.25)",
                      textAlign: isMine ? "right" : "left",
                    }}
                  >
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Input bar */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-3 pb-8 pt-2"
        style={{
          background: "rgba(0,0,0,0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
          aria-label="Emoji"
        >
          <Smile size={20} />
        </button>
        <button
          type="button"
          data-ocid="chat.image_button"
          onClick={() => toast("Image sharing coming soon")}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
          aria-label="Image upload"
        >
          <ImageIcon size={18} />
        </button>

        <input
          data-ocid="chat.input"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-transparent text-white placeholder:text-white/30 text-sm outline-none py-2.5 px-3 rounded-xl min-w-0"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.08)",
            fontSize: "16px",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        <button
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
          aria-label="Send video link"
        >
          <Film size={18} />
        </button>

        <motion.button
          type="button"
          data-ocid="chat.send_button"
          onClick={handleSend}
          disabled={!inputText.trim() || sendMutation.isPending}
          animate={{
            background:
              inputText.trim() && !sendMutation.isPending
                ? "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)"
                : "rgba(255,255,255,0.07)",
          }}
          transition={{ duration: 0.2 }}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            boxShadow:
              inputText.trim() && !sendMutation.isPending
                ? "0 0 12px rgba(255,0,80,0.4)"
                : "none",
          }}
          aria-label="Send"
        >
          <Send
            size={16}
            className="transition-colors"
            style={{
              color:
                inputText.trim() && !sendMutation.isPending
                  ? "white"
                  : "rgba(255,255,255,0.35)",
            }}
          />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Activity Sheet ────────────────────────────────────────────────────────────

function ActivitySheetContent({ type }: { type: ActivitySheet }) {
  if (!type) return null;

  const config: Record<
    NonNullable<ActivitySheet>,
    { icon: React.ReactNode; title: string; emptyLabel: string }
  > = {
    followers: {
      icon: <UserPlus size={20} style={{ color: "#ff0050" }} />,
      title: "New Followers",
      emptyLabel: "No new followers yet.",
    },
    notifications: {
      icon: <Bell size={20} style={{ color: "#ff0050" }} />,
      title: "Notifications",
      emptyLabel: "No notifications yet.",
    },
    mentions: {
      icon: <AtSign size={20} style={{ color: "#ff0050" }} />,
      title: "Mentions",
      emptyLabel: "No mentions yet.",
    },
  };

  const c = config[type];
  return (
    <div className="px-1 pt-2 pb-4">
      <div
        data-ocid={`inbox.${type}.empty_state`}
        className="flex flex-col items-center justify-center py-12 text-center gap-3"
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,0,80,0.08)" }}
        >
          {c.icon}
        </div>
        <p className="text-white/50 text-sm">{c.emptyLabel}</p>
        <p className="text-white/25 text-xs max-w-[220px] leading-relaxed">
          Activity from your followers and videos will appear here.
        </p>
      </div>
    </div>
  );
}

// ─── Main InboxPage ────────────────────────────────────────────────────────────

export function InboxPage({
  onJoinLiveStream,
  openChatFor,
}: {
  onJoinLiveStream?: (principalStr: string, displayName: string) => void;
  openChatFor?: string;
}) {
  const { actor, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [activitySheet, setActivitySheet] = useState<ActivitySheet>(null);
  const [showUserPicker, setShowUserPicker] = useState(false);

  // Auto-open chat when navigated via DM button from profile
  const openChatForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!openChatFor || !actor || openChatForRef.current === openChatFor)
      return;
    openChatForRef.current = openChatFor;
    const p = Principal.fromText(openChatFor);
    actor
      .getUserProfile(p)
      .then((profile) => {
        setActiveChat({ otherUserPrincipal: p, otherUserProfile: profile });
      })
      .catch(() => {
        const p2 = Principal.fromText(openChatFor);
        setActiveChat({ otherUserPrincipal: p2, otherUserProfile: null });
      });
  }, [openChatFor, actor]);

  // Real conversations from backend — filter out system DM signals
  const { data: rawConversations = [], isLoading: convosLoading } = useQuery<
    ConversationSummary[]
  >({
    queryKey: ["conversations"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getConversations();
    },
    enabled: !!actor && isAuthenticated,
    refetchInterval: 5000,
  });

  const conversationSummaries = rawConversations.filter(
    (conv) =>
      !conv.lastMessage.startsWith("LIVE_INVITE:") &&
      !conv.lastMessage.startsWith("BATTLE_INVITE:"),
  );

  const activityItems: {
    id: ActivitySheet;
    label: string;
    icon: React.ReactNode;
    ocid: string;
  }[] = [
    {
      id: "followers",
      label: "New Followers",
      icon: <UserPlus size={16} />,
      ocid: "inbox.new_followers_tab",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell size={16} />,
      ocid: "inbox.notifications_tab",
    },
    {
      id: "mentions",
      label: "Mentions",
      icon: <AtSign size={16} />,
      ocid: "inbox.mentions_tab",
    },
  ];

  const systemNotifications = [
    {
      icon: <Volume2 size={18} style={{ color: "#ff0050" }} />,
      title: "Welcome to SUB STREAM",
      subtitle: "Start uploading, go live, and connect with creators.",
      time: "Today",
    },
    {
      icon: <Sparkles size={18} style={{ color: "#ff0050" }} />,
      title: "New features available",
      subtitle: "Live streaming and gift system are now live!",
      time: "2d ago",
    },
    {
      icon: <MessageCircle size={18} style={{ color: "#ff0050" }} />,
      title: "Community guidelines update",
      subtitle: "We've updated our community standards. Take a look.",
      time: "1w ago",
    },
  ];

  const sheetConfig = activitySheet
    ? activityItems.find((a) => a.id === activitySheet)
    : null;

  function handleOpenChat(principal: Principal, profile: UserProfile | null) {
    setShowUserPicker(false);
    setActiveChat({ otherUserPrincipal: principal, otherUserProfile: profile });
    // Invalidate conversation list to refresh unread counts
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }

  return (
    <div
      data-ocid="inbox.page"
      className="w-full min-h-screen flex flex-col"
      style={{ background: "#000" }}
    >
      {/* Sticky header */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-4 pt-12 pb-3 flex-shrink-0"
        style={{
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <h1
          className="text-white font-bold text-xl"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Inbox
        </h1>
        <button
          type="button"
          data-ocid="inbox.search_button"
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.07)" }}
          aria-label="Search messages"
        >
          <Search size={18} />
        </button>
      </div>

      {/* Scrollable body */}
      <div
        className="flex-1 overflow-y-auto pb-24"
        style={{ overscrollBehavior: "contain" }}
      >
        {/* Live Now section — first thing visible */}
        <LiveNowSection onJoinStream={onJoinLiveStream ?? (() => {})} />

        {/* Activity row */}
        <div className="px-4 pt-4 pb-2">
          <div
            className="flex gap-3 overflow-x-auto pb-1 scrollbar-none"
            style={{ scrollbarWidth: "none" }}
          >
            {activityItems.map((item, i) => (
              <motion.button
                key={item.id}
                type="button"
                data-ocid={item.ocid}
                onClick={() => setActivitySheet(item.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.3 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl flex-shrink-0 relative"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span className="text-white/70">{item.icon}</span>
                <span
                  className="text-white text-sm font-medium whitespace-nowrap"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  {item.label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Messages section */}
        <div className="px-4 pt-5">
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          >
            Messages
          </h2>

          {convosLoading ? (
            <div data-ocid="inbox.loading_state" className="space-y-1">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : conversationSummaries.length === 0 ? (
            <motion.div
              data-ocid="inbox.empty_state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: "rgba(255,0,80,0.08)" }}
              >
                <MessageCircle size={28} style={{ color: "#ff0050" }} />
              </div>
              <p className="text-white font-semibold text-base mb-1">
                No messages yet.
              </p>
              <p className="text-white/40 text-sm mb-6">
                Your conversations will appear here.
              </p>
              <motion.button
                type="button"
                data-ocid="inbox.start_conversation_button"
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowUserPicker(true)}
                className="px-6 py-3 rounded-2xl text-white font-semibold text-sm"
                style={{
                  background:
                    "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
                  boxShadow: "0 8px 24px rgba(255,0,80,0.3)",
                }}
              >
                Start a conversation
              </motion.button>
            </motion.div>
          ) : (
            <div className="space-y-1">
              {/* New Message button at top of list */}
              <motion.button
                type="button"
                data-ocid="inbox.open_modal_button"
                onClick={() => setShowUserPicker(true)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left mb-2"
                style={{
                  background: "rgba(255,0,80,0.08)",
                  border: "1px solid rgba(255,0,80,0.2)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,0,80,0.15)" }}
                >
                  <Send size={16} style={{ color: "#ff0050" }} />
                </div>
                <span
                  className="text-sm font-semibold"
                  style={{
                    color: "#ff0050",
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                  }}
                >
                  New Message
                </span>
              </motion.button>

              {conversationSummaries.map((summary, i) => (
                <ConversationRow
                  key={summary.otherUser.toText()}
                  summary={summary}
                  index={i + 1}
                  onOpen={handleOpenChat}
                />
              ))}
            </div>
          )}
        </div>

        {/* System Notifications */}
        <div className="px-4 pt-7">
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          >
            From SUB STREAM
          </h2>
          <div className="space-y-2">
            {systemNotifications.map((notif, i) => (
              <motion.div
                key={notif.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.07, duration: 0.3 }}
                className="flex items-start gap-3 px-3 py-3.5 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(255,0,80,0.1)" }}
                >
                  {notif.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="text-white font-semibold text-sm truncate"
                      style={{
                        fontFamily: "'Bricolage Grotesque', sans-serif",
                      }}
                    >
                      {notif.title}
                    </p>
                    <span
                      className="text-xs flex-shrink-0"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      {notif.time}
                    </span>
                  </div>
                  <p
                    className="text-sm mt-0.5 leading-snug"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    {notif.subtitle}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity sheet overlay */}
      <AnimatePresence>
        {activitySheet && sheetConfig && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40"
              style={{
                background: "rgba(0,0,0,0.7)",
                backdropFilter: "blur(4px)",
              }}
              onClick={() => setActivitySheet(null)}
            />
            {/* Sheet */}
            <motion.div
              key="sheet"
              data-ocid="inbox.sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
              style={{
                background: "rgba(12,12,12,0.98)",
                border: "1px solid rgba(255,255,255,0.1)",
                maxHeight: "80vh",
              }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.2)" }}
                />
              </div>

              {/* Sheet header */}
              <div
                className="flex items-center gap-2 px-5 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                {sheetConfig.icon}
                <h2
                  className="text-white font-bold text-base flex-1"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  {sheetConfig.label}
                </h2>
                <button
                  type="button"
                  data-ocid="inbox.close_button"
                  onClick={() => setActivitySheet(null)}
                  className="text-white/40 hover:text-white transition-colors text-sm px-2 py-1 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                  aria-label="Close"
                >
                  Done
                </button>
              </div>

              {/* Sheet content */}
              <div
                className="overflow-y-auto"
                style={{ maxHeight: "calc(80vh - 100px)" }}
              >
                <ActivitySheetContent type={activitySheet} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* User Picker Modal */}
      <AnimatePresence>
        {showUserPicker && (
          <UserPickerModal
            onClose={() => setShowUserPicker(false)}
            onSelect={handleOpenChat}
          />
        )}
      </AnimatePresence>

      {/* Chat view */}
      <AnimatePresence>
        {activeChat && (
          <ChatView
            otherUserPrincipal={activeChat.otherUserPrincipal}
            otherUserProfile={activeChat.otherUserProfile}
            onBack={() => {
              setActiveChat(null);
              queryClient.invalidateQueries({ queryKey: ["conversations"] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
