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

export const mockLiveStreams: LiveStream[] = [
  {
    id: "ls-1",
    hostName: "NightOwlGamer",
    hostAvatar: "NG",
    title: "Late Night Valorant Ranked Grind 🎮",
    category: "Gaming",
    viewerCount: 4821,
    gradientFrom: "from-violet-950",
    gradientTo: "to-purple-800",
  },
  {
    id: "ls-2",
    hostName: "MelodyWaves",
    hostAvatar: "MW",
    title: "Acoustic Friday — taking song requests 🎸",
    category: "Music",
    viewerCount: 2310,
    gradientFrom: "from-pink-950",
    gradientTo: "to-rose-700",
  },
  {
    id: "ls-3",
    hostName: "UrbanTalks",
    hostAvatar: "UT",
    title: "Reacting to viral clips with the community 💬",
    category: "Chat",
    viewerCount: 1580,
    gradientFrom: "from-sky-950",
    gradientTo: "to-blue-800",
  },
  {
    id: "ls-4",
    hostName: "CosmicVibes",
    hostAvatar: "CV",
    title: "Morning Yoga + Meditation Flow 🧘",
    category: "Lifestyle",
    viewerCount: 938,
    gradientFrom: "from-emerald-950",
    gradientTo: "to-teal-700",
  },
  {
    id: "ls-5",
    hostName: "BeatDropKing",
    hostAvatar: "BK",
    title: "DJ Set LIVE — chill house mix 🎧",
    category: "Music",
    viewerCount: 7203,
    gradientFrom: "from-orange-950",
    gradientTo: "to-amber-700",
  },
  {
    id: "ls-6",
    hostName: "TechWithRay",
    hostAvatar: "TR",
    title: "Building an AI app from scratch — watch live 🤖",
    category: "Chat",
    viewerCount: 3147,
    gradientFrom: "from-cyan-950",
    gradientTo: "to-indigo-800",
  },
  {
    id: "ls-7",
    hostName: "ProApexPlayer",
    hostAvatar: "PA",
    title: "Apex Legends — Predator Push Season 20 🔥",
    category: "Gaming",
    viewerCount: 9550,
    gradientFrom: "from-red-950",
    gradientTo: "to-orange-800",
  },
  {
    id: "ls-8",
    hostName: "GlowUpDiaries",
    hostAvatar: "GD",
    title: "Get Ready With Me + Q&A 💄",
    category: "Lifestyle",
    viewerCount: 2890,
    gradientFrom: "from-fuchsia-950",
    gradientTo: "to-pink-800",
  },
];
