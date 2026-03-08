/**
 * useFollowSystem
 *
 * localStorage-backed hook for block management and follow timestamps.
 * Block records are stored per authenticated principal.
 * Follow timestamps are stored globally in a flat map.
 */

import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useInternetIdentity } from "./useInternetIdentity";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BlockRecord {
  blockerPrincipal: string;
  blockedPrincipal: string;
  blockedDisplayName: string;
  createdAt: number;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const FOLLOW_TIMESTAMPS_KEY = "substream_follow_timestamps";

function getTimestampMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(FOLLOW_TIMESTAMPS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

function saveTimestampMap(map: Record<string, number>): void {
  try {
    localStorage.setItem(FOLLOW_TIMESTAMPS_KEY, JSON.stringify(map));
  } catch {
    // silent
  }
}

function timestampKey(
  followerPrincipal: string,
  followedPrincipal: string,
): string {
  return `${followerPrincipal}:${followedPrincipal}`;
}

function getBlocksKey(myPrincipal: string): string {
  return `substream_blocks_${myPrincipal}`;
}

function loadBlocks(myPrincipal: string): BlockRecord[] {
  try {
    const raw = localStorage.getItem(getBlocksKey(myPrincipal));
    if (!raw) return [];
    return JSON.parse(raw) as BlockRecord[];
  } catch {
    return [];
  }
}

function saveBlocks(myPrincipal: string, blocks: BlockRecord[]): void {
  try {
    localStorage.setItem(getBlocksKey(myPrincipal), JSON.stringify(blocks));
  } catch {
    // silent
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFollowSystem() {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString() ?? "";

  // ── Block operations ────────────────────────────────────────────────────────

  const blockUser = useCallback(
    (principalStr: string, displayName: string) => {
      if (!myPrincipal) return;
      const blocks = loadBlocks(myPrincipal);
      // Avoid duplicate blocks
      if (blocks.some((b) => b.blockedPrincipal === principalStr)) return;

      const newRecord: BlockRecord = {
        blockerPrincipal: myPrincipal,
        blockedPrincipal: principalStr,
        blockedDisplayName: displayName,
        createdAt: Date.now(),
      };
      saveBlocks(myPrincipal, [...blocks, newRecord]);

      // Also remove follow relationship timestamps
      removeFollowTimestamp(myPrincipal, principalStr);
      removeFollowTimestamp(principalStr, myPrincipal);
    },
    [myPrincipal],
  );

  const unblockUser = useCallback(
    (principalStr: string) => {
      if (!myPrincipal) return;
      const blocks = loadBlocks(myPrincipal);
      saveBlocks(
        myPrincipal,
        blocks.filter((b) => b.blockedPrincipal !== principalStr),
      );
    },
    [myPrincipal],
  );

  const getBlockedUsers = useCallback((): BlockRecord[] => {
    if (!myPrincipal) return [];
    return loadBlocks(myPrincipal);
  }, [myPrincipal]);

  const isBlockedByMe = useCallback(
    (principalStr: string): boolean => {
      if (!myPrincipal) return false;
      return loadBlocks(myPrincipal).some(
        (b) => b.blockedPrincipal === principalStr,
      );
    },
    [myPrincipal],
  );

  /**
   * Check if another user has blocked ME — stored under their principal key.
   * We detect this by checking if my principal is in their block list.
   * In practice this is best-effort: we can only read their block list if
   * it's stored locally (e.g. when they're on the same device). A real
   * backend implementation would be authoritative here.
   */
  const isBlockedByThem = useCallback(
    (theirPrincipal: string): boolean => {
      if (!myPrincipal) return false;
      const theirBlocks = loadBlocks(theirPrincipal);
      return theirBlocks.some((b) => b.blockedPrincipal === myPrincipal);
    },
    [myPrincipal],
  );

  // ── Follow timestamps ───────────────────────────────────────────────────────

  const recordFollowTimestamp = useCallback(
    (followerPrincipal: string, followedPrincipal: string) => {
      const map = getTimestampMap();
      const key = timestampKey(followerPrincipal, followedPrincipal);
      map[key] = Date.now();
      saveTimestampMap(map);
    },
    [],
  );

  const removeFollowTimestamp = useCallback(
    (followerPrincipal: string, followedPrincipal: string) => {
      const map = getTimestampMap();
      delete map[timestampKey(followerPrincipal, followedPrincipal)];
      saveTimestampMap(map);
    },
    [],
  );

  const getFollowTimestamp = useCallback(
    (followerPrincipal: string, followedPrincipal: string): number | null => {
      const map = getTimestampMap();
      const ts = map[timestampKey(followerPrincipal, followedPrincipal)];
      return ts ?? null;
    },
    [],
  );

  return {
    myPrincipal,
    blockUser,
    unblockUser,
    getBlockedUsers,
    isBlockedByMe,
    isBlockedByThem,
    recordFollowTimestamp,
    removeFollowTimestamp,
    getFollowTimestamp,
  };
}

// Standalone helper — usable outside hook context
export function removeFollowTimestamp(
  followerPrincipal: string,
  followedPrincipal: string,
): void {
  const map = getTimestampMap();
  delete map[timestampKey(followerPrincipal, followedPrincipal)];
  saveTimestampMap(map);
}

export function recordFollowTimestampStatic(
  followerPrincipal: string,
  followedPrincipal: string,
): void {
  const map = getTimestampMap();
  const key = timestampKey(followerPrincipal, followedPrincipal);
  if (!map[key]) {
    // Only record first follow time
    map[key] = Date.now();
    saveTimestampMap(map);
  }
}

export function getFollowTimestampStatic(
  followerPrincipal: string,
  followedPrincipal: string,
): number | null {
  const map = getTimestampMap();
  return map[timestampKey(followerPrincipal, followedPrincipal)] ?? null;
}
