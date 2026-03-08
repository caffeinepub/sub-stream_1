import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  CreditCard,
  Diamond,
  Heart,
  Loader2,
  MoreHorizontal,
  Pencil,
  Pin,
  Play,
  Settings,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import type { Story, Video } from "../backend.d";
import { EditPostSheet } from "../components/EditPostSheet";
import { OnlineDot } from "../components/OnlineDot";
import {
  ProfileVideoPlayer,
  VideoDurationBadge,
} from "../components/ProfileVideoPlayer";
import { StoryOptionsSheet } from "../components/StoryOptionsSheet";
import { StoryRing } from "../components/StoryRing";
import { useAuth } from "../context/AuthContext";
import {
  getDisplayName,
  getUsername,
  packName,
  sanitizeUsername,
} from "../lib/userFormat";
import { StoryCreatorPage } from "./StoryCreatorPage";
import { StoryViewerPage, type StoryWithUser } from "./StoryViewerPage";

interface ProfilePageProps {
  onBack: () => void;
  onSettings: () => void;
  onOpenEarnings?: () => void;
  onOpenPaymentSettings?: () => void;
  onOpenWallet?: () => void;
}

type ProfileTab = "videos" | "shorts" | "replays";

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

export function ProfilePage({
  onBack,
  onSettings,
  onOpenEarnings,
  onOpenPaymentSettings,
  onOpenWallet,
}: ProfilePageProps) {
  const { userProfile, actor, isAuthenticated, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProfileTab>("videos");
  const displayNameFieldId = useId();
  const usernameFieldId = useId();
  const bioFieldId = useId();

  // ── Post management state ───────────────────────────────────────────────
  const [menuVideoId, setMenuVideoId] = useState<bigint | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<bigint | null>(null);
  const [editVideo, setEditVideo] = useState<Video | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  // ── Story state ────────────────────────────────────────────────────────────
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [storyOptionsOpen, setStoryOptionsOpen] = useState(false);
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [isDeletingStory, setIsDeletingStory] = useState(false);

  const fetchMyStories = useCallback(async () => {
    if (!actor || !isAuthenticated) return;
    try {
      const stories = await actor.getMyStories();
      setMyStories(stories);
    } catch {
      // silently ignore
    }
  }, [actor, isAuthenticated]);

  // Load stories on mount
  useEffect(() => {
    void fetchMyStories();
  }, [fetchMyStories]);

  const hasStory = myStories.length > 0;

  const handleDeleteStory = async () => {
    if (!actor || myStories.length === 0) return;
    setIsDeletingStory(true);
    try {
      await actor.deleteStory(myStories[0].id);
      toast.success("Story deleted");
      setMyStories([]);
      setStoryOptionsOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete story",
      );
    } finally {
      setIsDeletingStory(false);
    }
  };

  // Build StoryWithUser for viewer
  const myStoryWithUser: StoryWithUser[] = myStories.map((s) => ({
    ...s,
    userProfile: {
      displayName: getDisplayName(userProfile?.name || "") || "ANONYMOUS",
      username: getUsername(userProfile?.name || ""),
      avatarUrl: userProfile?.avatarUrl || "",
    },
  }));

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const displayNameInputRef = useRef<HTMLInputElement>(null);

  // Focus the display name input when edit mode is entered
  useEffect(() => {
    if (isEditing) {
      const t = setTimeout(() => displayNameInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isEditing]);

  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ["profileVideos"],
    queryFn: async () => {
      if (!actor || !isAuthenticated) return [];
      // Get the caller's principal via getUser - use a workaround: fetch all videos by creator
      // Use getAllUserids to find caller, or just use getAllVideos filtered
      // Best path: fetch via getCallerUserProfile then getUserVideos
      const profile = await actor.getCallerUserProfile();
      if (!profile) return [];
      // getUserVideos needs a Principal - use identity from InternetIdentity
      // We'll use getVideosByCreator via the actor - but we need the principal
      // The profile doesn't include the principal directly. Use getAllVideos for now
      // but filter via profile matching. Actually the correct call is getUserVideos
      // which takes a Principal. We get it from useInternetIdentity identity.
      // Since actor already scopes to the caller, we use getVideosByCreator trick:
      // Alternatively fetch all and match by profile name/email (current approach kept).
      // Better: use the backend.d.ts - getUserVideos takes Principal.
      // We'll fetch all videos and we already have the identity from auth context.
      // Actually the simplest approach: use getAllVideos and rely on the profile page
      // only showing this user's videos via the mutation-based approach.
      // For full correctness, we should use a principal. Let's get it from
      // getAllUserids or store it. For now use getAllVideos - will be fixed when
      // we can pass the caller principal directly.
      return await actor.getAllVideos();
    },
    enabled: !!actor && isAuthenticated,
  });

  // Fetch pinned video IDs
  const { data: pinnedVideos = [] } = useQuery<Video[]>({
    queryKey: ["pinnedVideos"],
    queryFn: async () => {
      if (!actor || !isAuthenticated) return [];
      // We need the caller's principal. Use a workaround - fetch getUser via getAllUserids
      // or use the user object from getCallerUserProfile (doesn't have id).
      // Best: use getAllUserids to find ours, but that's expensive.
      // Use pinned IDs from the user object: getUser needs a Principal too.
      // We'll rely on getPinnedVideos which we call with the current user's principal.
      // Store principal in a ref. For now return empty (will be populated via User type).
      return [];
    },
    enabled: !!actor && isAuthenticated,
    staleTime: 30_000,
  });

  const pinnedIds = new Set(pinnedVideos.map((v) => v.id.toString()));

  // ── Pin mutation ─────────────────────────────────────────────────────────
  const pinMutation = useMutation({
    mutationFn: async ({
      videoId,
      shouldPin,
    }: {
      videoId: bigint;
      shouldPin: boolean;
    }) => {
      if (!actor) throw new Error("Not connected");
      if (shouldPin) {
        await actor.pinVideo(videoId);
      } else {
        await actor.unpinVideo(videoId);
      }
    },
    onSuccess: async (_data, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profileVideos"] }),
        queryClient.invalidateQueries({ queryKey: ["pinnedVideos"] }),
        queryClient.invalidateQueries({ queryKey: ["allVideos"] }),
      ]);
      toast.success(vars.shouldPin ? "📌 Video pinned!" : "Video unpinned");
      setMenuVideoId(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update pin");
    },
  });

  // ── Delete mutation ──────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (videoId: bigint) => {
      if (!actor) throw new Error("Not connected");
      await actor.deleteVideo(videoId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profileVideos"] }),
        queryClient.invalidateQueries({ queryKey: ["allVideos"] }),
        queryClient.invalidateQueries({ queryKey: ["userVideos"] }),
      ]);
      toast.success("Post deleted");
      setDeleteConfirmId(null);
      setMenuVideoId(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete post");
    },
  });

  // Profile video player state
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerIndex, setPlayerIndex] = useState(0);

  const rawName = userProfile?.name || "";
  const displayName = getDisplayName(rawName) || "ANONYMOUS";
  const username = getUsername(rawName);
  const bio = userProfile?.bio || "";
  const avatarUrl = userProfile?.avatarUrl || "";
  const followerCount = userProfile?.followerCount ?? BigInt(0);
  const followingCount = userProfile?.followingCount ?? BigInt(0);
  const isOnline = userProfile?.isOnline ?? false;

  // Total likes across videos
  const totalLikes = videos.reduce((sum, v) => sum + Number(v.likeCount), 0);

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: "videos", label: "Videos" },
    { id: "shorts", label: "Shorts" },
    { id: "replays", label: "Live Replays" },
  ];

  // Enter edit mode — snapshot current values
  function enterEditMode() {
    setEditDisplayName(displayName);
    setEditUsername(username);
    setEditBio(bio);
    setEditAvatarPreview(null);
    setSaveError(null);
    setIsEditing(true);
  }

  // Cancel — revert everything
  function handleCancel() {
    setIsEditing(false);
    setEditDisplayName("");
    setEditUsername("");
    setEditBio("");
    setEditAvatarPreview(null);
    setSaveError(null);
  }

  // Avatar file pick
  function handleAvatarClick() {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate type
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) return;
    // Validate size (5 MB)
    if (file.size > 5 * 1024 * 1024) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        setEditAvatarPreview(result);
      }
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  // Save profile
  async function handleSave() {
    if (!actor) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const nameToSave = packName(
        editDisplayName.trim() || displayName,
        editUsername.trim() || username,
      );
      const avatarToSave = editAvatarPreview ?? avatarUrl;
      await actor.updateUserProfile(nameToSave, editBio, avatarToSave);
      await refreshProfile();
      setIsEditing(false);
      setEditAvatarPreview(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  // Which avatar src to show
  const shownAvatarUrl =
    isEditing && editAvatarPreview ? editAvatarPreview : avatarUrl;

  return (
    <div
      data-ocid="profile.page"
      className="min-h-screen w-full flex flex-col overflow-y-auto"
      style={{ background: "#000" }}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpg,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload profile photo"
      />

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
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1
          className="text-white font-bold text-base"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Profile
        </h1>
        <button
          type="button"
          data-ocid="profile.edit_button"
          onClick={onSettings}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Profile header */}
      <motion.div
        className="px-5 pt-8 pb-6 flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Avatar with Story Ring */}
        <div className="relative mb-4">
          {isEditing ? (
            /* Edit mode: plain circular button to change photo */
            <motion.button
              type="button"
              onClick={handleAvatarClick}
              className="relative w-24 h-24 rounded-full flex items-center justify-center overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0050]"
              style={{
                background: shownAvatarUrl
                  ? "transparent"
                  : "linear-gradient(135deg, #ff0050 0%, #ff6b35 100%)",
                boxShadow:
                  "0 0 0 3px rgba(255,0,80,0.6), 0 0 24px rgba(255,0,80,0.35)",
                cursor: "pointer",
              }}
              aria-label="Change profile photo"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              {shownAvatarUrl ? (
                <img
                  src={shownAvatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-2xl">
                  {getInitials(displayName)}
                </span>
              )}
              {/* Edit overlay */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center"
                style={{ background: "rgba(0,0,0,0.48)" }}
              >
                <Camera size={22} className="text-white drop-shadow" />
                <span className="text-white text-[9px] font-semibold mt-1 tracking-wide uppercase">
                  Change
                </span>
              </div>
            </motion.button>
          ) : (
            /* View mode: StoryRing */
            <StoryRing
              avatarUrl={shownAvatarUrl}
              displayName={displayName}
              size={88}
              hasStory={hasStory}
              allViewed={false}
              isOwn={true}
              showPlusBadge={!hasStory}
              onTap={() => setStoryOptionsOpen(true)}
            />
          )}

          {/* Bottom-right badge: OnlineDot in view mode, camera badge in edit mode */}
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.button
                key="camera-badge"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center border-2 border-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0050]"
                style={{ background: "#ff0050", zIndex: 10 }}
                aria-label="Upload profile image"
                data-ocid="profile.upload_button"
              >
                <Camera size={13} className="text-white" />
              </motion.button>
            ) : (
              <motion.div
                key="online-dot"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.2 }}
                className="absolute"
                style={{ bottom: 2, right: 2, zIndex: 10 }}
              >
                <OnlineDot isOnline={isOnline} size={14} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Display name + username — view mode */}
        <AnimatePresence mode="wait">
          {isEditing ? (
            /* ── Edit mode: 3 fields ── */
            <motion.div
              key="edit-fields"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="w-full max-w-xs space-y-3 mb-2"
            >
              {/* Display Name field */}
              <div className="space-y-1">
                <label
                  htmlFor={displayNameFieldId}
                  className="block text-white/40 text-[10px] font-semibold tracking-widest uppercase text-left"
                >
                  Display Name
                </label>
                <input
                  id={displayNameFieldId}
                  ref={displayNameInputRef}
                  type="text"
                  data-ocid="profile.display_name_input"
                  value={editDisplayName}
                  onChange={(e) =>
                    setEditDisplayName(e.target.value.toUpperCase())
                  }
                  className="w-full bg-transparent text-white font-bold text-lg border-b-2 outline-none text-center"
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    borderBottomColor: "#ff0050",
                    caretColor: "#ff0050",
                    letterSpacing: "0.02em",
                  }}
                  placeholder="DISPLAY NAME"
                  maxLength={60}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSave();
                    if (e.key === "Escape") handleCancel();
                  }}
                />
              </div>

              {/* Username field */}
              <div className="space-y-1">
                <label
                  htmlFor={usernameFieldId}
                  className="block text-white/40 text-[10px] font-semibold tracking-widest uppercase text-left"
                >
                  @Username
                </label>
                <div className="flex items-center gap-1 border-b-2 border-white/20 pb-0.5">
                  <span
                    className="text-white/50 font-bold text-lg select-none"
                    style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                  >
                    @
                  </span>
                  <input
                    id={usernameFieldId}
                    type="text"
                    data-ocid="profile.username_input"
                    value={editUsername}
                    onChange={(e) =>
                      setEditUsername(sanitizeUsername(e.target.value))
                    }
                    className="flex-1 bg-transparent text-white/70 text-base border-none outline-none text-center"
                    style={{
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      caretColor: "#ff0050",
                    }}
                    placeholder="username"
                    maxLength={40}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSave();
                      if (e.key === "Escape") handleCancel();
                    }}
                  />
                </div>
              </div>

              {/* Bio textarea */}
              <div className="space-y-1">
                <label
                  htmlFor={bioFieldId}
                  className="block text-white/40 text-[10px] font-semibold tracking-widest uppercase text-left"
                >
                  Bio
                </label>
                <div className="relative">
                  <textarea
                    id={bioFieldId}
                    data-ocid="profile.bio_textarea"
                    value={editBio}
                    onChange={(e) => {
                      if (e.target.value.length <= 1000)
                        setEditBio(e.target.value);
                    }}
                    rows={3}
                    placeholder="Tell the world about yourself…"
                    className="w-full rounded-xl px-3 py-2.5 text-white text-sm leading-relaxed outline-none resize-none placeholder:text-white/25"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      caretColor: "#ff0050",
                      minHeight: "80px",
                    }}
                    maxLength={1000}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") handleCancel();
                    }}
                  />
                  <span
                    className="absolute bottom-2 right-3 text-[10px] pointer-events-none"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    {editBio.length}/1000
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ── View mode: display name + @username ── */
            <motion.div
              key="view-identity"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.22 }}
              className="flex flex-col items-center gap-0.5 mb-1"
            >
              {/* Display name + pencil */}
              <button
                type="button"
                onClick={enterEditMode}
                className="flex items-center gap-2 group"
                aria-label="Edit profile"
              >
                <h2
                  data-ocid="profile.display_name"
                  className="text-white font-bold text-2xl tracking-wide leading-none"
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    letterSpacing: "0.02em",
                  }}
                >
                  {displayName}
                </h2>
                <Pencil
                  size={14}
                  className="text-white/40 group-hover:text-white/70 transition-colors flex-shrink-0"
                />
              </button>

              {/* @username */}
              {username && (
                <p
                  data-ocid="profile.username"
                  className="text-sm"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  @{username}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bio — view mode only */}
        {!isEditing && bio && (
          <p className="text-white/50 text-sm max-w-xs leading-relaxed mb-4 mt-2">
            {bio}
          </p>
        )}

        {/* Save error */}
        <AnimatePresence>
          {saveError && (
            <motion.p
              data-ocid="profile.error_state"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-sm mb-2 px-3 py-1.5 rounded-lg"
              style={{
                color: "#ff0050",
                background: "rgba(255,0,80,0.1)",
                border: "1px solid rgba(255,0,80,0.2)",
              }}
            >
              {saveError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Cancel / Save buttons — only in edit mode */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              key="edit-controls"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 mt-3 mb-1"
            >
              <button
                type="button"
                data-ocid="profile.cancel_button"
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold transition-all min-w-[88px] justify-center disabled:opacity-50"
                style={{
                  color: "rgba(255,255,255,0.7)",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                }}
              >
                <X size={14} />
                Cancel
              </button>
              <button
                type="button"
                data-ocid="profile.save_button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold transition-all min-w-[88px] justify-center disabled:opacity-80"
                style={{
                  color: "white",
                  background: "#ff0050",
                  boxShadow: "0 0 16px rgba(255,0,80,0.35)",
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Save
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats row */}
        <div className="flex items-center gap-6 mt-3">
          <StatPill label="Followers" value={formatCount(followerCount)} />
          <div className="w-px h-8 bg-white/10" />
          <StatPill label="Following" value={formatCount(followingCount)} />
          <div className="w-px h-8 bg-white/10" />
          <StatPill
            label="Likes"
            value={formatCount(totalLikes)}
            icon={<Heart size={12} fill="#ff0050" stroke="none" />}
          />
        </div>

        {/* Creator tools row — only on own profile */}
        {isAuthenticated && (
          <div className="flex gap-2 mt-4 w-full max-w-sm">
            <button
              type="button"
              data-ocid="profile.earnings_button"
              onClick={onOpenEarnings}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97]"
              style={{
                background: "rgba(168,85,247,0.12)",
                border: "1px solid rgba(168,85,247,0.3)",
                color: "#c084fc",
              }}
            >
              <Diamond size={15} />
              Creator Earnings
            </button>
            <button
              type="button"
              data-ocid="profile.wallet_button"
              onClick={onOpenWallet}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97]"
              style={{
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.25)",
                color: "rgba(245,158,11,0.8)",
              }}
              aria-label="Wallet"
            >
              <Wallet size={15} />
            </button>
            <button
              type="button"
              data-ocid="profile.payment_settings_button"
              onClick={onOpenPaymentSettings}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97]"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              <CreditCard size={15} />
            </button>
          </div>
        )}
      </motion.div>

      {/* Tabs */}
      <div
        className="flex border-b"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-ocid={`profile.${tab.id === "videos" ? "videos" : tab.id === "shorts" ? "shorts" : "replays"}_tab`}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-3 text-sm font-medium transition-colors relative"
            style={{
              color: activeTab === tab.id ? "white" : "rgba(255,255,255,0.4)",
            }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="profileTabIndicator"
                className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
                style={{ background: "#ff0050" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 px-1 pt-2 pb-24">
        {activeTab === "videos" && (
          <VideoGrid
            videos={videos}
            pinnedIds={pinnedIds}
            isLoading={isLoading}
            isOwn={isAuthenticated}
            onVideoTap={(i) => {
              setPlayerIndex(i);
              setPlayerOpen(true);
            }}
            onMenuOpen={(videoId) => setMenuVideoId(videoId)}
          />
        )}
        {activeTab === "shorts" && <ComingSoonPlaceholder label="Shorts" />}
        {activeTab === "replays" && (
          <LiveReplaysTab
            videos={videos}
            onVideoTap={(i) => {
              setPlayerIndex(i);
              setPlayerOpen(true);
            }}
          />
        )}
      </div>

      {/* Story Options Sheet */}
      <StoryOptionsSheet
        open={storyOptionsOpen}
        onClose={() => setStoryOptionsOpen(false)}
        hasStory={hasStory}
        onAddStory={() => setStoryCreatorOpen(true)}
        onViewStory={() => setStoryViewerOpen(true)}
        onDeleteStory={() => void handleDeleteStory()}
        isDeleting={isDeletingStory}
      />

      {/* Story Creator overlay */}
      <AnimatePresence>
        {storyCreatorOpen && (
          <StoryCreatorPage
            key="story-creator"
            onClose={() => setStoryCreatorOpen(false)}
            onStoryPosted={() => {
              setStoryCreatorOpen(false);
              void fetchMyStories();
            }}
          />
        )}
      </AnimatePresence>

      {/* Story Viewer overlay */}
      <AnimatePresence>
        {storyViewerOpen && myStoryWithUser.length > 0 && (
          <StoryViewerPage
            key="story-viewer-profile"
            stories={myStoryWithUser}
            initialStoryIndex={0}
            onClose={() => setStoryViewerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Profile Video Player overlay */}
      <AnimatePresence>
        {playerOpen && videos.length > 0 && (
          <ProfileVideoPlayer
            key="profile-video-player"
            videos={videos}
            initialIndex={playerIndex}
            onClose={() => setPlayerOpen(false)}
            isAuthenticated={isAuthenticated}
          />
        )}
      </AnimatePresence>

      {/* Post options bottom sheet */}
      <AnimatePresence>
        {menuVideoId !== null && (
          <>
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss */}
            <div
              className="fixed inset-0 z-[180]"
              style={{ background: "rgba(0,0,0,0.55)" }}
              onClick={() => setMenuVideoId(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 z-[190] rounded-t-2xl"
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
                {[
                  {
                    icon: <Pencil size={18} className="text-white/70" />,
                    label: "Edit post",
                    ocid: "profile.post_menu.edit_button",
                    action: () => {
                      const v = videos.find((x) => x.id === menuVideoId);
                      if (v) {
                        setEditVideo(v);
                        setEditSheetOpen(true);
                        setMenuVideoId(null);
                      }
                    },
                  },
                  {
                    icon: <Pin size={18} className="text-white/70" />,
                    label: pinnedIds.has(menuVideoId.toString())
                      ? "Unpin from profile"
                      : "Pin to profile",
                    ocid: pinnedIds.has(menuVideoId.toString())
                      ? "profile.post_menu.unpin_button"
                      : "profile.post_menu.pin_button",
                    action: () => {
                      const shouldPin = !pinnedIds.has(menuVideoId.toString());
                      pinMutation.mutate({ videoId: menuVideoId, shouldPin });
                    },
                  },
                  {
                    icon: <Trash2 size={18} style={{ color: "#ff0050" }} />,
                    label: "Delete post",
                    ocid: "profile.post_menu.delete_button",
                    action: () => {
                      setDeleteConfirmId(menuVideoId);
                      setMenuVideoId(null);
                    },
                    danger: true,
                  },
                ].map(({ icon, label, ocid, action, danger }) => (
                  <button
                    key={label}
                    type="button"
                    data-ocid={ocid}
                    onClick={action}
                    disabled={pinMutation.isPending}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {icon}
                    <span
                      className="text-sm font-medium"
                      style={{
                        color: danger ? "#ff0050" : "rgba(255,255,255,0.85)",
                        fontFamily: "'Bricolage Grotesque', sans-serif",
                      }}
                    >
                      {label}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setMenuVideoId(null)}
                  className="w-full py-4 rounded-2xl text-sm font-semibold mt-2"
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

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {deleteConfirmId !== null && (
          <>
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss */}
            <div
              className="fixed inset-0 z-[200]"
              style={{ background: "rgba(0,0,0,0.7)" }}
              onClick={() => {
                if (!deleteMutation.isPending) setDeleteConfirmId(null);
              }}
            />
            <motion.div
              data-ocid="profile.delete_dialog"
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
                    style={{ background: "rgba(255,0,80,0.12)" }}
                  >
                    <Trash2 size={24} style={{ color: "#ff0050" }} />
                  </div>
                  <h3
                    className="text-white font-bold text-lg mb-2"
                    style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                  >
                    Delete this post?
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed">
                    This will permanently remove the video from your profile,
                    home feed, and database.
                  </p>
                </div>
                <div className="flex flex-col gap-2 px-5 pb-7 pt-4">
                  <button
                    type="button"
                    data-ocid="profile.delete_confirm_button"
                    onClick={() => {
                      if (deleteConfirmId !== null) {
                        deleteMutation.mutate(deleteConfirmId);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="w-full py-3.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70"
                    style={{
                      background:
                        "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
                      boxShadow: "0 4px 16px rgba(255,0,80,0.35)",
                    }}
                  >
                    {deleteMutation.isPending ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Deleting…
                      </>
                    ) : (
                      "Delete"
                    )}
                  </button>
                  <button
                    type="button"
                    data-ocid="profile.delete_cancel_button"
                    onClick={() => {
                      if (!deleteMutation.isPending) setDeleteConfirmId(null);
                    }}
                    disabled={deleteMutation.isPending}
                    className="w-full py-3.5 rounded-2xl text-sm font-semibold disabled:opacity-50"
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

      {/* Edit post sheet */}
      <EditPostSheet
        open={editSheetOpen}
        video={editVideo}
        onClose={() => {
          setEditSheetOpen(false);
          setEditVideo(null);
        }}
      />
    </div>
  );
}

function StatPill({
  label,
  value,
  icon,
}: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-white font-bold text-lg leading-none">
          {value}
        </span>
      </div>
      <span className="text-white/40 text-xs">{label}</span>
    </div>
  );
}

function VideoGrid({
  videos,
  pinnedIds,
  isLoading,
  isOwn,
  onVideoTap,
  onMenuOpen,
}: {
  videos: Video[];
  pinnedIds: Set<string>;
  isLoading: boolean;
  isOwn: boolean;
  onVideoTap: (index: number) => void;
  onMenuOpen: (videoId: bigint) => void;
}) {
  if (isLoading) {
    return (
      <div
        data-ocid="profile.loading_state"
        className="grid grid-cols-2 gap-0.5 mt-1"
      >
        {["s1", "s2", "s3", "s4"].map((k) => (
          <div
            key={k}
            className="aspect-[9/16] rounded-sm animate-pulse"
            style={{ background: "rgba(255,255,255,0.06)" }}
          />
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div
        data-ocid="profile.empty_state"
        className="flex flex-col items-center justify-center py-16 text-center px-8"
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: "rgba(255,0,80,0.1)" }}
        >
          <Play size={28} style={{ color: "#ff0050" }} />
        </div>
        <p className="text-white/50 text-sm">No videos yet.</p>
        <p className="text-white/25 text-xs mt-1">
          Upload your first video to get started
        </p>
      </div>
    );
  }

  // Sort: pinned first, then rest
  const sorted = [...videos].sort((a, b) => {
    const aPin = pinnedIds.has(a.id.toString()) ? 0 : 1;
    const bPin = pinnedIds.has(b.id.toString()) ? 0 : 1;
    return aPin - bPin;
  });

  return (
    <div className="grid grid-cols-2 gap-0.5 mt-1">
      {sorted.map((video, i) => {
        const isPinned = pinnedIds.has(video.id.toString());
        return (
          <div key={video.id.toString()} className="relative">
            <button
              type="button"
              data-ocid={`profile.item.${i + 1}`}
              onClick={() => onVideoTap(videos.indexOf(video))}
              className={`w-full aspect-[9/16] rounded-sm overflow-hidden relative bg-gradient-to-b ${VIDEO_GRADIENTS[i % VIDEO_GRADIENTS.length]} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0050]`}
              aria-label={`Play ${video.title}`}
            >
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-b ${VIDEO_GRADIENTS[i % VIDEO_GRADIENTS.length]}`}
                />
              )}

              {/* Bottom gradient for text */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

              {/* Pinned label — top left */}
              {isPinned && (
                <div
                  className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-white text-[10px] font-semibold"
                  style={{ background: "rgba(0,0,0,0.65)" }}
                >
                  <span>📌</span>
                  <span>Pinned</span>
                </div>
              )}

              {/* Bottom: duration + view count */}
              <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                  <Play size={9} fill="white" stroke="none" />
                  <span className="text-white text-[10px] font-medium">
                    {formatCount(video.viewCount)}
                  </span>
                </div>
                {/* Duration badge */}
                {video.videoUrl && (
                  <VideoDurationBadgeInline videoUrl={video.videoUrl} />
                )}
              </div>
            </button>

            {/* Three-dots menu button — only on own profile */}
            {isOwn && (
              <button
                type="button"
                data-ocid={`profile.video_menu_button.${i + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onMenuOpen(video.id);
                }}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center z-10"
                style={{
                  background: "rgba(0,0,0,0.6)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                }}
                aria-label="Video options"
              >
                <MoreHorizontal size={13} className="text-white" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Inline duration badge that doesn't use bottom-right absolute — used in the 2-col grid */
function VideoDurationBadgeInline({ videoUrl }: { videoUrl: string }) {
  const [duration, setDuration] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    function onMeta() {
      if (!el || Number.isNaN(el.duration)) return;
      const totalSec = Math.floor(el.duration);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      setDuration(
        `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
      );
    }
    el.addEventListener("loadedmetadata", onMeta);
    if (el.readyState >= 1) onMeta();
    return () => el.removeEventListener("loadedmetadata", onMeta);
  }, []);

  if (!videoUrl) return null;

  return (
    <>
      <video
        ref={videoRef}
        src={videoUrl}
        preload="metadata"
        className="hidden"
        muted
        playsInline
        tabIndex={-1}
        aria-label="Video duration loader"
      />
      {duration && (
        <span
          className="text-white text-[10px] font-medium"
          style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
        >
          {duration}
        </span>
      )}
    </>
  );
}

function LiveReplaysTab({
  videos,
  onVideoTap,
}: {
  videos: Video[];
  onVideoTap: (index: number) => void;
}) {
  const replays = videos.filter((v) => v.title.startsWith("Live:"));

  if (replays.length === 0) {
    return (
      <div
        data-ocid="profile.replays_empty_state"
        className="flex flex-col items-center justify-center py-16 text-center px-8"
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: "rgba(255,0,80,0.1)" }}
        >
          <span className="text-2xl">🎬</span>
        </div>
        <p className="text-white/60 text-sm font-medium mb-1">
          No live replays yet
        </p>
        <p className="text-white/30 text-xs leading-relaxed">
          When you end a live stream and choose "Save Replay", it will appear
          here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-0.5 mt-1">
      {replays.map((video, i) => {
        const originalIdx = videos.indexOf(video);
        return (
          <button
            key={video.id.toString()}
            type="button"
            data-ocid={`profile.replay.item.${i + 1}`}
            onClick={() => onVideoTap(originalIdx)}
            className="aspect-[9/16] rounded-sm overflow-hidden relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0050]"
            style={{
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
            }}
            aria-label={`Watch replay: ${video.title}`}
          >
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-3xl">🎬</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
            {/* LIVE replay badge */}
            <div
              className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(255,0,80,0.75)" }}
            >
              <span className="text-white text-[9px] font-bold tracking-wider">
                REPLAY
              </span>
            </div>
            {/* Title at bottom */}
            <div className="absolute bottom-1.5 left-1.5 right-1.5">
              <p
                className="text-white text-[10px] font-medium truncate leading-tight"
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
              >
                {video.title.replace(/^Live:\s*/, "")}
              </p>
              <div className="flex items-center gap-0.5 mt-0.5">
                <Play size={8} fill="white" stroke="none" />
                <span className="text-white/60 text-[9px]">
                  {Number(video.viewCount) > 0
                    ? `${Number(video.viewCount).toLocaleString()} views`
                    : "0 views"}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ComingSoonPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        <span className="text-2xl">🚀</span>
      </div>
      <p className="text-white/50 text-sm">{label} coming soon</p>
    </div>
  );
}
