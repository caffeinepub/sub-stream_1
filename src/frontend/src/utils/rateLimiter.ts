/**
 * Rate limiter utility for comments and messages.
 * Tracks actions in localStorage and enforces a 5-per-30s limit.
 */

const MAX_ACTIONS = 5;
const WINDOW_MS = 30_000;
const KEY_PREFIX = "substream_ratelimit_";

function getKey(action: string, userId: string): string {
  return `${KEY_PREFIX}${action}_${userId}`;
}

export function checkRateLimit(
  action: "comment" | "message",
  userId: string,
): { allowed: boolean; warningMessage: string | null } {
  if (!userId) return { allowed: true, warningMessage: null };

  const key = getKey(action, userId);
  const now = Date.now();

  let timestamps: number[] = [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) timestamps = JSON.parse(raw) as number[];
  } catch {
    timestamps = [];
  }

  // Remove timestamps outside the window
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_ACTIONS) {
    return {
      allowed: false,
      warningMessage:
        "You're posting too fast. Please wait a moment before trying again.",
    };
  }

  // Record this action
  recent.push(now);
  try {
    localStorage.setItem(key, JSON.stringify(recent));
  } catch {
    // silent
  }

  return { allowed: true, warningMessage: null };
}
