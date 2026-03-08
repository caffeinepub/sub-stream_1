import { ChevronRight, Radio, Upload, Video } from "lucide-react";
import { useEffect } from "react";

interface CreateMenuProps {
  open: boolean;
  onClose: () => void;
  onGoLive?: () => void;
  onUploadVideo?: () => void;
  onRecordShort?: () => void;
}

export function CreateMenu({
  open,
  onClose,
  onGoLive,
  onUploadVideo,
  onRecordShort,
}: CreateMenuProps) {
  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const options = [
    {
      icon: Upload,
      label: "Upload Video",
      description: "Share a video from your library",
      ocid: "createmenu.upload_video.button",
      accent: false,
      action: () => {
        onUploadVideo?.();
        onClose();
      },
    },
    {
      icon: Video,
      label: "Record Short",
      description: "Record a quick vertical short",
      ocid: "createmenu.record_short.button",
      accent: false,
      action: () => {
        onRecordShort?.();
        onClose();
      },
    },
    {
      icon: Radio,
      label: "Go Live",
      description: "Broadcast live to your followers",
      ocid: "createmenu.go_live.button",
      accent: true,
      action: () => {
        onGoLive?.();
        onClose();
      },
    },
  ] as const;

  return (
    <>
      {/* Backdrop */}
      <div
        data-ocid="createmenu.close_button"
        className="fixed inset-0 bg-black/70 z-[60]"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        role="button"
        tabIndex={0}
        aria-label="Close menu"
        style={{
          animation: "fadeIn 0.2s ease-out forwards",
        }}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-3xl pb-10 overflow-hidden"
        style={{
          background: "linear-gradient(to bottom, #1a1a1a, #111111)",
          animation: "slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Title */}
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="text-white font-bold text-lg tracking-tight">
            Create
          </h2>
          <p className="text-white/50 text-sm mt-0.5">Choose what to create</p>
        </div>

        {/* Options */}
        <div className="px-4 pt-3">
          {options.map(
            ({ icon: Icon, label, description, ocid, accent, action }) => (
              <button
                key={label}
                type="button"
                data-ocid={ocid}
                onClick={action}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl mb-2 transition-all duration-150 active:scale-[0.98] group"
                style={{
                  background: accent
                    ? "rgba(255,0,80,0.1)"
                    : "rgba(255,255,255,0.04)",
                }}
              >
                {/* Icon container */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: accent
                      ? "linear-gradient(135deg, #ff0050, #ff6b35)"
                      : "rgba(255,255,255,0.08)",
                  }}
                >
                  <Icon
                    size={22}
                    stroke={accent ? "white" : "rgba(255,255,255,0.85)"}
                    strokeWidth={2}
                  />
                </div>

                {/* Text */}
                <div className="flex-1 text-left">
                  <p
                    className="font-semibold text-sm"
                    style={{ color: accent ? "#ff0050" : "white" }}
                  >
                    {label}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">{description}</p>
                </div>

                {/* Chevron */}
                <ChevronRight
                  size={18}
                  stroke="rgba(255,255,255,0.3)"
                  className="transition-transform duration-150 group-active:translate-x-1"
                />
              </button>
            ),
          )}
        </div>
      </div>
    </>
  );
}
