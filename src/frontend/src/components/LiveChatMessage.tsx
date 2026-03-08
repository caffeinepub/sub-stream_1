interface LiveChatMessageProps {
  username: string;
  message: string;
  isGift?: boolean;
  giftEmoji?: string;
  avatarUrl?: string;
}

// Deterministic gradient from username string
function getUserGradient(username: string): string {
  const gradients = [
    "linear-gradient(135deg, #ff0050, #ff6b35)",
    "linear-gradient(135deg, #7c3aed, #4f46e5)",
    "linear-gradient(135deg, #0ea5e9, #2563eb)",
    "linear-gradient(135deg, #059669, #0d9488)",
    "linear-gradient(135deg, #d97706, #ea580c)",
    "linear-gradient(135deg, #db2777, #9333ea)",
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length]!;
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function LiveChatMessage({
  username,
  message,
  isGift = false,
  giftEmoji,
  avatarUrl,
}: LiveChatMessageProps) {
  if (isGift) {
    return (
      <div className="flex items-center gap-2 my-0.5">
        {/* Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={username}
            className="w-6 h-6 rounded-full flex-shrink-0 object-cover"
          />
        ) : (
          <div
            className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold"
            style={{ background: getUserGradient(username) }}
          >
            {getInitials(username)}
          </div>
        )}
        {/* Gift pill */}
        <div
          className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"
          style={{
            background: "rgba(255,0,80,0.25)",
            border: "1px solid rgba(255,0,80,0.5)",
            color: "#fff",
          }}
        >
          <span style={{ color: "#ff6b6b" }}>{username}</span>
          <span className="text-white/70">sent</span>
          <span>{giftEmoji}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 my-0.5">
      {/* Avatar */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={username}
          className="w-6 h-6 rounded-full flex-shrink-0 object-cover mt-0.5"
        />
      ) : (
        <div
          className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold mt-0.5"
          style={{ background: getUserGradient(username) }}
        >
          {getInitials(username)}
        </div>
      )}
      {/* Message */}
      <div className="flex-1 min-w-0">
        <span
          className="text-xs font-semibold mr-1.5"
          style={{ color: "#ff6b6b" }}
        >
          {username}
        </span>
        <span className="text-white/90 text-xs leading-relaxed break-words">
          {message}
        </span>
      </div>
    </div>
  );
}
