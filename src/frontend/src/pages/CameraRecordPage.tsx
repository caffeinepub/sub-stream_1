import {
  ArrowLeft,
  Camera,
  ChevronLeft,
  ChevronRight,
  FlipHorizontal,
  Gauge,
  ImageIcon,
  Music,
  RotateCcw,
  Sparkles,
  SunMedium,
  Timer,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type RecordMode = "10m" | "60s" | "15s" | "PHOTO" | "TEXT";
type SpeedOption = "0.3×" | "0.5×" | "1×" | "2×" | "3×";
type TimerOption = "Off" | "3s" | "10s";

interface CameraRecordPageProps {
  onBack: () => void;
  onMediaReady: (file: File) => void;
  onGoLive: () => void;
}

const MODES: RecordMode[] = ["10m", "60s", "15s", "PHOTO", "TEXT"];
const SPEEDS: SpeedOption[] = ["0.3×", "0.5×", "1×", "2×", "3×"];
const TIMER_OPTIONS: TimerOption[] = ["Off", "3s", "10s"];

const MODE_MAX_SECONDS: Record<RecordMode, number> = {
  "10m": 600,
  "60s": 60,
  "15s": 15,
  PHOTO: 0,
  TEXT: 0,
};

const FILTERS = [
  { label: "Normal", filter: "none" },
  { label: "Vivid", filter: "saturate(1.8) contrast(1.1)" },
  { label: "Muted", filter: "saturate(0.5) brightness(0.9)" },
  { label: "Warm", filter: "sepia(0.35) saturate(1.3)" },
  { label: "Cool", filter: "hue-rotate(20deg) saturate(0.85)" },
  { label: "B&W", filter: "grayscale(1) contrast(1.15)" },
  { label: "Drama", filter: "contrast(1.4) brightness(0.85)" },
  { label: "Fade", filter: "brightness(1.1) contrast(0.8) saturate(0.6)" },
];

// ─── Main component ───────────────────────────────────────────────────────────

export function CameraRecordPage({
  onBack,
  onMediaReady,
  onGoLive,
}: CameraRecordPageProps) {
  const [activeMode, setActiveMode] = useState<RecordMode>("60s");
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [selectedSpeed, setSelectedSpeed] = useState<SpeedOption>("1×");
  const [selectedTimer, setSelectedTimer] = useState<TimerOption>("Off");
  const [selectedFilter, setSelectedFilter] = useState(0);
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [showFilterStrip, setShowFilterStrip] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [flashOverlay, setFlashOverlay] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Camera setup ────────────────────────────────────────────────────────
  const startCamera = useCallback(async (facing: "user" | "environment") => {
    try {
      // Stop existing stream
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      toast.error("Camera access denied. Please grant camera permission.");
    }
  }, []);

  useEffect(() => {
    if (activeMode !== "TEXT" && activeMode !== "PHOTO") {
      void startCamera(facingMode);
    } else if (activeMode === "PHOTO") {
      void startCamera(facingMode);
    }
    return () => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
      }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [facingMode, activeMode, startCamera]);

  const handleFlipCamera = () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
  };

  // ── Recording flow ──────────────────────────────────────────────────────
  const doRecord = useCallback(() => {
    if (!streamRef.current) return;
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const file = new File([blob], `recording_${Date.now()}.webm`, {
        type: "video/webm",
      });
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setIsRecording(false);
      setRecordingTime(0);
      // Stop camera
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
      }
      onMediaReady(file);
    };
    recorder.start(200);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordingTime(0);

    const maxSecs = MODE_MAX_SECONDS[activeMode];
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime((t) => {
        const next = t + 1;
        if (maxSecs > 0 && next >= maxSecs) {
          mediaRecorderRef.current?.stop();
          if (recordingTimerRef.current)
            clearInterval(recordingTimerRef.current);
          return t;
        }
        return next;
      });
    }, 1000);
  }, [activeMode, onMediaReady]);

  const startWithTimer = useCallback(() => {
    const timerSecs =
      selectedTimer === "Off" ? 0 : selectedTimer === "3s" ? 3 : 10;
    if (timerSecs === 0) {
      doRecord();
      return;
    }
    setCountdown(timerSecs);
    let c = timerSecs;
    countdownTimerRef.current = setInterval(() => {
      c -= 1;
      if (c <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        setCountdown(null);
        doRecord();
      } else {
        setCountdown(c);
      }
    }, 1000);
  }, [selectedTimer, doRecord]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  }, []);

  const handleRecordButtonTap = () => {
    if (isRecording) {
      stopRecording();
    } else if (countdown === null) {
      startWithTimer();
    }
  };

  // ── Photo capture ───────────────────────────────────────────────────────
  const handlePhotoCapture = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror if front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `photo_${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      // Flash animation
      setFlashOverlay(true);
      setTimeout(() => setFlashOverlay(false), 250);
      // Stop camera
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
      }
      onMediaReady(file);
    }, "image/jpeg");
  }, [facingMode, onMediaReady]);

  // ── Gallery picker ──────────────────────────────────────────────────────
  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onMediaReady(file);
    e.target.value = "";
  };

  // ── Text post ───────────────────────────────────────────────────────────
  const handleTextDone = useCallback(() => {
    if (!textInput.trim()) return;
    const enc = new TextEncoder();
    const bytes = enc.encode(textInput);
    const file = new File([bytes], `text_${Date.now()}.txt`, {
      type: "text/plain",
    });
    onMediaReady(file);
  }, [textInput, onMediaReady]);

  // ── Recording time display ───────────────────────────────────────────────
  const displayTime = `${Math.floor(recordingTime / 60)
    .toString()
    .padStart(1, "0")}:${String(recordingTime % 60).padStart(2, "0")}`;

  const currentFilter = FILTERS[selectedFilter]?.filter ?? "none";
  const isMirrored = facingMode === "user";

  // ─── TEXT mode ───────────────────────────────────────────────────────────
  if (activeMode === "TEXT") {
    return (
      <div
        data-ocid="camera.page"
        className="fixed inset-0 z-50 flex flex-col"
        style={{ background: "#111" }}
      >
        <div
          className="flex items-center justify-between px-4 py-4 pt-12"
          style={{
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(12px)",
          }}
        >
          <button
            type="button"
            data-ocid="camera.back_button"
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.12)" }}
            aria-label="Back"
          >
            <X size={18} className="text-white" />
          </button>
          <span className="text-white font-bold text-base">Text Post</span>
          <div className="w-9" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <textarea
            data-ocid="camera.text_input"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Write something…"
            className="w-full rounded-2xl text-white text-xl font-medium leading-relaxed resize-none outline-none text-center"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              caretColor: "#ff0050",
              minHeight: 200,
              padding: "20px",
              fontSize: "18px",
            }}
            rows={5}
          />
        </div>

        <div className="px-6 pb-12">
          <button
            type="button"
            data-ocid="camera.text_done_button"
            onClick={handleTextDone}
            disabled={!textInput.trim()}
            className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
            }}
          >
            Create Post
          </button>
        </div>

        {/* Mode pills at bottom */}
        <div className="flex items-center justify-center gap-2 pb-8 overflow-x-auto px-4">
          {MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              data-ocid={`camera.mode_${mode.toLowerCase()}_tab`}
              onClick={() => setActiveMode(mode)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex-shrink-0"
              style={{
                color: activeMode === mode ? "#000" : "rgba(255,255,255,0.65)",
                background:
                  activeMode === mode ? "#fff" : "rgba(255,255,255,0.1)",
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Camera / recording mode ──────────────────────────────────────────────
  return (
    <div
      data-ocid="camera.page"
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: "#000" }}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        className="hidden"
        onChange={handleGalleryChange}
        aria-label="Select media from gallery"
      />

      {/* Flash overlay for photo capture */}
      <AnimatePresence>
        {flashOverlay && (
          <motion.div
            key="flash"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Camera preview — fills the screen */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform: isMirrored ? "scaleX(-1)" : "none",
            filter: currentFilter,
          }}
        />
      </div>

      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-12 pb-3"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)",
        }}
      >
        {/* Close */}
        <button
          type="button"
          data-ocid="camera.back_button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)" }}
          aria-label="Close"
        >
          <X size={18} className="text-white" />
        </button>

        {/* Add sound */}
        <button
          type="button"
          data-ocid="camera.add_sound_button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold"
          style={{
            background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <Music size={13} />
          Add sound
        </button>

        {/* Flash */}
        <button
          type="button"
          data-ocid="camera.flash_toggle"
          onClick={() => setFlashOn((v) => !v)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: flashOn ? "rgba(255,220,0,0.3)" : "rgba(0,0,0,0.45)",
          }}
          aria-label="Toggle flash"
        >
          <Zap
            size={18}
            className={flashOn ? "text-yellow-300" : "text-white"}
            fill={flashOn ? "currentColor" : "none"}
          />
        </button>
      </div>

      {/* Recording badge */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            key="rec-badge"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-[88px] left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(255,0,80,0.85)" }}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white text-sm font-bold">{displayTime}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Countdown overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0, scale: 1.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="absolute inset-0 flex items-center justify-center z-30"
          >
            <span
              className="font-bold text-white"
              style={{
                fontSize: 120,
                fontFamily: "'Bricolage Grotesque', sans-serif",
                textShadow: "0 0 60px rgba(255,0,80,0.9)",
              }}
            >
              {countdown}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right side vertical controls */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4">
        {[
          {
            icon: <FlipHorizontal size={22} className="text-white" />,
            label: "Flip",
            action: handleFlipCamera,
            ocid: "camera.flip_button",
          },
          {
            icon: (
              <Zap
                size={22}
                className={flashOn ? "text-yellow-300" : "text-white"}
                fill={flashOn ? "currentColor" : "none"}
              />
            ),
            label: "Flash",
            action: () => setFlashOn((v) => !v),
            ocid: "camera.flash_button",
          },
          {
            icon: <Gauge size={22} className="text-white" />,
            label: "Speed",
            action: () => {
              setShowSpeedPicker((v) => !v);
              setShowTimerPicker(false);
              setShowFilterStrip(false);
            },
            ocid: "camera.speed_button",
            active: showSpeedPicker,
          },
          {
            icon: <Timer size={22} className="text-white" />,
            label: selectedTimer === "Off" ? "Timer" : selectedTimer,
            action: () => {
              setShowTimerPicker((v) => !v);
              setShowSpeedPicker(false);
              setShowFilterStrip(false);
            },
            ocid: "camera.timer_button",
            active: showTimerPicker,
          },
          {
            icon: <SunMedium size={22} className="text-white" />,
            label: "Filters",
            action: () => {
              setShowFilterStrip((v) => !v);
              setShowSpeedPicker(false);
              setShowTimerPicker(false);
            },
            ocid: "camera.filters_button",
            active: showFilterStrip,
          },
          {
            icon: <Sparkles size={22} className="text-white" />,
            label: "Beauty",
            action: () => toast.info("Beauty mode coming soon"),
            ocid: "camera.beauty_button",
          },
        ].map(({ icon, label, action, ocid, active }) => (
          <button
            key={ocid}
            type="button"
            data-ocid={ocid}
            onClick={action}
            className="flex flex-col items-center gap-0.5"
            aria-label={label}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{
                background: active ? "rgba(255,0,80,0.35)" : "rgba(0,0,0,0.48)",
                border: active
                  ? "1.5px solid rgba(255,0,80,0.5)"
                  : "1.5px solid rgba(255,255,255,0.15)",
              }}
            >
              {icon}
            </div>
            <span
              className="text-white/70 font-medium"
              style={{ fontSize: 10 }}
            >
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Speed picker */}
      <AnimatePresence>
        {showSpeedPicker && (
          <motion.div
            key="speed"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="absolute right-20 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1 p-2 rounded-2xl"
            style={{
              background: "rgba(12,12,12,0.92)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSelectedSpeed(s);
                  setShowSpeedPicker(false);
                }}
                className="px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{
                  color: selectedSpeed === s ? "#ff0050" : "white",
                  background:
                    selectedSpeed === s ? "rgba(255,0,80,0.15)" : "transparent",
                }}
              >
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer picker */}
      <AnimatePresence>
        {showTimerPicker && (
          <motion.div
            key="timer"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="absolute right-20 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1 p-2 rounded-2xl"
            style={{
              background: "rgba(12,12,12,0.92)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {TIMER_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setSelectedTimer(t);
                  setShowTimerPicker(false);
                }}
                className="px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{
                  color: selectedTimer === t ? "#ff0050" : "white",
                  background:
                    selectedTimer === t ? "rgba(255,0,80,0.15)" : "transparent",
                }}
              >
                {t}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter strip */}
      <AnimatePresence>
        {showFilterStrip && (
          <motion.div
            key="filter-strip"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className="absolute bottom-36 left-0 right-0 z-20 px-4 py-3 flex gap-3 overflow-x-auto"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
              scrollbarWidth: "none",
            }}
          >
            {FILTERS.map((f, i) => (
              <button
                key={f.label}
                type="button"
                onClick={() => setSelectedFilter(i)}
                className="flex flex-col items-center gap-1 flex-shrink-0"
                aria-label={f.label}
              >
                <div
                  className="w-14 h-14 rounded-xl overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #ff0050, #7c3aed)",
                    filter: f.filter === "none" ? undefined : f.filter,
                    border:
                      selectedFilter === i
                        ? "2px solid #ff0050"
                        : "2px solid transparent",
                  }}
                />
                <span
                  className="text-xs font-medium"
                  style={{
                    color:
                      selectedFilter === i
                        ? "#ff0050"
                        : "rgba(255,255,255,0.55)",
                    fontSize: 10,
                  }}
                >
                  {f.label}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom area */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 flex flex-col"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
        }}
      >
        {/* Mode pills */}
        <div
          className="flex items-center justify-center gap-2 mb-4 overflow-x-auto px-6 pt-3"
          style={{ scrollbarWidth: "none" }}
        >
          {MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              data-ocid={`camera.mode_${mode.toLowerCase()}_tab`}
              onClick={() => {
                setActiveMode(mode);
                setIsRecording(false);
                if (countdownTimerRef.current)
                  clearInterval(countdownTimerRef.current);
                setCountdown(null);
              }}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex-shrink-0"
              style={{
                color: activeMode === mode ? "#000" : "rgba(255,255,255,0.7)",
                background:
                  activeMode === mode ? "#fff" : "rgba(255,255,255,0.1)",
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Main controls row */}
        <div className="flex items-center justify-around px-8 pb-8">
          {/* Gallery */}
          <button
            type="button"
            data-ocid="camera.gallery_upload_button"
            onClick={() => fileInputRef.current?.click()}
            className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "2px solid rgba(255,255,255,0.2)",
            }}
            aria-label="Upload from gallery"
          >
            <ImageIcon size={22} className="text-white" />
          </button>

          {/* Record / Shutter */}
          <div className="flex flex-col items-center">
            {activeMode === "PHOTO" ? (
              <motion.button
                type="button"
                data-ocid="camera.shutter_button"
                onClick={handlePhotoCapture}
                whileTap={{ scale: 0.92 }}
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
                style={{
                  background: "#fff",
                  border: "5px solid rgba(255,255,255,0.35)",
                  boxShadow: "0 0 0 2px rgba(0,0,0,0.5)",
                }}
                aria-label="Take photo"
              >
                <Camera size={28} style={{ color: "#000" }} />
              </motion.button>
            ) : (
              <motion.button
                type="button"
                data-ocid={
                  isRecording ? "camera.stop_button" : "camera.record_button"
                }
                onClick={handleRecordButtonTap}
                disabled={countdown !== null}
                whileTap={countdown === null ? { scale: 0.92 } : undefined}
                className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center"
                style={{
                  background: isRecording
                    ? "rgba(255,0,80,0.2)"
                    : "rgba(255,0,80,0.15)",
                  border: `5px solid ${isRecording ? "#ff0050" : "rgba(255,0,80,0.7)"}`,
                }}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
              >
                <AnimatePresence mode="wait">
                  {isRecording ? (
                    <motion.div
                      key="stop"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      className="w-7 h-7 rounded-md"
                      style={{ background: "#ff0050" }}
                    />
                  ) : (
                    <motion.div
                      key="rec"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      className="w-8 h-8 rounded-full"
                      style={{ background: "#ff0050" }}
                    />
                  )}
                </AnimatePresence>
                {isRecording && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-red-500"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{
                      duration: 1.2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </motion.button>
            )}
          </div>

          {/* POST / LIVE stack */}
          <div className="flex flex-col gap-2 items-center">
            <button
              type="button"
              data-ocid="camera.post_tab"
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-white"
              style={{ background: "rgba(255,255,255,0.15)" }}
              aria-label="Post mode"
            >
              POST
            </button>
            <button
              type="button"
              data-ocid="camera.live_button"
              onClick={onGoLive}
              className="px-4 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
                color: "white",
              }}
              aria-label="Go Live"
            >
              LIVE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
