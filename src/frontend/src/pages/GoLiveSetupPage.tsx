import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Monitor,
  Radio,
  RefreshCw,
  Settings,
  Smartphone,
  Sparkles,
  SwitchCamera,
  Wand2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { setLiveStatusStatic } from "../hooks/useLiveStatus";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GoLiveConfig {
  title: string;
  category: string;
  chatEnabled: boolean;
  giftsEnabled: boolean;
  privacy: "public" | "followers" | "private";
  streamingMode: "camera" | "screen" | "gaming";
  stream?: MediaStream;
}

interface GoLiveSetupPageProps {
  onBack: () => void;
  onStartLive: (config: GoLiveConfig) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ["Gaming", "Music", "Chat", "Lifestyle", "Trending"];

const PRIVACY_OPTIONS = [
  { value: "public" as const, label: "Public", emoji: "🌍" },
  { value: "followers" as const, label: "Followers", emoji: "👥" },
  { value: "private" as const, label: "Private", emoji: "🔒" },
];

const STREAMING_MODES = [
  { value: "camera" as const, label: "Device Camera", icon: Camera },
  { value: "screen" as const, label: "Screen Share", icon: Monitor },
  { value: "gaming" as const, label: "Mobile Gaming", icon: Smartphone },
];

// ─── Phase type ────────────────────────────────────────────────────────────────

type Phase = "practice" | "setup" | "countdown";

// ─── Component ────────────────────────────────────────────────────────────────

export function GoLiveSetupPage({ onBack, onStartLive }: GoLiveSetupPageProps) {
  // ── Identity (for live status) ───────────────────────────────────────────────
  const { identity } = useInternetIdentity();

  // ── Phase state ─────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("practice");

  // ── Camera state ────────────────────────────────────────────────────────────
  const streamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [beautyOn, setBeautyOn] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [effectSheetOpen, setEffectSheetOpen] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [streamingMode, setStreamingMode] = useState<
    "camera" | "screen" | "gaming"
  >("camera");

  // ── Setup form state ─────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]!);
  const [privacy, setPrivacy] = useState<"public" | "followers" | "private">(
    "public",
  );
  const [chatEnabled, setChatEnabled] = useState(true);
  const [giftsEnabled, setGiftsEnabled] = useState(true);
  const [titleError, setTitleError] = useState("");

  // ── Countdown ────────────────────────────────────────────────────────────────
  const [countNum, setCountNum] = useState(5);

  // ── Live settings (toggles) ─────────────────────────────────────────────────
  const [allowGuestRequests, setAllowGuestRequests] = useState(true);
  const [allowViewerSuggestions, setAllowViewerSuggestions] = useState(true);
  const [notifyFriendsGoLive, setNotifyFriendsGoLive] = useState(true);
  const [notifySuggestedCreators, setNotifySuggestedCreators] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // Camera management
  // ─────────────────────────────────────────────────────────────────────────────

  const startCamera = useCallback(
    async (mode: "user" | "environment" = facingMode) => {
      setCameraLoading(true);
      setCameraError(false);
      // Stop any existing tracks
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
      }
      streamRef.current = null;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: true,
        });
        streamRef.current = stream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
        setCameraError(false);
      } catch {
        setCameraError(true);
      } finally {
        setCameraLoading(false);
      }
    },
    [facingMode],
  );

  const startScreenShare = useCallback(async () => {
    setCameraLoading(true);
    // Stop existing tracks
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
    }
    streamRef.current = null;

    try {
      if (!("getDisplayMedia" in navigator.mediaDevices)) {
        // Not supported — fall back to camera
        await startCamera();
        return;
      }
      const stream = await (
        navigator.mediaDevices as MediaDevices
      ).getDisplayMedia({
        video: true,
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      setCameraError(false);
    } catch {
      // User cancelled screen share — try camera fallback
      await startCamera();
    } finally {
      setCameraLoading(false);
    }
  }, [startCamera]);

  const switchCamera = useCallback(async () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    await startCamera(newMode);
  }, [facingMode, startCamera]);

  // Start camera on mount — only runs once (streamRef is stable)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once on mount
  useEffect(() => {
    void startCamera();
    return () => {
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
      }
      streamRef.current = null;
    };
  }, []);

  // Handle streaming mode change — startCamera / startScreenShare / facingMode are deps
  // biome-ignore lint/correctness/useExhaustiveDependencies: startCamera and startScreenShare are stable callbacks; facingMode is read inside them
  useEffect(() => {
    if (streamingMode === "screen") {
      void startScreenShare();
    } else {
      void startCamera(facingMode);
    }
  }, [streamingMode]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Countdown + start
  // ─────────────────────────────────────────────────────────────────────────────

  const handleStartLive = useCallback(() => {
    if (!title.trim()) {
      setTitleError("Please enter a title for your stream.");
      return;
    }
    setTitleError("");
    setPhase("countdown");
    setCountNum(5);

    let current = 5;
    const tick = setInterval(() => {
      current -= 1;
      if (current <= 0) {
        clearInterval(tick);
        // Mark the user as live
        const myPrincipal = identity?.getPrincipal().toString();
        if (myPrincipal) {
          setLiveStatusStatic(myPrincipal, true);
        }
        onStartLive({
          title: title.trim(),
          category,
          chatEnabled,
          giftsEnabled,
          privacy,
          streamingMode,
          stream: streamRef.current ?? undefined,
        });
      } else {
        setCountNum(current);
      }
    }, 1000);
  }, [
    title,
    category,
    chatEnabled,
    giftsEnabled,
    privacy,
    streamingMode,
    onStartLive,
    identity,
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const videoStyle: React.CSSProperties = {
    objectFit: "cover",
    width: "100%",
    height: "100%",
    transform: facingMode === "user" ? "scaleX(-1)" : "none",
    filter: beautyOn
      ? "blur(0.4px) brightness(1.06) saturate(1.08)"
      : undefined,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Phase: PRACTICE
  // ─────────────────────────────────────────────────────────────────────────────

  if (phase === "practice") {
    return (
      <div
        data-ocid="golive.practice_page"
        className="fixed inset-0 z-50 bg-black overflow-hidden"
      >
        {/* Full screen camera preview */}
        <div className="absolute inset-0">
          {!cameraError ? (
            <video
              ref={videoPreviewRef}
              autoPlay
              muted
              playsInline
              style={videoStyle}
              className="absolute inset-0"
            />
          ) : (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6"
              style={{
                background:
                  "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)",
              }}
            >
              <AlertCircle size={40} style={{ color: "#ff0050" }} />
              <p className="text-white text-base font-semibold text-center">
                Camera access required
              </p>
              <p className="text-white/50 text-sm text-center">
                Please allow camera access to start your live stream.
              </p>
              <button
                type="button"
                data-ocid="golive.retry_camera_button"
                onClick={() => void startCamera()}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold transition-all active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #ff0050, #ff6b35)",
                }}
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </div>
          )}

          {/* Dark gradient overlays for readability */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 25%, transparent 65%, rgba(0,0,0,0.8) 100%)",
            }}
          />
        </div>

        {/* Top camera controls */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-12 pb-4">
          {/* Back button */}
          <button
            type="button"
            data-ocid="golive.back_button"
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
            aria-label="Go back"
          >
            <ArrowLeft size={18} stroke="white" strokeWidth={2} />
          </button>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Flip camera */}
            <button
              type="button"
              data-ocid="golive.flip_camera_button"
              onClick={() => void switchCamera()}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
              aria-label="Flip camera"
            >
              <SwitchCamera size={18} stroke="white" strokeWidth={2} />
            </button>

            {/* Beauty/enhance */}
            <button
              type="button"
              data-ocid="golive.beauty_toggle"
              onClick={() => setBeautyOn((v) => !v)}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{
                background: beautyOn ? "rgba(255,0,80,0.4)" : "rgba(0,0,0,0.5)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: beautyOn
                  ? "1px solid rgba(255,0,80,0.6)"
                  : "1px solid rgba(255,255,255,0.15)",
              }}
              aria-label="Toggle beauty filter"
            >
              <Sparkles
                size={18}
                stroke={beautyOn ? "#ff6b6b" : "white"}
                strokeWidth={2}
              />
            </button>

            {/* Effects */}
            <button
              type="button"
              data-ocid="golive.effects_button"
              onClick={() => setEffectSheetOpen(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
              aria-label="Effects"
            >
              <Wand2 size={18} stroke="white" strokeWidth={2} />
            </button>

            {/* Settings */}
            <button
              type="button"
              data-ocid="golive.settings_button"
              onClick={() => setSettingsSheetOpen(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
              aria-label="Live settings"
            >
              <Settings size={18} stroke="white" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Loading indicator */}
        {cameraLoading && !cameraError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div
              className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white"
              style={{ animation: "spin 1s linear infinite" }}
            />
          </div>
        )}

        {/* Practice mode banner */}
        <div className="absolute bottom-36 left-0 right-0 z-10 flex items-center justify-center px-4">
          <div
            className="px-5 py-2.5 rounded-full text-white text-sm font-semibold text-center"
            style={{
              background: "rgba(255,0,80,0.25)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(255,0,80,0.4)",
            }}
          >
            🔴 Practice mode is only visible to you.
          </div>
        </div>

        {/* Bottom action buttons */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center gap-3 px-5 pb-10 pt-4">
          <button
            type="button"
            data-ocid="golive.practice_now_button"
            className="flex-1 py-4 rounded-2xl text-white font-bold text-base text-center transition-all active:scale-[0.98]"
            style={{
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            Practice Now
          </button>
          <button
            type="button"
            data-ocid="golive.go_live_button"
            onClick={() => setPhase("setup")}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #ff0050, #ff6b35)",
              boxShadow:
                "0 8px 32px rgba(255,0,80,0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            <Radio size={18} stroke="white" strokeWidth={2} />
            Go Live
          </button>
        </div>

        {/* ── Effects Sheet ── */}
        <AnimatePresence>
          {effectSheetOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-[70]"
                style={{ background: "rgba(0,0,0,0.6)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEffectSheetOpen(false)}
                role="presentation"
              />
              <motion.div
                data-ocid="golive.effects_sheet"
                className="fixed bottom-0 left-0 right-0 z-[80] rounded-t-3xl pb-10"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                style={{
                  background: "linear-gradient(to bottom, #1a1a1a, #111)",
                }}
              >
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 rounded-full bg-white/20" />
                </div>
                <div className="px-5 pb-3 border-b border-white/5">
                  <h3 className="text-white font-bold text-base">Effects</h3>
                  <p className="text-white/40 text-xs mt-0.5">
                    Enhance your live stream
                  </p>
                </div>
                <div className="flex items-center gap-3 px-5 pt-4 pb-2 overflow-x-auto no-scrollbar">
                  {[
                    { emoji: "✨", label: "Glitter" },
                    { emoji: "🌈", label: "Rainbow" },
                    { emoji: "🔥", label: "Fire" },
                    { emoji: "⭐", label: "Stars" },
                    { emoji: "💫", label: "Twirl" },
                    { emoji: "🌸", label: "Bloom" },
                  ].map((fx) => (
                    <button
                      key={fx.label}
                      type="button"
                      onClick={() => setEffectSheetOpen(false)}
                      className="flex flex-col items-center gap-1.5 flex-shrink-0 transition-all active:scale-90"
                    >
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        {fx.emoji}
                      </div>
                      <span className="text-white/60 text-[11px]">
                        {fx.label}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Live Settings Sheet ── */}
        <AnimatePresence>
          {settingsSheetOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-[70]"
                style={{ background: "rgba(0,0,0,0.6)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSettingsSheetOpen(false)}
                role="presentation"
              />
              <motion.div
                data-ocid="golive.settings_sheet"
                className="fixed bottom-0 left-0 right-0 z-[80] rounded-t-3xl pb-10"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                style={{
                  background: "linear-gradient(to bottom, #1a1a1a, #111)",
                }}
              >
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 rounded-full bg-white/20" />
                </div>
                <div className="px-5 pb-3 border-b border-white/5">
                  <h3 className="text-white font-bold text-base">
                    Live Settings
                  </h3>
                </div>
                <div className="px-5 pt-3 space-y-0 divide-y divide-white/5">
                  {[
                    {
                      label: "Allow Guest Requests",
                      desc: "Let creators request to join your stream",
                      value: allowGuestRequests,
                      onChange: setAllowGuestRequests,
                      id: "guest_requests",
                    },
                    {
                      label: "Allow Viewer Suggestions",
                      desc: "Accept topic suggestions from viewers",
                      value: allowViewerSuggestions,
                      onChange: setAllowViewerSuggestions,
                      id: "viewer_suggestions",
                    },
                    {
                      label: "Notify Friends",
                      desc: "Alert your friends when you go live",
                      value: notifyFriendsGoLive,
                      onChange: setNotifyFriendsGoLive,
                      id: "notify_friends",
                    },
                    {
                      label: "Notify Suggested Creators",
                      desc: "Alert suggested creators about your stream",
                      value: notifySuggestedCreators,
                      onChange: setNotifySuggestedCreators,
                      id: "notify_suggested",
                    },
                  ].map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-4"
                    >
                      <div>
                        <p className="text-white text-sm font-semibold">
                          {item.label}
                        </p>
                        <p className="text-white/40 text-xs mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                      <Switch
                        data-ocid={`golive.${item.id}_toggle`}
                        checked={item.value}
                        onCheckedChange={item.onChange}
                        className="data-[state=checked]:bg-[#ff0050]"
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Phase: SETUP form (camera still live)
  // ─────────────────────────────────────────────────────────────────────────────

  if (phase === "setup") {
    return (
      <div
        data-ocid="golive.setup_page"
        className="fixed inset-0 z-50 bg-black overflow-y-auto no-scrollbar"
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255,0,80,0.1) 0%, transparent 60%)",
          }}
        />

        {/* Header */}
        <div className="relative z-10 flex items-center gap-3 px-4 pt-12 pb-4">
          <button
            type="button"
            data-ocid="golive.back_to_practice_button"
            onClick={() => setPhase("practice")}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            aria-label="Back to practice"
          >
            <ArrowLeft size={18} stroke="white" strokeWidth={2} />
          </button>
          <h1
            className="text-white font-bold text-xl tracking-tight"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Live Setup
          </h1>
        </div>

        <div className="relative z-10 px-5 pb-12 space-y-5">
          {/* Camera preview (stays mounted — NEVER unmount) */}
          <div
            className="w-full rounded-2xl overflow-hidden relative"
            style={{
              aspectRatio: "9/16",
              maxHeight: "260px",
              background: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <video
              ref={videoPreviewRef}
              autoPlay
              muted
              playsInline
              style={videoStyle}
              className="absolute inset-0"
            />
            {/* LIVE watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span
                className="text-white/10 text-4xl font-black tracking-widest"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                PREVIEW
              </span>
            </div>
            {/* Camera switch in preview */}
            <button
              type="button"
              onClick={() => void switchCamera()}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(8px)",
              }}
              aria-label="Flip camera"
            >
              <SwitchCamera size={15} stroke="white" strokeWidth={2} />
            </button>
          </div>

          {/* Streaming mode selector */}
          <div className="space-y-2">
            <Label className="text-white/70 text-xs font-semibold tracking-wide uppercase">
              Streaming Mode
            </Label>
            <div className="flex gap-2">
              {STREAMING_MODES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  data-ocid={`golive.mode_${value}_button`}
                  onClick={() => setStreamingMode(value)}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all active:scale-95"
                  style={
                    streamingMode === value
                      ? { background: "#ff0050", color: "white" }
                      : {
                          background: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.5)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }
                  }
                >
                  <Icon size={18} strokeWidth={2} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Title input */}
          <div className="space-y-2">
            <Label className="text-white/70 text-xs font-semibold tracking-wide uppercase">
              Stream Title *
            </Label>
            <Input
              data-ocid="golive.title_input"
              type="text"
              placeholder="What are you streaming today?"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (e.target.value.trim()) setTitleError("");
              }}
              className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-[#ff0050] focus-visible:border-[#ff0050]/50"
              style={{ fontSize: "16px" }}
            />
            {titleError && (
              <p
                data-ocid="golive.title_error"
                className="text-[#ff4466] text-xs mt-1"
              >
                {titleError}
              </p>
            )}
          </div>

          {/* Category pills */}
          <div className="space-y-2">
            <Label className="text-white/70 text-xs font-semibold tracking-wide uppercase">
              Category
            </Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  data-ocid="golive.category_select"
                  onClick={() => setCategory(cat)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                  style={
                    category === cat
                      ? { background: "#ff0050", color: "white" }
                      : {
                          background: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.55)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy selector */}
          <div className="space-y-2">
            <Label className="text-white/70 text-xs font-semibold tracking-wide uppercase">
              Who can watch?
            </Label>
            <div className="flex gap-2">
              {PRIVACY_OPTIONS.map(({ value, label, emoji }) => (
                <button
                  key={value}
                  type="button"
                  data-ocid={`golive.privacy_${value}_button`}
                  onClick={() => setPrivacy(value)}
                  className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-semibold transition-all active:scale-95"
                  style={
                    privacy === value
                      ? { background: "#ff0050", color: "white" }
                      : {
                          background: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.5)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }
                  }
                >
                  <span className="text-base">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat / Gifts toggles */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
              <div>
                <p className="text-white text-sm font-semibold">Enable Chat</p>
                <p className="text-white/40 text-xs mt-0.5">
                  Allow viewers to send messages
                </p>
              </div>
              <Switch
                data-ocid="golive.chat_toggle"
                checked={chatEnabled}
                onCheckedChange={setChatEnabled}
                className="data-[state=checked]:bg-[#ff0050]"
              />
            </div>
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-white text-sm font-semibold">Enable Gifts</p>
                <p className="text-white/40 text-xs mt-0.5">
                  Let viewers send you animated gifts
                </p>
              </div>
              <Switch
                data-ocid="golive.gifts_toggle"
                checked={giftsEnabled}
                onCheckedChange={setGiftsEnabled}
                className="data-[state=checked]:bg-[#ff0050]"
              />
            </div>
          </div>

          {/* Start Live button */}
          <button
            type="button"
            data-ocid="golive.start_button"
            onClick={handleStartLive}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #ff0050, #ff6b35)",
              boxShadow:
                "0 8px 32px rgba(255,0,80,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            <Radio size={18} stroke="white" strokeWidth={2} />
            Start Live
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Phase: COUNTDOWN (camera preview stays mounted underneath)
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      data-ocid="golive.countdown_page"
      className="fixed inset-0 z-50 bg-black overflow-hidden"
    >
      {/* Camera still running behind countdown */}
      <video
        ref={videoPreviewRef}
        autoPlay
        muted
        playsInline
        style={{ ...videoStyle, position: "absolute", inset: 0 }}
      />

      {/* Countdown overlay */}
      <motion.div
        data-ocid="golive.countdown_panel"
        className="absolute inset-0 z-10 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="flex flex-col items-center gap-5">
          <p className="text-white/60 text-base font-medium tracking-widest uppercase">
            Going live in
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={countNum}
              initial={{ opacity: 0, scale: 0.4, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.4, y: -20 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="font-black leading-none"
              style={{
                fontSize: "120px",
                fontFamily: "'Bricolage Grotesque', sans-serif",
                background: "linear-gradient(135deg, #ff0050, #ff6b35)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 40px rgba(255,0,80,0.6))",
              }}
            >
              {countNum}
            </motion.div>
          </AnimatePresence>
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: "#ff0050",
                animation: "livePulse 1s ease-in-out infinite",
              }}
            />
            <p className="text-white/50 text-sm">Get ready!</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
