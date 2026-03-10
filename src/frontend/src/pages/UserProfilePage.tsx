import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bell,
  Loader2,
  MoreHorizontal,
  Play,
  Radio,
  Send,
  Share2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Video } from "../backend.d";
import {
  ProfileVideoPlayer,
  VideoDurationBadge,
} from "../components/ProfileVideoPlayer";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import { useFollowSystem } from "../hooks/useFollowSystem";
import { useLiveStatus } from "../hooks/useLiveStatus";
import { getDisplayName, getUsername } from "../lib/userFormat";

interface UserProfilePageProps {
  principalStr: string;
  onBack: () => void;
  onNavigateToProfile?: (principalStr: string) => void;
  onOpenFollowers?: (userId: string, displayName: string) => void;
  onOpenFollowing?: (userId: string, displayName: string) => void;
  onJoinLiveStream?: (principalStr: string, displayName: string) => void;
  onOpenDM?: (principalStr: string) => void;
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
  onNavigateToProfile,
  onOpenFollowers,
  onOpenFollowing,
  onJoinLiveStream,
  onOpenDM,
}: UserProfilePageProps) {
  const { actor, isAuthenticated, userProfile } = useAuth();
  const { addFollowNotification, addFriendNotification } = useNotifications();
  const queryClient = useQueryClient();
  const {
    blockUser,
    isBlockedByMe,
    recordFollowTimestamp,
    removeFollowTimestamp,
    myPrincipal,
  } = useFollowSystem();
  const { getLiveStatus } = useLiveStatus();

  // More options menu state
  const [menuOpen, setMenuOpen] = useState(false);
  // Block confirmation dialog state
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  // Friends sheet state
  const [friendsSheetOpen, setFriendsSheetOpen] = useState(false);

  // Parse principal
  let principal: Principal | null = null;
  try {
    principal = Principal.fromText(principalStr);
  } catch {
    // Invalid principal
  }

  // Check if this user is live
  const isLive = getLiveStatus(principalStr);

  // Check if blocked
  const blocked = isBlockedByMe(principalStr);

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

  // Fetch follow status (am I following them?)
  const { data: isFollowing = false } = useQuery({
    queryKey: ["isFollowing", principalStr],
    queryFn: async () => {
      if (!actor || !principal || !isAuthenticated) return false;
      return actor.isFollowing(principal);
    },
    enabled: !!actor && !!principal && isAuthenticated,
    staleTime: 0,
  });

  // Fetch whether they follow me (for "Friends" detection)
  const { data: theyFollowMe = false } = useQuery({
    queryKey: ["theyFollowMe", principalStr, myPrincipal],
    queryFn: async () => {
      if (!actor || !principal || !myPrincipal) return false;
      // Get their following list and see if my principal is in it
      const theirFollowing = await actor.getFollowing(principal!);
      const myPrincipalObj = Principal.fromText(myPrincipal);
      return theirFollowing.some(
        (p) => p.toString() === myPrincipalObj.toString(),
      );
    },
    enabled: !!actor && !!principal && !!myPrincipal && isAuthenticated,
    staleTime: 30_000,
  });

  // Friends if mutual follow
  const isFriend = isFollowing && theyFollowMe;

  // Fetch follower count (for live updates after follow/unfollow)
  const { data: followerCount = BigInt(0) } = useQuery({
    queryKey: ["followerCount", principalStr],
    queryFn: async () => {
      if (!actor || !principal) return BigInt(0);
      return actor.getFollowerCount(principal);
    },
    enabled: !!actor && !!principal,
    staleTime: 0,
  });

  // Fetch following count (authoritative live count)
  const { data: followingCount = BigInt(0) } = useQuery({
    queryKey: ["followingCount", principalStr],
    queryFn: async () => {
      if (!actor || !principal) return BigInt(0);
      return actor.getFollowingCount(principal);
    },
    enabled: !!actor && !!principal,
    staleTime: 0,
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
      // Optimistically toggle only the boolean follow state (safe, no count math)
      queryClient.setQueryData(["isFollowing", principalStr], !isFollowing);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["isFollowing", principalStr],
      });
      void queryClient.invalidateQueries({
        queryKey: ["followerCount", principalStr],
      });
      void queryClient.invalidateQueries({
        queryKey: ["followingCount", principalStr],
      });
      void queryClient.invalidateQueries({
        queryKey: ["userProfile", principalStr],
      });
      void queryClient.invalidateQueries({
        queryKey: ["theyFollowMe", principalStr, myPrincipal],
      });

      if (!isFollowing) {
        // Just followed
        const displayNameForNotif = profile
          ? getDisplayName(profile.name) || "USER"
          : "USER";
        recordFollowTimestamp(myPrincipal, principalStr);
        // Fire follow notification (for their notifications)
        const myName = userProfile
          ? getDisplayName(userProfile.name) || "USER"
          : "USER";
        addFollowNotification(
          myName,
          myPrincipal,
          userProfile?.avatarUrl ?? "",
        );

        // Check if mutual (they were already following me) → friends notification
        if (theyFollowMe) {
          addFriendNotification(displayNameForNotif, profile?.avatarUrl ?? "");
        }

        toast.success(`Now following ${displayNameForNotif}!`);
      } else {
        // Unfollowed
        removeFollowTimestamp(myPrincipal, principalStr);
        toast.success("Unfollowed");
      }
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

  // Handle block
  const handleBlockConfirm = () => {
    const nameForBlock = profile
      ? getDisplayName(profile.name) || "USER"
      : "USER";
    blockUser(principalStr, nameForBlock);
    setBlockConfirmOpen(false);
    setMenuOpen(false);
    toast.success(`${nameForBlock} blocked`);
    onBack();
  };

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

  // If blocked, show "User not found"
  if (blocked) {
    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center"
        style={{ background: "#000" }}
      >
        <div className="flex flex-col items-center gap-3 text-center px-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <span className="text-2xl">🚫</span>
          </div>
          <p className="text-white font-semibold text-base">User not found</p>
          <p className="text-white/35 text-sm">
            This account is not available.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-3 text-[#ff0050] text-sm font-medium"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const displayName = profile ? getDisplayName(profile.name) || "USER" : "USER";
  const username = profile ? getUsername(profile.name) : "";
  const avatarUrl = profile?.avatarUrl ?? "";
  const bio = profile?.bio ?? "";
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
        {/* Bell + Share icons on right */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-ocid="user-profile.bell_button"
            onClick={() => toast("Notifications coming soon")}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.06)" }}
            aria-label="Notifications"
          >
            <Bell size={18} />
          </button>
          <button
            type="button"
            data-ocid="user-profile.share_button"
            onClick={() => {
              const url = `${window.location.origin}/?profile=${principalStr}`;
              navigator.clipboard
                .writeText(url)
                .then(() => {
                  toast.success("Profile link copied!");
                })
                .catch(() => {
                  toast.success("Profile link copied!");
                });
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.06)" }}
            aria-label="Share profile"
          >
            <Share2 size={18} />
          </button>
        </div>
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
          {/* Avatar with LIVE ring */}
          <div className="relative mb-4">
            {/* LIVE pulsing red ring */}
            {isLive && (
              <motion.div
                className="absolute rounded-full"
                style={{
                  inset: -4,
                  border: "3px solid #ff0050",
                  borderRadius: "50%",
                  zIndex: 0,
                }}
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{
                  duration: 1.4,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
            )}
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden border-2 relative"
              style={{
                background: avatarUrl
                  ? "transparent"
                  : "linear-gradient(135deg, #ff0050 0%, #ff6b35 100%)",
                borderColor: isLive ? "#ff0050" : "rgba(255,255,255,0.15)",
                zIndex: 1,
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

          {/* Display name + LIVE badge + Friends badge */}
          <div className="flex items-center gap-2 mb-1">
            <h2
              className="text-white font-bold text-2xl tracking-wide leading-none"
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                letterSpacing: "0.02em",
              }}
            >
              {displayName}
            </h2>
            {isLive && (
              <motion.span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{
                  background: "#ff0050",
                  color: "white",
                  letterSpacing: "0.06em",
                }}
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{
                  duration: 1.2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              >
                LIVE
              </motion.span>
            )}
            {isFriend && !isOwnProfile && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: "rgba(34,197,94,0.15)",
                  color: "#22c55e",
                  border: "1px solid rgba(34,197,94,0.3)",
                }}
              >
                Friends
              </span>
            )}
          </div>

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

          {/* Stats row — tappable */}
          <div className="flex items-center gap-6 mt-2 mb-5">
            <button
              type="button"
              data-ocid="user-profile.followers_button"
              onClick={() => onOpenFollowers?.(principalStr, displayName)}
              className="flex flex-col items-center gap-0.5 transition-opacity active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0050] rounded-lg px-1"
              aria-label={`View followers of ${displayName}`}
            >
              <span className="text-white font-bold text-lg leading-none">
                {formatCount(followerCount)}
              </span>
              <span className="text-white/40 text-xs">Followers</span>
            </button>
            <div className="w-px h-8 bg-white/10" />
            <button
              type="button"
              data-ocid="user-profile.following_button"
              onClick={() => onOpenFollowing?.(principalStr, displayName)}
              className="flex flex-col items-center gap-0.5 transition-opacity active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0050] rounded-lg px-1"
              aria-label={`View following of ${displayName}`}
            >
              <span className="text-white font-bold text-lg leading-none">
                {formatCount(followingCount)}
              </span>
              <span className="text-white/40 text-xs">Following</span>
            </button>
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
            <div className="flex flex-col items-center gap-2 w-full max-w-xs">
              <motion.button
                type="button"
                data-ocid="user-profile.follow_button"
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
                whileTap={{ scale: 0.97 }}
                className="w-full px-8 py-2.5 rounded-2xl font-bold text-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2"
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
                ) : isFriend ? (
                  "Friends ✓"
                ) : isFollowing ? (
                  "Following"
                ) : (
                  "Follow"
                )}
              </motion.button>

              {/* Join Live Stream button */}
              {isLive && (
                <motion.button
                  type="button"
                  data-ocid="user-profile.join_live_button"
                  onClick={() => onJoinLiveStream?.(principalStr, displayName)}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full px-8 py-2.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                  style={{
                    background: "rgba(255,0,80,0.12)",
                    border: "1.5px solid rgba(255,0,80,0.4)",
                    color: "#ff0050",
                  }}
                >
                  <Radio size={15} className="animate-pulse" />
                  Join Live Stream
                </motion.button>
              )}
            </div>
          )}

          {/* Message / Friends / More row — shown for other users */}
          {!isOwnProfile && isAuthenticated && (
            <div className="flex gap-2 w-full max-w-xs mt-1">
              <button
                type="button"
                data-ocid="user-profile.message_button"
                onClick={() => {
                  if (!isFollowing) {
                    toast("Follow this user to send messages.");
                  } else {
                    onOpenDM?.(principalStr);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                <Send size={15} />
                <span>Message</span>
              </button>
              <button
                type="button"
                data-ocid="user-profile.friends_button"
                onClick={() => setFriendsSheetOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                <UserPlus size={15} />
                <span>Friends</span>
              </button>
              <button
                type="button"
                data-ocid="user-profile.more_button"
                onClick={() => setMenuOpen(true)}
                className="w-12 flex items-center justify-center py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
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
            onNavigateToProfile={onNavigateToProfile}
          />
        )}
      </AnimatePresence>

      {/* More Options bottom sheet */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss */}
            <div
              className="fixed inset-0 z-[180]"
              style={{ background: "rgba(0,0,0,0.6)" }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              data-ocid="user-profile.sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 z-[190] rounded-t-3xl"
              style={{
                background: "rgba(12,12,12,0.99)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.2)" }}
                />
              </div>
              <div className="px-4 pb-8 pt-2 space-y-1">
                <button
                  type="button"
                  data-ocid="user-profile.block_button"
                  onClick={() => {
                    setMenuOpen(false);
                    setBlockConfirmOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all active:scale-[0.98]"
                  style={{
                    background: "rgba(255,0,80,0.06)",
                    border: "1px solid rgba(255,0,80,0.15)",
                  }}
                >
                  <span className="text-xl">🚫</span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "#ff0050" }}
                  >
                    Block User
                  </span>
                </button>
                <button
                  type="button"
                  data-ocid="user-profile.report_button"
                  onClick={() => {
                    setMenuOpen(false);
                    toast.success("Reported");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all active:scale-[0.98]"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span className="text-xl">⚠️</span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "rgba(255,255,255,0.8)" }}
                  >
                    Report
                  </span>
                </button>
                <button
                  type="button"
                  data-ocid="user-profile.cancel_button"
                  onClick={() => setMenuOpen(false)}
                  className="w-full py-4 rounded-2xl text-sm font-semibold mt-1"
                  style={{
                    color: "rgba(255,255,255,0.4)",
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

      {/* Block confirmation dialog */}
      <AnimatePresence>
        {blockConfirmOpen && (
          <>
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss */}
            <div
              className="fixed inset-0 z-[200]"
              style={{ background: "rgba(0,0,0,0.75)" }}
              onClick={() => setBlockConfirmOpen(false)}
            />
            <motion.div
              data-ocid="user-profile.block_dialog"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[210] flex items-center justify-center p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="w-full max-w-xs rounded-3xl overflow-hidden"
                style={{
                  background: "rgba(16,16,16,0.99)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backdropFilter: "blur(24px)",
                }}
              >
                <div className="px-6 pt-7 pb-2 text-center">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: "rgba(255,0,80,0.1)" }}
                  >
                    <span className="text-2xl">🚫</span>
                  </div>
                  <h3
                    className="text-white font-bold text-lg mb-2"
                    style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                  >
                    Block {displayName}?
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed">
                    They won't be able to view your profile, videos or contact
                    you.
                  </p>
                </div>
                <div className="flex flex-col gap-2 px-5 pb-7 pt-4">
                  <button
                    type="button"
                    data-ocid="user-profile.block_confirm_button"
                    onClick={handleBlockConfirm}
                    className="w-full py-3.5 rounded-2xl text-white text-sm font-bold"
                    style={{
                      background:
                        "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
                      boxShadow: "0 4px 16px rgba(255,0,80,0.3)",
                    }}
                  >
                    Confirm Block
                  </button>
                  <button
                    type="button"
                    data-ocid="user-profile.block_cancel_button"
                    onClick={() => setBlockConfirmOpen(false)}
                    className="w-full py-3.5 rounded-2xl text-sm font-semibold"
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      background: "rgba(255,255,255,0.06)",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Friends Sheet */}
      <AnimatePresence>
        {friendsSheetOpen && (
          <>
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss */}
            <div
              className="fixed inset-0 z-[100]"
              style={{ background: "rgba(0,0,0,0.75)" }}
              onClick={() => setFriendsSheetOpen(false)}
            />
            <motion.div
              data-ocid="user-profile.friends_sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 z-[110] rounded-t-3xl overflow-hidden flex flex-col"
              style={{
                background: "rgba(12,12,12,0.98)",
                border: "1px solid rgba(255,255,255,0.09)",
                backdropFilter: "blur(24px)",
                maxHeight: "75vh",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sheet header */}
              <div
                className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <h3
                  className="text-white font-bold text-lg"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  Friends
                </h3>
                <button
                  type="button"
                  data-ocid="user-profile.friends_sheet_close_button"
                  onClick={() => setFriendsSheetOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                  aria-label="Close friends list"
                >
                  <X size={16} />
                </button>
              </div>
              {/* Sheet body */}
              <FriendsSheetBody
                principalStr={principalStr}
                onOpenDM={onOpenDM}
                isFollowing={isFollowing}
                onClose={() => setFriendsSheetOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── FriendsSheetBody ────────────────────────────────────────────────────────

function FriendsSheetBody({
  principalStr,
  onOpenDM,
  isFollowing,
  onClose,
}: {
  principalStr: string;
  onOpenDM?: (principalStr: string) => void;
  isFollowing: boolean;
  onClose: () => void;
}) {
  const { actor } = useAuth();

  let principal: Principal | null = null;
  try {
    principal = Principal.fromText(principalStr);
  } catch {
    // Invalid
  }

  // Fetch followers of this profile
  const { data: followers = [], isLoading: followersLoading } = useQuery<
    Principal[]
  >({
    queryKey: ["profileFollowers", principalStr],
    queryFn: async () => {
      if (!actor || !principal) return [];
      return actor.getFollowers(principal);
    },
    enabled: !!actor && !!principal,
    staleTime: 30_000,
  });

  // Fetch following of this profile
  const { data: following = [], isLoading: followingLoading } = useQuery<
    Principal[]
  >({
    queryKey: ["profileFollowing", principalStr],
    queryFn: async () => {
      if (!actor || !principal) return [];
      return actor.getFollowing(principal);
    },
    enabled: !!actor && !!principal,
    staleTime: 30_000,
  });

  const isLoading = followersLoading || followingLoading;

  // Mutual followers (friends) = principals in both lists
  const friends = followers.filter((followerP) =>
    following.some((followingP) => followingP.toText() === followerP.toText()),
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
      {isLoading ? (
        <>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-3.5 rounded-2xl animate-pulse"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <div
                className="w-11 h-11 rounded-full flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.1)" }}
              />
              <div className="flex-1 space-y-2">
                <div
                  className="h-3.5 rounded-full w-1/3"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                />
                <div
                  className="h-3 rounded-full w-2/3"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                />
              </div>
            </div>
          ))}
        </>
      ) : friends.length === 0 ? (
        <div
          data-ocid="user-profile.friends.empty_state"
          className="flex flex-col items-center justify-center py-16 text-center gap-3"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <Users size={24} style={{ color: "rgba(255,255,255,0.3)" }} />
          </div>
          <p className="text-white/40 text-sm">No friends yet</p>
          <p className="text-white/25 text-xs max-w-[200px] leading-relaxed">
            Friends are users who follow each other
          </p>
        </div>
      ) : (
        friends.map((friendPrincipal, i) => (
          <FriendRow
            key={friendPrincipal.toText()}
            friendPrincipal={friendPrincipal}
            index={i + 1}
            onOpenDM={onOpenDM}
            isFollowing={isFollowing}
            onClose={onClose}
          />
        ))
      )}
    </div>
  );
}

function FriendRow({
  friendPrincipal,
  index,
  onOpenDM,
  isFollowing,
  onClose,
}: {
  friendPrincipal: Principal;
  index: number;
  onOpenDM?: (principalStr: string) => void;
  isFollowing: boolean;
  onClose: () => void;
}) {
  const { actor } = useAuth();
  const principalText = friendPrincipal.toText();

  const { data: profile = null } = useQuery({
    queryKey: ["userProfile", principalText],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getUserProfile(friendPrincipal);
    },
    enabled: !!actor,
    staleTime: 60_000,
  });

  const displayName = profile ? getDisplayName(profile.name) || "USER" : "USER";
  const username = profile ? getUsername(profile.name) : "";
  const avatarUrl = profile?.avatarUrl ?? "";

  return (
    <motion.div
      data-ocid={`user-profile.friends.item.${index}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className="flex items-center gap-3 px-3 py-3 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      {/* Avatar */}
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{
          background: avatarUrl
            ? "transparent"
            : "linear-gradient(135deg, #ff0050 0%, #ff6b35 100%)",
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-white font-bold text-sm">
            {displayName.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-white font-semibold text-sm truncate"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          {displayName}
        </p>
        {username && (
          <p className="text-white/40 text-xs truncate">@{username}</p>
        )}
        <span
          className="inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
          style={{
            background: "rgba(34,197,94,0.12)",
            color: "#22c55e",
            border: "1px solid rgba(34,197,94,0.25)",
          }}
        >
          Friends
        </span>
      </div>
      {/* Message shortcut */}
      <button
        type="button"
        data-ocid={`user-profile.friends.message_button.${index}`}
        onClick={() => {
          if (!isFollowing) {
            toast("Follow this user to send messages.");
          } else {
            onOpenDM?.(principalText);
            onClose();
          }
        }}
        className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
        style={{
          background: "rgba(255,0,80,0.08)",
          border: "1px solid rgba(255,0,80,0.2)",
        }}
        aria-label={`Message ${displayName}`}
      >
        <Send size={15} style={{ color: "#ff0050" }} />
      </button>
    </motion.div>
  );
}
