import {
  ArrowLeft,
  Minus,
  Plus,
  RotateCw,
  Scissors,
  Sparkles,
  SunMedium,
  Type,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TextOverlay {
  id: string;
  text: string;
  fontIndex: number;
  x: number;
  y: number;
  scale: number;
  color: string;
  selected: boolean;
}

export interface StickerOverlay {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
  selected: boolean;
}

export interface EditorEdits {
  textOverlays: TextOverlay[];
  stickerOverlays: StickerOverlay[];
  filterIndex: number;
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  trimStart: number;
  trimEnd: number;
}

interface VideoEditorPageProps {
  mediaFile: File;
  onBack: () => void;
  onYourStory: (mediaFile: File, edits: EditorEdits) => void;
  onNext: (mediaFile: File, edits: EditorEdits) => void;
}

// ─── Font list ────────────────────────────────────────────────────────────────

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
  {
    label: "SUNDAYMASTHEAD",
    style: {
      fontFamily: "Impact, serif",
      textTransform: "uppercase",
      letterSpacing: "0.12em",
    },
  },
  {
    label: "Kaushan Script",
    style: {
      fontFamily: "Brush Script MT, cursive",
      fontStyle: "italic",
      fontWeight: 700,
    },
  },
  {
    label: "ANTON",
    style: {
      fontFamily: "Impact, Arial Black, sans-serif",
      letterSpacing: "0.02em",
      fontWeight: 900,
    },
  },
  {
    label: "Biro",
    style: { fontFamily: "Courier New, Courier, monospace" },
  },
  {
    label: "Etiquette",
    style: {
      fontFamily: "'Times New Roman', Times, serif",
      fontStyle: "italic",
    },
  },
  {
    label: "Vision",
    style: {
      fontFamily: "Helvetica Neue, Arial, sans-serif",
      letterSpacing: "0.15em",
    },
  },
  {
    label: "GLASSIER",
    style: {
      fontFamily: "Helvetica Neue, Arial, sans-serif",
      fontWeight: 100,
      letterSpacing: "0.2em",
    },
  },
  {
    label: "ATOMiC",
    style: {
      fontFamily: "Impact, Arial Black, sans-serif",
      fontWeight: 900,
      letterSpacing: "-0.02em",
    },
  },
  {
    label: "BEBASNEUE",
    style: {
      fontFamily: "Impact, Arial Narrow, sans-serif",
      letterSpacing: "0.1em",
      fontWeight: 400,
    },
  },
  {
    label: "CoreSans",
    style: { fontFamily: "Helvetica Neue, Arial, sans-serif", fontWeight: 500 },
  },
  {
    label: "CINZEL",
    style: {
      fontFamily: "Palatino Linotype, Book Antiqua, Palatino, serif",
      letterSpacing: "0.12em",
    },
  },
  {
    label: "PUFF",
    style: {
      fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
      fontWeight: 700,
    },
  },
  {
    label: "Montra-It",
    style: { fontFamily: "Verdana, Geneva, sans-serif", fontStyle: "italic" },
  },
  {
    label: "Sylvanr",
    style: { fontFamily: "Brush Script MT, cursive", fontSize: "1.2em" },
  },
];

// ─── Data ─────────────────────────────────────────────────────────────────────

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
  "😀",
  "😍",
  "🥰",
  "😎",
  "🤩",
  "😜",
  "🙌",
  "🏆",
];

const FILTER_PRESETS = [
  { label: "Normal", filter: "none" },
  { label: "Vivid", filter: "saturate(1.8) contrast(1.1)" },
  { label: "Muted", filter: "saturate(0.6) brightness(0.95)" },
  { label: "Warm", filter: "sepia(0.3) saturate(1.4) brightness(1.05)" },
  { label: "Cool", filter: "hue-rotate(20deg) saturate(0.9) brightness(1.05)" },
  { label: "B&W", filter: "grayscale(1) contrast(1.1)" },
  { label: "Fade", filter: "brightness(1.15) contrast(0.8) saturate(0.7)" },
  { label: "Retro", filter: "sepia(0.5) saturate(1.2) contrast(1.05)" },
  { label: "Drama", filter: "contrast(1.4) brightness(0.85)" },
];

type ToolPanel =
  | "text"
  | "sticker"
  | "gif"
  | "filter"
  | "brightness"
  | "contrast"
  | "trim"
  | "cut"
  | null;

// ─── Main component ───────────────────────────────────────────────────────────

export function VideoEditorPage({
  mediaFile,
  onBack,
  onYourStory,
  onNext,
}: VideoEditorPageProps) {
  const isVideo =
    mediaFile.type.startsWith("video/") ||
    mediaFile.name.endsWith(".webm") ||
    mediaFile.name.endsWith(".mp4") ||
    mediaFile.name.endsWith(".mov");
  const mediaUrl = URL.createObjectURL(mediaFile);

  // ── Editor state ─────────────────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState<ToolPanel>(null);
  const [filterIndex, setFilterIndex] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);

  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [stickerOverlays, setStickerOverlays] = useState<StickerOverlay[]>([]);
  const [newTextInput, setNewTextInput] = useState("");
  const [selectedFontIndex, setSelectedFontIndex] = useState(0);
  const [textColor, setTextColor] = useState("#ffffff");

  const draggingRef = useRef<{
    id: string;
    type: "text" | "sticker";
    startX: number;
    startY: number;
    itemStartX: number;
    itemStartY: number;
  } | null>(null);
  const overlayContainerRef = useRef<HTMLDivElement>(null);

  // ── CSS filter ────────────────────────────────────────────────────────────
  const filterPreset = FILTER_PRESETS[filterIndex]?.filter ?? "none";
  const adjustFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  const combinedFilter =
    filterPreset === "none" ? adjustFilter : `${filterPreset} ${adjustFilter}`;

  // ── Text overlay helpers ──────────────────────────────────────────────────
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
        selected: false,
      },
    ]);
    setNewTextInput("");
    setActivePanel(null);
  };

  const addSticker = (emoji: string) => {
    setStickerOverlays((prev) => [
      ...prev,
      {
        id: `s${Date.now()}`,
        emoji,
        x: 50,
        y: 50,
        scale: 1,
        selected: false,
      },
    ]);
    setActivePanel(null);
  };

  // ── Drag helpers ──────────────────────────────────────────────────────────
  const getRect = () =>
    overlayContainerRef.current?.getBoundingClientRect() ?? null;

  const handleDragStart = (
    id: string,
    type: "text" | "sticker",
    cx: number,
    cy: number,
    ix: number,
    iy: number,
  ) => {
    draggingRef.current = {
      id,
      type,
      startX: cx,
      startY: cy,
      itemStartX: ix,
      itemStartY: iy,
    };
  };

  const handleDragMove = (cx: number, cy: number) => {
    const d = draggingRef.current;
    if (!d) return;
    const rect = getRect();
    if (!rect) return;
    const dx = ((cx - d.startX) / rect.width) * 100;
    const dy = ((cy - d.startY) / rect.height) * 100;
    const nx = Math.max(0, Math.min(100, d.itemStartX + dx));
    const ny = Math.max(0, Math.min(100, d.itemStartY + dy));
    if (d.type === "text") {
      setTextOverlays((prev) =>
        prev.map((t) => (t.id === d.id ? { ...t, x: nx, y: ny } : t)),
      );
    } else {
      setStickerOverlays((prev) =>
        prev.map((s) => (s.id === d.id ? { ...s, x: nx, y: ny } : s)),
      );
    }
  };

  const handleDragEnd = () => {
    draggingRef.current = null;
  };

  // ── Build edits object ────────────────────────────────────────────────────
  const buildEdits = (): EditorEdits => ({
    textOverlays,
    stickerOverlays,
    filterIndex,
    brightness,
    contrast,
    saturation,
    rotation,
    trimStart,
    trimEnd,
  });

  const handleYourStory = () => onYourStory(mediaFile, buildEdits());
  const handleNext = () => onNext(mediaFile, buildEdits());

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      data-ocid="editor.page"
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#000" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-12 pb-3 z-20 flex-shrink-0"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      >
        <button
          type="button"
          data-ocid="editor.back_button"
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/70"
          style={{ background: "rgba(255,255,255,0.08)" }}
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <p
          className="text-white font-bold text-base"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Edit
        </p>
        <div className="w-10" />
      </div>

      {/* Video/image + overlay canvas */}
      <div
        ref={overlayContainerRef}
        className="relative flex-1 overflow-hidden"
        style={{ touchAction: "none" }}
        onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
        onMouseUp={handleDragEnd}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (t) handleDragMove(t.clientX, t.clientY);
        }}
        onTouchEnd={handleDragEnd}
      >
        {isVideo ? (
          <video
            src={mediaUrl}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: combinedFilter,
              transform: `rotate(${rotation}deg)`,
            }}
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <img
            src={mediaUrl}
            alt="Media preview"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: combinedFilter,
              transform: `rotate(${rotation}deg)`,
            }}
          />
        )}

        {/* Right-side vertical toolbar */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3">
          {[
            {
              id: "text",
              icon: <Type size={20} />,
              label: "Text",
              action: undefined as (() => void) | undefined,
            },
            {
              id: "sticker",
              icon: <span className="text-[18px]">😀</span>,
              label: "Stickers",
              action: undefined as (() => void) | undefined,
            },
            {
              id: "gif",
              icon: <span className="text-[18px]">🎞</span>,
              label: "GIFs",
              action: undefined as (() => void) | undefined,
            },
            {
              id: "filter",
              icon: <span className="text-[18px]">🎨</span>,
              label: "Filters",
              action: undefined as (() => void) | undefined,
            },
            {
              id: "brightness",
              icon: <SunMedium size={20} />,
              label: "Bright",
              action: undefined as (() => void) | undefined,
            },
            {
              id: "contrast",
              icon: <span className="text-[18px]">◑</span>,
              label: "Contrast",
              action: undefined as (() => void) | undefined,
            },
            {
              id: "trim",
              icon: <Scissors size={20} />,
              label: "Trim",
              action: undefined as (() => void) | undefined,
            },
            {
              id: "cut",
              icon: <span className="text-[18px]">🔪</span>,
              label: "Cut",
              action: undefined as (() => void) | undefined,
            },
            {
              id: "rotate",
              icon: <RotateCw size={20} />,
              label: "Rotate",
              action: (() => setRotation((r) => (r + 90) % 360)) as
                | (() => void)
                | undefined,
            },
            {
              id: "effects",
              icon: <Sparkles size={20} />,
              label: "Effects",
              action: undefined as (() => void) | undefined,
            },
          ].map(({ id, icon, label, action }) => (
            <button
              key={id}
              type="button"
              data-ocid={`editor.${id}_button`}
              onClick={
                action
                  ? action
                  : () =>
                      setActivePanel((prev) =>
                        prev === id ? null : (id as ToolPanel),
                      )
              }
              className="flex flex-col items-center gap-0.5"
              aria-label={label}
              aria-pressed={activePanel === id}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background:
                    activePanel === id
                      ? "rgba(255,0,80,0.3)"
                      : "rgba(0,0,0,0.55)",
                  border:
                    activePanel === id
                      ? "1.5px solid rgba(255,0,80,0.5)"
                      : "1.5px solid rgba(255,255,255,0.18)",
                  color:
                    activePanel === id ? "#ff0050" : "rgba(255,255,255,0.9)",
                }}
              >
                {icon}
              </div>
              <span className="text-white/60" style={{ fontSize: 9 }}>
                {label}
              </span>
            </button>
          ))}
        </div>

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
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTextOverlays((prev) =>
                        prev.map((t) =>
                          t.id === overlay.id
                            ? { ...t, scale: Math.max(0.5, t.scale - 0.15) }
                            : t,
                        ),
                      );
                    }}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                    style={{ background: "rgba(0,0,0,0.7)" }}
                    aria-label="Shrink"
                  >
                    <Minus size={8} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTextOverlays((prev) =>
                        prev.map((t) =>
                          t.id === overlay.id
                            ? { ...t, scale: Math.min(4, t.scale + 0.15) }
                            : t,
                        ),
                      );
                    }}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                    style={{ background: "rgba(0,0,0,0.7)" }}
                    aria-label="Grow"
                  >
                    <Plus size={8} />
                  </button>
                </div>
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
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStickerOverlays((prev) =>
                      prev.map((s) =>
                        s.id === sticker.id
                          ? { ...s, scale: Math.max(0.3, s.scale - 0.2) }
                          : s,
                      ),
                    );
                  }}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                  style={{ background: "rgba(0,0,0,0.7)" }}
                  aria-label="Shrink sticker"
                >
                  <Minus size={8} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStickerOverlays((prev) =>
                      prev.map((s) =>
                        s.id === sticker.id
                          ? { ...s, scale: Math.min(3, s.scale + 0.2) }
                          : s,
                      ),
                    );
                  }}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                  style={{ background: "rgba(0,0,0,0.7)" }}
                  aria-label="Grow sticker"
                >
                  <Plus size={8} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tool panels (slide up from bottom) */}
      <AnimatePresence>
        {/* ── Text panel ──────────────────────────────────────────────── */}
        {activePanel === "text" && (
          <motion.div
            key="text-panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-20 left-0 right-0 z-30 rounded-t-2xl"
            style={{
              background: "rgba(12,12,12,0.97)",
              border: "1px solid rgba(255,255,255,0.08)",
              maxHeight: "55vh",
              overflowY: "auto",
            }}
          >
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  data-ocid="editor.text_input"
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
                  data-ocid="editor.add_text_button"
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
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Font
              </p>
              <div
                className="flex gap-2 overflow-x-auto pb-3"
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
            </div>
          </motion.div>
        )}

        {/* ── Sticker / GIF panel ────────────────────────────────────── */}
        {(activePanel === "sticker" || activePanel === "gif") && (
          <motion.div
            key="sticker-panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-20 left-0 right-0 z-30 rounded-t-2xl px-4 pt-4 pb-6"
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
                  aria-label={`Add ${emoji} sticker`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Filter panel ───────────────────────────────────────────── */}
        {activePanel === "filter" && (
          <motion.div
            key="filter-panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-20 left-0 right-0 z-30 rounded-t-2xl px-4 pt-4 pb-6"
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
                  onClick={() => setFilterIndex(i)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0"
                >
                  <div
                    className="w-16 h-16 rounded-xl overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, #ff0050, #7c3aed)",
                      filter:
                        preset.filter === "none" ? undefined : preset.filter,
                      border:
                        filterIndex === i
                          ? "2px solid #ff0050"
                          : "2px solid transparent",
                    }}
                  />
                  <span
                    className="text-xs font-medium"
                    style={{
                      color:
                        filterIndex === i ? "#ff0050" : "rgba(255,255,255,0.5)",
                    }}
                  >
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Brightness panel ──────────────────────────────────────── */}
        {activePanel === "brightness" && (
          <motion.div
            key="brightness-panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-20 left-0 right-0 z-30 rounded-t-2xl px-4 pt-4 pb-6 space-y-4"
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
                label: "Saturation",
                value: saturation,
                setter: setSaturation,
                min: 0,
                max: 200,
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
                  data-ocid={`editor.${label.toLowerCase()}_slider`}
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

        {/* ── Contrast panel ────────────────────────────────────────── */}
        {activePanel === "contrast" && (
          <motion.div
            key="contrast-panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-20 left-0 right-0 z-30 rounded-t-2xl px-4 pt-4 pb-6 space-y-4"
            style={{
              background: "rgba(12,12,12,0.97)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  Contrast
                </span>
                <span className="text-white/50 text-xs">{contrast}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={150}
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                data-ocid="editor.contrast_slider"
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  accentColor: "#ff0050",
                  background: `linear-gradient(to right, #ff0050 0%, #ff0050 ${((contrast - 50) / 100) * 100}%, rgba(255,255,255,0.15) ${((contrast - 50) / 100) * 100}%, rgba(255,255,255,0.15) 100%)`,
                }}
              />
            </div>
          </motion.div>
        )}

        {/* ── Trim panel ────────────────────────────────────────────── */}
        {(activePanel === "trim" || activePanel === "cut") && (
          <motion.div
            key="trim-panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-20 left-0 right-0 z-30 rounded-t-2xl px-4 pt-4 pb-6"
            style={{
              background: "rgba(12,12,12,0.97)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              {activePanel === "trim" ? "Trim Video" : "Cut Segments"}
            </p>
            {/* Visual timeline */}
            <div
              className="relative h-12 rounded-xl overflow-hidden mb-4"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              {/* Filled region */}
              <div
                className="absolute top-0 bottom-0 rounded-xl"
                style={{
                  left: `${trimStart}%`,
                  right: `${100 - trimEnd}%`,
                  background: "rgba(255,0,80,0.3)",
                  border: "2px solid #ff0050",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-around px-2">
                {Array.from({ length: 16 }, (_, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: timeline tick marks are purely decorative
                    key={`tick-${i}`}
                    className="w-px h-6 rounded"
                    style={{ background: "rgba(255,255,255,0.15)" }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-white/50">Start</span>
                  <span className="text-xs text-white/50">{trimStart}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={trimEnd - 1}
                  value={trimStart}
                  onChange={(e) => setTrimStart(Number(e.target.value))}
                  data-ocid="editor.trim_start_slider"
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: "#ff0050" }}
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-white/50">End</span>
                  <span className="text-xs text-white/50">{trimEnd}%</span>
                </div>
                <input
                  type="range"
                  min={trimStart + 1}
                  max={100}
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(Number(e.target.value))}
                  data-ocid="editor.trim_end_slider"
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: "#ff0050" }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom action buttons */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-5 py-4 gap-3"
        style={{
          background: "rgba(0,0,0,0.92)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
        }}
      >
        <button
          type="button"
          data-ocid="editor.your_story_button"
          onClick={handleYourStory}
          className="flex-1 py-3.5 rounded-2xl text-white text-sm font-bold"
          style={{
            border: "1.5px solid rgba(255,255,255,0.35)",
            background: "transparent",
          }}
        >
          Your Story
        </button>
        <motion.button
          type="button"
          data-ocid="editor.next_button"
          onClick={handleNext}
          whileTap={{ scale: 0.97 }}
          className="flex-1 py-3.5 rounded-2xl text-white text-sm font-bold"
          style={{
            background: "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
            boxShadow: "0 6px 24px rgba(255,0,80,0.35)",
          }}
        >
          Next →
        </motion.button>
      </div>
    </div>
  );
}
