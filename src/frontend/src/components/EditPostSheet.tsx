import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Video } from "../backend.d";
import { useAuth } from "../context/AuthContext";

type PrivacyOption = "everyone" | "followers" | "only_me";

const PRIVACY_LABELS: Record<PrivacyOption, string> = {
  everyone: "Everyone",
  followers: "Followers only",
  only_me: "Only me",
};

interface EditPostSheetProps {
  open: boolean;
  video: Video | null;
  onClose: () => void;
}

export function EditPostSheet({ open, video, onClose }: EditPostSheetProps) {
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [privacy, setPrivacy] = useState<PrivacyOption>("everyone");

  const captionRef = useRef<HTMLTextAreaElement>(null);

  // Populate fields when the sheet opens with a new video
  useEffect(() => {
    if (open && video) {
      setCaption(video.caption || "");
      setHashtags(video.hashtags.join(", "));
      const v = video.privacy?.toLowerCase();
      if (v === "followers") setPrivacy("followers");
      else if (v === "only_me" || v === "only me") setPrivacy("only_me");
      else setPrivacy("everyone");
    }
  }, [open, video]);

  // Focus caption when sheet opens
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => captionRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!actor || !video) throw new Error("Not connected");
      const hashtagList = hashtags
        .split(",")
        .map((h) => h.trim().replace(/^#/, "").toLowerCase())
        .filter(Boolean);
      await actor.updateVideo(video.id, caption.trim(), hashtagList, privacy);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profileVideos"] }),
        queryClient.invalidateQueries({ queryKey: ["allVideos"] }),
        queryClient.invalidateQueries({ queryKey: ["userVideos"] }),
      ]);
      toast.success("Post updated");
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update post");
    },
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss */}
          <div
            className="fixed inset-0 z-[190]"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => {
              if (!editMutation.isPending) onClose();
            }}
          />

          <motion.div
            data-ocid="edit_post.sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-0 left-0 right-0 z-[200] rounded-t-2xl flex flex-col"
            style={{
              background: "rgba(12,12,12,0.99)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.08)",
              maxHeight: "85vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.2)" }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
              <h3
                className="text-white font-bold text-base"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                Edit Post
              </h3>
              <button
                type="button"
                data-ocid="edit_post.close_button"
                onClick={() => {
                  if (!editMutation.isPending) onClose();
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.07)" }}
                aria-label="Close edit post"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <div
              className="flex-1 overflow-y-auto px-4 pb-4"
              style={{ scrollbarWidth: "none" }}
            >
              {/* Caption */}
              <div className="mb-4">
                <label
                  className="block text-white/40 text-[10px] font-semibold tracking-widest uppercase mb-2"
                  htmlFor="edit-caption"
                >
                  Caption
                </label>
                <textarea
                  id="edit-caption"
                  ref={captionRef}
                  data-ocid="edit_post.caption_textarea"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value.slice(0, 2200))}
                  placeholder="Describe your video…"
                  rows={4}
                  className="w-full rounded-xl px-3 py-2.5 text-white text-sm leading-relaxed outline-none resize-none placeholder:text-white/25"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    caretColor: "#ff0050",
                    fontSize: "15px",
                  }}
                />
                <p className="text-right mt-1">
                  <span
                    className="text-[10px]"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    {caption.length}/2200
                  </span>
                </p>
              </div>

              {/* Hashtags */}
              <div className="mb-4">
                <label
                  className="block text-white/40 text-[10px] font-semibold tracking-widest uppercase mb-2"
                  htmlFor="edit-hashtags"
                >
                  Hashtags (comma-separated)
                </label>
                <input
                  id="edit-hashtags"
                  type="text"
                  data-ocid="edit_post.hashtags_input"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="funny, dance, trending"
                  className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none placeholder:text-white/25"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    caretColor: "#ff0050",
                    fontSize: "15px",
                  }}
                />
              </div>

              {/* Privacy */}
              <div className="mb-5">
                <label
                  className="block text-white/40 text-[10px] font-semibold tracking-widest uppercase mb-2"
                  htmlFor="edit-privacy"
                >
                  Who can watch
                </label>
                <div className="relative">
                  <select
                    id="edit-privacy"
                    data-ocid="edit_post.privacy_select"
                    value={privacy}
                    onChange={(e) =>
                      setPrivacy(e.target.value as PrivacyOption)
                    }
                    className="w-full rounded-xl px-3 py-3 text-white text-sm outline-none appearance-none"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      caretColor: "#ff0050",
                    }}
                  >
                    {(
                      Object.entries(PRIVACY_LABELS) as [
                        PrivacyOption,
                        string,
                      ][]
                    ).map(([val, label]) => (
                      <option
                        key={val}
                        value={val}
                        style={{ background: "#111", color: "white" }}
                      >
                        {label}
                      </option>
                    ))}
                  </select>
                  {/* Chevron */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div
              className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
              style={{
                borderTop: "1px solid rgba(255,255,255,0.07)",
                background: "rgba(0,0,0,0.4)",
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
              }}
            >
              <button
                type="button"
                data-ocid="edit_post.cancel_button"
                onClick={() => {
                  if (!editMutation.isPending) onClose();
                }}
                disabled={editMutation.isPending}
                className="flex-1 py-3 rounded-2xl text-sm font-bold disabled:opacity-50 transition-opacity"
                style={{
                  color: "rgba(255,255,255,0.7)",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                data-ocid="edit_post.save_button"
                onClick={() => editMutation.mutate()}
                disabled={editMutation.isPending}
                className="flex-[2] py-3 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70 transition-opacity"
                style={{
                  background:
                    "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
                  boxShadow: editMutation.isPending
                    ? "none"
                    : "0 6px 24px rgba(255,0,80,0.3)",
                }}
              >
                {editMutation.isPending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
