import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface BattleCountdownProps {
  onComplete: () => void;
}

const STEPS = [3, 2, 1, "Start Battle!"] as const;
type Step = (typeof STEPS)[number];

const STEP_DURATIONS_MS = [800, 800, 800, 1000];

export function BattleCountdown({ onComplete }: BattleCountdownProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const onCompleteRef = useRef(onComplete);

  // Keep callback ref fresh without restarting the interval
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  // Run once on mount — advance through 3 → 2 → 1 → "Start Battle!"
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let currentIdx = 0;

    const advance = () => {
      const duration = STEP_DURATIONS_MS[currentIdx] ?? 800;
      timeoutId = setTimeout(() => {
        const nextIdx = currentIdx + 1;
        if (nextIdx >= STEPS.length) {
          onCompleteRef.current();
        } else {
          currentIdx = nextIdx;
          setStepIndex(nextIdx);
          advance();
        }
      }, duration);
    };

    advance();

    return () => clearTimeout(timeoutId);
    // Intentionally empty deps — runs once on mount
    // biome-ignore lint/correctness/useExhaustiveDependencies: one-shot countdown
  }, []);

  const currentStep: Step = STEPS[stepIndex] ?? 3;
  const isText = typeof currentStep === "string";

  return (
    <motion.div
      data-ocid="battle.countdown_overlay"
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 200,
        background: "rgba(0,0,0,0.88)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Crossed swords decoration */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="text-7xl opacity-10"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        >
          ⚔️
        </motion.div>
      </div>

      {/* Countdown number / text */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          data-ocid="battle.countdown_number"
          initial={{ scale: 2.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{
            duration: 0.35,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          className="flex flex-col items-center gap-3 relative z-10"
        >
          {isText ? (
            <span
              className="text-4xl font-black tracking-tight text-center leading-none px-6"
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                background: "linear-gradient(135deg, #ff0050 0%, #ff6b35 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textShadow: "none",
                letterSpacing: "-0.02em",
              }}
            >
              {currentStep}
            </span>
          ) : (
            <span
              className="font-black leading-none"
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: "9rem",
                background:
                  "linear-gradient(135deg, #ff0050 0%, #ff6b35 60%, #fff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textShadow: "none",
                lineHeight: 1,
              }}
            >
              {currentStep}
            </span>
          )}

          {/* Subtitle */}
          {!isText && (
            <motion.p
              className="text-white/40 text-sm font-medium tracking-widest uppercase"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              BATTLE STARTS IN
            </motion.p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="absolute bottom-20 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="rounded-full"
            style={{
              width: i === stepIndex % 3 && stepIndex < 3 ? 8 : 6,
              height: i === stepIndex % 3 && stepIndex < 3 ? 8 : 6,
              background:
                i <= (stepIndex < 3 ? 2 - stepIndex : -1)
                  ? "rgba(255,0,80,0.9)"
                  : "rgba(255,255,255,0.2)",
            }}
            animate={{
              scale:
                i === (stepIndex < 3 ? 2 - stepIndex : -1) ? [1, 1.3, 1] : 1,
            }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />
        ))}
      </div>
    </motion.div>
  );
}
