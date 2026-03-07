import { motion } from "motion/react";

export interface GiftItem {
  emoji: string;
  name: string;
}

interface GiftAnimationProps {
  gift: GiftItem;
  id: string;
  onComplete: (id: string) => void;
}

export function GiftAnimation({ gift, id, onComplete }: GiftAnimationProps) {
  return (
    <motion.div
      key={id}
      className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1 pointer-events-none"
      initial={{ y: 0, opacity: 1, scale: 0.6 }}
      animate={{ y: -300, opacity: 0, scale: 1.2 }}
      transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => onComplete(id)}
    >
      <div
        className="px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg"
        style={{
          background: "rgba(255,0,80,0.2)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,0,80,0.4)",
        }}
      >
        <span className="text-2xl">{gift.emoji}</span>
        <span className="text-white text-sm font-semibold">{gift.name}</span>
      </div>
    </motion.div>
  );
}
