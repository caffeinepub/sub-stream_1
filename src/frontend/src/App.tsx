import { BottomNav } from "./components/BottomNav";
import { TopNav } from "./components/TopNav";
import { VideoFeed } from "./components/VideoFeed";

export default function App() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Fullscreen video feed — sits behind navs */}
      <VideoFeed />

      {/* Floating top navigation */}
      <TopNav />

      {/* Fixed bottom navigation */}
      <BottomNav />
    </div>
  );
}
