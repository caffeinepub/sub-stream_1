import { Toaster } from "@/components/ui/sonner";
import { Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { BattleCountdown } from "./components/BattleCountdown";
import { BattleInviteNotification } from "./components/BattleInviteNotification";
import { BottomNav, type BottomNavScreen } from "./components/BottomNav";
import { CoHostInviteNotification } from "./components/CoHostInviteNotification";
import { CreateMenu } from "./components/CreateMenu";
import { LiveEndScreen, type LiveEndStats } from "./components/LiveEndScreen";
import { TopNav, type TopNavTab } from "./components/TopNav";
import { VideoFeed } from "./components/VideoFeed";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CoinWalletProvider } from "./context/CoinWalletContext";
import {
  NotificationsProvider,
  useNotifications,
} from "./context/NotificationsContext";
import { WalletProvider } from "./context/WalletContext";
import type { LiveStream } from "./data/liveStreams";
import { useBattleInvitePoller } from "./hooks/useBattleInvitePoller";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useLiveFollowedPoller } from "./hooks/useLiveFollowedPoller";
import { useLiveInvitePoller } from "./hooks/useLiveInvitePoller";
import { getLiveStatusStatic } from "./hooks/useLiveStatus";
import { AdminReviewPage } from "./pages/AdminReviewPage";
import { BlockedUsersPage } from "./pages/BlockedUsersPage";
import { CoinRechargePage } from "./pages/CoinRechargePage";
import { CreateFlowPage } from "./pages/CreateFlowPage";
import { CreatorEarningsPage } from "./pages/CreatorEarningsPage";
import { FollowersListPage } from "./pages/FollowersListPage";
import { FollowingListPage } from "./pages/FollowingListPage";
import { GoLiveSetupPage } from "./pages/GoLiveSetupPage";
import { InboxPage } from "./pages/InboxPage";
import { LiveDiscoveryPage } from "./pages/LiveDiscoveryPage";
import { LiveStreamViewPage } from "./pages/LiveStreamViewPage";
import { LoginPage } from "./pages/LoginPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { PaymentSettingsPage } from "./pages/PaymentSettingsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { SearchPage } from "./pages/SearchPage";
import { SettingsPage } from "./pages/SettingsPage";
import { UserProfilePage } from "./pages/UserProfilePage";
import { UsernameSetupPage } from "./pages/UsernameSetupPage";
import { VideoUploadPage } from "./pages/VideoUploadPage";
import { WalletPage } from "./pages/WalletPage";

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
  | "live-end"
  | "go-live-setup"
  | "upload-video"
  | "video-editor"
  | "create-flow"
  | "user-profile"
  | "search"
  | "coin-recharge"
  | "earnings"
  | "payment-settings"
  | "wallet"
  | "notifications"
  | "followers-list"
  | "following-list"
  | "blocked-users"
  | "admin";

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
    actor,
  } = useAuth();
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString() ?? "";
  const { unreadCount } = useNotifications();
  const [screen, setScreen] = useState<Screen>("feed");
  const [feedTab, setFeedTab] = useState<TopNavTab>("For You");
  const [, setCommentPanelOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [isHostStream, setIsHostStream] = useState(false);
  const [viewingProfilePrincipal, setViewingProfilePrincipal] = useState<
    string | null
  >(null);
  const [liveEndStats, setLiveEndStats] = useState<LiveEndStats | null>(null);
  const [isSavingReplay, setIsSavingReplay] = useState(false);
  const [liveMediaStream, setLiveMediaStream] = useState<MediaStream | null>(
    null,
  );
  const [pendingInvite, setPendingInvite] = useState<{
    fromName: string;
    fromPrincipal: string;
    streamId: string;
  } | null>(null);

  const [pendingBattleInvite, setPendingBattleInvite] = useState<{
    fromName: string;
    fromPrincipal: string;
    streamId: string;
  } | null>(null);

  // Battle countdown state
  const [showBattleCountdown, setShowBattleCountdown] = useState(false);
  const [pendingBattleStream, setPendingBattleStream] =
    useState<LiveStream | null>(null);

  // DM navigation: principalStr to open chat for
  const [dmOpenFor, setDmOpenFor] = useState<string | null>(null);

  // Track where payment-settings was opened from so back button is correct
  const [paymentSettingsOrigin, setPaymentSettingsOrigin] =
    useState<Screen>("settings");

  // State for followers/following list pages
  const [viewingListUserId, setViewingListUserId] = useState<string | null>(
    null,
  );
  const [viewingListDisplayName, setViewingListDisplayName] =
    useState<string>("");
  // Remember which profile page we came from for followers/following back navigation
  const [listOriginScreen, setListOriginScreen] =
    useState<Screen>("user-profile");

  const effectiveScreenForPoller: Screen =
    screen === "login" || screen === "register" ? "feed" : screen;

  // Poll followed creators' live status and send notifications
  useLiveFollowedPoller();

  // Poll for live co-host invites when not already in a stream
  useLiveInvitePoller({
    enabled: isAuthenticated && effectiveScreenForPoller !== "live-view",
    onInviteReceived: (invite) => {
      setPendingInvite({
        fromName: invite.fromName,
        fromPrincipal: invite.fromPrincipal,
        streamId: invite.streamId,
      });
    },
  });

  // Poll for battle invites — only show when recipient is currently live
  useBattleInvitePoller({
    enabled: isAuthenticated && effectiveScreenForPoller !== "live-view",
    isCurrentlyLive: myPrincipal !== "" && getLiveStatusStatic(myPrincipal),
    onInviteReceived: (invite) => {
      setPendingBattleInvite({
        fromName: invite.fromName,
        fromPrincipal: invite.fromPrincipal,
        streamId: invite.streamId,
      });
    },
  });

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
    <>
      {/* Co-host invite notification — always mounted, floats above everything */}
      <CoHostInviteNotification
        invite={pendingInvite}
        onAccept={(invite) => {
          setPendingInvite(null);
          const coHostStream: LiveStream = {
            id: invite.streamId,
            hostName: invite.fromName,
            hostAvatar: "",
            title: `${invite.fromName}'s Live Stream`,
            category: "Live",
            viewerCount: 0,
            gradientFrom: "from-purple-900",
            gradientTo: "to-indigo-900",
            isHost: false,
            hostPrincipal: invite.fromPrincipal,
          };
          setSelectedStream(coHostStream);
          setIsHostStream(false);
          setLiveMediaStream(null);
          setScreen("live-view");
        }}
        onDecline={() => setPendingInvite(null)}
      />

      {/* Battle invite notification — floats above co-host notification */}
      <BattleInviteNotification
        invite={pendingBattleInvite}
        onAccept={(invite) => {
          setPendingBattleInvite(null);
          const battleStream: LiveStream = {
            id: invite.streamId,
            hostName: invite.fromName,
            hostAvatar: "",
            title: `⚔️ Battle vs ${invite.fromName}`,
            category: "Live",
            viewerCount: 0,
            gradientFrom: "from-orange-900",
            gradientTo: "to-red-900",
            isHost: true,
            hostPrincipal: invite.fromPrincipal,
            battleMode: true,
            battleOpponentName: invite.fromName,
          };
          // Store the stream and show countdown before navigating
          setPendingBattleStream(battleStream);
          setShowBattleCountdown(true);
        }}
        onDecline={() => setPendingBattleInvite(null)}
      />

      {/* Battle countdown overlay — shown before switching to split-screen */}
      <AnimatePresence>
        {showBattleCountdown && (
          <BattleCountdown
            key="battle-countdown"
            onComplete={() => {
              setShowBattleCountdown(false);
              if (pendingBattleStream) {
                setSelectedStream(pendingBattleStream);
                setIsHostStream(true);
                setLiveMediaStream(null);
                setScreen("live-view");
                setPendingBattleStream(null);
              }
            }}
          />
        )}
      </AnimatePresence>

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
              onOpenDM={(principalStr) => {
                setDmOpenFor(principalStr);
                setScreen("inbox");
              }}
              onNavigateToProfile={(pStr) => {
                setViewingProfilePrincipal(pStr);
                setScreen("user-profile");
              }}
              onOpenFollowers={(userId, displayName) => {
                setViewingListUserId(userId);
                setViewingListDisplayName(displayName);
                setListOriginScreen("user-profile");
                setScreen("followers-list");
              }}
              onOpenFollowing={(userId, displayName) => {
                setViewingListUserId(userId);
                setViewingListDisplayName(displayName);
                setListOriginScreen("user-profile");
                setScreen("following-list");
              }}
              onJoinLiveStream={handleJoinLiveFromProfile}
            />
          </motion.div>
        )}

        {/* Followers list page */}
        {effectiveScreen === "followers-list" && viewingListUserId && (
          <motion.div
            key="followers-list"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ background: "#000" }}
          >
            <FollowersListPage
              userId={viewingListUserId}
              displayName={viewingListDisplayName}
              onBack={() => setScreen(listOriginScreen)}
              onNavigateToProfile={(pStr) => {
                setViewingProfilePrincipal(pStr);
                setScreen("user-profile");
              }}
            />
          </motion.div>
        )}

        {/* Following list page */}
        {effectiveScreen === "following-list" && viewingListUserId && (
          <motion.div
            key="following-list"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ background: "#000" }}
          >
            <FollowingListPage
              userId={viewingListUserId}
              displayName={viewingListDisplayName}
              onBack={() => setScreen(listOriginScreen)}
              onNavigateToProfile={(pStr) => {
                setViewingProfilePrincipal(pStr);
                setScreen("user-profile");
              }}
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
              onOpenEarnings={() => setScreen("earnings")}
              onOpenPaymentSettings={() => {
                setPaymentSettingsOrigin("profile");
                setScreen("payment-settings");
              }}
              onOpenWallet={() => setScreen("wallet")}
            />
            <BottomNav
              activeScreen="profile"
              onOpenCreate={() => setCreateOpen(true)}
              onNavigate={handleBottomNav}
              hidden={false}
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
              onOpenCreatorPayments={() => {
                setPaymentSettingsOrigin("settings");
                setScreen("payment-settings");
              }}
              onOpenBlockedUsers={() => setScreen("blocked-users")}
              onOpenAdmin={() => setScreen("admin")}
            />
          </motion.div>
        )}

        {/* Blocked Users page */}
        {effectiveScreen === "blocked-users" && (
          <motion.div
            key="blocked-users"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ background: "#000" }}
          >
            <BlockedUsersPage onBack={() => setScreen("settings")} />
          </motion.div>
        )}

        {/* Admin Review page */}
        {effectiveScreen === "admin" && (
          <motion.div
            key="admin"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ background: "#000" }}
          >
            <AdminReviewPage onBack={() => setScreen("settings")} />
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
              hidden={false}
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
            <InboxPage
              onJoinLiveStream={handleJoinLiveFromProfile}
              openChatFor={dmOpenFor ?? undefined}
            />
            <BottomNav
              activeScreen="inbox"
              onOpenCreate={() => setCreateOpen(true)}
              onNavigate={handleBottomNav}
              hidden={false}
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
              feedTab={feedTab}
              onCommentPanelChange={setCommentPanelOpen}
            />
            <TopNav
              onNavigate={(tab) => {
                if (tab === "LIVE") setScreen("live");
              }}
              onTabChange={(tab) => {
                if (tab === "LIVE") {
                  setScreen("live");
                } else {
                  setFeedTab(tab);
                }
              }}
              activeTab={feedTab}
              onSearch={() => setScreen("search")}
              searchActive={screen === "search"}
              onNotifications={() => setScreen("notifications")}
              notificationCount={unreadCount}
            />
            <BottomNav
              activeScreen={bottomActive}
              onOpenCreate={() => setCreateOpen(true)}
              onNavigate={handleBottomNav}
              hidden={false}
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
              hidden={false}
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
              mediaStream={liveMediaStream ?? undefined}
              onBack={() => {
                setLiveMediaStream(null);
                setScreen("live");
              }}
              onOpenRecharge={() => setScreen("coin-recharge")}
              onEnd={(stats) => {
                if (isHostStream) {
                  setLiveEndStats({
                    totalViewers: stats.totalViewers,
                    totalLikes: stats.totalLikes,
                    totalGifts: stats.totalGifts,
                    durationMs: Date.now() - stats.startedAt,
                  });
                  setScreen("live-end");
                } else {
                  setIsHostStream(false);
                  setLiveMediaStream(null);
                  setScreen("live");
                }
              }}
            />
          </motion.div>
        )}

        {/* Live end summary screen */}
        {effectiveScreen === "live-end" && liveEndStats && (
          <motion.div
            key="live-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50"
          >
            <LiveEndScreen
              stats={liveEndStats}
              isSaving={isSavingReplay}
              onSave={async () => {
                setIsSavingReplay(true);
                if (actor && selectedStream) {
                  try {
                    await actor.addVideo(
                      `Live: ${selectedStream.title}`,
                      `Live stream recording — ${new Date().toLocaleDateString()}`,
                      "",
                      "",
                      ["#live", "#stream"],
                      "public",
                    );
                  } catch {
                    // silent
                  }
                }
                setIsSavingReplay(false);
                setIsHostStream(false);
                setLiveMediaStream(null);
                setLiveEndStats(null);
                setScreen("live");
              }}
              onDelete={() => {
                setIsHostStream(false);
                setLiveMediaStream(null);
                setLiveEndStats(null);
                setScreen("live");
              }}
            />
          </motion.div>
        )}

        {/* Coin Recharge page */}
        {effectiveScreen === "coin-recharge" && (
          <motion.div
            key="coin-recharge"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50"
          >
            <CoinRechargePage onBack={() => setScreen("feed")} />
          </motion.div>
        )}

        {/* Creator Earnings page */}
        {effectiveScreen === "earnings" && (
          <motion.div
            key="earnings"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 overflow-y-auto"
            style={{ background: "#000" }}
          >
            <CreatorEarningsPage
              onBack={() => setScreen("profile")}
              onOpenPaymentSettings={() => {
                setPaymentSettingsOrigin("earnings");
                setScreen("payment-settings");
              }}
            />
          </motion.div>
        )}

        {/* Payment Settings page */}
        {effectiveScreen === "payment-settings" && (
          <motion.div
            key="payment-settings"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 overflow-y-auto"
            style={{ background: "#000" }}
          >
            <PaymentSettingsPage
              onBack={() => setScreen(paymentSettingsOrigin)}
            />
          </motion.div>
        )}

        {/* Wallet page */}
        {effectiveScreen === "wallet" && (
          <motion.div
            key="wallet"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 overflow-y-auto"
            style={{ background: "#000" }}
          >
            <WalletPage onBack={() => setScreen("profile")} />
          </motion.div>
        )}

        {/* Notifications page */}
        {effectiveScreen === "notifications" && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 overflow-y-auto"
            style={{ background: "#000" }}
          >
            <NotificationsPage
              onBack={() => setScreen("feed")}
              onNavigateToProfile={(pStr) => {
                setViewingProfilePrincipal(pStr);
                setScreen("user-profile");
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
                // Store the real camera/screen stream
                setLiveMediaStream(config.stream ?? null);
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
    </>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <CoinWalletProvider>
        <NotificationsProvider>
          <WalletProvider>
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
          </WalletProvider>
        </NotificationsProvider>
      </CoinWalletProvider>
    </AuthProvider>
  );
}
