import { useCallback, useRef, useState } from "react";
import type { GiftItem } from "../components/GiftAnimation";

export interface QueuedGift {
  id: string;
  gift: GiftItem & { tier: "regular" | "premium" };
  senderName?: string;
}

/**
 * Manages a priority gift animation queue.
 * Premium gifts jump to the front; regular gifts append.
 * Only one animation plays at a time.
 */
export function useGiftQueue() {
  const [currentGift, setCurrentGift] = useState<QueuedGift | null>(null);
  const queueRef = useRef<QueuedGift[]>([]);
  const playingRef = useRef(false);

  const playNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      playingRef.current = false;
      setCurrentGift(null);
      return;
    }
    const next = queueRef.current.shift()!;
    setCurrentGift(next);
    playingRef.current = true;
  }, []);

  const enqueue = useCallback(
    (gift: QueuedGift["gift"], senderName?: string) => {
      const entry: QueuedGift = {
        id: `gift-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        gift,
        senderName,
      };

      if (gift.tier === "premium") {
        // Premium jumps to front
        queueRef.current = [entry, ...queueRef.current];
      } else {
        queueRef.current = [...queueRef.current, entry];
      }

      if (!playingRef.current) {
        playNext();
      }
    },
    [playNext],
  );

  const onAnimationComplete = useCallback(() => {
    playNext();
  }, [playNext]);

  return { currentGift, enqueue, onAnimationComplete };
}
