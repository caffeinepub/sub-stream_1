import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

interface CoHostInvite {
  fromName: string;
  fromPrincipal: string;
  streamId: string;
}

interface CoHostInviteNotificationProps {
  invite: CoHostInvite | null;
  onAccept: (invite: CoHostInvite) => void;
  onDecline: () => void;
}

export function CoHostInviteNotification({
  invite,
  onAccept,
  onDecline,
}: CoHostInviteNotificationProps) {
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after 15 seconds
  useEffect(() => {
    if (!invite) return;
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      onDecline();
    }, 15000);
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [invite, onDecline]);

  return (
    <AnimatePresence>
      {invite && (
        <motion.div
          key="invite-notification"
          data-ocid="invite.panel"
          className="fixed left-3 right-3 z-[200] rounded-2xl overflow-hidden"
          style={{
            top: "env(safe-area-inset-top, 0px)",
            marginTop: "8px",
          }}
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -120, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
        >
          <div
            style={{
              background: "rgba(20,20,20,0.97)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1.5px solid rgba(255,0,80,0.45)",
              boxShadow:
                "0 0 0 1px rgba(255,0,80,0.12), 0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(255,0,80,0.15)",
              borderRadius: "1rem",
            }}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Live pulsing dot */}
              <div className="flex-shrink-0 relative">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: "#ff0050",
                    animation: "livePulse 1.5s ease-in-out infinite",
                  }}
                />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "rgba(255,0,80,0.4)",
                    animation: "livePing 1.5s ease-in-out infinite",
                  }}
                />
              </div>

              {/* Message */}
              <p
                className="flex-1 text-sm font-semibold text-white leading-snug"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                <span style={{ color: "#ff6b6b" }}>{invite.fromName}</span>
                {" invited you to join LIVE 🔴"}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 px-4 pb-3">
              <button
                type="button"
                data-ocid="invite.accept_button"
                onClick={() => {
                  if (dismissTimerRef.current)
                    clearTimeout(dismissTimerRef.current);
                  onAccept(invite);
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                style={{
                  background:
                    "linear-gradient(135deg, #ff0050 0%, #ff6b35 100%)",
                  boxShadow: "0 2px 12px rgba(255,0,80,0.35)",
                }}
              >
                Accept
              </button>
              <button
                type="button"
                data-ocid="invite.decline_button"
                onClick={() => {
                  if (dismissTimerRef.current)
                    clearTimeout(dismissTimerRef.current);
                  onDecline();
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                Decline
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
