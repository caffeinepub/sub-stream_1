export interface MockVideo {
  id: string;
  username: string;
  caption: string;
  hashtags: string[];
  music: string;
  likes: number;
  comments: number;
  shares: number;
  isLive: boolean;
  avatarUrl: string;
  videoUrl: string;
  gradientFrom: string;
  gradientTo: string;
}

export const mockVideos: MockVideo[] = [
  {
    id: "1",
    username: "aurora_vibes",
    caption: "Golden hour in Santorini was absolutely unreal 🌅",
    hashtags: ["#travel", "#santorini", "#goldenhour", "#wanderlust"],
    music: "Golden — Harry Styles",
    likes: 284300,
    comments: 4821,
    shares: 12400,
    isLive: false,
    avatarUrl: "https://i.pravatar.cc/150?img=1",
    videoUrl: "",
    gradientFrom: "from-orange-900",
    gradientTo: "to-rose-950",
  },
  {
    id: "2",
    username: "neon_pulse_dj",
    caption: "Drop at midnight 🎧 who's tuning in?",
    hashtags: ["#edm", "#music", "#nightlife", "#rave"],
    music: "Original Sound — neon_pulse_dj",
    likes: 512000,
    comments: 9340,
    shares: 31200,
    isLive: true,
    avatarUrl: "https://i.pravatar.cc/150?img=2",
    videoUrl: "",
    gradientFrom: "from-violet-950",
    gradientTo: "to-cyan-900",
  },
  {
    id: "3",
    username: "chef_marco_real",
    caption: "The creamiest carbonara you'll ever make at home 🍝",
    hashtags: ["#foodtok", "#pasta", "#carbonara", "#italianfood"],
    music: "O Sole Mio — Traditional",
    likes: 97800,
    comments: 2210,
    shares: 8750,
    isLive: false,
    avatarUrl: "https://i.pravatar.cc/150?img=3",
    videoUrl: "",
    gradientFrom: "from-amber-900",
    gradientTo: "to-stone-950",
  },
  {
    id: "4",
    username: "skate_or_die_99",
    caption: "New park just dropped and I ate concrete 5 times to get this 😭",
    hashtags: ["#skateboarding", "#skatepark", "#tricks", "#fail"],
    music: "All I Want — Kodaline",
    likes: 763000,
    comments: 18900,
    shares: 54200,
    isLive: false,
    avatarUrl: "https://i.pravatar.cc/150?img=4",
    videoUrl: "",
    gradientFrom: "from-slate-800",
    gradientTo: "to-zinc-950",
  },
  {
    id: "5",
    username: "luna_aesthetics",
    caption: "Soft girl autumn is not a phase 🍂✨",
    hashtags: ["#aesthetic", "#softgirl", "#autumn", "#fashion"],
    music: "Ivy — Frank Ocean",
    likes: 1200000,
    comments: 27600,
    shares: 89100,
    isLive: true,
    avatarUrl: "https://i.pravatar.cc/150?img=5",
    videoUrl: "",
    gradientFrom: "from-pink-950",
    gradientTo: "to-purple-950",
  },
  {
    id: "6",
    username: "cosmo_trek",
    caption: "Shot this on my phone at 3am because insomnia hits different 🌌",
    hashtags: ["#astrophotography", "#space", "#stars", "#nightsky"],
    music: "Clair de Lune — Debussy",
    likes: 441000,
    comments: 8320,
    shares: 22700,
    isLive: false,
    avatarUrl: "https://i.pravatar.cc/150?img=6",
    videoUrl: "",
    gradientFrom: "from-indigo-950",
    gradientTo: "to-blue-950",
  },
];
