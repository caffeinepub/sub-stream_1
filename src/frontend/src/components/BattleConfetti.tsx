import { motion } from "motion/react";
import { useEffect, useMemo } from "react";

interface BattleConfettiProps {
  winnerName: string;
  hostScore: number;
  guestScore: number;
  onClose: () => void;
}

const CONFETTI_COLORS = [
  "#ff0050",
  "#f59e0b",
  "#ffffff",
  "#ec4899",
  "#3b82f6",
  "#ff6b35",
  "#fbbf24",
  "#a78bfa",
];

interface ConfettiParticle {
  id: number;
  left: number;
  size: number;
  color: string;
  rotation: number;
  drift: number;
  duration: number;
  delay: number;
  shape: "square" | "circle" | "rect";
}

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function BattleConfetti({
  winnerName,
  hostScore,
  guestScore,
  onClose,
}: BattleConfettiProps) {
  const particles = useMemo<ConfettiParticle[]>(() => {
    const rand = seededRand(42);
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: rand() * 100,
      size: 8 + rand() * 4,
      color: CONFETTI_COLORS[Math.floor(rand() * CONFETTI_COLORS.length)]!,
      rotation: rand() * 360,
      drift: (rand() - 0.5) * 80,
      duration: 2 + rand() * 2,
      delay: rand() * 1.5,
      shape: (["square", "circle", "rect"] as const)[Math.floor(rand() * 3)]!,
    }));
  }, []);

  // Auto-close after 7 seconds
  useEffect(() => {
    const t = setTimeout(onClose, 7000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      data-ocid="battle.confetti_modal"
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 200, background: "rgba(0,0,0,0.82)" }}
    >
      {/* Confetti particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute"
            style={
              {
                left: `${p.left}%`,
                top: -20,
                width: p.shape === "rect" ? p.size * 0.5 : p.size,
                height: p.shape === "rect" ? p.size * 1.8 : p.size,
                borderRadius: p.shape === "circle" ? "50%" : "2px",
                background: p.color,
                transform: `rotate(${p.rotation}deg)`,
                animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
                "--drift": `${p.drift}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Winner card */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          damping: 16,
          stiffness: 220,
          delay: 0.15,
        }}
        className="relative flex flex-col items-center gap-4 px-10 py-10 rounded-3xl mx-6 text-center"
        style={{
          background: "rgba(20,20,20,0.97)",
          border: "1.5px solid rgba(245,158,11,0.45)",
          boxShadow:
            "0 0 60px rgba(245,158,11,0.18), 0 24px 60px rgba(0,0,0,0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          maxWidth: 320,
          width: "100%",
        }}
      >
        {/* Trophy */}
        <motion.span
          className="text-[80px] leading-none"
          initial={{ rotateY: 0 }}
          animate={{ rotateY: [0, -15, 15, -10, 10, 0] }}
          transition={{ duration: 1.2, delay: 0.4 }}
        >
          🏆
        </motion.span>

        {/* Winner label */}
        <p
          className="text-sm font-black uppercase tracking-[0.2em]"
          style={{
            background: "linear-gradient(135deg, #f59e0b, #fbbf24, #f59e0b)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Winner
        </p>

        {/* Winner name */}
        <p
          className="text-white font-black leading-tight"
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 28,
          }}
        >
          {winnerName}
        </p>

        {/* Score line */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black" style={{ color: "#ff0050" }}>
              {hostScore.toLocaleString()}
            </span>
            <span className="text-white/40 text-xs mt-0.5">Host</span>
          </div>
          <span className="text-white/30 font-bold text-lg">vs</span>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black" style={{ color: "#3b82f6" }}>
              {guestScore.toLocaleString()}
            </span>
            <span className="text-white/40 text-xs mt-0.5">Guest</span>
          </div>
        </div>

        {/* Continue button */}
        <button
          type="button"
          data-ocid="battle.close_confetti_button"
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-all active:scale-95 mt-2"
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          Continue
        </button>
      </motion.div>

      {/* Embedded CSS keyframes */}
      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) translateX(0) rotate(var(--r, 0deg));
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) translateX(var(--drift)) rotate(calc(var(--r, 0deg) + 540deg));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
