import type { Principal } from "@icp-sdk/core/principal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Hash,
  Radio,
  Search,
  User,
  UserCheck,
  Video,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UserProfile, Video as VideoType } from "../backend.d";
import { useAuth } from "../context/AuthContext";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SearchPageProps {
  onBack: () => void;
  onNavigateToProfile: (principalStr: string) => void;
  onOpenVideo?: (video: VideoType) => void;
}

type SearchTab = "Top" | "Users" | "Videos" | "Hashtags" | "Live";

const SEARCH_HISTORY_KEY = "substream_search_history";
const MAX_HISTORY = 10;

// ─── Local storage helpers ─────────────────────────────────────────────────────

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function saveToHistory(term: string) {
  if (!term.trim()) return;
  const current = loadHistory().filter((t) => t !== term);
  const updated = [term, ...current].slice(0, MAX_HISTORY);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
}

function clearHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

// ─── Format helpers ────────────────────────────────────────────────────────────

function formatCount(n: bigint | number): string {
  const num = typeof n === "bigint" ? Number(n) : n;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

// ─── Parse packed name helper ──────────────────────────────────────────────────
function parseName(rawName: string): { displayName: string; username: string } {
  if (rawName.includes("|")) {
    const [d, u] = rawName.split("|", 2);
    return { displayName: d ?? "", username: u ?? "" };
  }
  return { displayName: rawName, username: "" };
}

// ─── User matches query helper ─────────────────────────────────────────────────
function userMatchesQuery(profile: UserProfile, q: string): boolean {
  if (!q) return true;
  // Strip leading @ from query
  const stripped = q.startsWith("@") ? q.slice(1) : q;
  const { displayName, username } = parseName(profile.name ?? "");
  return (
    displayName.toLowerCase().includes(stripped) ||
    username.toLowerCase().includes(stripped) ||
    // Also match the full packed name
    (profile.name ?? "")
      .toLowerCase()
      .includes(stripped)
  );
}

// ─── Follow Button ─────────────────────────────────────────────────────────────

function FollowButton({
  principalStr,
  onTap,
}: {
  principalStr: string;
  onTap: (e: React.MouseEvent) => void;
}) {
  const { actor } = useAuth();
  const qc = useQueryClient();

  const { data: following = false } = useQuery<boolean>({
    queryKey: ["isFollowing", principalStr],
    queryFn: async () => {
      if (!actor) return false;
      const { Principal: PrincipalLib } = await import(
        "@icp-sdk/core/principal"
      );
      return actor.isFollowing(PrincipalLib.fromText(principalStr));
    },
    enabled: !!actor && !!principalStr,
    staleTime: 0,
  });

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!actor) return;
    const { Principal: PrincipalLib } = await import("@icp-sdk/core/principal");
    const p = PrincipalLib.fromText(principalStr);
    if (following) {
      await actor.unfollow(p);
    } else {
      await actor.follow(p);
    }
    qc.invalidateQueries({ queryKey: ["isFollowing", principalStr] });
    qc.invalidateQueries({ queryKey: ["followerCount", principalStr] });
    qc.invalidateQueries({ queryKey: ["allUserProfiles"] });
  };

  return (
    <motion.button
      type="button"
      data-ocid="search.follow_button"
      whileTap={{ scale: 0.93 }}
      onClick={(e) => {
        void handleClick(e);
        onTap(e);
      }}
      className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all"
      style={
        following
          ? {
              background: "rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(255,255,255,0.2)",
            }
          : {
              background: "linear-gradient(135deg, #ff0050 0%, #ff3377 100%)",
              color: "white",
              border: "1px solid rgba(255,0,80,0.4)",
            }
      }
    >
      {following ? (
        <span className="flex items-center gap-1">
          <UserCheck size={11} />
          Following
        </span>
      ) : (
        "Follow"
      )}
    </motion.button>
  );
}

// ─── User result card ──────────────────────────────────────────────────────────

function UserCard({
  principalStr,
  profile,
  index,
  onTap,
  currentUserPrincipalStr,
}: {
  principalStr: string;
  profile: UserProfile;
  index: number;
  onTap: (p: string) => void;
  currentUserPrincipalStr?: string;
}) {
  const { displayName, username } = parseName(profile.name ?? "");
  const initials = (displayName || "U").slice(0, 2).toUpperCase();
  const isSelf = currentUserPrincipalStr === principalStr;

  return (
    <motion.div
      data-ocid={`search.user_result.${index}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Avatar — tappable to open profile */}
      <button
        type="button"
        onClick={() => onTap(principalStr)}
        className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden focus:outline-none"
        style={{
          background: "linear-gradient(135deg, #ff0050 0%, #ff6b35 100%)",
        }}
        aria-label={`Open ${displayName || "user"}'s profile`}
      >
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-white font-bold text-sm">{initials}</span>
        )}
      </button>

      {/* Info — tappable to open profile */}
      <button
        type="button"
        onClick={() => onTap(principalStr)}
        className="flex-1 text-left min-w-0 focus:outline-none"
      >
        <p
          className="text-white font-bold text-sm truncate"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          {displayName || "User"}
        </p>
        {username ? (
          <p className="text-white/50 text-xs truncate">@{username}</p>
        ) : null}
        <p className="text-white/30 text-xs mt-0.5">
          {formatCount(profile.followerCount)} followers
        </p>
      </button>

      {/* Follow button — skip for self */}
      {!isSelf && (
        <FollowButton
          principalStr={principalStr}
          onTap={(e) => e.stopPropagation()}
        />
      )}
    </motion.div>
  );
}

// ─── Video result card ─────────────────────────────────────────────────────────

function VideoCard({
  video,
  creatorName,
  index,
  onTap,
}: {
  video: VideoType;
  creatorName: string;
  index: number;
  onTap: (v: VideoType) => void;
}) {
  return (
    <motion.button
      type="button"
      data-ocid={`search.video_result.${index}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      onClick={() => onTap(video)}
      className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all active:scale-98 w-full text-left"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Thumbnail */}
      <div
        className="w-12 rounded-xl overflow-hidden flex-shrink-0"
        style={{
          aspectRatio: "9/16",
          background: "linear-gradient(135deg, #1a1a2e, #16213e)",
        }}
      >
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #ff0050 0%, #7c3aed 100%)",
            }}
          >
            <Video size={16} className="text-white/60" />
          </div>
        )}
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-white font-semibold text-sm truncate"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          {video.title || "Untitled"}
        </p>
        <p className="text-white/50 text-xs truncate mt-0.5">@{creatorName}</p>
        <p className="text-white/30 text-xs mt-0.5">
          {formatCount(video.viewCount)} views
        </p>
      </div>
    </motion.button>
  );
}

// ─── Hashtag result row ────────────────────────────────────────────────────────

function HashtagRow({
  tag,
  count,
  index,
  onTap,
}: {
  tag: string;
  count: number;
  index: number;
  onTap: (tag: string) => void;
}) {
  return (
    <motion.button
      type="button"
      data-ocid={`search.hashtag_result.${index}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      onClick={() => onTap(tag)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all active:scale-98"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: "rgba(255,0,80,0.1)",
          border: "1px solid rgba(255,0,80,0.2)",
        }}
      >
        <Hash size={18} style={{ color: "#ff0050" }} />
      </div>
      <div className="flex-1 text-left">
        <p className="text-white font-semibold text-sm">#{tag}</p>
        <p className="text-white/40 text-xs">{formatCount(count)} videos</p>
      </div>
    </motion.button>
  );
}

// ─── Suggested Users section ───────────────────────────────────────────────────

function SuggestedUsers({
  userProfiles,
  currentUserPrincipalStr,
  onTap,
}: {
  userProfiles: Array<{ principalStr: string; profile: UserProfile }>;
  currentUserPrincipalStr?: string;
  onTap: (p: string) => void;
}) {
  const suggestions = userProfiles
    .filter(({ principalStr }) => principalStr !== currentUserPrincipalStr)
    .slice(0, 6);

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-2">
      <p
        className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3 px-1"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        Suggested Users
      </p>
      <div className="space-y-2">
        {suggestions.map(({ principalStr, profile }, i) => (
          <UserCard
            key={principalStr}
            principalStr={principalStr}
            profile={profile}
            index={i + 1}
            onTap={onTap}
            currentUserPrincipalStr={currentUserPrincipalStr}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main SearchPage ───────────────────────────────────────────────────────────

export function SearchPage({
  onBack,
  onNavigateToProfile,
  onOpenVideo,
}: SearchPageProps) {
  const { actor } = useAuth();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("Users");
  const [history, setHistory] = useState<string[]>(loadHistory);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine self principal from localStorage (set by auth system)
  const selfPrincipalStr = localStorage.getItem("ss_principal") ?? undefined;

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  // ── Data fetching ────────────────────────────────────────────────────────
  const { data: allVideos = [], isLoading: videosLoading } = useQuery<
    VideoType[]
  >({
    queryKey: ["allVideos"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllVideos();
    },
    enabled: !!actor,
  });

  const { data: allUserIds = [], isLoading: usersLoading } = useQuery<
    Principal[]
  >({
    queryKey: ["allUserIds"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUserids();
    },
    enabled: !!actor,
    staleTime: 0,
  });

  // Fetch all user profiles
  const { data: userProfiles = [], isLoading: profilesLoading } = useQuery<
    Array<{ principalStr: string; profile: UserProfile }>
  >({
    queryKey: [
      "allUserProfiles",
      allUserIds.map((p) => p.toString()).join(","),
    ],
    queryFn: async () => {
      if (!actor || allUserIds.length === 0) return [];
      const results = await Promise.all(
        allUserIds.map(async (id) => {
          const profile = await actor.getUserProfile(id).catch(() => null);
          return profile ? { principalStr: id.toString(), profile } : null;
        }),
      );
      return results.filter(
        (r): r is { principalStr: string; profile: UserProfile } => r !== null,
      );
    },
    enabled: !!actor && allUserIds.length > 0,
    staleTime: 0,
  });

  const isLoading = videosLoading || usersLoading || profilesLoading;

  // ── Hashtag extraction ────────────────────────────────────────────────────
  const hashtagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const video of allVideos) {
      for (const tag of video.hashtags) {
        counts[tag] = (counts[tag] ?? 0) + 1;
      }
    }
    return counts;
  }, [allVideos]);

  const sortedHashtags = useMemo(
    () => Object.entries(hashtagCounts).sort((a, b) => b[1] - a[1]),
    [hashtagCounts],
  );

  // ── Creator name lookup ───────────────────────────────────────────────────
  const profileByPrincipal = useMemo(() => {
    const map: Record<string, UserProfile> = {};
    for (const { principalStr, profile } of userProfiles) {
      map[principalStr] = profile;
    }
    return map;
  }, [userProfiles]);

  function getCreatorName(creatorPrincipal: Principal): string {
    const profile = profileByPrincipal[creatorPrincipal.toString()];
    if (!profile) return "creator";
    const raw = profile.name ?? "";
    const [, username] = raw.includes("|") ? raw.split("|", 2) : [raw, ""];
    return username || raw || "creator";
  }

  // ── Filtered results ──────────────────────────────────────────────────────
  const q = query.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    if (!q) return userProfiles.slice(0, 6);
    return userProfiles.filter(({ profile }) => userMatchesQuery(profile, q));
  }, [q, userProfiles]);

  const filteredVideos = useMemo(() => {
    if (!q) return allVideos.slice(0, 6);
    return allVideos.filter((v) => {
      return (
        v.title.toLowerCase().includes(q) ||
        v.caption.toLowerCase().includes(q) ||
        v.hashtags.some((h) => h.toLowerCase().includes(q))
      );
    });
  }, [q, allVideos]);

  const filteredHashtags = useMemo(() => {
    if (!q) return sortedHashtags.slice(0, 10);
    return sortedHashtags.filter(([tag]) => tag.toLowerCase().includes(q));
  }, [q, sortedHashtags]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const commitSearch = (term: string) => {
    if (!term.trim()) return;
    saveToHistory(term.trim());
    setHistory(loadHistory());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitSearch(query);
    }
  };

  const handleHistoryTap = (term: string) => {
    setQuery(term);
  };

  const removeHistoryItem = (term: string) => {
    const updated = history.filter((t) => t !== term);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    setHistory(updated);
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  const handleHashtagTap = (tag: string) => {
    setQuery(tag);
    setActiveTab("Videos");
    commitSearch(tag);
  };

  const handleUserTap = (principalStr: string) => {
    commitSearch(query || principalStr);
    onNavigateToProfile(principalStr);
  };

  const handleVideoTap = (video: VideoType) => {
    commitSearch(query || video.title);
    onOpenVideo?.(video);
  };

  const TABS: SearchTab[] = ["Top", "Users", "Videos", "Hashtags", "Live"];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      data-ocid="search.page"
      className="fixed inset-0 flex flex-col"
      style={{ background: "#000" }}
    >
      {/* Search header */}
      <div
        className="flex items-center gap-3 px-4 pt-12 pb-3 flex-shrink-0"
        style={{
          background: "rgba(0,0,0,0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          type="button"
          data-ocid="search.back_button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.07)" }}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
          />
          <input
            ref={inputRef}
            type="text"
            data-ocid="search.search_input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search @username, name..."
            className="w-full pl-9 pr-9 py-2.5 rounded-2xl text-white placeholder:text-white/30 outline-none text-sm"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
              caretColor: "#ff0050",
              fontSize: "16px",
            }}
            aria-label="Search"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)" }}
              aria-label="Clear search"
            >
              <X size={12} className="text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 px-3 py-2 flex-shrink-0 overflow-x-auto"
        style={{
          background: "rgba(0,0,0,0.9)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          scrollbarWidth: "none",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            data-ocid="search.tab"
            onClick={() => setActiveTab(tab)}
            className="relative flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              background:
                activeTab === tab ? "rgba(255,0,80,0.15)" : "transparent",
              color: activeTab === tab ? "#ff0050" : "rgba(255,255,255,0.5)",
              border:
                activeTab === tab
                  ? "1px solid rgba(255,0,80,0.3)"
                  : "1px solid transparent",
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-8">
        {isLoading ? (
          <div
            data-ocid="search.loading_state"
            className="flex flex-col items-center justify-center h-40 gap-3"
          >
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "#ff0050" }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 0.9,
                    delay: i * 0.2,
                    repeat: Number.POSITIVE_INFINITY,
                  }}
                />
              ))}
            </div>
            <p className="text-white/30 text-sm">Loading…</p>
          </div>
        ) : !query ? (
          /* ── Empty state: trending + history ── */
          <div className="px-4 py-5 space-y-6">
            {/* Recent searches */}
            {history.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">
                    Recent
                  </p>
                  <button
                    type="button"
                    data-ocid="search.clear_history_button"
                    onClick={handleClearHistory}
                    className="text-xs font-medium"
                    style={{ color: "#ff0050" }}
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.map((term) => (
                    <div
                      key={term}
                      className="flex items-center gap-1 pl-3 pr-1 py-1.5 rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.09)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleHistoryTap(term)}
                        className="text-white/80 text-sm"
                      >
                        {term}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeHistoryItem(term)}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors"
                        style={{ background: "rgba(255,255,255,0.1)" }}
                        aria-label={`Remove ${term}`}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested creators */}
            {userProfiles.length > 0 && (
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-3">
                  Suggested Creators
                </p>
                <div className="space-y-2">
                  {userProfiles
                    .filter(
                      ({ principalStr }) => principalStr !== selfPrincipalStr,
                    )
                    .slice(0, 6)
                    .map(({ principalStr, profile }, i) => (
                      <UserCard
                        key={principalStr}
                        principalStr={principalStr}
                        profile={profile}
                        index={i + 1}
                        onTap={handleUserTap}
                        currentUserPrincipalStr={selfPrincipalStr}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Trending hashtags */}
            {sortedHashtags.length > 0 && (
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-3">
                  Trending Hashtags
                </p>
                <div className="space-y-2">
                  {sortedHashtags.slice(0, 8).map(([tag, count], i) => (
                    <HashtagRow
                      key={tag}
                      tag={tag}
                      count={count}
                      index={i + 1}
                      onTap={handleHashtagTap}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Trending videos */}
            {allVideos.length > 0 && (
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-3">
                  Trending Videos
                </p>
                <div className="space-y-2">
                  {[...allVideos]
                    .sort((a, b) => Number(b.viewCount) - Number(a.viewCount))
                    .slice(0, 6)
                    .map((video, i) => (
                      <VideoCard
                        key={video.id.toString()}
                        video={video}
                        creatorName={getCreatorName(video.creator)}
                        index={i + 1}
                        onTap={handleVideoTap}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* True empty state */}
            {allVideos.length === 0 && userProfiles.length === 0 && (
              <div
                data-ocid="search.empty_state"
                className="flex flex-col items-center justify-center py-16 gap-4"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "rgba(255,0,80,0.1)",
                    border: "1px solid rgba(255,0,80,0.2)",
                  }}
                >
                  <Search size={28} style={{ color: "#ff0050" }} />
                </div>
                <p
                  className="text-white font-bold text-lg text-center"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  Nothing here yet
                </p>
                <p className="text-white/40 text-sm text-center max-w-xs">
                  Be the first to upload content and get discovered.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ── Search results ── */
          <div className="px-4 py-4 space-y-3">
            {activeTab === "Top" &&
              (filteredUsers.length === 0 &&
              filteredVideos.length === 0 &&
              filteredHashtags.length === 0 ? (
                <div
                  data-ocid="search.empty_state"
                  className="flex flex-col items-center justify-center py-12 gap-4"
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <Search size={24} className="text-white/30" />
                  </div>
                  <p className="text-white/40 text-sm text-center">
                    No results for "{query}"
                  </p>
                  <SuggestedUsers
                    userProfiles={userProfiles}
                    currentUserPrincipalStr={selfPrincipalStr}
                    onTap={handleUserTap}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredUsers.slice(0, 3).length > 0 && (
                    <div>
                      <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-2 px-1">
                        Users
                      </p>
                      <div className="space-y-2">
                        {filteredUsers
                          .slice(0, 3)
                          .map(({ principalStr, profile }, i) => (
                            <UserCard
                              key={principalStr}
                              principalStr={principalStr}
                              profile={profile}
                              index={i + 1}
                              onTap={handleUserTap}
                              currentUserPrincipalStr={selfPrincipalStr}
                            />
                          ))}
                      </div>
                    </div>
                  )}
                  {filteredVideos.slice(0, 3).length > 0 && (
                    <div>
                      <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-2 px-1">
                        Videos
                      </p>
                      <div className="space-y-2">
                        {filteredVideos.slice(0, 3).map((video, i) => (
                          <VideoCard
                            key={video.id.toString()}
                            video={video}
                            creatorName={getCreatorName(video.creator)}
                            index={i + 1}
                            onTap={handleVideoTap}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {filteredHashtags.slice(0, 3).length > 0 && (
                    <div>
                      <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-2 px-1">
                        Hashtags
                      </p>
                      <div className="space-y-2">
                        {filteredHashtags.slice(0, 3).map(([tag, count], i) => (
                          <HashtagRow
                            key={tag}
                            tag={tag}
                            count={count}
                            index={i + 1}
                            onTap={handleHashtagTap}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

            {activeTab === "Users" &&
              (filteredUsers.length === 0 ? (
                <div
                  data-ocid="search.empty_state"
                  className="flex flex-col items-center justify-center py-12 gap-3"
                >
                  <User size={32} className="text-white/20" />
                  <p className="text-white/40 text-sm">
                    No users found for "{query}"
                  </p>
                  <SuggestedUsers
                    userProfiles={userProfiles}
                    currentUserPrincipalStr={selfPrincipalStr}
                    onTap={handleUserTap}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map(({ principalStr, profile }, i) => (
                    <UserCard
                      key={principalStr}
                      principalStr={principalStr}
                      profile={profile}
                      index={i + 1}
                      onTap={handleUserTap}
                      currentUserPrincipalStr={selfPrincipalStr}
                    />
                  ))}
                </div>
              ))}

            {activeTab === "Videos" &&
              (filteredVideos.length === 0 ? (
                <div
                  data-ocid="search.empty_state"
                  className="flex flex-col items-center justify-center py-16 gap-3"
                >
                  <Video size={32} className="text-white/20" />
                  <p className="text-white/40 text-sm">
                    No videos found for "{query}"
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredVideos.map((video, i) => (
                    <VideoCard
                      key={video.id.toString()}
                      video={video}
                      creatorName={getCreatorName(video.creator)}
                      index={i + 1}
                      onTap={handleVideoTap}
                    />
                  ))}
                </div>
              ))}

            {activeTab === "Hashtags" &&
              (filteredHashtags.length === 0 ? (
                <div
                  data-ocid="search.empty_state"
                  className="flex flex-col items-center justify-center py-16 gap-3"
                >
                  <Hash size={32} className="text-white/20" />
                  <p className="text-white/40 text-sm">
                    No hashtags found for "{query}"
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredHashtags.map(([tag, count], i) => (
                    <HashtagRow
                      key={tag}
                      tag={tag}
                      count={count}
                      index={i + 1}
                      onTap={handleHashtagTap}
                    />
                  ))}
                </div>
              ))}

            {activeTab === "Live" && (
              <div
                data-ocid="search.empty_state"
                className="flex flex-col items-center justify-center py-16 gap-4"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "rgba(255,0,80,0.1)",
                    border: "1px solid rgba(255,0,80,0.2)",
                  }}
                >
                  <Radio size={28} style={{ color: "#ff0050" }} />
                </div>
                <div
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: "#ff0050", color: "white" }}
                >
                  LIVE
                </div>
                <p
                  className="text-white font-bold text-base text-center"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  Live search coming soon
                </p>
                <p className="text-white/40 text-sm text-center max-w-xs">
                  Discover active live streams directly from the LIVE tab.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
