import {
  ArrowLeft,
  Check,
  ChevronRight,
  CreditCard,
  DollarSign,
  Gift,
  Loader2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useCoinWallet } from "../context/CoinWalletContext";
import type { WithdrawalRecord } from "../context/CoinWalletContext";
import { useWallet } from "../context/WalletContext";

interface Props {
  onBack: () => void;
  onOpenPaymentSettings: () => void;
}

const PAYOUT_METHODS = [
  {
    id: "PayPal",
    label: "PayPal",
    icon: "💸",
    desc: "Sent to your PayPal email",
  },
  {
    id: "Bank Transfer",
    label: "Bank Transfer",
    icon: "🏦",
    desc: "Direct bank deposit (1-3 days)",
  },
  {
    id: "Debit Card",
    label: "Debit Card",
    icon: "💳",
    desc: "Instant to your debit card",
  },
  {
    id: "Stripe",
    label: "Stripe",
    icon: "⚡",
    desc: "Stripe express payout",
  },
];

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    Processing: {
      bg: "rgba(245,158,11,0.15)",
      color: "#f59e0b",
      label: "Processing",
    },
    Completed: {
      bg: "rgba(34,197,94,0.15)",
      color: "#22c55e",
      label: "Completed",
    },
    Failed: {
      bg: "rgba(239,68,68,0.15)",
      color: "#ef4444",
      label: "Failed",
    },
  };
  const s = map[status] ?? map.Processing!;
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

type WithdrawStep = 1 | 2 | 3 | "success";

export function CreatorEarningsPage({ onBack, onOpenPaymentSettings }: Props) {
  const { wallet, requestWithdrawal } = useCoinWallet();
  const { addTransaction } = useWallet();

  const estimatedUSD = (wallet.diamonds / 1000) * 5;
  const canWithdraw = estimatedUSD >= 50;

  // Withdrawal sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [step, setStep] = useState<WithdrawStep>(1);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [lastRecord, setLastRecord] = useState<WithdrawalRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function openSheet() {
    setStep(1);
    setWithdrawAmount("");
    setSelectedMethod("");
    setAmountError(null);
    setLastRecord(null);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
  }

  function handleStep1Next() {
    const amt = Number.parseFloat(withdrawAmount);
    if (Number.isNaN(amt) || amt < 50) {
      setAmountError("Minimum withdrawal is $50 USD.");
      return;
    }
    if (amt > estimatedUSD) {
      setAmountError(`You only have $${estimatedUSD.toFixed(2)} available.`);
      return;
    }
    setAmountError(null);
    setStep(2);
  }

  function handleStep2Next() {
    if (!selectedMethod) return;
    setStep(3);
  }

  async function handleConfirm() {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200)); // Simulate processing
    const record = requestWithdrawal(
      Number.parseFloat(withdrawAmount),
      selectedMethod,
    );
    setLastRecord(record);
    // Record in wallet transaction log
    addTransaction({
      type: "withdrawal",
      label: `Withdrawal via ${selectedMethod}`,
      amount: `-$${Number.parseFloat(withdrawAmount).toFixed(2)}`,
      amountColor: "red",
      transactionId: record.transactionId,
      status: "Processing",
    });
    // Show payout confirmation toast
    toast.success(
      `Your withdrawal of $${Number.parseFloat(withdrawAmount).toFixed(2)} has been sent.`,
    );
    setIsSubmitting(false);
    setStep("success");
  }

  // Build unified transaction list
  type TxEntry = {
    key: string;
    date: number;
    type: string;
    amount: string;
    status?: string;
    txId?: string;
    method?: string;
  };

  const transactions: TxEntry[] = [
    ...wallet.giftHistory.map((g, i) => ({
      key: `gift-${g.sentAt}-${i}`,
      date: g.sentAt,
      type: "Gift Sent",
      amount: `-${g.coinCost.toLocaleString()} coins`,
      txId: undefined,
    })),
    ...wallet.paymentHistory.map((p) => ({
      key: `pay-${p.packageId}-${p.createdAt}`,
      date: p.createdAt,
      type: "Coin Purchase",
      amount: `+${p.coins.toLocaleString()} coins ($${p.amountUSD.toFixed(2)})`,
      txId: p.packageId,
    })),
    ...wallet.withdrawalHistory.map((w) => ({
      key: `wd-${w.transactionId}`,
      date: w.timestamp,
      type: "Withdrawal",
      amount: `-$${w.amount.toFixed(2)} USD`,
      status: w.status,
      txId: w.transactionId,
      method: w.method,
    })),
  ].sort((a, b) => b.date - a.date);

  return (
    <div
      data-ocid="earnings.page"
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
          data-ocid="earnings.back_button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-label="Go back"
        >
          <ArrowLeft size={19} className="text-white/80" />
        </button>
        <h1
          className="text-white font-bold text-lg"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Creator Earnings
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-5 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              icon: "💎",
              label: "Diamonds",
              value: wallet.diamonds.toLocaleString(),
              accent: "#a855f7",
              bg: "rgba(168,85,247,0.1)",
              border: "rgba(168,85,247,0.2)",
            },
            {
              icon: "💵",
              label: "Est. Value",
              value: `$${estimatedUSD.toFixed(2)} USD`,
              accent: "#22c55e",
              bg: "rgba(34,197,94,0.1)",
              border: "rgba(34,197,94,0.2)",
            },
            {
              icon: "🎁",
              label: "Gifts Received",
              value: wallet.giftHistory.length.toLocaleString(),
              accent: "#ff0050",
              bg: "rgba(255,0,80,0.1)",
              border: "rgba(255,0,80,0.2)",
            },
            {
              icon: "💸",
              label: "Total Withdrawn",
              value: `$${(wallet.totalWithdrawn ?? 0).toFixed(2)}`,
              accent: "#f59e0b",
              bg: "rgba(245,158,11,0.1)",
              border: "rgba(245,158,11,0.2)",
            },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              data-ocid={`earnings.summary_card.${i + 1}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: i * 0.07,
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="rounded-2xl p-4 flex flex-col gap-2"
              style={{
                background: card.bg,
                border: `1px solid ${card.border}`,
              }}
            >
              <span className="text-2xl">{card.icon}</span>
              <div>
                <p
                  className="text-lg font-black leading-tight"
                  style={{ color: card.accent }}
                >
                  {card.value}
                </p>
                <p className="text-white/50 text-xs mt-0.5">{card.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Conversion rate note */}
        <div
          className="rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span className="text-lg">ℹ️</span>
          <p className="text-white/50 text-xs leading-relaxed">
            1,000 diamonds = $5 USD · Minimum withdrawal: $50 USD
          </p>
        </div>

        {/* Pending withdrawals */}
        {(wallet.pendingWithdrawals ?? []).length > 0 && (
          <div>
            <h2 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">
              Pending Payouts
            </h2>
            <div className="space-y-2">
              {(wallet.pendingWithdrawals ?? []).map((w, i) => (
                <div
                  key={w.id}
                  data-ocid={`earnings.pending_item.${i + 1}`}
                  className="rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3"
                  style={{
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.2)",
                  }}
                >
                  <div>
                    <p className="text-white text-sm font-semibold">
                      ${w.amount.toFixed(2)} · {w.method}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {w.transactionId}
                    </p>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Withdraw button */}
        <div className="flex flex-col gap-3">
          <motion.button
            type="button"
            data-ocid="earnings.withdraw_button"
            onClick={openSheet}
            disabled={!canWithdraw}
            className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
            style={{
              background: canWithdraw
                ? "linear-gradient(135deg, #ff0050 0%, #ff6b35 100%)"
                : "rgba(255,255,255,0.1)",
              boxShadow: canWithdraw
                ? "0 4px 24px rgba(255,0,80,0.35)"
                : "none",
            }}
            whileTap={{ scale: 0.98 }}
          >
            <DollarSign size={18} />
            Withdraw Earnings
          </motion.button>
          {!canWithdraw && (
            <p className="text-center text-white/40 text-xs">
              Minimum $50 USD to withdraw · You have ${estimatedUSD.toFixed(2)}
            </p>
          )}

          {/* Payment settings link */}
          <button
            type="button"
            data-ocid="earnings.payment_settings_button"
            onClick={onOpenPaymentSettings}
            className="w-full py-3.5 rounded-2xl flex items-center justify-between px-4 transition-all active:scale-[0.98]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center gap-3">
              <CreditCard size={18} className="text-white/60" />
              <span className="text-white/80 text-sm font-medium">
                Payment Settings
              </span>
            </div>
            <ChevronRight size={16} className="text-white/30" />
          </button>
        </div>

        {/* Transaction history */}
        <div>
          <h2 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">
            Transaction History
          </h2>
          {transactions.length === 0 ? (
            <div
              data-ocid="earnings.transactions_empty_state"
              className="flex flex-col items-center py-12 gap-3 text-center"
            >
              <Gift size={36} className="text-white/20" strokeWidth={1.5} />
              <p className="text-white/40 text-sm">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 50).map((tx, i) => (
                <div
                  key={tx.key}
                  data-ocid={`earnings.transaction.item.${i + 1}`}
                  className="rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white text-sm font-semibold">
                        {tx.type}
                      </p>
                      {tx.method && (
                        <span className="text-white/40 text-xs">
                          · {tx.method}
                        </span>
                      )}
                      {tx.status && <StatusBadge status={tx.status} />}
                    </div>
                    <p className="text-white/35 text-xs mt-0.5 truncate">
                      {formatDate(tx.date)}
                      {tx.txId ? ` · ${tx.txId}` : ""}
                    </p>
                  </div>
                  <p
                    className="text-sm font-bold flex-shrink-0"
                    style={{
                      color: tx.amount.startsWith("+")
                        ? "#22c55e"
                        : tx.amount.startsWith("-$")
                          ? "#f59e0b"
                          : "#ff6b6b",
                    }}
                  >
                    {tx.amount}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── WITHDRAWAL SHEET ─── */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[70]"
              style={{ background: "rgba(0,0,0,0.7)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={step === "success" ? closeSheet : undefined}
              role="presentation"
            />
            <motion.div
              data-ocid="earnings.withdrawal_sheet"
              className="fixed bottom-0 left-0 right-0 z-[80] rounded-t-3xl overflow-hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              style={{
                background: "linear-gradient(to bottom, #1a1a1a, #111)",
                maxHeight: "90vh",
              }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: "82vh" }}>
                {/* Step indicator (only steps 1-3) */}
                {step !== "success" && (
                  <div className="px-5 pb-3 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center gap-1">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all"
                            style={{
                              background:
                                step >= s ? "#ff0050" : "rgba(255,255,255,0.1)",
                              color: "white",
                            }}
                          >
                            {s}
                          </div>
                          {s < 3 && (
                            <div
                              className="flex-1 h-px w-8"
                              style={{
                                background:
                                  step > s
                                    ? "#ff0050"
                                    : "rgba(255,255,255,0.1)",
                              }}
                            />
                          )}
                        </div>
                      ))}
                      <p className="text-white/50 text-xs ml-1">
                        {step === 1
                          ? "Amount"
                          : step === 2
                            ? "Method"
                            : "Confirm"}
                      </p>
                    </div>
                  </div>
                )}

                {/* ── STEP 1: Enter amount ── */}
                {step === 1 && (
                  <div className="px-5 pt-5 pb-8 space-y-4">
                    <div>
                      <h3
                        className="text-white font-bold text-lg"
                        style={{
                          fontFamily: "'Bricolage Grotesque', sans-serif",
                        }}
                      >
                        Enter Amount
                      </h3>
                      <p className="text-white/40 text-sm mt-0.5">
                        Available: ${estimatedUSD.toFixed(2)} USD
                      </p>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-bold text-xl">
                        $
                      </span>
                      <input
                        type="number"
                        data-ocid="earnings.amount_input"
                        inputMode="decimal"
                        placeholder="0.00"
                        min="50"
                        step="0.01"
                        value={withdrawAmount}
                        onChange={(e) => {
                          setWithdrawAmount(e.target.value);
                          setAmountError(null);
                        }}
                        className="w-full pl-9 pr-4 py-4 rounded-2xl bg-white/5 text-white text-xl font-bold outline-none placeholder:text-white/20 border border-white/10"
                        style={{ fontSize: "20px" }}
                      />
                    </div>
                    {amountError && (
                      <p
                        data-ocid="earnings.amount_error_state"
                        className="text-sm px-3 py-2 rounded-xl"
                        style={{
                          color: "#ff6b6b",
                          background: "rgba(239,68,68,0.1)",
                          border: "1px solid rgba(239,68,68,0.2)",
                        }}
                      >
                        {amountError}
                      </p>
                    )}
                    <button
                      type="button"
                      data-ocid="earnings.step1_next_button"
                      onClick={handleStep1Next}
                      className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98]"
                      style={{ background: "#ff0050" }}
                    >
                      Next →
                    </button>
                    <button
                      type="button"
                      data-ocid="earnings.withdrawal_cancel_button"
                      onClick={closeSheet}
                      className="w-full py-3 text-white/40 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* ── STEP 2: Select method ── */}
                {step === 2 && (
                  <div className="px-5 pt-5 pb-8 space-y-4">
                    <div>
                      <h3
                        className="text-white font-bold text-lg"
                        style={{
                          fontFamily: "'Bricolage Grotesque', sans-serif",
                        }}
                      >
                        Select Payout Method
                      </h3>
                      <p className="text-white/40 text-sm mt-0.5">
                        Withdrawing $
                        {Number.parseFloat(withdrawAmount || "0").toFixed(2)}{" "}
                        USD
                      </p>
                    </div>
                    <div className="space-y-2">
                      {PAYOUT_METHODS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          data-ocid={`earnings.payout_method.${m.id.toLowerCase().replace(/\s+/g, "_")}_button`}
                          onClick={() => setSelectedMethod(m.id)}
                          className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all active:scale-[0.98]"
                          style={{
                            background:
                              selectedMethod === m.id
                                ? "rgba(255,0,80,0.12)"
                                : "rgba(255,255,255,0.04)",
                            border:
                              selectedMethod === m.id
                                ? "1.5px solid rgba(255,0,80,0.5)"
                                : "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <span className="text-2xl">{m.icon}</span>
                          <div className="flex-1">
                            <p className="text-white text-sm font-semibold">
                              {m.label}
                            </p>
                            <p className="text-white/40 text-xs mt-0.5">
                              {m.desc}
                            </p>
                          </div>
                          {selectedMethod === m.id && (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: "#ff0050" }}
                            >
                              <Check size={12} className="text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      data-ocid="earnings.step2_next_button"
                      onClick={handleStep2Next}
                      disabled={!selectedMethod}
                      className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98] disabled:opacity-40"
                      style={{ background: "#ff0050" }}
                    >
                      Next →
                    </button>
                    <button
                      type="button"
                      data-ocid="earnings.step2_back_button"
                      onClick={() => setStep(1)}
                      className="w-full py-3 text-white/40 text-sm"
                    >
                      ← Back
                    </button>
                  </div>
                )}

                {/* ── STEP 3: Confirm ── */}
                {step === 3 && (
                  <div className="px-5 pt-5 pb-8 space-y-4">
                    <h3
                      className="text-white font-bold text-lg"
                      style={{
                        fontFamily: "'Bricolage Grotesque', sans-serif",
                      }}
                    >
                      Confirm Withdrawal
                    </h3>
                    <div
                      className="rounded-2xl p-5 space-y-3"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white/50 text-sm">Amount</span>
                        <span className="text-white font-bold text-lg">
                          ${Number.parseFloat(withdrawAmount || "0").toFixed(2)}{" "}
                          USD
                        </span>
                      </div>
                      <div
                        className="h-px"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-white/50 text-sm">Method</span>
                        <span className="text-white font-semibold text-sm">
                          {
                            PAYOUT_METHODS.find((m) => m.id === selectedMethod)
                              ?.icon
                          }{" "}
                          {selectedMethod}
                        </span>
                      </div>
                      <div
                        className="h-px"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-white/50 text-sm">
                          Processing time
                        </span>
                        <span className="text-white/70 text-sm">1-3 days</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      data-ocid="earnings.confirm_withdrawal_button"
                      onClick={() => void handleConfirm()}
                      disabled={isSubmitting}
                      className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
                      style={{
                        background:
                          "linear-gradient(135deg, #ff0050 0%, #ff6b35 100%)",
                        boxShadow: "0 4px 20px rgba(255,0,80,0.35)",
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Processing…
                        </>
                      ) : (
                        "Confirm Withdrawal"
                      )}
                    </button>
                    <button
                      type="button"
                      data-ocid="earnings.step3_back_button"
                      onClick={() => setStep(2)}
                      className="w-full py-3 text-white/40 text-sm"
                    >
                      ← Back
                    </button>
                  </div>
                )}

                {/* ── SUCCESS ── */}
                {step === "success" && lastRecord && (
                  <div
                    data-ocid="earnings.withdrawal_success_state"
                    className="px-5 pt-8 pb-10 flex flex-col items-center gap-5 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: "spring",
                        damping: 14,
                        stiffness: 200,
                      }}
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{
                        background: "rgba(34,197,94,0.15)",
                        border: "2px solid rgba(34,197,94,0.4)",
                      }}
                    >
                      <Check size={36} style={{ color: "#22c55e" }} />
                    </motion.div>
                    <div>
                      <h3
                        className="text-white font-bold text-xl mb-2"
                        style={{
                          fontFamily: "'Bricolage Grotesque', sans-serif",
                        }}
                      >
                        Payout Requested!
                      </h3>
                      <p className="text-white/60 text-sm leading-relaxed max-w-xs">
                        Your payout of ${lastRecord.amount.toFixed(2)} has been
                        sent to {lastRecord.method}.
                      </p>
                    </div>
                    <div
                      className="w-full rounded-2xl p-4 space-y-2"
                      style={{
                        background: "rgba(34,197,94,0.06)",
                        border: "1px solid rgba(34,197,94,0.15)",
                      }}
                    >
                      <p className="text-white/50 text-xs uppercase tracking-widest font-bold">
                        Transaction ID
                      </p>
                      <p className="text-white text-sm font-mono font-semibold">
                        {lastRecord.transactionId}
                      </p>
                    </div>
                    <button
                      type="button"
                      data-ocid="earnings.success_close_button"
                      onClick={closeSheet}
                      className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98]"
                      style={{ background: "#ff0050" }}
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Close button (always visible) */}
      <AnimatePresence>
        {sheetOpen && step !== "success" && (
          <button
            type="button"
            data-ocid="earnings.sheet_close_button"
            onClick={closeSheet}
            className="fixed top-16 right-4 z-[90] w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.1)" }}
            aria-label="Close"
          >
            <X size={16} className="text-white/60" />
          </button>
        )}
      </AnimatePresence>
    </div>
  );
}
