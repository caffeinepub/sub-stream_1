import { Plus } from "lucide-react";
import { motion } from "motion/react";

interface StoryRingProps {
  avatarUrl?: string;
  displayName: string;
  size?: number;
  hasStory: boolean;
  allViewed: boolean;
  isOwn: boolean;
  onTap: () => void;
  showPlusBadge?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function StoryRing({
  avatarUrl,
  displayName,
  size = 64,
  hasStory,
  allViewed,
  onTap,
  showPlusBadge = false,
}: StoryRingProps) {
  const ringSize = size + 6;
  const badgeSize = Math.round(size * 0.28);

  return (
    <motion.button
      type="button"
      data-ocid="story.ring_button"
      onClick={onTap}
      className="relative flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0050]"
      style={{ width: ringSize, height: ringSize }}
      whileTap={{ scale: 0.93 }}
      aria-label={
        hasStory
          ? `View ${displayName}'s story`
          : showPlusBadge
            ? "Add story"
            : displayName
      }
    >
      {/* Story ring */}
      {hasStory && !allViewed && (
        /* Animated gradient ring */
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, #ff0050, #ff6b35, #a855f7, #3b82f6, #ff0050)",
            padding: 2,
            borderRadius: "50%",
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 4,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />
      )}
      {hasStory && allViewed && (
        /* Viewed: grey ring */
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "rgba(255,255,255,0.25)",
            padding: 2,
            borderRadius: "50%",
          }}
        />
      )}

      {/* Avatar circle */}
      <div
        className="relative overflow-hidden rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          width: size,
          height: size,
          background: avatarUrl
            ? "transparent"
            : "linear-gradient(135deg, #ff0050 0%, #ff6b35 100%)",
          border: hasStory ? "2px solid #000" : "none",
          zIndex: 1,
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            className="text-white font-bold select-none"
            style={{ fontSize: Math.round(size * 0.3) }}
          >
            {getInitials(displayName || "?")}
          </span>
        )}
      </div>

      {/* Plus badge for own profile without a story */}
      {showPlusBadge && !hasStory && (
        <div
          className="absolute flex items-center justify-center rounded-full"
          style={{
            width: badgeSize,
            height: badgeSize,
            background: "#ff0050",
            border: "2px solid #000",
            bottom: -2,
            right: -2,
            zIndex: 2,
          }}
        >
          <Plus
            size={badgeSize * 0.55}
            className="text-white"
            strokeWidth={3}
          />
        </div>
      )}
    </motion.button>
  );
}
