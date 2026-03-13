import { Camera, Loader2, StopCircle, Upload, Video, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

interface StoryCreatorPageProps {
  onClose: () => void;
  onStoryPosted: () => void;
}

type StoryTab = "photo" | "video";
type VideoMode = "record" | "upload" | null;

const COMMON_EMOJIS = [
  "😀",
  "❤️",
  "🔥",
  "🎉",
  "✨",
  "🌟",
  "💫",
  "🎵",
  "🎶",
  "💕",
  "🌈",
  "🦋",
  "🎸",
  "🎤",
  "🏆",
  "👑",
  "💎",
  "🚀",
  "🌙",
  "⭐",
];

const MAX_VIDEO_SECONDS = 120;
// Increased to 400MB for story video uploads
const MAX_VIDEO_BYTES = 400 * 1024 * 1024;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Failed to read file"));
    };
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.readAsDataURL(file);
  });
}

export function StoryCreatorPage({
  onClose,
  onStoryPosted,
}: StoryCreatorPageProps) {
  const { actor } = useAuth();
  const [activeTab, setActiveTab] = useState<StoryTab>("photo");
  const [textOverlay, setTextOverlay] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoMode, setVideoMode] = useState<VideoMode>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isPosting, setIsPosting] = useState(false);

  // Store actual file/blob refs to avoid fetch(blobURL) failures
  const photoFileRef = useRef<File | null>(null);
  const videoFileRef = useRef<File | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordedBlobRef = useRef<Blob | null>(null);

  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function stopStream() {
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) track.stop();
      mediaStreamRef.current = null;
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP images are supported");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Image must be under 5MB");
      return;
    }
    photoFileRef.current = file;
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
    e.target.value = "";
  }

  function handleVideoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = [
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/x-m4v",
    ];
    if (!allowed.includes(file.type)) {
      toast.error("Only MP4, MOV, WEBM videos are supported");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error("Video must be under 400MB for story upload");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.onloadedmetadata = () => {
      if (vid.duration > MAX_VIDEO_SECONDS) {
        URL.revokeObjectURL(objectUrl);
        toast.error("Video must be under 2 minutes");
        return;
      }
      videoFileRef.current = file;
      setVideoPreview(objectUrl);
    };
    vid.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast.error("Could not read video file. Please try a different file.");
    };
    vid.src = objectUrl;
    e.target.value = "";
  }

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      mediaStreamRef.current = stream;
      if (cameraPreviewRef.current) {
        cameraPreviewRef.current.srcObject = stream;
        cameraPreviewRef.current.play().catch(() => {});
      }
    } catch {
      toast.error("Camera access denied");
      setVideoMode(null);
    }
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: stopStream is stable
  useEffect(() => {
    if (videoMode === "record") void startCamera();
    else stopStream();
  }, [videoMode, startCamera]);

  function startRecording() {
    if (!mediaStreamRef.current) return;
    chunksRef.current = [];
    recordedBlobRef.current = null;
    const recorder = new MediaRecorder(mediaStreamRef.current);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      recordedBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      setVideoPreview(url);
      stopStream();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    recorder.start(100);
    setIsRecording(true);
    setRecordSeconds(0);

    timerRef.current = setInterval(() => {
      setRecordSeconds((s) => {
        if (s + 1 >= MAX_VIDEO_SECONDS) stopRecording();
        return s + 1;
      });
    }, 1000);
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  }

  function addEmoji(emoji: string) {
    setTextOverlay((prev) => prev + emoji);
  }

  const hasMedia = activeTab === "photo" ? !!photoPreview : !!videoPreview;

  async function handlePost() {
    if (!actor) {
      toast.error("Not connected");
      return;
    }
    if (!hasMedia) {
      toast.error("Please select media first");
      return;
    }

    setIsPosting(true);
    try {
      let mediaUrl = "";
      const mediaType = activeTab;

      if (activeTab === "photo") {
        // Use stored File ref directly — no fetch(blobURL)
        const file = photoFileRef.current;
        if (!file) throw new Error("Photo file not found");
        mediaUrl = await fileToBase64(file);
      } else if (activeTab === "video") {
        if (recordedBlobRef.current) {
          // Recorded blob — convert directly
          mediaUrl = await fileToBase64(recordedBlobRef.current);
        } else {
          // Uploaded file — use stored File ref directly
          const file = videoFileRef.current;
          if (!file) throw new Error("Video file not found");
          mediaUrl = await fileToBase64(file);
        }
      }

      if (!mediaUrl) throw new Error("Failed to process media");

      await actor.addStory(mediaUrl, mediaType, textOverlay.trim());
      toast.success("Story posted!");
      onStoryPosted();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to post story";
      toast.error(msg);
    } finally {
      setIsPosting(false);
    }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: "#000" }}
    >
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handlePhotoChange}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
        className="hidden"
        onChange={handleVideoFileChange}
      />

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-12 pb-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          type="button"
          data-ocid="story_creator.cancel_button"
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.07)" }}
          aria-label="Cancel"
        >
          <X size={18} />
        </button>
        <h2
          className="text-white font-bold text-base"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          New Story
        </h2>
        <div className="w-9" />
      </div>

      {/* Tabs */}
      <div className="flex px-4 pt-3 gap-2">
        {(["photo", "video"] as StoryTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            data-ocid={`story_creator.${tab}_tab`}
            onClick={() => {
              setActiveTab(tab);
              setVideoMode(null);
              setVideoPreview(null);
              setPhotoPreview(null);
              photoFileRef.current = null;
              videoFileRef.current = null;
            }}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background:
                activeTab === tab
                  ? "linear-gradient(135deg, #ff0050, #ff6b35)"
                  : "rgba(255,255,255,0.07)",
              color: activeTab === tab ? "white" : "rgba(255,255,255,0.5)",
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-4">
        <AnimatePresence mode="wait">
          {activeTab === "photo" && (
            <motion.div
              key="photo-tab"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {photoPreview ? (
                <div className="relative rounded-2xl overflow-hidden aspect-[9/16] max-h-[55vh] w-full">
                  <img
                    src={photoPreview}
                    alt="Story preview"
                    className="w-full h-full object-cover"
                  />
                  {textOverlay && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-6">
                      <p
                        className="text-white text-2xl font-bold text-center leading-snug"
                        style={{
                          textShadow: "0 2px 16px rgba(0,0,0,0.9)",
                          fontFamily: "'Bricolage Grotesque', sans-serif",
                        }}
                      >
                        {textOverlay}
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview(null);
                      photoFileRef.current = null;
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.6)" }}
                    aria-label="Remove photo"
                  >
                    <X size={15} className="text-white" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  data-ocid="story_creator.upload_button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full aspect-video rounded-2xl flex flex-col items-center justify-center gap-3 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "2px dashed rgba(255,255,255,0.15)",
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #ff0050, #ff6b35)",
                    }}
                  >
                    <Upload size={24} className="text-white" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold text-sm">
                      Upload Photo
                    </p>
                    <p className="text-white/40 text-xs mt-1">
                      JPG, PNG, WEBP · max 5MB
                    </p>
                  </div>
                </button>
              )}
            </motion.div>
          )}

          {activeTab === "video" && (
            <motion.div
              key="video-tab"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {!videoMode && !videoPreview && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVideoMode("record")}
                    className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "2px dashed rgba(255,255,255,0.15)",
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, #ff0050, #ff6b35)",
                      }}
                    >
                      <Camera size={22} className="text-white" />
                    </div>
                    <span className="text-white/80 text-sm font-medium">
                      Record
                    </span>
                  </button>
                  <button
                    type="button"
                    data-ocid="story_creator.upload_button"
                    onClick={() => {
                      setVideoMode("upload");
                      setTimeout(() => videoInputRef.current?.click(), 50);
                    }}
                    className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "2px dashed rgba(255,255,255,0.15)",
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.1)" }}
                    >
                      <Video size={22} className="text-white" />
                    </div>
                    <span className="text-white/80 text-sm font-medium">
                      Upload
                    </span>
                    <span className="text-white/30 text-[10px]">
                      MP4 · MOV · max 400MB
                    </span>
                  </button>
                </div>
              )}

              {videoMode === "record" && !videoPreview && (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[55vh] w-full">
                    <video
                      ref={cameraPreviewRef}
                      muted
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    >
                      <track kind="captions" />
                    </video>
                    {isRecording && (
                      <div
                        className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full"
                        style={{ background: "rgba(255,0,80,0.85)" }}
                      >
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <span className="text-white text-xs font-bold">
                          {formatTime(recordSeconds)} / 2:00
                        </span>
                      </div>
                    )}
                    {textOverlay && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-6">
                        <p
                          className="text-white text-xl font-bold text-center"
                          style={{
                            textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                            fontFamily: "'Bricolage Grotesque', sans-serif",
                          }}
                        >
                          {textOverlay}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{
                          background: "#ff0050",
                          boxShadow: "0 0 24px rgba(255,0,80,0.5)",
                        }}
                        aria-label="Start recording"
                      >
                        <div className="w-6 h-6 rounded-full bg-white" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{
                          background: "#ff0050",
                          boxShadow: "0 0 24px rgba(255,0,80,0.5)",
                        }}
                        aria-label="Stop recording"
                      >
                        <StopCircle size={28} className="text-white" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setVideoMode(null);
                        stopStream();
                      }}
                      className="px-4 py-2 rounded-xl text-white/60 text-sm"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {videoPreview && (
                <div className="relative rounded-2xl overflow-hidden aspect-[9/16] max-h-[55vh] w-full">
                  <video
                    src={videoPreview}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  >
                    <track kind="captions" />
                  </video>
                  {textOverlay && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-6">
                      <p
                        className="text-white text-2xl font-bold text-center leading-snug"
                        style={{
                          textShadow: "0 2px 16px rgba(0,0,0,0.9)",
                          fontFamily: "'Bricolage Grotesque', sans-serif",
                        }}
                      >
                        {textOverlay}
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setVideoPreview(null);
                      setVideoMode(null);
                      recordedBlobRef.current = null;
                      videoFileRef.current = null;
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.6)" }}
                    aria-label="Remove video"
                  >
                    <X size={15} className="text-white" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text overlay */}
        <div className="space-y-2">
          <label
            htmlFor="story-text-overlay"
            className="block text-white/40 text-[10px] font-semibold tracking-widest uppercase"
          >
            Text Overlay
          </label>
          <input
            id="story-text-overlay"
            type="text"
            data-ocid="story_creator.text_input"
            value={textOverlay}
            onChange={(e) => setTextOverlay(e.target.value)}
            placeholder="Add text to your story…"
            maxLength={120}
            className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              caretColor: "#ff0050",
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          />
        </div>

        {/* Emoji picker */}
        <div className="space-y-2">
          <p className="text-white/40 text-[10px] font-semibold tracking-widest uppercase">
            Emojis
          </p>
          <div className="grid grid-cols-10 gap-1">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="w-full aspect-square flex items-center justify-center rounded-lg text-lg transition-all active:scale-90"
                style={{ background: "rgba(255,255,255,0.05)" }}
                aria-label={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Post button */}
      <div
        className="px-4 pb-8 pt-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          type="button"
          data-ocid="story_creator.post_button"
          onClick={() => void handlePost()}
          disabled={isPosting || !hasMedia}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-base transition-all disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #ff0050, #ff6b35)",
            color: "white",
            fontFamily: "'Bricolage Grotesque', sans-serif",
            boxShadow: hasMedia ? "0 0 32px rgba(255,0,80,0.35)" : "none",
          }}
        >
          {isPosting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Posting…
            </>
          ) : (
            "Post Story"
          )}
        </button>
      </div>
    </motion.div>
  );
}
