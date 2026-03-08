/**
 * useLiveStatus
 *
 * Track who is live using localStorage.
 * Structure: substream_live_status → { [principalStr]: { isLive: boolean; ts: number } }
 * Statuses expire after 4 hours.
 */

import { useCallback } from "react";
import { useInternetIdentity } from "./useInternetIdentity";

const LIVE_STATUS_KEY = "substream_live_status";
const EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours

interface LiveEntry {
  isLive: boolean;
  ts: number;
}

function loadStatus(): Record<string, LiveEntry> {
  try {
    const raw = localStorage.getItem(LIVE_STATUS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, LiveEntry>;
  } catch {
    return {};
  }
}

function saveStatus(map: Record<string, LiveEntry>): void {
  try {
    localStorage.setItem(LIVE_STATUS_KEY, JSON.stringify(map));
  } catch {
    // silent
  }
}

function isExpired(entry: LiveEntry): boolean {
  return Date.now() - entry.ts > EXPIRY_MS;
}

// ─── Public helpers (no hook needed) ─────────────────────────────────────────

export function getLiveStatusStatic(principalStr: string): boolean {
  const map = loadStatus();
  const entry = map[principalStr];
  if (!entry) return false;
  if (isExpired(entry)) {
    // Prune stale entry
    delete map[principalStr];
    saveStatus(map);
    return false;
  }
  return entry.isLive;
}

export function setLiveStatusStatic(
  principalStr: string,
  isLive: boolean,
): void {
  const map = loadStatus();
  map[principalStr] = { isLive, ts: Date.now() };
  saveStatus(map);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLiveStatus() {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString() ?? "";

  const setMyLiveStatus = useCallback(
    (isLive: boolean) => {
      if (!myPrincipal) return;
      setLiveStatusStatic(myPrincipal, isLive);
    },
    [myPrincipal],
  );

  const getLiveStatus = useCallback((principalStr: string): boolean => {
    return getLiveStatusStatic(principalStr);
  }, []);

  const setLiveStatus = useCallback((principalStr: string, isLive: boolean) => {
    setLiveStatusStatic(principalStr, isLive);
  }, []);

  return {
    myPrincipal,
    setMyLiveStatus,
    getLiveStatus,
    setLiveStatus,
  };
}
