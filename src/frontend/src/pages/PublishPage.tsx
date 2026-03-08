import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  Eye,
  Link,
  Loader2,
  Lock,
  MapPin,
  Share2,
} from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import { useAuth } from "../context/AuthContext";
import type { EditorEdits } from "./VideoEditorPage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublishPageProps {
  mediaFile: File;
  edits: EditorEdits;
  onBack: () => void;
  onPublished: () => void;
  onSaveDraft: () => void;
}

type PrivacySetting = "Everyone" | "Followers" | "Only Me";

const PRIVACY_OPTIONS: PrivacySetting[] = ["Everyone", "Followers", "Only Me"];

function extractHashtags(text: string): string[] {
  const matches = text.match(/#([a-zA-Z0-9_]+)/g) ?? [];
  return matches.map((h) => h.slice(1).toLowerCase());
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PublishPage({
  mediaFile,
  edits: _edits,
  onBack,
  onPublished,
  onSaveDraft,
}: PublishPageProps) {
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  const mediaPreviewUrl = useRef(URL.createObjectURL(mediaFile)).current;
  const isVideo =
    mediaFile.type.startsWith("video/") ||
    mediaFile.name.endsWith(".webm") ||
    mediaFile.name.endsWith(".mp4");

  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [addLink, setAddLink] = useState("");
  const [privacy, setPrivacy] = useState<PrivacySetting>("Everyone");
  const [showPrivacySheet, setShowPrivacySheet] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [contentDisclosure, setContentDisclosure] = useState(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [allowStitch, setAllowStitch] = useState(true);
  const [musicAccepted, setMusicAccepted] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const MAX_CHARS = 2200;

  /** Generate a thumbnail from the first frame of a video file */
  async function generateVideoThumbnail(file: File): Promise<string> {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      const objectUrl = URL.createObjectURL(file);
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";

      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
        video.removeAttribute("src");
        video.load();
      };

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration * 0.1 || 0.5);
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = Math.min(video.videoWidth, 720);
          canvas.height = Math.round(
            (canvas.width / video.videoWidth) * video.videoHeight,
          );
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            cleanup();
            resolve("");
            return;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          cleanup();
          resolve(dataUrl);
        } catch {
          cleanup();
          resolve("");
        }
      };

      video.onerror = () => {
        cleanup();
        resolve("");
      };

      video.src = objectUrl;
      video.load();
    });
  }

  const privacyToBackend = (p: PrivacySetting): string => {
    if (p === "Followers") return "followers";
    if (p === "Only Me") return "only_me";
    return "everyone";
  };

  const handlePost = async () => {
    if (!musicAccepted) {
      toast.error("Please accept the Music Usage Confirmation");
      return;
    }
    if (!actor) {
      toast.error("Not connected. Please log in.");
      return;
    }
    setIsPosting(true);
    setUploadProgress(0);
    try {
      // Upload media file
      const bytes = new Uint8Array(await mediaFile.arrayBuffer());
      const extBlob = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) =>
        setUploadProgress(Math.round(pct)),
      );
      const meta = await actor.uploadFile(
        mediaFile.name,
        mediaFile.type || "video/webm",
        BigInt(mediaFile.size),
        extBlob,
      );
      const mediaUrl = meta.externalBlob.getDirectURL();

      // Generate thumbnail from video
      let thumbnailUrl = "";
      if (isVideo) {
        thumbnailUrl = await generateVideoThumbnail(mediaFile);
      }

      // Save post
      const title = description.trim() || mediaFile.name;
      await actor.addVideo(
        title,
        description.trim(),
        mediaUrl,
        thumbnailUrl,
        extractHashtags(description),
        privacyToBackend(privacy),
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["allVideos"] }),
        queryClient.invalidateQueries({ queryKey: ["userVideos"] }),
        queryClient.invalidateQueries({ queryKey: ["profileVideos"] }),
      ]);

      toast.success("Video posted!");
      onPublished();
    } catch (err) {
      console.error(err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsPosting(false);
      setUploadProgress(0);
    }
  };

  const handleSaveDraft = () => {
    // Save to localStorage as a draft record
    try {
      const existing = JSON.parse(
        localStorage.getItem("ss_drafts") ?? "[]",
      ) as object[];
      existing.unshift({
        name: mediaFile.name,
        size: mediaFile.size,
        type: mediaFile.type,
        description,
        savedAt: Date.now(),
      });
      localStorage.setItem("ss_drafts", JSON.stringify(existing.slice(0, 20)));
      toast.success("Saved to drafts");
    } catch {
      toast.error("Could not save draft");
    }
    onSaveDraft();
  };

  return (
    <div
      data-ocid="publish.page"
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: "#000" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-12 pb-3 flex-shrink-0"
        style={{
          background: "rgba(0,0,0,0.9)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          type="button"
          data-ocid="publish.back_button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/70"
          style={{ background: "rgba(255,255,255,0.07)" }}
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1
          className="text-white font-bold text-base"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Post
        </h1>
        <div className="w-9" />
      </div>

      {/* Upload progress bar */}
      {isPosting && (
        <div className="h-1" style={{ background: "rgba(255,255,255,0.08)" }}>
          <motion.div
            className="h-full"
            style={{
              background: "linear-gradient(90deg, #ff0050 0%, #ff6b35 100%)",
              width: `${uploadProgress}%`,
            }}
            transition={{ duration: 0.15 }}
          />
        </div>
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-28">
        {/* Video/photo preview */}
        <div className="flex gap-4 px-5 pt-5 pb-2">
          <div
            className="flex-shrink-0 relative rounded-2xl overflow-hidden"
            style={{
              width: 72,
              aspectRatio: "9/16",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            {isVideo ? (
              <video
                src={mediaPreviewUrl}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
            ) : (
              <img
                src={mediaPreviewUrl}
                alt="Media preview"
                className="w-full h-full object-cover"
              />
            )}
            <button
              type="button"
              data-ocid="publish.edit_cover_button"
              onClick={onBack}
              className="absolute bottom-1 left-1/2 -translate-x-1/2 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(0,0,0,0.7)" }}
            >
              Edit cover
            </button>
          </div>

          {/* Description */}
          <div className="flex-1">
            <textarea
              data-ocid="publish.description_textarea"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value.slice(0, MAX_CHARS))
              }
              placeholder="Describe your video... #hashtag @mention"
              className="w-full bg-transparent text-white text-sm placeholder:text-white/30 outline-none resize-none leading-relaxed"
              rows={6}
              style={{ caretColor: "#ff0050", fontSize: "15px" }}
            />
            <div className="text-right">
              <span
                className="text-xs"
                style={{
                  color:
                    description.length > MAX_CHARS * 0.9
                      ? "#ff0050"
                      : "rgba(255,255,255,0.3)",
                }}
              >
                {description.length}/{MAX_CHARS}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.06)",
            margin: "0 20px",
          }}
        />

        {/* Settings rows */}
        <div className="px-5 py-2 space-y-0">
          {/* Location */}
          <button
            type="button"
            data-ocid="publish.location_button"
            onClick={() => setShowLocationInput((v) => !v)}
            className="w-full flex items-center gap-3 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <MapPin size={18} style={{ color: "rgba(255,255,255,0.6)" }} />
            <span
              className="flex-1 text-left text-sm"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              {location || "Location"}
            </span>
            <ChevronRight
              size={16}
              style={{ color: "rgba(255,255,255,0.3)" }}
            />
          </button>
          {showLocationInput && (
            <div className="pb-3">
              <input
                type="text"
                data-ocid="publish.location_input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add your location…"
                className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder:text-white/30 outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  caretColor: "#ff0050",
                  fontSize: "16px",
                }}
              />
            </div>
          )}

          {/* Content disclosure */}
          <button
            type="button"
            data-ocid="publish.content_disclosure_toggle"
            onClick={() => setContentDisclosure((v) => !v)}
            className="w-full flex items-center gap-3 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <Eye size={18} style={{ color: "rgba(255,255,255,0.6)" }} />
            <span
              className="flex-1 text-left text-sm"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              Content disclosure and ads
            </span>
            <div
              className="w-10 h-6 rounded-full relative transition-colors"
              style={{
                background: contentDisclosure
                  ? "linear-gradient(135deg, #ff0050, #ff3366)"
                  : "rgba(255,255,255,0.15)",
              }}
            >
              <div
                className="absolute w-4 h-4 bg-white rounded-full top-1 transition-all"
                style={{
                  left: contentDisclosure ? "auto" : 4,
                  right: contentDisclosure ? 4 : "auto",
                }}
              />
            </div>
          </button>

          {/* Add link */}
          <button
            type="button"
            data-ocid="publish.add_link_button"
            onClick={() => setShowLinkInput((v) => !v)}
            className="w-full flex items-center gap-3 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <Link size={18} style={{ color: "rgba(255,255,255,0.6)" }} />
            <span
              className="flex-1 text-left text-sm"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              {addLink || "Add link"}
            </span>
            <ChevronRight
              size={16}
              style={{ color: "rgba(255,255,255,0.3)" }}
            />
          </button>
          {showLinkInput && (
            <div className="pb-3">
              <input
                type="url"
                data-ocid="publish.link_input"
                value={addLink}
                onChange={(e) => setAddLink(e.target.value)}
                placeholder="https://…"
                className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder:text-white/30 outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  caretColor: "#ff0050",
                  fontSize: "16px",
                }}
              />
            </div>
          )}

          {/* Privacy */}
          <button
            type="button"
            data-ocid="publish.privacy_button"
            onClick={() => setShowPrivacySheet(true)}
            className="w-full flex items-center gap-3 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <Lock size={18} style={{ color: "rgba(255,255,255,0.6)" }} />
            <span
              className="flex-1 text-left text-sm"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              Privacy settings
            </span>
            <span
              className="text-xs mr-1"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {privacy}
            </span>
            <ChevronRight
              size={16}
              style={{ color: "rgba(255,255,255,0.3)" }}
            />
          </button>

          {/* More options accordion */}
          <button
            type="button"
            data-ocid="publish.more_options_toggle"
            onClick={() => setMoreOptionsOpen((v) => !v)}
            className="w-full flex items-center gap-3 py-4"
            style={{
              borderBottom: moreOptionsOpen
                ? "none"
                : "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <span
              className="flex-1 text-left text-sm"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              More options
            </span>
            <motion.span
              animate={{ rotate: moreOptionsOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight
                size={16}
                style={{ color: "rgba(255,255,255,0.3)" }}
              />
            </motion.span>
          </button>

          {moreOptionsOpen && (
            <div className="space-y-0 pb-1">
              {[
                {
                  label: "Allow comments",
                  value: allowComments,
                  setter: setAllowComments,
                  ocid: "publish.comments_switch",
                },
                {
                  label: "Allow duet",
                  value: allowDuet,
                  setter: setAllowDuet,
                  ocid: "publish.duet_switch",
                },
                {
                  label: "Allow stitch",
                  value: allowStitch,
                  setter: setAllowStitch,
                  ocid: "publish.stitch_switch",
                },
              ].map(({ label, value, setter, ocid }) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-3.5 px-1"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <span
                    className="text-sm"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    {label}
                  </span>
                  <button
                    type="button"
                    data-ocid={ocid}
                    onClick={() => setter((v) => !v)}
                    className="w-10 h-6 rounded-full relative transition-colors"
                    style={{
                      background: value
                        ? "linear-gradient(135deg, #ff0050, #ff3366)"
                        : "rgba(255,255,255,0.15)",
                    }}
                    role="switch"
                    aria-checked={value}
                  >
                    <div
                      className="absolute w-4 h-4 bg-white rounded-full top-1 transition-all"
                      style={{
                        left: value ? "auto" : 4,
                        right: value ? 4 : "auto",
                      }}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Share to other platforms */}
          <button
            type="button"
            data-ocid="publish.share_button"
            className="w-full flex items-center gap-3 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <Share2 size={18} style={{ color: "rgba(255,255,255,0.6)" }} />
            <span
              className="flex-1 text-left text-sm"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              Share to other platforms
            </span>
            <ChevronRight
              size={16}
              style={{ color: "rgba(255,255,255,0.3)" }}
            />
          </button>
        </div>

        {/* Music usage confirmation */}
        <div className="mx-5 mt-4 mb-2">
          <button
            type="button"
            data-ocid="publish.music_checkbox"
            onClick={() => setMusicAccepted((v) => !v)}
            className="flex items-start gap-3 w-full"
          >
            <div
              className="w-5 h-5 rounded-md flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors"
              style={{
                background: musicAccepted ? "#ff0050" : "transparent",
                border: musicAccepted
                  ? "none"
                  : "1.5px solid rgba(255,255,255,0.35)",
              }}
            >
              {musicAccepted && (
                <svg
                  width="11"
                  height="9"
                  viewBox="0 0 11 9"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M1 4L4 7L10 1"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span
              className="text-sm text-left leading-relaxed"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              I accept the Music Usage Confirmation
            </span>
          </button>
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 flex items-center gap-3 px-5 py-4 z-40"
        style={{
          background: "rgba(0,0,0,0.95)",
          backdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
        }}
      >
        <button
          type="button"
          data-ocid="publish.drafts_button"
          onClick={handleSaveDraft}
          disabled={isPosting}
          className="flex-1 py-3.5 rounded-2xl text-white text-sm font-bold disabled:opacity-50"
          style={{
            border: "1.5px solid rgba(255,255,255,0.3)",
            background: "transparent",
          }}
        >
          Drafts
        </button>
        <motion.button
          type="button"
          data-ocid="publish.post_button"
          onClick={() => void handlePost()}
          disabled={isPosting}
          whileTap={!isPosting ? { scale: 0.97 } : undefined}
          className="flex-[2] py-3.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70"
          style={{
            background: "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
            boxShadow: isPosting ? "none" : "0 6px 24px rgba(255,0,80,0.35)",
          }}
        >
          {isPosting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {uploadProgress > 0
                ? `Uploading ${uploadProgress}%…`
                : "Uploading…"}
            </>
          ) : (
            "Post"
          )}
        </motion.button>
      </div>

      {/* Privacy sheet */}
      {showPrivacySheet && (
        <dialog
          className="fixed inset-0 z-50 flex flex-col justify-end w-full h-full max-w-none max-h-none m-0 p-0 border-0"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          open
        >
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss */}
          <div
            className="absolute inset-0"
            onClick={() => setShowPrivacySheet(false)}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-t-3xl px-5 pt-5 pb-10"
            style={{
              background: "rgba(16,16,16,0.98)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mb-5"
              style={{ background: "rgba(255,255,255,0.2)" }}
            />
            <h3
              className="text-white font-bold text-lg mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Who can watch?
            </h3>
            {PRIVACY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                data-ocid={`publish.privacy_${opt.toLowerCase().replace(" ", "_")}_radio`}
                onClick={() => {
                  setPrivacy(opt);
                  setShowPrivacySheet(false);
                }}
                className="w-full flex items-center justify-between py-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span className="text-white text-base">{opt}</span>
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                  style={{
                    borderColor:
                      privacy === opt ? "#ff0050" : "rgba(255,255,255,0.3)",
                    background: privacy === opt ? "#ff0050" : "transparent",
                  }}
                >
                  {privacy === opt && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </button>
            ))}
            <button
              type="button"
              data-ocid="publish.privacy_cancel_button"
              onClick={() => setShowPrivacySheet(false)}
              className="w-full py-3.5 rounded-2xl text-white/60 text-sm font-semibold mt-3"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              Cancel
            </button>
          </motion.div>
        </dialog>
      )}
    </div>
  );
}
