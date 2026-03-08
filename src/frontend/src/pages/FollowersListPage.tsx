import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { getFollowTimestampStatic } from "../hooks/useFollowSystem";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { getDisplayName, getUsername } from "../lib/userFormat";

interface FollowersListPageProps {
  userId: string;
  displayName: string;
  onBack: () => void;
  onNavigateToProfile: (principalStr: string) => void;
}

function formatFollowDate(ts: number | null): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Followed today";
  if (days === 1) return "Followed yesterday";
  if (days < 30) return `Followed ${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12)
    return `Followed ${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `Followed ${years} year${years > 1 ? "s" : ""} ago`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function FollowersListPage({
  userId,
  displayName,
  onBack,
  onNavigateToProfile,
}: FollowersListPageProps) {
  const { actor, isAuthenticated } = useAuth();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const myPrincipal = identity?.getPrincipal().toString() ?? "";

  let targetPrincipal: Principal | null = null;
  try {
    targetPrincipal = Principal.fromText(userId);
  } catch {
    // invalid principal
  }

  // Fetch follower principals
  const { data: followerPrincipals = [], isLoading: loadingPrincipals } =
    useQuery({
      queryKey: ["followers", userId],
      queryFn: async () => {
        if (!actor || !targetPrincipal) return [];
        return actor.getFollowers(targetPrincipal);
      },
      enabled: !!actor && !!targetPrincipal,
    });

  // Fetch profiles for each follower
  const { data: followerProfiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["followerProfiles", userId, followerPrincipals.length],
    queryFn: async () => {
      if (!actor || followerPrincipals.length === 0) return [];
      const results = await Promise.all(
        followerPrincipals.map(async (p) => {
          try {
            const profile = await actor.getUserProfile(p);
            return { principal: p.toString(), profile };
          } catch {
            return { principal: p.toString(), profile: null };
          }
        }),
      );
      return results;
    },
    enabled: !!actor && followerPrincipals.length > 0,
  });

  // Track which principals the current user follows
  const { data: followingSet = new Set<string>() } = useQuery({
    queryKey: ["myFollowingSet"],
    queryFn: async () => {
      if (!actor || !identity) return new Set<string>();
      const principals = await actor.getFollowing(identity.getPrincipal());
      return new Set(principals.map((p) => p.toString()));
    },
    enabled: !!actor && !!identity && isAuthenticated,
  });

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async ({
      principalStr,
      shouldFollow,
    }: { principalStr: string; shouldFollow: boolean }) => {
      if (!actor) throw new Error("Not connected");
      const p = Principal.fromText(principalStr);
      if (shouldFollow) {
        await actor.follow(p);
      } else {
        await actor.unfollow(p);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["myFollowingSet"] });
      void queryClient.invalidateQueries({ queryKey: ["isFollowing"] });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to update follow",
      );
    },
  });

  const isLoading = loadingPrincipals || loadingProfiles;

  return (
    <div
      data-ocid="followers-list.page"
      className="min-h-screen w-full flex flex-col"
      style={{ background: "#000" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 pt-10 pb-3"
        style={{
          background: "rgba(0,0,0,0.9)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          type="button"
          data-ocid="followers-list.back_button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1
            className="text-white font-bold text-base leading-none"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Followers
          </h1>
          <p className="text-white/35 text-xs mt-0.5">{displayName}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {isLoading && (
          <div
            data-ocid="followers-list.loading_state"
            className="flex flex-col gap-2 px-4 pt-4"
          >
            {[1, 2, 3, 4, 5].map((k) => (
              <div
                key={k}
                className="flex items-center gap-3 p-3 rounded-2xl animate-pulse"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <div
                  className="w-12 h-12 rounded-full flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                />
                <div className="flex-1 space-y-2">
                  <div
                    className="h-4 w-32 rounded"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  />
                  <div
                    className="h-3 w-20 rounded"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && followerProfiles.length === 0 && (
          <motion.div
            data-ocid="followers-list.empty_state"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center justify-center py-28 text-center px-8"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <Users size={32} className="text-white/30" />
            </div>
            <p className="text-white font-semibold text-base mb-2">
              No followers yet.
            </p>
            <p className="text-white/35 text-sm leading-relaxed max-w-xs">
              Be the first to follow {displayName}!
            </p>
          </motion.div>
        )}

        {!isLoading && followerProfiles.length > 0 && (
          <div className="px-4 pt-4 space-y-2">
            {followerProfiles.map(({ principal: pStr, profile }, i) => {
              const name = profile
                ? getDisplayName(profile.name) || "USER"
                : "USER";
              const uname = profile ? getUsername(profile.name) : "";
              const avatar = profile?.avatarUrl ?? "";
              const followTs = getFollowTimestampStatic(pStr, userId);
              const isMe = pStr === myPrincipal;
              const iAmFollowing = followingSet.has(pStr);

              return (
                <motion.div
                  key={pStr}
                  data-ocid={`followers-list.item.${i + 1}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.04 * Math.min(i, 12),
                    duration: 0.3,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {/* Avatar — tap to open profile */}
                  <button
                    type="button"
                    onClick={() => onNavigateToProfile(pStr)}
                    className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0050]"
                    style={{
                      background: avatar
                        ? "transparent"
                        : "linear-gradient(135deg, #ff0050 0%, #ff6b35 100%)",
                    }}
                    aria-label={`View ${name}'s profile`}
                  >
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-base flex items-center justify-center w-full h-full">
                        {getInitials(name)}
                      </span>
                    )}
                  </button>

                  {/* Info — tap to open profile */}
                  <button
                    type="button"
                    onClick={() => onNavigateToProfile(pStr)}
                    className="flex-1 min-w-0 text-left focus-visible:outline-none"
                    aria-label={`View ${name}'s profile`}
                  >
                    <p
                      className="text-white font-bold text-sm truncate"
                      style={{
                        fontFamily: "'Bricolage Grotesque', sans-serif",
                      }}
                    >
                      {name}
                    </p>
                    {uname && (
                      <p className="text-white/40 text-xs truncate">@{uname}</p>
                    )}
                    {followTs && (
                      <p className="text-white/25 text-[10px] mt-0.5">
                        {formatFollowDate(followTs)}
                      </p>
                    )}
                  </button>

                  {/* Follow button — only for authenticated and not own profile */}
                  {isAuthenticated && !isMe && (
                    <button
                      type="button"
                      data-ocid={`followers-list.follow_button.${i + 1}`}
                      onClick={() =>
                        followMutation.mutate({
                          principalStr: pStr,
                          shouldFollow: !iAmFollowing,
                        })
                      }
                      disabled={followMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-60 flex-shrink-0"
                      style={
                        iAmFollowing
                          ? {
                              background: "transparent",
                              border: "1.5px solid rgba(255,255,255,0.25)",
                              color: "rgba(255,255,255,0.7)",
                            }
                          : {
                              background:
                                "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
                              border: "none",
                              color: "white",
                              boxShadow: "0 4px 12px rgba(255,0,80,0.25)",
                            }
                      }
                    >
                      {followMutation.isPending ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : iAmFollowing ? (
                        "Following"
                      ) : (
                        "Follow"
                      )}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
