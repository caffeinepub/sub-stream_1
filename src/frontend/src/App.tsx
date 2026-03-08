import { Toaster } from "@/components/ui/sonner";
import { Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { BottomNav, type BottomNavScreen } from "./components/BottomNav";
import { CreateMenu } from "./components/CreateMenu";
import { TopNav } from "./components/TopNav";
import { VideoFeed } from "./components/VideoFeed";
import { AuthProvider, useAuth } from "./context/AuthContext";
import type { LiveStream } from "./data/liveStreams";
import { CreateFlowPage } from "./pages/CreateFlowPage";
import { GoLiveSetupPage } from "./pages/GoLiveSetupPage";
import { InboxPage } from "./pages/InboxPage";
import { LiveDiscoveryPage } from "./pages/LiveDiscoveryPage";
import { LiveStreamViewPage } from "./pages/LiveStreamViewPage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { SearchPage } from "./pages/SearchPage";
import { SettingsPage } from "./pages/SettingsPage";
import { UserProfilePage } from "./pages/UserProfilePage";
import { UsernameSetupPage } from "./pages/UsernameSetupPage";
import { VideoUploadPage } from "./pages/VideoUploadPage";

type Screen =
  | "login"
  | "register"
  | "feed"
  | "friends"
  | "inbox"
  | "profile"
  | "settings"
  | "live"
  | "live-view"
  | "go-live-setup"
  | "upload-video"
  | "video-editor"
  | "create-flow"
  | "user-profile"
  | "search";

// ─── Loading Screen ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div
      data-ocid="auth.loading_state"
      className="fixed inset-0 flex flex-col items-center justify-center bg-black"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        className="flex flex-col items-center gap-4"
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #ff0050 0%, #ff6b35 100%)",
            boxShadow: "0 0 32px rgba(255,0,80,0.6)",
          }}
        >
          <Zap size={26} fill="white" stroke="none" />
        </div>
        <div
          className="text-xl font-bold tracking-tight"
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            background:
              "linear-gradient(135deg, #ff0050 0%, #ff6b35 60%, #fff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          SUB STREAM
        </div>
        {/* Pulsing dots */}
        <div className="flex items-center gap-1.5 mt-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#ff0050" }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1,
                delay: i * 0.2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Friends placeholder ───────────────────────────────────────────────────────
function FriendsScreen() {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-black">
      <span className="text-4xl mb-4">👥</span>
      <p className="text-white/50 text-base">Friends feed coming soon</p>
    </div>
  );
}

// ─── Main app shell (post-auth) ────────────────────────────────────────────────
function AppShell() {
  const {
    isAuthenticated,
    isInitializing,
    needsUsername,
    logout,
    userProfile,
  } = useAuth();
  const [screen, setScreen] = useState<Screen>("feed");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [isHostStream, setIsHostStream] = useState(false);
  const [viewingProfilePrincipal, setViewingProfilePrincipal] = useState<
    string | null
  >(null);

  const handleJoinLiveFromProfile = (
    principalStr: string,
    displayName: string,
  ) => {
    const newStream: LiveStream = {
      id: principalStr,
      hostName: displayName,
      hostAvatar: "",
      title: `${displayName}'s Live Stream`,
      category: "Live",
      viewerCount: Math.floor(Math.random() * 3000) + 100,
      gradientFrom: "from-rose-900",
      gradientTo: "to-pink-900",
      isHost: false,
    };
    setSelectedStream(newStream);
    setIsHostStream(false);
    setScreen("live-view");
  };

  // Map bottom nav tabs to screens
  const _rawEffectiveScreen: Screen =
    screen === "login" || screen === "register" ? "feed" : screen;
  const bottomActive: BottomNavScreen =
    _rawEffectiveScreen === "profile" || _rawEffectiveScreen === "settings"
      ? "profile"
      : _rawEffectiveScreen === "friends"
        ? "friends"
        : _rawEffectiveScreen === "inbox"
          ? "inbox"
          : "feed";

  const handleBottomNav = (s: BottomNavScreen) => {
    if (s === "profile") {
      setScreen("profile");
    } else if (s === "friends") {
      setScreen("friends");
    } else if (s === "inbox") {
      setScreen("inbox");
    } else {
      setScreen("feed");
    }
  };

  const handleLogout = () => {
    logout();
    setScreen("login");
  };

  // While booting
  if (isInitializing) {
    return <LoadingScreen />;
  }

  // Username setup: authenticated but no username yet
  if (isAuthenticated && needsUsername) {
    return (
      <motion.div
        key="username-setup"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full min-h-screen"
      >
        <UsernameSetupPage onLogout={handleLogout} />
      </motion.div>
    );
  }

  // Auth screens — only show when NOT authenticated
  if (!isAuthenticated) {
    if (screen === "register") {
      return (
        <motion.div
          key="register"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          className="w-full min-h-screen"
        >
          <RegisterPage onGoToLogin={() => setScreen("login")} />
        </motion.div>
      );
    }

    return (
      <motion.div
        key="login"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full min-h-screen"
      >
        <LoginPage onGoToRegister={() => setScreen("register")} />
      </motion.div>
    );
  }

  const effectiveScreen: Screen =
    screen === "login" || screen === "register" ? "feed" : screen;

  return (
    <AnimatePresence mode="wait">
      {/* Create Flow (3-step: camera → editor → publish) */}
      {effectiveScreen === "create-flow" && (
        <motion.div
          key="create-flow"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50"
        >
          <CreateFlowPage
            onBack={() => setScreen("feed")}
            onDone={() => setScreen("feed")}
            onGoLive={() => setScreen("go-live-setup")}
          />
        </motion.div>
      )}

      {/* Upload Video page (legacy — kept for backward compat) */}
      {effectiveScreen === "upload-video" && (
        <motion.div
          key="upload-video"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50"
        >
          <VideoUploadPage
            onBack={() => setScreen("feed")}
            onUploaded={() => setScreen("feed")}
          />
        </motion.div>
      )}

      {/* User Profile page */}
      {effectiveScreen === "user-profile" && viewingProfilePrincipal && (
        <motion.div
          key="user-profile"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 60 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-40 overflow-y-auto"
          style={{ background: "#000" }}
        >
          <UserProfilePage
            principalStr={viewingProfilePrincipal}
            onBack={() => setScreen("feed")}
          />
        </motion.div>
      )}

      {/* Profile page */}
      {effectiveScreen === "profile" && (
        <motion.div
          key="profile"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 60 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-40 overflow-y-auto"
          style={{ background: "#000" }}
        >
          <ProfilePage
            onBack={() => setScreen("feed")}
            onSettings={() => setScreen("settings")}
          />
          <BottomNav
            activeScreen="profile"
            onOpenCreate={() => setCreateOpen(true)}
            onNavigate={handleBottomNav}
          />
        </motion.div>
      )}

      {/* Settings page */}
      {effectiveScreen === "settings" && (
        <motion.div
          key="settings"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 60 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-40"
          style={{ background: "#000" }}
        >
          <SettingsPage
            onBack={() => setScreen("profile")}
            onLogout={handleLogout}
          />
        </motion.div>
      )}

      {/* Friends screen */}
      {effectiveScreen === "friends" && (
        <motion.div
          key="friends"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-10"
        >
          <FriendsScreen />
          <TopNav />
          <BottomNav
            activeScreen="friends"
            onOpenCreate={() => setCreateOpen(true)}
            onNavigate={handleBottomNav}
          />
        </motion.div>
      )}

      {/* Inbox screen */}
      {effectiveScreen === "inbox" && (
        <motion.div
          key="inbox"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-10 overflow-y-auto"
        >
          <InboxPage onJoinLiveStream={handleJoinLiveFromProfile} />
          <BottomNav
            activeScreen="inbox"
            onOpenCreate={() => setCreateOpen(true)}
            onNavigate={handleBottomNav}
          />
        </motion.div>
      )}

      {/* Search page */}
      {effectiveScreen === "search" && (
        <motion.div
          key="search"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-30"
          style={{ background: "#000" }}
        >
          <SearchPage
            onBack={() => setScreen("feed")}
            onNavigateToProfile={(principalStr) => {
              setViewingProfilePrincipal(principalStr);
              setScreen("user-profile");
            }}
          />
        </motion.div>
      )}

      {/* Main feed */}
      {effectiveScreen === "feed" && (
        <motion.div
          key="feed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="relative w-full h-screen overflow-hidden bg-black"
        >
          <VideoFeed
            onOpenCreate={() => setCreateOpen(true)}
            onNavigateToProfile={(principalStr) => {
              setViewingProfilePrincipal(principalStr);
              setScreen("user-profile");
            }}
            onJoinLiveStream={handleJoinLiveFromProfile}
          />
          <TopNav
            onNavigate={(tab) => {
              if (tab === "LIVE") setScreen("live");
            }}
            onSearch={() => setScreen("search")}
            searchActive={screen === "search"}
          />
          <BottomNav
            activeScreen={bottomActive}
            onOpenCreate={() => setCreateOpen(true)}
            onNavigate={handleBottomNav}
          />
          <CreateMenu
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            onGoLive={() => setScreen("go-live-setup")}
            onUploadVideo={() => {
              setCreateOpen(false);
              setScreen("create-flow");
            }}
            onRecordShort={() => {
              setCreateOpen(false);
              setScreen("create-flow");
            }}
          />
        </motion.div>
      )}

      {/* Live Discovery page */}
      {effectiveScreen === "live" && (
        <motion.div
          key="live"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-20"
        >
          <LiveDiscoveryPage
            onOpenStream={(stream) => {
              setSelectedStream(stream);
              setScreen("live-view");
            }}
            onGoLive={() => setScreen("go-live-setup")}
          />
          <BottomNav
            activeScreen={bottomActive}
            onOpenCreate={() => setCreateOpen(true)}
            onNavigate={handleBottomNav}
          />
          <CreateMenu
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            onGoLive={() => setScreen("go-live-setup")}
            onUploadVideo={() => {
              setCreateOpen(false);
              setScreen("create-flow");
            }}
            onRecordShort={() => {
              setCreateOpen(false);
              setScreen("create-flow");
            }}
          />
        </motion.div>
      )}

      {/* Live stream view */}
      {effectiveScreen === "live-view" && selectedStream && (
        <motion.div
          key="live-view"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-40"
        >
          <LiveStreamViewPage
            stream={selectedStream}
            isHost={isHostStream}
            onBack={() => setScreen("live")}
            onEnd={() => {
              setIsHostStream(false);
              setScreen("live");
            }}
          />
        </motion.div>
      )}

      {/* Go Live setup page */}
      {effectiveScreen === "go-live-setup" && (
        <motion.div
          key="go-live-setup"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-40"
        >
          <GoLiveSetupPage
            onBack={() => setScreen("live")}
            onStartLive={(config) => {
              const newStream: LiveStream = {
                id: Date.now().toString(),
                hostName: userProfile?.name ?? "You",
                hostAvatar: "",
                title: config.title,
                category: config.category,
                viewerCount: 0,
                gradientFrom: "from-rose-900",
                gradientTo: "to-pink-900",
                isHost: true,
              };
              setSelectedStream(newStream);
              setIsHostStream(true);
              setScreen("live-view");
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <div className="relative w-full h-screen overflow-hidden bg-black">
        <AppShell />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "rgba(20,20,20,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "white",
              backdropFilter: "blur(12px)",
            },
          }}
        />
      </div>
    </AuthProvider>
  );
}
