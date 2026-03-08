import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { useCoinWallet } from "../context/CoinWalletContext";
import { type WalletTransaction, useWallet } from "../context/WalletContext";

interface WalletPageProps {
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hrs ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} days ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function txTypeIcon(type: WalletTransaction["type"]): string {
  switch (type) {
    case "coin_purchase":
      return "🪙";
    case "gift_sent":
      return "🎁";
    case "gift_received":
      return "💝";
    case "withdrawal":
      return "💸";
  }
}

function StatusBadge({ status }: { status: WalletTransaction["status"] }) {
  const config = {
    Completed: { bg: "rgba(34,197,94,0.15)", color: "#22c55e" },
    Processing: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    Failed: { bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
  }[status];

  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: config.bg, color: config.color }}
    >
      {status}
    </span>
  );
}

function amountColorStyle(color: WalletTransaction["amountColor"]): string {
  switch (color) {
    case "green":
      return "#22c55e";
    case "red":
      return "#ff0050";
    case "yellow":
      return "#f59e0b";
  }
}

// ─── WalletPage ───────────────────────────────────────────────────────────────

export function WalletPage({ onBack }: WalletPageProps) {
  const { coinBalance, diamonds } = useCoinWallet();
  const { transactions } = useWallet();

  return (
    <div
      data-ocid="wallet.page"
      className="min-h-screen w-full flex flex-col"
      style={{ background: "#000" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 pt-12 pb-4"
        style={{
          background: "rgba(0,0,0,0.9)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          type="button"
          data-ocid="wallet.back_button"
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
          Wallet
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-5 space-y-6">
        {/* Balance cards */}
        <motion.div
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Coin Balance */}
          <div
            className="rounded-2xl p-4 flex flex-col gap-2"
            style={{
              background:
                "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)",
              border: "1px solid rgba(245,158,11,0.25)",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">🪙</span>
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "rgba(245,158,11,0.7)" }}
              >
                Coins
              </span>
            </div>
            <p
              className="text-white font-bold text-2xl"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              {coinBalance.toLocaleString()}
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              Available balance
            </p>
          </div>

          {/* Diamond Balance */}
          <div
            className="rounded-2xl p-4 flex flex-col gap-2"
            style={{
              background:
                "linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0.05) 100%)",
              border: "1px solid rgba(168,85,247,0.25)",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">💎</span>
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "rgba(168,85,247,0.7)" }}
              >
                Diamonds
              </span>
            </div>
            <p
              className="text-white font-bold text-2xl"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              {diamonds.toLocaleString()}
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              Creator earnings
            </p>
          </div>
        </motion.div>

        {/* Transaction History */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          >
            Transaction History
          </h2>

          {transactions.length === 0 ? (
            <motion.div
              data-ocid="wallet.empty_state"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <span className="text-3xl">💳</span>
              </div>
              <p className="text-white/60 font-semibold text-base mb-1">
                No transactions yet.
              </p>
              <p className="text-white/30 text-sm leading-relaxed max-w-xs">
                Your financial records will appear here.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2" data-ocid="wallet.list">
              {transactions.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  data-ocid={`wallet.item.${i + 1}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.12 + i * 0.04,
                    duration: 0.3,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="rounded-2xl p-4"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Type icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      {txTypeIcon(tx.type)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p
                          className="text-white font-semibold text-sm truncate"
                          style={{
                            fontFamily: "'Bricolage Grotesque', sans-serif",
                          }}
                        >
                          {tx.label}
                        </p>
                        <p
                          className="text-sm font-bold flex-shrink-0"
                          style={{ color: amountColorStyle(tx.amountColor) }}
                        >
                          {tx.amount}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p
                          className="text-[10px] font-mono truncate"
                          style={{ color: "rgba(255,255,255,0.25)" }}
                        >
                          {tx.transactionId}
                        </p>
                        <StatusBadge status={tx.status} />
                      </div>

                      <p
                        className="text-[11px] mt-1.5"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        {relativeTime(tx.timestamp)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
