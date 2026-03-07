interface OnlineDotProps {
  isOnline: boolean;
  size?: number;
  className?: string;
}

export function OnlineDot({
  isOnline,
  size = 10,
  className = "",
}: OnlineDotProps) {
  return (
    <span
      className={`absolute rounded-full border-2 border-black ${className}`}
      style={{
        width: size,
        height: size,
        background: isOnline ? "#22c55e" : "rgba(255,255,255,0.3)",
        bottom: 0,
        right: 0,
        display: "block",
        flexShrink: 0,
      }}
      aria-label={isOnline ? "Online" : "Offline"}
    />
  );
}
