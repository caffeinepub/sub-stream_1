import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Hash,
  ImageIcon,
  Loader2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import { useAuth } from "../context/AuthContext";

interface VideoUploadPageProps {
  onBack: () => void;
  onUploaded: () => void;
}

// ─── Editing data shared with VideoEditorPage ─────────────────────────────────

interface FontOption {
  label: string;
  style: React.CSSProperties;
}

const FONTS: FontOption[] = [
  { label: "SYSTEM", style: { fontFamily: "system-ui, sans-serif" } },
  { label: "Parslay", style: { fontFamily: "Georgia, serif" } },
  {
    label: "FERVENT",
    style: {
      fontFamily: "Impact, Haettenschweiler, sans-serif",
      letterSpacing: "0.08em",
    },
  },
  {
    label: "Hopeless",
    style: { fontFamily: "Brush Script MT, cursive", fontStyle: "italic" },
  },
  { label: "Witty", style: { fontFamily: "Papyrus, fantasy" } },
  {
    label: "Oliver",
    style: {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontStyle: "italic",
    },
  },
];

const STICKERS = [
  "🔥",
  "❤️",
  "😂",
  "👑",
  "💎",
  "🚀",
  "⭐",
  "🌟",
  "💥",
  "🎉",
  "🎵",
  "🌹",
  "✨",
  "🦋",
  "🌈",
  "💫",
];

interface FilterPreset {
  label: string;
  filter: string;
}

const FILTER_PRESETS: FilterPreset[] = [
  { label: "Normal", filter: "none" },
  { label: "Vivid", filter: "saturate(1.8) contrast(1.1)" },
  { label: "Muted", filter: "saturate(0.6) brightness(0.95)" },
  { label: "Warm", filter: "sepia(0.3) saturate(1.4) brightness(1.05)" },
  { label: "Cool", filter: "hue-rotate(20deg) saturate(0.9) brightness(1.05)" },
  { label: "B&W", filter: "grayscale(1) contrast(1.1)" },
  { label: "Fade", filter: "brightness(1.15) contrast(0.8) saturate(0.7)" },
];

interface TextOverlay {
  id: string;
  text: string;
  fontIndex: number;
  x: number;
  y: number;
  scale: number;
  color: string;
}

interface StickerOverlay {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
}

type PhotoToolPanel = "text" | "emoji" | "filter" | "adjust" | null;

// ─── Utility helpers ──────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoUploadPage({ onBack, onUploaded }: VideoUploadPageProps) {
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  // ── Media file state ──────────────────────────────────────────────────────
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [isPhotoMode, setIsPhotoMode] = useState(false);

  // ── Thumbnail (video mode only) ───────────────────────────────────────────
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(
    null,
  );

  // ── Post metadata ──────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtagInput, setHashtagInput] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);

  // ── Upload state ───────────────────────────────────────────────────────────
  const [isPosting, setIsPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<
    "idle" | "media" | "thumbnail" | "saving"
  >("idle");
  const [isDragging, setIsDragging] = useState(false);

  // ── Photo editing state ────────────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState<PhotoToolPanel>(null);
  const [selectedFilter, setSelectedFilter] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [stickerOverlays, setStickerOverlays] = useState<StickerOverlay[]>([]);
  const [newTextInput, setNewTextInput] = useState("");
  const [selectedFontIndex, setSelectedFontIndex] = useState(0);
  const [textColor, setTextColor] = useState("#ffffff");

  const [previewAspect, setPreviewAspect] = useState<string>("9/16");

  const draggingRef = useRef<{
    id: string;
    type: "text" | "sticker";
    startX: number;
    startY: number;
    itemStartX: number;
    itemStartY: number;
  } | null>(null);
  const overlayContainerRef = useRef<HTMLDivElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const mediaInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // ── Photo filter CSS ───────────────────────────────────────────────────────
  const filterPreset = FILTER_PRESETS[selectedFilter]?.filter ?? "none";
  const adjustFilter = `brightness(${brightness}%) contrast(${contrast}%)`;
  const combinedFilter =
    filterPreset === "none" ? adjustFilter : `${filterPreset} ${adjustFilter}`;

  // ── Media select ───────────────────────────────────────────────────────────
  const handleMediaSelect = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setMediaFile(file);
    setMediaPreviewUrl(url);
    setTextOverlays([]);
    setStickerOverlays([]);
    setSelectedFilter(0);
    setBrightness(100);
    setContrast(100);
    setPreviewAspect("9/16"); // reset until loadedmetadata fires

    if (file.type.startsWith("image/")) {
      setIsPhotoMode(true);
      setVideoDuration(null);
    } else {
      setIsPhotoMode(false);
      // Get video duration
      const vid = document.createElement("video");
      vid.preload = "metadata";
      vid.onloadedmetadata = () => {
        setVideoDuration(vid.duration);
        URL.revokeObjectURL(vid.src);
      };
      vid.src = url;
    }
  }, []);

  const handleMediaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleMediaSelect(file);
    e.target.value = "";
  };

  const handleThumbnailInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    const url = URL.createObjectURL(file);
    setThumbnailPreviewUrl(url);
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleMediaSelect(file);
    },
    [handleMediaSelect],
  );

  // ── Hashtag helpers ────────────────────────────────────────────────────────
  const addHashtag = (raw: string) => {
    const tag = raw.replace(/^#+/, "").trim().toLowerCase();
    if (!tag) return;
    if (!hashtags.includes(tag)) {
      setHashtags((prev) => [...prev, tag]);
    }
    setHashtagInput("");
  };

  const removeHashtag = (tag: string) => {
    setHashtags((prev) => prev.filter((t) => t !== tag));
  };

  const handleHashtagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addHashtag(hashtagInput);
    }
  };

  // ── Photo overlay helpers ──────────────────────────────────────────────────
  const addTextOverlay = () => {
    if (!newTextInput.trim()) return;
    setTextOverlays((prev) => [
      ...prev,
      {
        id: `t${Date.now()}`,
        text: newTextInput.trim(),
        fontIndex: selectedFontIndex,
        x: 50,
        y: 40,
        scale: 1,
        color: textColor,
      },
    ]);
    setNewTextInput("");
    setActivePanel(null);
  };

  const addSticker = (emoji: string) => {
    setStickerOverlays((prev) => [
      ...prev,
      { id: `s${Date.now()}`, emoji, x: 50, y: 50, scale: 1 },
    ]);
    setActivePanel(null);
  };

  const getContainerRect = () =>
    overlayContainerRef.current?.getBoundingClientRect() ?? null;

  const handleDragStart = (
    id: string,
    type: "text" | "sticker",
    clientX: number,
    clientY: number,
    itemX: number,
    itemY: number,
  ) => {
    draggingRef.current = {
      id,
      type,
      startX: clientX,
      startY: clientY,
      itemStartX: itemX,
      itemStartY: itemY,
    };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    const d = draggingRef.current;
    if (!d) return;
    const rect = getContainerRect();
    if (!rect) return;
    const dx = ((clientX - d.startX) / rect.width) * 100;
    const dy = ((clientY - d.startY) / rect.height) * 100;
    const newX = Math.max(0, Math.min(100, d.itemStartX + dx));
    const newY = Math.max(0, Math.min(100, d.itemStartY + dy));
    if (d.type === "text") {
      setTextOverlays((prev) =>
        prev.map((t) => (t.id === d.id ? { ...t, x: newX, y: newY } : t)),
      );
    } else {
      setStickerOverlays((prev) =>
        prev.map((s) => (s.id === d.id ? { ...s, x: newX, y: newY } : s)),
      );
    }
  };

  const handleDragEnd = () => {
    draggingRef.current = null;
  };

  // ── Post ───────────────────────────────────────────────────────────────────
  const canPost = !!mediaFile && title.trim().length > 0 && !isPosting;

  const handlePost = async () => {
    if (!canPost || !actor || !mediaFile) return;

    setIsPosting(true);
    setUploadProgress(0);
    setUploadStage("media");

    try {
      // 1. Upload media file (video or photo)
      const mediaBytes = new Uint8Array(await mediaFile.arrayBuffer());
      const mediaBlob = ExternalBlob.fromBytes(mediaBytes).withUploadProgress(
        (pct) => {
          setUploadProgress(Math.round(pct));
        },
      );
      const mediaMeta = await actor.uploadFile(
        mediaFile.name,
        mediaFile.type,
        BigInt(mediaFile.size),
        mediaBlob,
      );
      const mediaUrl = mediaMeta.externalBlob.getDirectURL();

      // 2. Upload thumbnail if selected (video mode)
      let thumbnailUrl = "";
      if (thumbnailFile && !isPhotoMode) {
        setUploadStage("thumbnail");
        setUploadProgress(0);
        const thumbBytes = new Uint8Array(await thumbnailFile.arrayBuffer());
        const thumbBlob = ExternalBlob.fromBytes(thumbBytes).withUploadProgress(
          (pct) => {
            setUploadProgress(Math.round(pct));
          },
        );
        const thumbMeta = await actor.uploadFile(
          thumbnailFile.name,
          thumbnailFile.type,
          BigInt(thumbnailFile.size),
          thumbBlob,
        );
        thumbnailUrl = thumbMeta.externalBlob.getDirectURL();
      }

      // 3. Save metadata (works for both video and photo)
      setUploadStage("saving");
      await actor.addVideo(
        title.trim(),
        caption.trim(),
        mediaUrl,
        thumbnailUrl,
        hashtags,
      );

      // 4. Invalidate queries so feeds refresh
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["allVideos"] }),
        queryClient.invalidateQueries({ queryKey: ["userVideos"] }),
        queryClient.invalidateQueries({ queryKey: ["profileVideos"] }),
      ]);

      toast.success(isPhotoMode ? "Photo posted!" : "Video posted!");
      onUploaded();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to upload");
    } finally {
      setIsPosting(false);
      setUploadStage("idle");
      setUploadProgress(0);
    }
  };

  const uploadStageLabel: Record<typeof uploadStage, string> = {
    idle: "",
    media: `Uploading ${isPhotoMode ? "photo" : "video"}… ${uploadProgress}%`,
    thumbnail: `Uploading thumbnail… ${uploadProgress}%`,
    saving: "Saving to feed…",
  };

  return (
    <div
      data-ocid="upload.page"
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{ background: "#000" }}
    >
      {/* Hidden file inputs — no format restrictions */}
      <input
        ref={mediaInputRef}
        type="file"
        accept="video/*,image/*"
        className="hidden"
        onChange={handleMediaInputChange}
        aria-label="Select video or photo"
      />
      <input
        ref={thumbnailInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleThumbnailInputChange}
        aria-label="Select thumbnail image"
      />

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-12 pb-3 flex-shrink-0"
        style={{
          background: "rgba(0,0,0,0.9)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          type="button"
          data-ocid="upload.back_button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.07)" }}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1
          className="text-white font-bold text-base"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          {isPhotoMode ? "Upload Photo" : "Upload Video"}
        </h1>
        <button
          type="button"
          data-ocid="upload.cancel_button"
          onClick={onBack}
          className="text-sm font-medium"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Cancel
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-6 space-y-5 pb-32">
        {/* Media dropzone / preview */}
        {!mediaFile ? (
          <motion.div
            data-ocid="upload.dropzone"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl overflow-hidden cursor-pointer"
            style={{
              border: isDragging
                ? "2px dashed #ff0050"
                : "2px dashed rgba(255,255,255,0.15)",
              background: isDragging
                ? "rgba(255,0,80,0.05)"
                : "rgba(255,255,255,0.03)",
              aspectRatio: "9/14",
              maxHeight: 300,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => mediaInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: "rgba(255,0,80,0.1)",
                border: "1px solid rgba(255,0,80,0.2)",
              }}
            >
              <Upload size={28} style={{ color: "#ff0050" }} />
            </div>
            <p
              className="text-white font-semibold text-base mb-1"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Tap to select video or photo
            </p>
            <p className="text-white/40 text-sm">
              Any video or photo format supported
            </p>
            <button
              type="button"
              data-ocid="upload.upload_button"
              className="mt-5 px-6 py-2.5 rounded-2xl text-white text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
                boxShadow: "0 8px 24px rgba(255,0,80,0.3)",
              }}
              onClick={(e) => {
                e.stopPropagation();
                mediaInputRef.current?.click();
              }}
            >
              Choose File
            </button>
          </motion.div>
        ) : isPhotoMode ? (
          /* ── Photo mode: image preview + editing overlays ── */
          <motion.div
            data-ocid="upload.photo_mode"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Overlay container */}
            <div
              ref={overlayContainerRef}
              className="relative"
              style={{ aspectRatio: "4/5", touchAction: "none" }}
              onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
              onMouseUp={handleDragEnd}
              onTouchMove={(e) => {
                const t = e.touches[0];
                if (t) handleDragMove(t.clientX, t.clientY);
              }}
              onTouchEnd={handleDragEnd}
            >
              <img
                src={mediaPreviewUrl ?? ""}
                alt="Selected media"
                className="w-full h-full object-cover"
                style={{ filter: combinedFilter }}
              />
              {/* Text overlays */}
              {textOverlays.map((overlay) => {
                const font = FONTS[overlay.fontIndex] ?? FONTS[0]!;
                return (
                  <div
                    key={overlay.id}
                    className="absolute"
                    style={{
                      left: `${overlay.x}%`,
                      top: `${overlay.y}%`,
                      transform: `translate(-50%, -50%) scale(${overlay.scale})`,
                      cursor: "move",
                      userSelect: "none",
                      zIndex: 10,
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleDragStart(
                        overlay.id,
                        "text",
                        e.clientX,
                        e.clientY,
                        overlay.x,
                        overlay.y,
                      );
                    }}
                    onTouchStart={(e) => {
                      const t = e.touches[0];
                      if (t)
                        handleDragStart(
                          overlay.id,
                          "text",
                          t.clientX,
                          t.clientY,
                          overlay.x,
                          overlay.y,
                        );
                    }}
                  >
                    <div className="relative group">
                      <p
                        className="text-center leading-tight px-2 py-1 rounded"
                        style={{
                          ...font.style,
                          color: overlay.color,
                          fontSize: 22 * overlay.scale,
                          textShadow: "0 2px 8px rgba(0,0,0,0.7)",
                          maxWidth: 200,
                          wordBreak: "break-word",
                        }}
                      >
                        {overlay.text}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTextOverlays((prev) =>
                            prev.filter((t) => t.id !== overlay.id),
                          );
                        }}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "#ff0050", zIndex: 20 }}
                        aria-label="Remove text"
                      >
                        <X size={10} className="text-white" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {/* Sticker overlays */}
              {stickerOverlays.map((sticker) => (
                <div
                  key={sticker.id}
                  className="absolute"
                  style={{
                    left: `${sticker.x}%`,
                    top: `${sticker.y}%`,
                    transform: `translate(-50%, -50%) scale(${sticker.scale})`,
                    cursor: "move",
                    userSelect: "none",
                    zIndex: 10,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleDragStart(
                      sticker.id,
                      "sticker",
                      e.clientX,
                      e.clientY,
                      sticker.x,
                      sticker.y,
                    );
                  }}
                  onTouchStart={(e) => {
                    const t = e.touches[0];
                    if (t)
                      handleDragStart(
                        sticker.id,
                        "sticker",
                        t.clientX,
                        t.clientY,
                        sticker.x,
                        sticker.y,
                      );
                  }}
                >
                  <div className="relative group">
                    <span
                      style={{ fontSize: 40 * sticker.scale, lineHeight: 1 }}
                      className="drop-shadow-lg"
                    >
                      {sticker.emoji}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStickerOverlays((prev) =>
                          prev.filter((s) => s.id !== sticker.id),
                        );
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "#ff0050", zIndex: 20 }}
                      aria-label="Remove sticker"
                    >
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Photo info + remove */}
            <div className="px-4 py-3 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,0,80,0.1)" }}
              >
                <ImageIcon size={18} style={{ color: "#ff0050" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {mediaFile.name}
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  {formatFileSize(mediaFile.size)} · Photo
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
                  setMediaFile(null);
                  setMediaPreviewUrl(null);
                  setIsPhotoMode(false);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.07)" }}
                aria-label="Remove photo"
              >
                <X size={16} />
              </button>
            </div>

            {/* Photo editing toolbar */}
            <AnimatePresence>
              {activePanel === "text" && (
                <motion.div
                  key="text-panel"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute bottom-14 left-0 right-0 z-30 rounded-t-2xl px-4 pt-4 pb-4"
                  style={{
                    background: "rgba(12,12,12,0.97)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      value={newTextInput}
                      onChange={(e) => setNewTextInput(e.target.value)}
                      placeholder="Type text here…"
                      className="flex-1 px-3 py-2 rounded-xl text-white text-sm placeholder:text-white/30 outline-none"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        caretColor: "#ff0050",
                        fontSize: "16px",
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addTextOverlay();
                      }}
                    />
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border-none outline-none"
                      style={{ background: "transparent" }}
                      title="Text color"
                    />
                    <button
                      type="button"
                      onClick={addTextOverlay}
                      disabled={!newTextInput.trim()}
                      className="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
                      style={{
                        background:
                          "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <div
                    className="flex gap-2 overflow-x-auto pb-1"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {FONTS.map((font, i) => (
                      <button
                        key={font.label}
                        type="button"
                        onClick={() => setSelectedFontIndex(i)}
                        className="flex-shrink-0 px-3 py-2 rounded-xl text-sm transition-all"
                        style={{
                          ...font.style,
                          color: "white",
                          background:
                            selectedFontIndex === i
                              ? "rgba(255,0,80,0.2)"
                              : "rgba(255,255,255,0.06)",
                          border:
                            selectedFontIndex === i
                              ? "1px solid rgba(255,0,80,0.4)"
                              : "1px solid transparent",
                          fontSize: 13,
                        }}
                      >
                        {font.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
              {activePanel === "emoji" && (
                <motion.div
                  key="emoji-panel"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute bottom-14 left-0 right-0 z-30 rounded-t-2xl px-4 pt-4 pb-6"
                  style={{
                    background: "rgba(12,12,12,0.97)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-3"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    Stickers & Emoji
                  </p>
                  <div className="grid grid-cols-8 gap-2">
                    {STICKERS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => addSticker(emoji)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl hover:scale-110 transition-transform active:scale-95"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                        aria-label={`Add ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
              {activePanel === "filter" && (
                <motion.div
                  key="filter-panel"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute bottom-14 left-0 right-0 z-30 rounded-t-2xl px-4 pt-4 pb-6"
                  style={{
                    background: "rgba(12,12,12,0.97)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-3"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    Filters
                  </p>
                  <div
                    className="flex gap-3 overflow-x-auto pb-1"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {FILTER_PRESETS.map((preset, i) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setSelectedFilter(i)}
                        className="flex flex-col items-center gap-1.5 flex-shrink-0"
                      >
                        <div
                          className="w-16 h-16 rounded-xl overflow-hidden"
                          style={{
                            background:
                              "linear-gradient(135deg, #ff0050, #7c3aed)",
                            filter:
                              preset.filter === "none"
                                ? undefined
                                : preset.filter,
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
                                : "rgba(255,255,255,0.5)",
                          }}
                        >
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
              {activePanel === "adjust" && (
                <motion.div
                  key="adjust-panel"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute bottom-14 left-0 right-0 z-30 rounded-t-2xl px-4 pt-4 pb-6 space-y-4"
                  style={{
                    background: "rgba(12,12,12,0.97)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {[
                    {
                      label: "Brightness",
                      value: brightness,
                      setter: setBrightness,
                      min: 50,
                      max: 150,
                    },
                    {
                      label: "Contrast",
                      value: contrast,
                      setter: setContrast,
                      min: 50,
                      max: 150,
                    },
                  ].map(({ label, value, setter, min, max }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className="text-xs font-semibold uppercase tracking-widest"
                          style={{ color: "rgba(255,255,255,0.35)" }}
                        >
                          {label}
                        </span>
                        <span className="text-white/50 text-xs">{value}%</span>
                      </div>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        value={value}
                        onChange={(e) => setter(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{
                          accentColor: "#ff0050",
                          background: `linear-gradient(to right, #ff0050 0%, #ff0050 ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.15) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.15) 100%)`,
                        }}
                      />
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Photo editing bottom toolbar */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: toolbar backdrop dismiss */}
            <div
              className="flex items-center justify-around px-4 py-3"
              style={{
                background: "rgba(0,0,0,0.85)",
                backdropFilter: "blur(12px)",
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
              onClick={() => setActivePanel(null)}
            >
              {[
                { id: "text" as PhotoToolPanel, icon: "Aa", label: "Text" },
                { id: "emoji" as PhotoToolPanel, icon: "😀", label: "Sticker" },
                { id: "filter" as PhotoToolPanel, icon: "🎨", label: "Filter" },
                { id: "adjust" as PhotoToolPanel, icon: "🌡", label: "Adjust" },
              ].map(({ id, icon, label }) => (
                <button
                  key={label}
                  type="button"
                  data-ocid={`upload.photo_${label.toLowerCase()}_toggle`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePanel((prev) => (prev === id ? null : id));
                  }}
                  className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all"
                  style={{
                    background:
                      activePanel === id
                        ? "rgba(255,0,80,0.15)"
                        : "transparent",
                    border:
                      activePanel === id
                        ? "1px solid rgba(255,0,80,0.3)"
                        : "1px solid transparent",
                  }}
                  aria-label={label}
                  aria-pressed={activePanel === id}
                >
                  <span
                    className="text-lg"
                    style={{
                      color:
                        activePanel === id
                          ? "#ff0050"
                          : "rgba(255,255,255,0.7)",
                    }}
                  >
                    {icon}
                  </span>
                  <span
                    className="text-[10px] font-medium"
                    style={{
                      color:
                        activePanel === id
                          ? "#ff0050"
                          : "rgba(255,255,255,0.4)",
                    }}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          /* ── Video mode: standard video preview ── */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative rounded-2xl overflow-hidden bg-black"
            style={{
              background: "#000",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              className="relative w-full bg-black"
              style={{ aspectRatio: previewAspect, maxHeight: 400 }}
            >
              {/* biome-ignore lint/a11y/useMediaCaption: preview-only video does not require captions */}
              <video
                ref={previewVideoRef}
                src={mediaPreviewUrl ?? ""}
                className="w-full h-full object-contain"
                controls
                playsInline
                onLoadedMetadata={() => {
                  const v = previewVideoRef.current;
                  if (v?.videoWidth && v.videoHeight) {
                    setPreviewAspect(`${v.videoWidth}/${v.videoHeight}`);
                  }
                }}
              />
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,0,80,0.1)" }}
              >
                <Video size={18} style={{ color: "#ff0050" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {mediaFile.name}
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  {formatFileSize(mediaFile.size)}
                  {videoDuration !== null
                    ? ` · ${formatDuration(videoDuration)}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
                  setMediaFile(null);
                  setMediaPreviewUrl(null);
                  setVideoDuration(null);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.07)" }}
                aria-label="Remove video"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Thumbnail picker — video mode only */}
        {mediaFile && !isPhotoMode && (
          <div>
            <p
              className="block text-xs font-semibold uppercase tracking-widest mb-2"
              style={{
                color: "rgba(255,255,255,0.35)",
                fontFamily: "'Bricolage Grotesque', sans-serif",
              }}
            >
              Thumbnail (optional)
            </p>
            {!thumbnailFile ? (
              <button
                type="button"
                data-ocid="upload.thumbnail_upload_button"
                onClick={() => thumbnailInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px dashed rgba(255,255,255,0.12)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  <ImageIcon size={18} className="text-white/50" />
                </div>
                <div className="text-left">
                  <p className="text-white/70 text-sm font-medium">
                    Add thumbnail
                  </p>
                  <p className="text-white/30 text-xs">Any image format</p>
                </div>
              </button>
            ) : (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <img
                  src={thumbnailPreviewUrl ?? ""}
                  alt="Thumbnail preview"
                  className="w-10 h-14 object-cover rounded-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {thumbnailFile.name}
                  </p>
                  <p className="text-white/40 text-xs">
                    {formatFileSize(thumbnailFile.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (thumbnailPreviewUrl)
                      URL.revokeObjectURL(thumbnailPreviewUrl);
                    setThumbnailFile(null);
                    setThumbnailPreviewUrl(null);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                  aria-label="Remove thumbnail"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <div>
          <label
            htmlFor="upload-title"
            className="block text-xs font-semibold uppercase tracking-widest mb-2"
            style={{
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          >
            Title <span style={{ color: "#ff0050" }}>*</span>
          </label>
          <input
            id="upload-title"
            type="text"
            data-ocid="upload.title_input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              isPhotoMode
                ? "Give your photo a title…"
                : "Give your video a title…"
            }
            maxLength={100}
            className="w-full px-4 py-3 rounded-xl text-white placeholder:text-white/25 outline-none text-sm"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.09)",
              caretColor: "#ff0050",
              fontSize: "16px",
            }}
          />
        </div>

        {/* Caption */}
        <div>
          <label
            htmlFor="upload-caption"
            className="block text-xs font-semibold uppercase tracking-widest mb-2"
            style={{
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          >
            Caption
          </label>
          <textarea
            id="upload-caption"
            data-ocid="upload.caption_textarea"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption…"
            maxLength={500}
            rows={3}
            className="w-full px-4 py-3 rounded-xl text-white placeholder:text-white/25 outline-none text-sm resize-none leading-relaxed"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.09)",
              caretColor: "#ff0050",
              fontSize: "16px",
            }}
          />
        </div>

        {/* Hashtags */}
        <div>
          <label
            htmlFor="upload-hashtags"
            className="block text-xs font-semibold uppercase tracking-widest mb-2"
            style={{
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          >
            Hashtags
          </label>
          <div
            className="flex flex-wrap gap-1.5 p-2 rounded-xl min-h-[44px]"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.09)",
            }}
          >
            {hashtags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  background: "rgba(255,0,80,0.15)",
                  color: "#ff6b8a",
                  border: "1px solid rgba(255,0,80,0.25)",
                }}
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => removeHashtag(tag)}
                  className="text-white/50 hover:text-white transition-colors"
                  aria-label={`Remove #${tag}`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1 flex-1 min-w-[120px]">
              <Hash size={13} className="text-white/30 flex-shrink-0 ml-1" />
              <input
                id="upload-hashtags"
                type="text"
                data-ocid="upload.hashtag_input"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={handleHashtagKeyDown}
                onBlur={() => {
                  if (hashtagInput.trim()) addHashtag(hashtagInput);
                }}
                placeholder="Add tag, press Enter"
                className="flex-1 bg-transparent text-white text-xs placeholder:text-white/25 outline-none py-1"
                style={{ caretColor: "#ff0050", fontSize: "16px" }}
              />
            </div>
          </div>
          <p className="text-white/25 text-xs mt-1.5 px-1">
            Press Enter or comma to add
          </p>
        </div>
      </div>

      {/* Upload progress */}
      {isPosting && uploadStage !== "idle" && (
        <div
          className="fixed bottom-20 left-4 right-4 rounded-2xl px-4 py-3 z-50"
          style={{
            background: "rgba(20,20,20,0.97)",
            border: "1px solid rgba(255,0,80,0.3)",
            backdropFilter: "blur(12px)",
          }}
        >
          <p className="text-white text-sm font-medium mb-2">
            {uploadStageLabel[uploadStage]}
          </p>
          {uploadStage !== "saving" && (
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, #ff0050 0%, #ff6b35 100%)",
                  width: `${uploadProgress}%`,
                }}
                transition={{ duration: 0.15 }}
              />
            </div>
          )}
        </div>
      )}

      {/* Post button — fixed at bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-3 z-40"
        style={{
          background: "rgba(0,0,0,0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <motion.button
          type="button"
          data-ocid="upload.submit_button"
          onClick={() => void handlePost()}
          disabled={!canPost}
          whileTap={canPost ? { scale: 0.97 } : undefined}
          className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all flex items-center justify-center gap-2"
          style={
            canPost
              ? {
                  background:
                    "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
                  boxShadow: "0 8px 32px rgba(255,0,80,0.35)",
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                }
              : {
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                }
          }
        >
          {isPosting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload size={18} />
              {isPhotoMode ? "Post Photo" : "Post Video"}
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
