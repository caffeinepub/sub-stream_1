import { motion } from "motion/react";
import { useEffect } from "react";

interface MvpCrownAnimationProps {
  winnerName: string;
  winnerSide: "left" | "right";
  onComplete: () => void;
}

// Deterministic seeded random for stable star positions
function seededRandMvp(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function MvpCrownAnimation({
  winnerName,
  winnerSide,
  onComplete,
}: MvpCrownAnimationProps) {
  const rand = seededRandMvp(99);

  const stars = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    x: rand() * 100,
    delay: rand() * 0.6,
    duration: 0.8 + rand() * 0.6,
    driftX: (rand() - 0.5) * 120,
    driftY: -(rand() * 100 + 60),
  }));

  // Crown horizontal position based on which side won
  const crownX = winnerSide === "left" ? "25%" : "75%";

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      data-ocid="mvp_crown.panel"
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 100 }}
      aria-hidden="true"
    >
      {/* Golden particles burst */}
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute text-lg"
          style={{
            left: `${star.x}%`,
            top: "45%",
            willChange: "transform, opacity",
          }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0.8, 0],
            x: star.driftX,
            y: star.driftY,
            scale: [0, 1.2, 0.8, 0],
          }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            ease: "easeOut",
          }}
        >
          ⭐
        </motion.div>
      ))}

      {/* Crown dropping from top */}
      <motion.div
        className="absolute flex flex-col items-center"
        style={{
          left: crownX,
          transform: "translateX(-50%)",
          top: "30%",
          willChange: "transform, opacity",
        }}
        initial={{ y: -200, scale: 0.5, rotate: -15, opacity: 0 }}
        animate={{ y: 0, scale: 1, rotate: 0, opacity: 1 }}
        transition={{
          type: "spring",
          damping: 14,
          stiffness: 180,
          duration: 0.8,
        }}
      >
        {/* Crown emoji */}
        <motion.span
          className="text-6xl leading-none"
          style={{ willChange: "transform" }}
          animate={{
            scale: [1, 1.1, 0.97, 1.05, 1],
          }}
          transition={{
            duration: 1.2,
            delay: 0.5,
            ease: "easeInOut",
          }}
        >
          👑
        </motion.span>

        {/* MVP text */}
        <motion.div
          className="mt-2 flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.4,
            delay: 0.6,
            ease: [0.34, 1.56, 0.64, 1],
          }}
        >
          <span
            className="font-black text-2xl tracking-widest uppercase"
            style={{
              animation: "mvpPulse 1.2s ease-in-out infinite",
              background: "linear-gradient(135deg, #f59e0b, #fbbf24, #f59e0b)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          >
            MVP
          </span>
          <span
            className="text-white font-bold text-sm mt-1 max-w-[120px] truncate text-center"
            style={{
              textShadow:
                "0 0 16px rgba(245,158,11,0.7), 0 1px 6px rgba(0,0,0,0.9)",
            }}
          >
            {winnerName}
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
