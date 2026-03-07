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

// No mock videos — the feed will show an empty state until real content is uploaded
export const mockVideos: MockVideo[] = [];
