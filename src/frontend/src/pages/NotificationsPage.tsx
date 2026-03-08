import { ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  type AppNotification,
  useNotifications,
} from "../context/NotificationsContext";

interface NotificationsPageProps {
  onBack: () => void;
  onNavigateToProfile?: (principalStr: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} minutes ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hours ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} days ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface NotifIconConfig {
  bg: string;
  emoji: string;
}

function notifIconConfig(type: AppNotification["type"]): NotifIconConfig {
  switch (type) {
    case "follow":
      return { bg: "rgba(59,130,246,0.18)", emoji: "👤" };
    case "like":
      return { bg: "rgba(255,0,80,0.15)", emoji: "❤️" };
    case "comment":
      return { bg: "rgba(255,255,255,0.1)", emoji: "💬" };
    case "gift":
      return { bg: "rgba(245,158,11,0.15)", emoji: "🎁" };
    case "friend":
      return { bg: "rgba(34,197,94,0.15)", emoji: "🤝" };
    case "live":
      return { bg: "rgba(255,0,80,0.2)", emoji: "🔴" };
  }
}

function notifActionText(type: AppNotification["type"]): string {
  switch (type) {
    case "follow":
      return "started following";
    case "like":
      return "liked";
    case "comment":
      return "commented on";
    case "gift":
      return "sent a gift to";
    case "friend":
      return "connected with";
    case "live":
      return "";
  }
}

// ─── NotificationItem ─────────────────────────────────────────────────────────

function NotificationItem({
  notification,
  index,
  onNavigateToProfile,
}: {
  notification: AppNotification;
  index: number;
  onNavigateToProfile?: (principalStr: string) => void;
}) {
  const { bg, emoji } = notifIconConfig(notification.type);
  const action = notifActionText(notification.type);

  const isClickable = !!notification.tappedPrincipal && !!onNavigateToProfile;

  const handleClick = () => {
    if (isClickable && notification.tappedPrincipal) {
      onNavigateToProfile?.(notification.tappedPrincipal);
    }
  };

  const isLive = notification.type === "live";

  return (
    <motion.div
      data-ocid={`notifications.item.${index}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.05 + Math.min(index, 10) * 0.04,
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl relative ${isClickable ? "cursor-pointer active:scale-[0.99] transition-transform" : ""}`}
      style={{
        background: notification.isRead
          ? "rgba(255,255,255,0.03)"
          : "rgba(255,255,255,0.06)",
        borderLeft: notification.isRead
          ? "none"
          : "2px solid rgba(255,0,80,0.5)",
        border: notification.isRead
          ? "1px solid rgba(255,255,255,0.05)"
          : "1px solid rgba(255,0,80,0.15)",
      }}
      onClick={handleClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") handleClick();
            }
          : undefined
      }
    >
      {/* Icon circle */}
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-xl overflow-hidden"
        style={{ background: bg }}
      >
        {notification.actorAvatar ? (
          <img
            src={notification.actorAvatar}
            alt={notification.actorName}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span>{emoji}</span>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm leading-relaxed"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          <span
            className="font-bold text-white"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            {notification.actorName}
          </span>{" "}
          {action && <>{action} </>}
          {isLive ? (
            <span className="font-bold" style={{ color: "#ff0050" }}>
              is now LIVE 🔴
            </span>
          ) : (
            notification.targetLabel
          )}
        </p>
        <p
          className="text-[11px] mt-1"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          {relativeTime(notification.timestamp)}
        </p>
      </div>

      {/* Live badge */}
      {isLive && (
        <div
          className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse"
          style={{
            background: "rgba(255,0,80,0.2)",
            color: "#ff0050",
            border: "1px solid rgba(255,0,80,0.4)",
          }}
        >
          LIVE
        </div>
      )}

      {/* Unread dot */}
      {!notification.isRead && notification.type !== "live" && (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
          style={{ background: "#ff0050" }}
        />
      )}
    </motion.div>
  );
}

// ─── NotificationsPage ────────────────────────────────────────────────────────

export function NotificationsPage({
  onBack,
  onNavigateToProfile,
}: NotificationsPageProps) {
  const { notifications, unreadCount, markAllRead, clearAll } =
    useNotifications();

  return (
    <div
      data-ocid="notifications.page"
      className="min-h-screen w-full flex flex-col"
      style={{ background: "#000" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-4 pt-12 pb-4"
        style={{
          background: "rgba(0,0,0,0.9)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-ocid="notifications.back_button"
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.07)" }}
            aria-label="Go back"
          >
            <ArrowLeft size={19} />
          </button>
          <h1
            className="text-white font-bold text-lg"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Notifications
          </h1>
        </div>

        {/* Mark all read button */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.button
              type="button"
              data-ocid="notifications.mark_all_read_button"
              onClick={markAllRead}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="text-sm font-semibold px-3 py-1.5 rounded-full transition-colors"
              style={{
                color: "#ff0050",
                background: "rgba(255,0,80,0.1)",
                border: "1px solid rgba(255,0,80,0.2)",
                fontFamily: "'Bricolage Grotesque', sans-serif",
              }}
            >
              Mark all read
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        {notifications.length === 0 ? (
          <motion.div
            data-ocid="notifications.empty_state"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center justify-center py-28 text-center px-8"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <span className="text-4xl">🔔</span>
            </div>
            <p className="text-white font-semibold text-base mb-2">
              No notifications yet.
            </p>
            <p className="text-white/35 text-sm leading-relaxed max-w-xs">
              Activity from followers and creators will appear here.
            </p>
          </motion.div>
        ) : (
          <div className="px-4 pt-4 space-y-2">
            {/* Unread count badge */}
            {unreadCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-3"
              >
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{
                    color: "rgba(255,255,255,0.35)",
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                  }}
                >
                  New
                </span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(255,0,80,0.15)",
                    color: "#ff0050",
                  }}
                >
                  {unreadCount} unread
                </span>
              </motion.div>
            )}

            {notifications.map((notif, i) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                index={i + 1}
                onNavigateToProfile={onNavigateToProfile}
              />
            ))}

            {/* Clear all */}
            {notifications.length > 0 && (
              <motion.button
                type="button"
                data-ocid="notifications.clear_button"
                onClick={clearAll}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="w-full py-3 text-sm mt-4 rounded-2xl transition-colors"
                style={{
                  color: "rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                }}
              >
                Clear all notifications
              </motion.button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
