import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Video } from "../backend.d";
import {
  ProfileVideoPlayer,
  VideoDurationBadge,
} from "../components/ProfileVideoPlayer";
import { useAuth } from "../context/AuthContext";
import { getDisplayName, getUsername } from "../lib/userFormat";

interface UserProfilePageProps {
  principalStr: string;
  onBack: () => void;
}

function formatCount(n: bigint | number): string {
  const num = typeof n === "bigint" ? Number(n) : n;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const VIDEO_GRADIENTS = [
  "from-rose-900 to-pink-800",
  "from-violet-900 to-purple-800",
  "from-blue-900 to-indigo-800",
  "from-emerald-900 to-teal-800",
  "from-amber-900 to-orange-800",
  "from-red-900 to-rose-800",
];

export function UserProfilePage({
  principalStr,
  onBack,
}: UserProfilePageProps) {
  const { actor, isAuthenticated, userProfile } = useAuth();
  const queryClient = useQueryClient();

  // Parse principal
  let principal: Principal | null = null;
  try {
    principal = Principal.fromText(principalStr);
  } catch {
    // Invalid principal
  }

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["userProfile", principalStr],
    queryFn: async () => {
      if (!actor || !principal) return null;
      return actor.getUserProfile(principal);
    },
    enabled: !!actor && !!principal,
    staleTime: 60_000,
  });

  // Fetch user's videos
  const { data: videos = [], isLoading: videosLoading } = useQuery<Video[]>({
    queryKey: ["userVideos", principalStr],
    queryFn: async () => {
      if (!actor || !principal) return [];
      return actor.getUserVideos(principal);
    },
    enabled: !!actor && !!principal,
    staleTime: 60_000,
  });

  // Fetch follow status
  const { data: isFollowing = false } = useQuery({
    queryKey: ["isFollowing", principalStr],
    queryFn: async () => {
      if (!actor || !principal || !isAuthenticated) return false;
      return actor.isFollowing(principal);
    },
    enabled: !!actor && !!principal && isAuthenticated,
    staleTime: 30_000,
  });

  // Fetch follower count (for live updates after follow/unfollow)
  const { data: followerCount = BigInt(0) } = useQuery({
    queryKey: ["followerCount", principalStr],
    queryFn: async () => {
      if (!actor || !principal) return BigInt(0);
      return actor.getFollowerCount(principal);
    },
    enabled: !!actor && !!principal,
    staleTime: 30_000,
  });

  // Is this the current user's own profile?
  const isOwnProfile =
    profile && userProfile
      ? profile.name === userProfile.name && profile.email === userProfile.email
      : false;

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!actor || !principal) throw new Error("Not connected");
      if (isFollowing) {
        await actor.unfollow(principal);
      } else {
        await actor.follow(principal);
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ["isFollowing", principalStr],
      });
      await queryClient.cancelQueries({
        queryKey: ["followerCount", principalStr],
      });
      queryClient.setQueryData(["isFollowing", principalStr], !isFollowing);
      queryClient.setQueryData(
        ["followerCount", principalStr],
        (prev: bigint) => (isFollowing ? prev - BigInt(1) : prev + BigInt(1)),
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["isFollowing", principalStr],
      });
      void queryClient.invalidateQueries({
        queryKey: ["followerCount", principalStr],
      });
      void queryClient.invalidateQueries({
        queryKey: ["userProfile", principalStr],
      });
      toast.success(isFollowing ? "Unfollowed" : "Now following!");
    },
    onError: () => {
      // Rollback
      queryClient.setQueryData(["isFollowing", principalStr], isFollowing);
      void queryClient.invalidateQueries({
        queryKey: ["followerCount", principalStr],
      });
      toast.error("Failed to update follow status");
    },
  });

  const isLoading = profileLoading || videosLoading;

  // Profile video player state
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerIndex, setPlayerIndex] = useState(0);

  if (!principal) {
    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center"
        style={{ background: "#000" }}
      >
        <p className="text-white/50 text-sm">Invalid profile link</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 text-[#ff0050] text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  const displayName = profile ? getDisplayName(profile.name) || "USER" : "USER";
  const username = profile ? getUsername(profile.name) : "";
  const avatarUrl = profile?.avatarUrl ?? "";
  const bio = profile?.bio ?? "";
  const followingCount = profile?.followingCount ?? BigInt(0);
  const videoCount = BigInt(videos.length);

  return (
    <div
      data-ocid="user-profile.page"
      className="min-h-screen w-full flex flex-col overflow-y-auto"
      style={{ background: "#000" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-4 pt-10 pb-3"
        style={{
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <button
          type="button"
          data-ocid="user-profile.back_button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1
          className="text-white font-bold text-base truncate max-w-[180px]"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          {isLoading ? "Profile" : displayName}
        </h1>
        <div className="w-9" />
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex flex-col items-center pt-12 px-5 gap-4 animate-pulse">
          <div
            className="w-24 h-24 rounded-full"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <div
            className="w-36 h-5 rounded-full"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <div
            className="w-24 h-4 rounded-full"
            style={{ background: "rgba(255,255,255,0.06)" }}
          />
          <div
            data-ocid="user-profile.loading_state"
            className="flex gap-6 mt-2"
          >
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className="w-10 h-5 rounded"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                />
                <div
                  className="w-14 h-3 rounded"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile content */}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="px-5 pt-8 pb-6 flex flex-col items-center text-center"
        >
          {/* Avatar */}
          <div className="relative mb-4">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden border-2"
              style={{
                background: avatarUrl
                  ? "transparent"
                  : "linear-gradient(135deg, #ff0050 0%, #ff6b35 100%)",
                borderColor: "rgba(255,255,255,0.15)",
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-2xl">
                  {getInitials(displayName)}
                </span>
              )}
            </div>
          </div>

          {/* Display name */}
          <h2
            className="text-white font-bold text-2xl tracking-wide leading-none mb-1"
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              letterSpacing: "0.02em",
            }}
          >
            {displayName}
          </h2>

          {/* Username */}
          {username && (
            <p
              className="text-sm mb-2"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              @{username}
            </p>
          )}

          {/* Bio */}
          {bio && (
            <p className="text-white/50 text-sm max-w-xs leading-relaxed mb-4 mt-1">
              {bio}
            </p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-6 mt-2 mb-5">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-white font-bold text-lg leading-none">
                {formatCount(followerCount)}
              </span>
              <span className="text-white/40 text-xs">Followers</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-white font-bold text-lg leading-none">
                {formatCount(followingCount)}
              </span>
              <span className="text-white/40 text-xs">Following</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-white font-bold text-lg leading-none">
                {formatCount(videoCount)}
              </span>
              <span className="text-white/40 text-xs">Videos</span>
            </div>
          </div>

          {/* Follow / Unfollow button */}
          {!isOwnProfile && isAuthenticated && (
            <motion.button
              type="button"
              data-ocid="user-profile.follow_button"
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-2.5 rounded-2xl font-bold text-sm transition-all disabled:opacity-70 flex items-center gap-2"
              style={
                isFollowing
                  ? {
                      background: "transparent",
                      border: "2px solid rgba(255,255,255,0.3)",
                      color: "rgba(255,255,255,0.8)",
                    }
                  : {
                      background:
                        "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
                      border: "none",
                      color: "white",
                      boxShadow: "0 8px 24px rgba(255,0,80,0.35)",
                    }
              }
            >
              {followMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isFollowing ? (
                "Following"
              ) : (
                "Follow"
              )}
            </motion.button>
          )}

          {isOwnProfile && (
            <p
              className="text-xs mt-2"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              This is your profile
            </p>
          )}
        </motion.div>
      )}

      {/* Divider */}
      {!isLoading && (
        <div
          className="h-px mx-4 mb-2"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />
      )}

      {/* Videos grid */}
      {!isLoading && (
        <div className="flex-1 px-1 pt-2 pb-24">
          <h3
            className="text-xs font-semibold uppercase tracking-widest px-3 mb-3"
            style={{
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          >
            Videos
          </h3>

          {videos.length === 0 ? (
            <div
              data-ocid="user-profile.empty_state"
              className="flex flex-col items-center justify-center py-16 text-center px-8"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: "rgba(255,0,80,0.08)" }}
              >
                <Play size={28} style={{ color: "#ff0050" }} />
              </div>
              <p className="text-white/50 text-sm">No videos yet.</p>
              <p className="text-white/25 text-xs mt-1 max-w-[200px]">
                Videos uploaded by this creator will appear here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 mt-1">
              {videos.map((video, i) => (
                <button
                  key={video.id.toString()}
                  type="button"
                  data-ocid={`user-profile.item.${i + 1}`}
                  onClick={() => {
                    setPlayerIndex(i);
                    setPlayerOpen(true);
                  }}
                  className={`aspect-[9/16] rounded-sm overflow-hidden relative bg-gradient-to-b ${VIDEO_GRADIENTS[i % VIDEO_GRADIENTS.length]} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0050]`}
                  aria-label={`Play ${video.title}`}
                >
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  {/* View count — bottom left */}
                  <div className="absolute bottom-1 left-1 flex items-center gap-0.5">
                    <Play size={10} fill="white" stroke="none" />
                    <span className="text-white text-[10px] font-medium">
                      {formatCount(video.viewCount)}
                    </span>
                  </div>
                  {/* Duration badge — bottom right */}
                  {video.videoUrl && (
                    <VideoDurationBadge videoUrl={video.videoUrl} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Profile Video Player overlay */}
      <AnimatePresence>
        {playerOpen && videos.length > 0 && (
          <ProfileVideoPlayer
            key="user-profile-video-player"
            videos={videos}
            initialIndex={playerIndex}
            onClose={() => setPlayerOpen(false)}
            isAuthenticated={isAuthenticated}
            onNavigateToProfile={undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
