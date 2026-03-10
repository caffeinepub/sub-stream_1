/**
 * SUB STREAM Viral Recommendation Engine
 *
 * Purely frontend — uses localStorage for user interest profiles.
 * Implements staged distribution, engagement scoring, and personalised feeds.
 */

import type { Video } from "../backend.d";

// ─── Weights ──────────────────────────────────────────────────────────────────

const WEIGHTS = {
  likeCount: 3,
  commentCount: 4,
  shareCount: 6,
  viewCount: 0.5,
} as const;

// Engagement event weights for interest profile updates
const INTEREST_WEIGHTS = {
  watch: 2,
  like: 5,
  skip: -1,
} as const;

// Stage 1 boost so new videos get initial test-audience exposure
const STAGE_1_BOOST = 20;

// ─── Types ───────────────────────────────────────────────────────────────────

export type FeedMode = "forYou" | "following" | "explore";

/** Per-hashtag affinity score stored in localStorage */
export type UserInterestProfile = Record<string, number>;

/** Distribution stage derived from view count */
export type DistributionStage = 1 | 2 | 3 | 4;

// ─── Video Scoring ────────────────────────────────────────────────────────────

export function computeVideoScore(video: Video): number {
  const likes = Number(video.likeCount);
  const comments = Number(video.commentCount);
  const shares = Number(video.shareCount);
  const views = Number(video.viewCount);

  return (
    likes * WEIGHTS.likeCount +
    comments * WEIGHTS.commentCount +
    shares * WEIGHTS.shareCount +
    views * WEIGHTS.viewCount
  );
}

// ─── Distribution Stage ───────────────────────────────────────────────────────

export function getDistributionStage(video: Video): DistributionStage {
  const views = Number(video.viewCount);
  if (views < 50) return 1;
  if (views < 500) return 2;
  if (views < 5000) return 3;
  return 4;
}

// ─── User Interest Profile ────────────────────────────────────────────────────

function interestKey(principalText: string): string {
  return `substream_interests_${principalText}`;
}

export function getUserInterests(principalText: string): UserInterestProfile {
  try {
    const raw = localStorage.getItem(interestKey(principalText));
    if (!raw) return {};
    return JSON.parse(raw) as UserInterestProfile;
  } catch {
    return {};
  }
}

export function updateUserInterests(
  principalText: string,
  hashtags: string[],
  eventType: "watch" | "like" | "skip",
): void {
  if (hashtags.length === 0) return;
  const profile = getUserInterests(principalText);
  const delta = INTEREST_WEIGHTS[eventType];

  for (const tag of hashtags) {
    const normalised = tag.replace(/^#/, "").toLowerCase();
    const current = profile[normalised] ?? 0;
    // Clamp to [−50, 200] so stale interests naturally decay
    profile[normalised] = Math.max(-50, Math.min(200, current + delta));
  }

  try {
    localStorage.setItem(interestKey(principalText), JSON.stringify(profile));
  } catch {
    // silent — storage might be full
  }
}

// ─── Hashtag Affinity Boost ───────────────────────────────────────────────────

function hashtagAffinityBoost(
  video: Video,
  interests: UserInterestProfile,
): number {
  let boost = 0;
  for (const tag of video.hashtags) {
    const normalised = tag.replace(/^#/, "").toLowerCase();
    boost += interests[normalised] ?? 0;
  }
  return boost;
}

// ─── For You Feed ─────────────────────────────────────────────────────────────

/**
 * Rank all videos for the personalised "For You" feed.
 * Stage 1 videos receive a boost to reach initial test audiences.
 */
export function rankVideosForUser(
  videos: Video[],
  callerPrincipal: string,
): Video[] {
  const interests = getUserInterests(callerPrincipal);

  const scored = videos.map((v) => {
    const engagementScore = computeVideoScore(v);
    const affinityBoost = hashtagAffinityBoost(v, interests);
    const stage = getDistributionStage(v);
    // Stage 1 videos get extra boost to seed their test audience
    const stageBoost = stage === 1 ? STAGE_1_BOOST : 0;
    const finalRank = engagementScore + affinityBoost + stageBoost;
    return { video: v, finalRank };
  });

  scored.sort((a, b) => {
    // Primary: newest first by createdAt, fallback to finalRank
    const aTime = Number(a.video.createdAt ?? 0n);
    const bTime = Number(b.video.createdAt ?? 0n);
    if (bTime !== aTime) return bTime - aTime;
    return b.finalRank - a.finalRank;
  });
  return scored.slice(0, 20).map((s) => s.video);
}

// ─── Following Feed ───────────────────────────────────────────────────────────

/**
 * Filter to only followed creators, then sort by engagement score.
 */
export function rankFollowingFeed(
  videos: Video[],
  followingPrincipals: string[],
): Video[] {
  const followingSet = new Set(followingPrincipals);
  const filtered = videos.filter((v) => followingSet.has(v.creator.toString()));
  filtered.sort((a, b) => computeVideoScore(b) - computeVideoScore(a));
  return filtered;
}

// ─── Trending / Explore ───────────────────────────────────────────────────────

/**
 * Pure engagement score sort, no personalisation.
 */
export function getTrendingVideos(videos: Video[], limit: number): Video[] {
  const sorted = [...videos].sort(
    (a, b) => computeVideoScore(b) - computeVideoScore(a),
  );
  return sorted.slice(0, limit);
}

// ─── Live Signal types (localStorage-based) ───────────────────────────────────

export interface LiveSignal {
  streamId: string;
  hostId: string;
  hostName: string;
  title: string;
  category: string;
  viewerCount: number;
  giftCount: number;
  chatCount: number;
  isActive: boolean;
  startedAt: number;
}

const LIVE_SIGNALS_KEY = "substream_live_signals";

export function getLiveSignals(): LiveSignal[] {
  try {
    const raw = localStorage.getItem(LIVE_SIGNALS_KEY);
    if (!raw) return [];
    const signals = JSON.parse(raw) as LiveSignal[];
    // Expire streams older than 4 hours
    const cutoff = Date.now() - 4 * 60 * 60 * 1000;
    return signals.filter((s) => s.isActive && s.startedAt > cutoff);
  } catch {
    return [];
  }
}

export function writeLiveSignal(signal: LiveSignal): void {
  try {
    const existing = getLiveSignals();
    // Replace if same streamId exists
    const idx = existing.findIndex((s) => s.streamId === signal.streamId);
    if (idx >= 0) {
      existing[idx] = signal;
    } else {
      existing.push(signal);
    }
    localStorage.setItem(LIVE_SIGNALS_KEY, JSON.stringify(existing));
  } catch {
    // silent
  }
}

export function markLiveSignalInactive(streamId: string): void {
  try {
    const signals = getLiveSignals();
    const updated = signals.map((s) =>
      s.streamId === streamId ? { ...s, isActive: false } : s,
    );
    localStorage.setItem(LIVE_SIGNALS_KEY, JSON.stringify(updated));
  } catch {
    // silent
  }
}

/**
 * Composite live discovery score.
 * viewerCount × 3 + giftCount × 5 + chatCount × 2
 */
export function computeLiveScore(signal: LiveSignal): number {
  return signal.viewerCount * 3 + signal.giftCount * 5 + signal.chatCount * 2;
}

export function getRankedLiveSignals(): LiveSignal[] {
  const signals = getLiveSignals();
  return signals.sort((a, b) => computeLiveScore(b) - computeLiveScore(a));
}
