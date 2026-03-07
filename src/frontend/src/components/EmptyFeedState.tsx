import { Video } from "lucide-react";
import { motion } from "motion/react";

interface EmptyFeedStateProps {
  onUpload: () => void;
}

export function EmptyFeedState({ onUpload }: EmptyFeedStateProps) {
  return (
    <motion.div
      data-ocid="feed.empty_state"
      className="w-full h-full flex flex-col items-center justify-center px-8 text-center"
      style={{ background: "#000000" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
        className="mb-8"
      >
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(255, 0, 80, 0.1)",
            boxShadow: "0 0 48px rgba(255,0,80,0.2)",
          }}
        >
          <Video size={56} strokeWidth={1.5} style={{ color: "#ff0050" }} />
        </div>
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.22 }}
        className="mb-10 space-y-3"
      >
        <h2
          className="text-white font-bold text-2xl tracking-tight leading-tight"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          No content available yet.
        </h2>
        <p
          className="text-sm leading-relaxed max-w-xs mx-auto"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          Be the first to upload content.
        </p>
      </motion.div>

      {/* CTA Button */}
      <motion.button
        type="button"
        data-ocid="feed.upload_button"
        onClick={onUpload}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.32 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
          boxShadow:
            "0 8px 32px rgba(255,0,80,0.45), 0 2px 8px rgba(255,0,80,0.3)",
        }}
      >
        <Video size={18} strokeWidth={2} />
        Upload First Video
      </motion.button>

      {/* Subtle decorative ring behind icon */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(255,0,80,0.05) 0%, transparent 70%)",
        }}
      />
    </motion.div>
  );
}
