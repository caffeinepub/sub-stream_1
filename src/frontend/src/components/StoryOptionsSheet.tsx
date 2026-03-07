import { Loader2, Plus, Trash2, X } from "lucide-react";
import { Eye } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface StoryOptionsSheetProps {
  open: boolean;
  onClose: () => void;
  hasStory: boolean;
  onAddStory: () => void;
  onViewStory: () => void;
  onDeleteStory: () => void;
  isDeleting: boolean;
}

export function StoryOptionsSheet({
  open,
  onClose,
  hasStory,
  onAddStory,
  onViewStory,
  onDeleteStory,
  isDeleting,
}: StoryOptionsSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="story-options-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] bg-black/60"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            key="story-options-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="fixed bottom-0 left-0 right-0 z-[90] rounded-t-3xl overflow-hidden"
            style={{
              background:
                "linear-gradient(to bottom, rgba(28,28,30,0.97), rgba(18,18,18,0.99))",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderBottom: "none",
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
              <h3
                className="text-white font-bold text-base"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                Your Story
              </h3>
              <button
                type="button"
                data-ocid="story_options.close_button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.06)" }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Options */}
            <div className="px-4 py-3 pb-10 space-y-2">
              {/* Add Story — always shown */}
              <button
                type="button"
                data-ocid="story_options.add_button"
                onClick={() => {
                  onClose();
                  onAddStory();
                }}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-150 active:scale-[0.98]"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #ff0050, #ff6b35)",
                  }}
                >
                  <Plus size={22} className="text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-semibold text-sm">Add Story</p>
                  <p className="text-white/40 text-xs mt-0.5">
                    Share a photo or video
                  </p>
                </div>
              </button>

              {/* View Story — only if hasStory */}
              {hasStory && (
                <button
                  type="button"
                  data-ocid="story_options.view_button"
                  onClick={() => {
                    onClose();
                    onViewStory();
                  }}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-150 active:scale-[0.98]"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  >
                    <Eye size={22} className="text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-semibold text-sm">
                      View Story
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      See your active story
                    </p>
                  </div>
                </button>
              )}

              {/* Delete Story — only if hasStory */}
              {hasStory && (
                <button
                  type="button"
                  data-ocid="story_options.delete_button"
                  onClick={onDeleteStory}
                  disabled={isDeleting}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-150 active:scale-[0.98] disabled:opacity-60"
                  style={{ background: "rgba(255,0,80,0.08)" }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,0,80,0.15)" }}
                  >
                    {isDeleting ? (
                      <Loader2
                        size={22}
                        className="animate-spin"
                        style={{ color: "#ff0050" }}
                      />
                    ) : (
                      <Trash2 size={22} style={{ color: "#ff0050" }} />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p
                      className="font-semibold text-sm"
                      style={{ color: "#ff0050" }}
                    >
                      {isDeleting ? "Deleting…" : "Delete Story"}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      Remove your active story
                    </p>
                  </div>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
