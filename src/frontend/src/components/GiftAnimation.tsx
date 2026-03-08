import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

export interface GiftItem {
  emoji: string;
  name: string;
  tier?: "regular" | "premium";
}

interface GiftAnimationProps {
  gift: GiftItem;
  id: string;
  senderName?: string;
  onComplete: (id: string) => void;
}

// ─── Floating particle for regular gifts ─────────────────────────────────────

function FloatingParticle({
  emoji,
  index,
  total,
}: {
  emoji: string;
  index: number;
  total: number;
}) {
  const startX = (index / (total - 1)) * 80 - 40; // spread from -40 to +40
  const rotation = (Math.random() - 0.5) * 60;
  const drift = (Math.random() - 0.5) * 40;

  return (
    <motion.div
      className="absolute text-3xl pointer-events-none"
      style={{
        left: `calc(50% + ${startX}px)`,
        bottom: "8rem",
        willChange: "transform, opacity",
      }}
      initial={{ opacity: 1, y: 0, scale: 0.7, rotate: 0 }}
      animate={{
        opacity: [1, 1, 0.6, 0],
        y: [-10, -120, -240, -320],
        scale: [0.7, 1.1, 0.9, 0.5],
        rotate: [0, rotation, rotation * 1.5, rotation * 2],
        x: [0, drift, drift * 1.2, drift * 0.5],
      }}
      transition={{
        duration: 3,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {emoji}
    </motion.div>
  );
}

// ─── Sparkle effect ───────────────────────────────────────────────────────────

function Sparkle({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none text-yellow-300 text-lg"
      style={{ left: x, top: y, willChange: "transform, opacity" }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, 1.2, 0],
        y: [-5, -20],
      }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      ✨
    </motion.div>
  );
}

// ─── Regular gift animation ───────────────────────────────────────────────────

function RegularGiftAnimation({
  gift,
  senderName,
  onDone,
}: {
  gift: GiftItem;
  senderName?: string;
  onDone: () => void;
}) {
  const particleCount = 6;
  const sparklePositions = [
    { x: "20%", y: "60%" },
    { x: "75%", y: "55%" },
    { x: "45%", y: "65%" },
  ];

  useEffect(() => {
    const timer = setTimeout(onDone, 3200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 30 }}
      aria-hidden="true"
    >
      {/* Particles floating up */}
      {Array.from({ length: particleCount }, (_, i) => (
        <FloatingParticle
          // biome-ignore lint/suspicious/noArrayIndexKey: static count, position is index-based
          key={i}
          emoji={gift.emoji}
          index={i}
          total={particleCount}
        />
      ))}

      {/* Sparkles */}
      {sparklePositions.map((pos, i) => (
        <Sparkle
          // biome-ignore lint/suspicious/noArrayIndexKey: static count, position is index-based
          key={i}
          x={pos.x as unknown as number}
          y={pos.y as unknown as number}
        />
      ))}

      {/* Sender pill */}
      {senderName && (
        <motion.div
          className="absolute bottom-36 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full"
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          style={{
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <span className="text-base">{gift.emoji}</span>
          <span className="text-white text-xs font-semibold">
            {senderName} sent {gift.name}
          </span>
        </motion.div>
      )}
    </div>
  );
}

// ─── Premium gift animation ───────────────────────────────────────────────────

function PremiumGiftAnimation({
  gift,
  senderName,
  onDone,
}: {
  gift: GiftItem;
  senderName?: string;
  onDone: () => void;
}) {
  const isLion = gift.name === "Lion";
  const isUniverse = gift.name === "TikTok Universe";
  const isPhoenix = gift.name === "Fire Phoenix";
  const isFalcon = gift.name === "Thunder Falcon";

  useEffect(() => {
    const duration = isUniverse ? 6200 : isLion ? 5200 : 5000;
    const timer = setTimeout(onDone, duration);
    return () => clearTimeout(timer);
  }, [onDone, isUniverse, isLion]);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 30 }}
      aria-hidden="true"
    >
      {/* Edge glow */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.4, 0, 0.3, 0] }}
        transition={{ duration: 2, ease: "easeInOut" }}
        style={{
          boxShadow: `inset 0 0 80px 20px ${
            isLion
              ? "rgba(245,158,11,0.5)"
              : isPhoenix
                ? "rgba(239,68,68,0.5)"
                : isUniverse
                  ? "rgba(139,92,246,0.6)"
                  : isFalcon
                    ? "rgba(59,130,246,0.5)"
                    : "rgba(255,0,80,0.4)"
          }`,
        }}
      />

      {/* Universe: galaxy stars */}
      {isUniverse && (
        <div className="absolute inset-0">
          {Array.from({ length: 20 }, (_, i) => (
            <motion.div
              // biome-ignore lint/suspicious/noArrayIndexKey: static star count
              key={i}
              className="absolute text-white text-xs"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                willChange: "transform, opacity",
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 2,
                delay: Math.random() * 2,
                ease: "easeInOut",
              }}
            >
              ⭐
            </motion.div>
          ))}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: [0, 30] }}
            transition={{ duration: 6, ease: "linear" }}
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(139,92,246,0.3) 0%, transparent 70%)",
              willChange: "transform",
            }}
          />
        </div>
      )}

      {/* Phoenix: fire trail */}
      {isPhoenix && (
        <div className="absolute inset-0">
          {Array.from({ length: 8 }, (_, i) => (
            <motion.div
              // biome-ignore lint/suspicious/noArrayIndexKey: static fire trail count
              key={i}
              className="absolute text-2xl"
              style={{ willChange: "transform, opacity" }}
              initial={{
                x: "110%",
                y: `${20 + i * 8}%`,
                opacity: 0,
              }}
              animate={{
                x: ["110%", `${80 - i * 10}%`, `${40 - i * 5}%`, "-10%"],
                y: [
                  `${20 + i * 8}%`,
                  `${35 + i * 6}%`,
                  `${45 + i * 5}%`,
                  `${55 + i * 4}%`,
                ],
                opacity: [0, 0.9, 0.7, 0],
              }}
              transition={{
                duration: 2,
                delay: i * 0.1,
                ease: "easeOut",
              }}
            >
              🔥
            </motion.div>
          ))}
        </div>
      )}

      {/* Thunder Falcon: lightning streaks */}
      {isFalcon && (
        <div className="absolute inset-0">
          {Array.from({ length: 5 }, (_, i) => (
            <motion.div
              // biome-ignore lint/suspicious/noArrayIndexKey: static lightning count
              key={i}
              className="absolute text-3xl"
              style={{ willChange: "transform, opacity" }}
              initial={{ x: "-10%", y: `${15 + i * 15}%`, opacity: 0 }}
              animate={{
                x: ["−10%", "30%", "70%", "110%"],
                opacity: [0, 1, 1, 0],
                scale: [0.8, 1.2, 1, 0.6],
              }}
              transition={{
                duration: 0.8,
                delay: i * 0.15,
                ease: "easeIn",
              }}
            >
              ⚡
            </motion.div>
          ))}
        </div>
      )}

      {/* Lion: screen shake */}
      {isLion && (
        <motion.div
          className="absolute inset-0"
          animate={{
            x: [0, -4, 4, -4, 3, -2, 1, 0],
            y: [0, 2, -2, 2, -1, 1, 0, 0],
          }}
          transition={{
            duration: 0.5,
            delay: 0.8,
            ease: "easeInOut",
          }}
          style={{ willChange: "transform" }}
        />
      )}

      {/* Main gift emoji — slides in from right, pauses, slides out left */}
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 text-8xl flex flex-col items-center gap-3"
        style={{ willChange: "transform, opacity" }}
        initial={{ x: "120vw", opacity: 0 }}
        animate={{
          x: ["120vw", "50vw", "50vw", "-120vw"],
          opacity: [0, 1, 1, 0],
          translateX: [0, "-50%", "-50%", 0],
          scale: isLion ? [0.8, 1.1, 1.05, 0.9] : [0.9, 1, 1, 0.9],
        }}
        transition={{
          duration: isUniverse ? 6 : 5,
          times: [0, 0.25, 0.7, 1],
          ease: ["easeOut", "linear", "easeIn", "easeIn"],
        }}
      >
        <span style={{ filter: "drop-shadow(0 0 20px rgba(255,255,255,0.4))" }}>
          {gift.emoji}
        </span>

        {/* Sender pill below emoji */}
        {senderName && (
          <div
            className="px-4 py-2 rounded-full flex items-center gap-2"
            style={{
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.2)",
              fontSize: "0.875rem",
            }}
          >
            <span className="text-white font-bold text-sm">
              {senderName} sent {gift.name} {gift.emoji}
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GiftAnimation({
  gift,
  id,
  senderName,
  onComplete,
}: GiftAnimationProps) {
  const isPremium = gift.tier === "premium";

  const handleDone = () => onComplete(id);

  return (
    <AnimatePresence>
      {isPremium ? (
        <PremiumGiftAnimation
          key={id}
          gift={gift}
          senderName={senderName}
          onDone={handleDone}
        />
      ) : (
        <RegularGiftAnimation
          key={id}
          gift={gift}
          senderName={senderName}
          onDone={handleDone}
        />
      )}
    </AnimatePresence>
  );
}
