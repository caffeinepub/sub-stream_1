import { ArrowLeft, Shield } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { type BlockRecord, useFollowSystem } from "../hooks/useFollowSystem";
import { getDisplayName } from "../lib/userFormat";

interface BlockedUsersPageProps {
  onBack: () => void;
}

function formatBlockDate(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Blocked today";
  if (days === 1) return "Blocked yesterday";
  if (days < 30) return `Blocked ${days} days ago`;
  const months = Math.floor(days / 30);
  return `Blocked ${months} month${months > 1 ? "s" : ""} ago`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function BlockedUsersPage({ onBack }: BlockedUsersPageProps) {
  const { getBlockedUsers, unblockUser } = useFollowSystem();
  const [blockedList, setBlockedList] = useState<BlockRecord[]>(() =>
    getBlockedUsers(),
  );

  const handleUnblock = (record: BlockRecord) => {
    unblockUser(record.blockedPrincipal);
    setBlockedList((prev) =>
      prev.filter((b) => b.blockedPrincipal !== record.blockedPrincipal),
    );
    toast.success(`${record.blockedDisplayName} unblocked`);
  };

  return (
    <div
      data-ocid="blocked-users.page"
      className="min-h-screen w-full flex flex-col"
      style={{ background: "#000" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 pt-10 pb-3"
        style={{
          background: "rgba(0,0,0,0.9)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          type="button"
          data-ocid="blocked-users.back_button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1
            className="text-white font-bold text-base leading-none"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Blocked Users
          </h1>
          <p className="text-white/35 text-xs mt-0.5">Privacy &amp; Safety</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {blockedList.length === 0 ? (
          <motion.div
            data-ocid="blocked-users.empty_state"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center justify-center py-28 text-center px-8"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <Shield size={32} className="text-white/30" />
            </div>
            <p className="text-white font-semibold text-base mb-2">
              No blocked accounts.
            </p>
            <p className="text-white/35 text-sm leading-relaxed max-w-xs">
              Users you block won't be able to view your profile or contact you.
            </p>
          </motion.div>
        ) : (
          <div className="px-4 pt-4 space-y-2">
            {/* Info note */}
            <div
              className="rounded-2xl px-4 py-3 mb-3 flex items-start gap-3"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <Shield
                size={16}
                className="flex-shrink-0 mt-0.5"
                style={{ color: "rgba(255,255,255,0.35)" }}
              />
              <p className="text-white/40 text-xs leading-relaxed">
                Blocked users cannot view your profile, videos, or send you
                messages.
              </p>
            </div>

            {blockedList.map((record, i) => {
              const name =
                getDisplayName(record.blockedDisplayName) ||
                `${record.blockedPrincipal.slice(0, 10)}…`;

              return (
                <motion.div
                  key={record.blockedPrincipal}
                  data-ocid={`blocked-users.item.${i + 1}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{
                    delay: 0.04 * Math.min(i, 10),
                    duration: 0.3,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {/* Avatar placeholder */}
                  <div
                    className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(100,100,100,0.4) 0%, rgba(60,60,60,0.4) 100%)",
                    }}
                  >
                    <span className="text-white/60 font-bold text-base">
                      {getInitials(name)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-white font-bold text-sm truncate"
                      style={{
                        fontFamily: "'Bricolage Grotesque', sans-serif",
                      }}
                    >
                      {name}
                    </p>
                    <p className="text-white/30 text-[11px] mt-0.5">
                      {formatBlockDate(record.createdAt)}
                    </p>
                  </div>

                  {/* Unblock button */}
                  <button
                    type="button"
                    data-ocid={`blocked-users.unblock_button.${i + 1}`}
                    onClick={() => handleUnblock(record)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1.5px solid rgba(255,255,255,0.15)",
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    Unblock
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
