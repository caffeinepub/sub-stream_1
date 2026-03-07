import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Camera, Radio } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const CATEGORIES = ["Gaming", "Music", "Chat", "Lifestyle", "Trending"];

interface GoLiveConfig {
  title: string;
  category: string;
  chatEnabled: boolean;
  giftsEnabled: boolean;
}

interface GoLiveSetupPageProps {
  onBack: () => void;
  onStartLive: (config: GoLiveConfig) => void;
}

export function GoLiveSetupPage({ onBack, onStartLive }: GoLiveSetupPageProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]!);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [giftsEnabled, setGiftsEnabled] = useState(true);
  const [titleError, setTitleError] = useState("");
  const [counting, setCounting] = useState(false);
  const [countNum, setCountNum] = useState(5);

  const handleStart = () => {
    if (!title.trim()) {
      setTitleError("Please enter a title for your stream.");
      return;
    }
    setTitleError("");
    setCounting(true);
    setCountNum(5);

    let current = 5;
    const tick = setInterval(() => {
      current -= 1;
      if (current <= 0) {
        clearInterval(tick);
        setCounting(false);
        onStartLive({
          title: title.trim(),
          category,
          chatEnabled,
          giftsEnabled,
        });
      } else {
        setCountNum(current);
      }
    }, 1000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black overflow-y-auto no-scrollbar"
      style={{ background: "#000" }}
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
          data-ocid="golive.back_button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          aria-label="Go back"
        >
          <ArrowLeft size={18} stroke="white" strokeWidth={2} />
        </button>
        <h1
          className="text-white font-bold text-xl tracking-tight"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Go Live
        </h1>
      </div>

      <div className="relative z-10 px-5 pb-12 space-y-6">
        {/* Camera preview */}
        <div
          className="w-full rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-3 relative"
          style={{
            aspectRatio: "9/16",
            maxHeight: "280px",
            background: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(255,0,80,0.15)",
              border: "1px solid rgba(255,0,80,0.3)",
            }}
          >
            <Camera size={26} style={{ color: "#ff0050" }} strokeWidth={1.5} />
          </div>
          <p className="text-white/50 text-sm font-medium">Camera Preview</p>
          <p className="text-white/25 text-xs">
            Camera will activate when live starts
          </p>
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
            <p className="text-[#ff4466] text-xs mt-1">{titleError}</p>
          )}
        </div>

        {/* Category select */}
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
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-95"
                style={
                  category === cat
                    ? {
                        background: "#ff0050",
                        color: "white",
                      }
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

        {/* Toggles */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {/* Enable Chat */}
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

          {/* Enable Gifts */}
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
          onClick={handleStart}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base transition-all duration-200 active:scale-[0.98]"
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

      {/* ── Countdown overlay ── */}
      <AnimatePresence>
        {counting && (
          <motion.div
            data-ocid="golive.countdown_panel"
            className="fixed inset-0 z-[100] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: "rgba(0,0,0,0.92)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
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
                    textShadow: "none",
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
        )}
      </AnimatePresence>
    </div>
  );
}
