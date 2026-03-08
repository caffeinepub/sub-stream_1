import type { Principal } from "@icp-sdk/core/principal";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { getDisplayName, getUsername } from "../lib/userFormat";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FollowingEntry {
  principal: Principal;
  principalStr: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  isLive: boolean;
}

interface FollowingLiveRowProps {
  onJoinStream: (principalStr: string, displayName: string) => void;
  onOpenProfile: (principalStr: string) => void;
}

// ─── Helper ────────────────────────────────────────────────────────────────────

function gradientFromString(s: string): [string, string] {
  const hash = Array.from(s).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hues = [0, 30, 60, 120, 160, 200, 240, 270, 320];
  const h1 = hues[hash % hues.length];
  const h2 = hues[(hash + 4) % hues.length];
  return [`hsl(${h1},70%,50%)`, `hsl(${h2},70%,40%)`];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name[0] ?? "?").toUpperCase();
}

// ─── Avatar circle ─────────────────────────────────────────────────────────────

function LiveAvatar({
  avatarUrl,
  displayName,
  principalStr,
  isLive,
  size = 52,
}: {
  avatarUrl: string;
  displayName: string;
  principalStr: string;
  isLive: boolean;
  size?: number;
}) {
  const [from, to] = gradientFromString(principalStr);
  const initials = getInitials(displayName || principalStr.slice(0, 2));

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size + 4, height: size + 4 }}
    >
      {/* Ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: isLive
            ? "2px solid #ff0050"
            : "2px solid rgba(255,255,255,0.15)",
          boxShadow: isLive ? "0 0 8px rgba(255,0,80,0.5)" : "none",
          borderRadius: "50%",
        }}
      />

      {/* Avatar */}
      <div
        className="absolute rounded-full overflow-hidden flex items-center justify-center"
        style={{
          inset: 3,
          background: avatarUrl
            ? "transparent"
            : `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            className="text-white font-bold select-none"
            style={{ fontSize: Math.round(size * 0.28) }}
          >
            {initials}
          </span>
        )}
      </div>

      {/* LIVE pill badge */}
      {isLive && (
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full"
          style={{
            bottom: -4,
            background: "#ff0050",
            paddingLeft: 4,
            paddingRight: 4,
            paddingTop: 1,
            paddingBottom: 1,
            zIndex: 2,
            minWidth: 28,
          }}
        >
          <span
            className="text-white font-bold tracking-wide"
            style={{ fontSize: 8, lineHeight: "12px" }}
          >
            LIVE
          </span>
        </div>
      )}
    </div>
  );
}

// ─── FollowingLiveRow ──────────────────────────────────────────────────────────

export function FollowingLiveRow({
  onJoinStream,
  onOpenProfile,
}: FollowingLiveRowProps) {
  const { actor, userProfile } = useAuth();

  // Get the caller's own principal via getAllUserids comparison or by deriving from profile
  // We fetch the following list using getCallerUserProfile's follower info, but we need
  // to call getFollowing(myPrincipal). The easiest way is to get all user IDs and find
  // ourselves by matching the profile, OR use actor.getAllUserids().
  // Actually we have actor.getCallerUserProfile() which returns UserProfile (no principal).
  // The cleanest approach: get all user IDs first, then call getFollowing with caller's
  // principal. But we don't have caller's principal directly here.
  // Since we can't easily get our own principal without the identity hook, we'll use
  // a different approach: fetch all user IDs, get online ones, and find who we follow
  // by using isFollowing for each. That's too many calls.
  //
  // Best approach: call actor.getFollowers for each user is also expensive.
  // Instead: fetch all user IDs with online status, then show online users the caller
  // might be following by checking isFollowing for the online subset.
  // We'll fetch all online users efficiently.

  // Step 1: Get all user principals
  const { data: allUserIds = [], isLoading: idsLoading } = useQuery<
    Principal[]
  >({
    queryKey: ["allUserIds-live-row"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUserids();
    },
    enabled: !!actor,
    staleTime: 120_000,
  });

  // Step 2: Check online status for all users
  const { data: onlineStatuses = [], isLoading: statusLoading } = useQuery<
    boolean[]
  >({
    queryKey: [
      "onlineStatus-live-row",
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

  // Step 3: Get profiles + following status for online users
  const onlineUserIds = allUserIds.filter((_, i) => onlineStatuses[i] === true);

  const { data: followingEntries = [], isLoading: profilesLoading } = useQuery<
    FollowingEntry[]
  >({
    queryKey: [
      "following-live-entries",
      onlineUserIds.map((id) => id.toText()).join(","),
      userProfile?.name,
    ],
    queryFn: async () => {
      if (!actor || onlineUserIds.length === 0) return [];

      // Fetch profiles and follow status in parallel
      const results = await Promise.all(
        onlineUserIds.map(async (principal) => {
          const principalStr = principal.toText();
          try {
            const [profile, isFollowing] = await Promise.all([
              actor.getUserProfile(principal),
              actor.isFollowing(principal),
            ]);
            // Only include people we follow
            if (!isFollowing) return null;
            const displayName =
              getDisplayName(profile?.name ?? "") ||
              `${principalStr.slice(0, 6)}…`;
            const username = getUsername(profile?.name ?? "");
            const entry: FollowingEntry = {
              principal,
              principalStr,
              displayName,
              username,
              avatarUrl: profile?.avatarUrl ?? "",
              isLive: true, // online = treat as live
            };
            return entry;
          } catch {
            return null;
          }
        }),
      );

      return results.filter((r): r is NonNullable<typeof r> => r !== null);
    },
    enabled: !!actor && onlineUserIds.length > 0,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const isLoading = idsLoading || statusLoading || profilesLoading;

  // Loading skeleton
  if (isLoading) {
    return (
      <div
        data-ocid="feed.live_row"
        className="flex items-center gap-3 px-4 pb-2 pt-1 overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            <div
              className="w-14 h-14 rounded-full animate-pulse"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />
            <div
              className="w-10 h-2 rounded-full animate-pulse"
              style={{ background: "rgba(255,255,255,0.06)" }}
            />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (followingEntries.length === 0) {
    return (
      <div
        data-ocid="feed.live_row.empty_state"
        className="px-4 pb-2 pt-1"
        style={{ minHeight: 0 }}
      >
        <p
          className="text-center text-xs"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          Follow creators to see them here.
        </p>
      </div>
    );
  }

  return (
    <div
      data-ocid="feed.live_row"
      className="flex items-end gap-3 px-4 pb-2 pt-1 overflow-x-auto"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {followingEntries.map((entry, i) => (
        <motion.button
          key={entry.principalStr}
          type="button"
          data-ocid={`feed.live_row.item.${i + 1}`}
          onClick={() => {
            if (entry.isLive) {
              onJoinStream(entry.principalStr, entry.displayName);
            } else {
              onOpenProfile(entry.principalStr);
            }
          }}
          whileTap={{ scale: 0.92 }}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 focus-visible:outline-none"
          style={{ minWidth: 56 }}
        >
          <LiveAvatar
            avatarUrl={entry.avatarUrl}
            displayName={entry.displayName}
            principalStr={entry.principalStr}
            isLive={entry.isLive}
            size={52}
          />
          <span
            className="text-white font-medium truncate"
            style={{
              fontSize: 10,
              maxWidth: 56,
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          >
            {entry.displayName.split(" ")[0]}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
