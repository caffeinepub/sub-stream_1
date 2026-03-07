import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Camera,
  Check,
  Heart,
  Loader2,
  Pencil,
  Play,
  Settings,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Video } from "../backend.d";
import { OnlineDot } from "../components/OnlineDot";
import { useAuth } from "../context/AuthContext";

interface ProfilePageProps {
  onBack: () => void;
  onSettings: () => void;
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

export function ProfilePage({ onBack, onSettings }: ProfilePageProps) {
  const { userProfile, actor, isAuthenticated, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("videos");

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus the name input when edit mode is entered
  useEffect(() => {
    if (isEditing) {
      const t = setTimeout(() => nameInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isEditing]);

  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ["profileVideos"],
    queryFn: async () => {
      if (!actor || !isAuthenticated) return [];
      const profile = await actor.getCallerUserProfile();
      if (!profile) return [];
      return await actor.getAllVideos();
    },
    enabled: !!actor && isAuthenticated,
  });

  const displayName = userProfile?.name || "Anonymous";
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
    setEditName(displayName);
    setEditAvatarPreview(null);
    setSaveError(null);
    setIsEditing(true);
  }

  // Cancel — revert everything
  function handleCancel() {
    setIsEditing(false);
    setEditName("");
    setEditAvatarPreview(null);
    setSaveError(null);
    // Revoke any created object URL to free memory
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
      const nameToSave = editName.trim() || displayName;
      const avatarToSave = editAvatarPreview ?? avatarUrl;
      await actor.updateUserProfile(nameToSave, bio, avatarToSave);
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
  const shownName = isEditing ? editName : displayName;

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
        {/* Avatar */}
        <div className="relative mb-4">
          <motion.button
            type="button"
            onClick={handleAvatarClick}
            className="relative w-24 h-24 rounded-full flex items-center justify-center overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0050]"
            style={{
              background: shownAvatarUrl
                ? "transparent"
                : "linear-gradient(135deg, #ff0050 0%, #ff6b35 100%)",
              boxShadow: isEditing
                ? "0 0 0 3px rgba(255,0,80,0.6), 0 0 24px rgba(255,0,80,0.35)"
                : "0 0 0 3px rgba(255,0,80,0.3), 0 0 24px rgba(255,0,80,0.2)",
              cursor: isEditing ? "pointer" : "default",
            }}
            aria-label={isEditing ? "Change profile photo" : undefined}
            whileHover={isEditing ? { scale: 1.04 } : {}}
            whileTap={isEditing ? { scale: 0.97 } : {}}
          >
            {shownAvatarUrl ? (
              <img
                src={shownAvatarUrl}
                alt={shownName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white font-bold text-2xl">
                {getInitials(shownName || displayName)}
              </span>
            )}

            {/* Edit overlay — only in edit mode */}
            <AnimatePresence>
              {isEditing && (
                <motion.div
                  key="avatar-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="absolute inset-0 flex flex-col items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.48)" }}
                >
                  <Camera size={22} className="text-white drop-shadow" />
                  <span className="text-white text-[9px] font-semibold mt-1 tracking-wide uppercase">
                    Change
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

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
                style={{ background: "#ff0050" }}
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
                className="absolute bottom-1 right-1"
              >
                <OnlineDot isOnline={isOnline} size={14} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Username / Edit name row */}
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              key="edit-name"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="flex items-center gap-1.5 mb-1"
            >
              <span
                className="text-white/50 font-bold text-xl select-none"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                @
              </span>
              <input
                ref={nameInputRef}
                type="text"
                data-ocid="profile.username_input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-transparent text-white font-bold text-xl border-b-2 outline-none text-center min-w-0 w-40"
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  borderBottomColor: "#ff0050",
                  caretColor: "#ff0050",
                }}
                placeholder="username"
                maxLength={40}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSave();
                  if (e.key === "Escape") handleCancel();
                }}
              />
            </motion.div>
          ) : (
            <motion.button
              key="view-name"
              type="button"
              onClick={enterEditMode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.22 }}
              className="flex items-center gap-2 mb-1 group"
              aria-label="Edit username"
            >
              <h2
                data-ocid="profile.username"
                className="text-white font-bold text-xl"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                @{displayName}
              </h2>
              <Pencil
                size={14}
                className="text-white/40 group-hover:text-white/70 transition-colors flex-shrink-0"
              />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Bio */}
        {bio && (
          <p className="text-white/50 text-sm max-w-xs leading-relaxed mb-4">
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
          <VideoGrid videos={videos} isLoading={isLoading} />
        )}
        {activeTab === "shorts" && <ComingSoonPlaceholder label="Shorts" />}
        {activeTab === "replays" && (
          <ComingSoonPlaceholder label="Live Replays" />
        )}
      </div>
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
  isLoading,
}: { videos: Video[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div
        data-ocid="profile.loading_state"
        className="grid grid-cols-3 gap-0.5 mt-1"
      >
        {["s1", "s2", "s3", "s4", "s5", "s6"].map((k) => (
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
        <p className="text-white/50 text-sm">No videos yet</p>
        <p className="text-white/25 text-xs mt-1">
          Upload your first video to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-0.5 mt-1">
      {videos.map((video, i) => (
        <div
          key={video.id.toString()}
          data-ocid={`profile.item.${i + 1}`}
          className={`aspect-[9/16] rounded-sm overflow-hidden relative bg-gradient-to-b ${VIDEO_GRADIENTS[i % VIDEO_GRADIENTS.length]}`}
        >
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : null}
          {/* View count overlay */}
          <div className="absolute bottom-1 left-1 flex items-center gap-0.5">
            <Play size={10} fill="white" stroke="none" />
            <span className="text-white text-[10px] font-medium">
              {formatCount(video.viewCount)}
            </span>
          </div>
        </div>
      ))}
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
