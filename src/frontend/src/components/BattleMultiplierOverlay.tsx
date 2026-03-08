import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

interface Props {
  multiplier: 2 | 3;
  phase: "starting" | "active" | null;
}

export function BattleMultiplierOverlay({ multiplier, phase }: Props) {
  const [visible, setVisible] = useState(false);

  const color = multiplier === 2 ? "#f59e0b" : "#a855f7";
  const glow =
    multiplier === 2
      ? "0 0 30px rgba(245,158,11,0.8), 0 0 60px rgba(245,158,11,0.4)"
      : "0 0 30px rgba(168,85,247,0.8), 0 0 60px rgba(168,85,247,0.4)";
  const bgOverlay =
    multiplier === 2 ? "rgba(245,158,11,0.08)" : "rgba(168,85,247,0.08)";

  const label =
    phase === "starting"
      ? `x${multiplier} Starting Soon`
      : `x${multiplier} Activated`;

  // Auto-hide after 3s when active
  useEffect(() => {
    if (phase === "active") {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(t);
    }
    if (phase === "starting") {
      setVisible(true);
    } else if (phase === null) {
      setVisible(false);
    }
  }, [phase]);

  if (!phase) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={`multiplier-${multiplier}-${phase}`}
          className="fixed inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 60 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Soft background wash */}
          <motion.div
            className="absolute inset-0"
            style={{ background: bgOverlay }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Main text */}
          <motion.div
            className="relative flex flex-col items-center gap-2"
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{
              scale: [0.5, 1.15, 1],
              opacity: [0, 1, 1],
              y: [20, -4, 0],
            }}
            exit={{ scale: 0.8, opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Multiplier badge */}
            <motion.div
              className="flex items-center justify-center"
              animate={{
                textShadow: [
                  glow,
                  glow.replace("0.8", "0.4").replace("0.4", "0.1"),
                  glow,
                ],
              }}
              transition={{
                duration: 1.2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            >
              <span
                className="text-5xl font-black tracking-tight select-none"
                style={{
                  color,
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  textShadow: glow,
                  letterSpacing: "-0.02em",
                }}
              >
                {label}
              </span>
            </motion.div>

            {/* Subtitle line */}
            <motion.div
              className="px-5 py-1.5 rounded-full"
              style={{
                background:
                  multiplier === 2
                    ? "rgba(245,158,11,0.2)"
                    : "rgba(168,85,247,0.2)",
                border: `1px solid ${color}50`,
              }}
              initial={{ opacity: 0, scaleX: 0.4 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.25, duration: 0.35 }}
            >
              <span
                className="text-sm font-bold tracking-widest uppercase"
                style={{ color }}
              >
                {phase === "starting"
                  ? "Multiplier activating…"
                  : "All points are multiplied!"}
              </span>
            </motion.div>

            {/* Particle sparks */}
            {(["s0", "s1", "s2", "s3", "s4", "s5"] as const).map((key, i) => {
              const angle = (i / 6) * 360;
              const r = 80 + ((i * 17) % 30);
              return (
                <motion.div
                  key={key}
                  className="absolute w-2 h-2 rounded-full"
                  style={{ background: color, top: "50%", left: "50%" }}
                  initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                    x: Math.cos((angle * Math.PI) / 180) * r,
                    y: Math.sin((angle * Math.PI) / 180) * r,
                  }}
                  transition={{
                    duration: 0.7,
                    delay: 0.15 + i * 0.05,
                    ease: "easeOut",
                  }}
                />
              );
            })}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
