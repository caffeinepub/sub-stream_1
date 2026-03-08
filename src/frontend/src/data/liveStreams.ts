export interface LiveStream {
  id: string;
  hostName: string;
  hostAvatar: string; // initials-based — gradient fallback used in UI
  title: string;
  category: string;
  viewerCount: number;
  gradientFrom: string; // Tailwind class e.g. "from-purple-900"
  gradientTo: string; // e.g. "to-indigo-900"
  isHost?: boolean; // true when the current user started this stream
  // Extended fields for overlay layout
  hostPrincipal?: string;
  hostAvatarUrl?: string;
  cohosts?: Array<{ name: string; avatarUrl?: string }>;
  battleMode?: boolean;
  battleOpponentName?: string;
  likeCount?: number;
  giftCount?: number;
  startedAt?: number; // timestamp ms
}

export const CATEGORIES = [
  "All",
  "Gaming",
  "Music",
  "Chat",
  "Lifestyle",
  "Trending",
] as const;

export type LiveCategory = (typeof CATEGORIES)[number];

export const mockLiveStreams: LiveStream[] = [];
