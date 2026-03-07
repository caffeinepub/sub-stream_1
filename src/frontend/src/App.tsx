import { useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { CreateMenu } from "./components/CreateMenu";
import { TopNav } from "./components/TopNav";
import { VideoFeed } from "./components/VideoFeed";
import { mockVideos } from "./data/mockVideos";

export default function App() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Fullscreen video feed — sits behind navs */}
      <VideoFeed videos={mockVideos} onOpenCreate={() => setCreateOpen(true)} />

      {/* Floating top navigation */}
      <TopNav />

      {/* Fixed bottom navigation */}
      <BottomNav onOpenCreate={() => setCreateOpen(true)} />

      {/* Create menu — controlled at App level so EmptyFeedState can also open it */}
      <CreateMenu open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
