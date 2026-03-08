import { Clock, Eye, Gift, Heart, Save, Trash2, Zap } from "lucide-react";
import { motion } from "motion/react";

export interface LiveEndStats {
  totalViewers: number;
  totalLikes: number;
  totalGifts: number;
  durationMs: number; // elapsed milliseconds
}

interface LiveEndScreenProps {
  stats: LiveEndStats;
  onSave: () => void;
  onDelete: () => void;
  isSaving?: boolean;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const STAT_ITEMS = [
  {
    key: "viewers",
    icon: Eye,
    label: "Total Viewers",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.12)",
    border: "rgba(96,165,250,0.25)",
  },
  {
    key: "likes",
    icon: Heart,
    label: "Total Likes",
    color: "#ff0050",
    bg: "rgba(255,0,80,0.12)",
    border: "rgba(255,0,80,0.25)",
  },
  {
    key: "gifts",
    icon: Gift,
    label: "Total Gifts",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.25)",
  },
  {
    key: "duration",
    icon: Clock,
    label: "Duration",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.12)",
    border: "rgba(167,139,250,0.25)",
  },
] as const;

export function LiveEndScreen({
  stats,
  onSave,
  onDelete,
  isSaving = false,
}: LiveEndScreenProps) {
  const statValues: Record<string, string> = {
    viewers: formatCount(stats.totalViewers),
    likes: formatCount(stats.totalLikes),
    gifts: formatCount(stats.totalGifts),
    duration: formatDuration(stats.durationMs),
  };

  return (
    <motion.div
      data-ocid="live_end.page"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: "rgba(0,0,0,0.97)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(255,0,80,0.08) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 w-full max-w-sm px-6 flex flex-col items-center gap-7">
        {/* Logo */}
        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #ff0050 0%, #ff6b35 100%)",
              boxShadow: "0 0 32px rgba(255,0,80,0.5)",
            }}
          >
            <Zap size={26} fill="white" stroke="none" />
          </div>
          <span
            className="text-lg font-black tracking-widest"
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              background:
                "linear-gradient(135deg, #ff0050 0%, #ff6b35 60%, #fff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            SUB STREAM
          </span>
        </motion.div>

        {/* Title */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2
            className="text-white text-2xl font-bold mb-1"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Stream Ended
          </h2>
          <p className="text-white/45 text-sm">
            Great stream! Here's your summary.
          </p>
        </motion.div>

        {/* Stats 2×2 grid */}
        <motion.div
          className="grid grid-cols-2 gap-3 w-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {STAT_ITEMS.map(({ key, icon: Icon, label, color, bg, border }) => (
            <div
              key={key}
              data-ocid={`live_end.${key}_card`}
              className="flex flex-col items-center gap-2.5 py-5 px-4 rounded-2xl"
              style={{
                background: bg,
                border: `1px solid ${border}`,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${color}20` }}
              >
                <Icon size={20} style={{ color }} strokeWidth={1.8} />
              </div>
              <div className="text-center">
                <p
                  className="text-white font-bold text-xl leading-none mb-1"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  {statValues[key]}
                </p>
                <p className="text-white/45 text-[11px] font-medium">{label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Action buttons */}
        <motion.div
          className="flex flex-col gap-3 w-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            type="button"
            data-ocid="live_end.save_button"
            onClick={onSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-white font-bold text-base transition-all duration-200 active:scale-[0.98] disabled:opacity-70"
            style={{
              background: "linear-gradient(135deg, #ff0050, #ff6b35)",
              boxShadow:
                "0 6px 28px rgba(255,0,80,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            <Save size={18} stroke="white" strokeWidth={2} />
            {isSaving ? "Saving Replay…" : "Save Replay"}
          </button>

          <button
            type="button"
            data-ocid="live_end.delete_button"
            onClick={onDelete}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-base transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
            style={{
              color: "rgba(255,255,255,0.6)",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <Trash2 size={18} strokeWidth={2} />
            Delete Recording
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
