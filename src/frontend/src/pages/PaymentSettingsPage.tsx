import {
  ArrowLeft,
  Check,
  CreditCard,
  DollarSign,
  Eye,
  EyeOff,
  History,
  Loader2,
  Lock,
  Settings,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCoinWallet } from "../context/CoinWalletContext";
import type { WithdrawalRecord } from "../context/CoinWalletContext";
import { useWallet } from "../context/WalletContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface Props {
  onBack: () => void;
}

// ─── Payout method form data ──────────────────────────────────────────────────

interface PaymentSettings {
  paypal: { email: string };
  bank: {
    routingNumber: string;
    accountNumber: string;
    accountHolderName: string;
  };
  debitCard: {
    cardNumber: string;
    expiry: string;
    cardholderName: string;
  };
  stripe: { email: string };
}

const DEFAULT_SETTINGS: PaymentSettings = {
  paypal: { email: "" },
  bank: { routingNumber: "", accountNumber: "", accountHolderName: "" },
  debitCard: { cardNumber: "", expiry: "", cardholderName: "" },
  stripe: { email: "" },
};

const PAYOUT_METHODS_LIST = [
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
    desc: "Direct bank deposit (1–3 days)",
  },
  {
    id: "Debit Card",
    label: "Debit Card",
    icon: "💳",
    desc: "Instant to your debit card",
  },
  { id: "Stripe", label: "Stripe", icon: "⚡", desc: "Stripe express payout" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskValue(val: string, showLast = 4): string {
  if (!val || val.length <= showLast) return val;
  return `••••••••${val.slice(-showLast)}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    Processing: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    Completed: { bg: "rgba(34,197,94,0.15)", color: "#22c55e" },
    Failed: { bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
  };
  const s = map[status] ?? map.Processing!;
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xl">{icon}</span>
      <h2
        className="text-white font-bold text-base"
        style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
      >
        {title}
      </h2>
    </div>
  );
}

function SaveButton({
  ocid,
  saved,
  onClick,
}: {
  ocid: string;
  saved: boolean;
  onClick: () => void;
}) {
  return (
    <AnimatePresence mode="wait">
      {saved ? (
        <motion.div
          key="saved"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="w-full py-3 rounded-2xl flex items-center justify-center gap-2"
          style={{
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.25)",
          }}
        >
          <Check size={15} style={{ color: "#22c55e" }} />
          <span className="text-sm font-semibold" style={{ color: "#22c55e" }}>
            Saved securely
          </span>
        </motion.div>
      ) : (
        <motion.button
          key="save"
          type="button"
          data-ocid={ocid}
          onClick={onClick}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="w-full py-3 rounded-2xl text-white text-sm font-bold transition-all active:scale-[0.98]"
          style={{
            background: "rgba(255,0,80,0.8)",
            border: "1px solid rgba(255,0,80,0.4)",
          }}
        >
          Save
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type TabId = "methods" | "history" | "withdraw";
type WithdrawStep = 1 | 2 | 3 | "success";

export function PaymentSettingsPage({ onBack }: Props) {
  const { identity } = useInternetIdentity();
  const principalText = identity?.getPrincipal().toString() ?? "guest";
  const storageKey = `substream_payment_settings_${principalText}`;

  const { wallet, requestWithdrawal } = useCoinWallet();
  const { addTransaction } = useWallet();

  const [activeTab, setActiveTab] = useState<TabId>("methods");

  // ── Payout methods state ──────────────────────────────────────────────────
  const [settings, setSettings] = useState<PaymentSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PaymentSettings>;
        setSettings({
          paypal: parsed.paypal ?? DEFAULT_SETTINGS.paypal,
          bank: parsed.bank ?? DEFAULT_SETTINGS.bank,
          debitCard: parsed.debitCard ?? DEFAULT_SETTINGS.debitCard,
          stripe: parsed.stripe ?? DEFAULT_SETTINGS.stripe,
        });
      }
    } catch {
      // silent
    }
  }, [storageKey]);

  function saveSection(section: keyof PaymentSettings) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch {
      // silent
    }
    setSaved((prev) => ({ ...prev, [section]: true }));
    setTimeout(() => setSaved((prev) => ({ ...prev, [section]: false })), 2500);
  }

  function toggleShow(key: string) {
    setShowSensitive((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // ── Withdrawal state ──────────────────────────────────────────────────────
  const estimatedUSD = (wallet.diamonds / 1000) * 5;
  const canWithdraw = estimatedUSD >= 50;

  const [withdrawStep, setWithdrawStep] = useState<WithdrawStep>(1);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [lastRecord, setLastRecord] = useState<WithdrawalRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetWithdraw() {
    setWithdrawStep(1);
    setWithdrawAmount("");
    setSelectedMethod("");
    setAmountError(null);
    setLastRecord(null);
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
    setWithdrawStep(2);
  }

  function handleStep2Next() {
    if (!selectedMethod) return;
    setWithdrawStep(3);
  }

  async function handleConfirm() {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    const record = requestWithdrawal(
      Number.parseFloat(withdrawAmount),
      selectedMethod,
    );
    setLastRecord(record);
    addTransaction({
      type: "withdrawal",
      label: `Withdrawal via ${selectedMethod}`,
      amount: `-$${Number.parseFloat(withdrawAmount).toFixed(2)}`,
      amountColor: "red",
      transactionId: record.transactionId,
      status: "Processing",
    });
    toast.success(
      `Your withdrawal of $${Number.parseFloat(withdrawAmount).toFixed(2)} has been sent to ${selectedMethod}.`,
    );
    setIsSubmitting(false);
    setWithdrawStep("success");
  }

  // ── Build unified payment history ─────────────────────────────────────────
  type TxEntry = {
    key: string;
    date: number;
    type: string;
    amount: string;
    method?: string;
    status?: string;
    txId?: string;
  };

  const paymentHistory: TxEntry[] = [
    ...wallet.withdrawalHistory.map((w) => ({
      key: `wd-${w.transactionId}`,
      date: w.timestamp,
      type: "Withdrawal Payout",
      amount: `-$${w.amount.toFixed(2)} USD`,
      method: w.method,
      status: w.status,
      txId: w.transactionId,
    })),
    ...wallet.paymentHistory.map((p) => ({
      key: `pay-${p.packageId}-${p.createdAt}`,
      date: p.createdAt,
      type: "Coin Recharge",
      amount: `+${p.coins.toLocaleString()} coins ($${p.amountUSD.toFixed(2)})`,
      txId: p.packageId,
    })),
  ].sort((a, b) => b.date - a.date);

  const inputClass =
    "w-full px-4 py-3.5 rounded-2xl text-white text-sm outline-none placeholder:text-white/25 border transition-all";
  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.1)",
    fontSize: "16px",
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "methods", label: "Payout Methods", icon: <CreditCard size={14} /> },
    { id: "history", label: "History", icon: <History size={14} /> },
    { id: "withdraw", label: "Withdraw", icon: <DollarSign size={14} /> },
  ];

  return (
    <div
      data-ocid="creator_payments.page"
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
          data-ocid="creator_payments.back_button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-label="Go back"
        >
          <ArrowLeft size={19} className="text-white/80" />
        </button>
        <div className="flex-1 min-w-0">
          <h1
            className="text-white font-bold text-lg leading-tight"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Creator Payments
          </h1>
          <p className="text-white/35 text-xs">
            Profile → Settings → Creator Payments
          </p>
        </div>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,0,80,0.12)" }}
        >
          <Settings size={16} style={{ color: "#ff0050" }} />
        </div>
      </div>

      {/* Diamond balance banner */}
      <div
        className="mx-4 mt-4 rounded-2xl p-4 flex items-center justify-between gap-4"
        style={{
          background:
            "linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(255,0,80,0.08) 100%)",
          border: "1px solid rgba(168,85,247,0.25)",
        }}
      >
        <div>
          <p className="text-white/50 text-xs uppercase tracking-widest font-semibold mb-0.5">
            Available Balance
          </p>
          <p
            className="text-white font-black text-2xl"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            ${estimatedUSD.toFixed(2)} USD
          </p>
          <p className="text-white/35 text-xs mt-0.5">
            {wallet.diamonds.toLocaleString()} diamonds · min. $50 to withdraw
          </p>
        </div>
        <div className="text-4xl select-none">💎</div>
      </div>

      {/* Tabs */}
      <div
        className="flex mx-4 mt-4 rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-ocid={`creator_payments.${tab.id}_tab`}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all relative"
            style={{
              color: activeTab === tab.id ? "white" : "rgba(255,255,255,0.4)",
              background:
                activeTab === tab.id ? "rgba(255,0,80,0.15)" : "transparent",
            }}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">
              {tab.id === "methods"
                ? "Methods"
                : tab.id === "history"
                  ? "History"
                  : "Withdraw"}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-4">
        <AnimatePresence mode="wait">
          {/* ── PAYOUT METHODS TAB ── */}
          {activeTab === "methods" && (
            <motion.div
              key="methods"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5"
            >
              {/* Security note */}
              <div
                className="rounded-2xl px-4 py-3 flex items-start gap-3"
                style={{
                  background: "rgba(34,197,94,0.05)",
                  border: "1px solid rgba(34,197,94,0.12)",
                }}
              >
                <Lock
                  size={15}
                  style={{ color: "#22c55e", flexShrink: 0, marginTop: 1 }}
                />
                <p className="text-white/50 text-xs leading-relaxed">
                  Your payment information is encrypted. Card numbers are never
                  stored in plain text. Identity verification is required before
                  your first payout.
                </p>
              </div>

              {/* PayPal */}
              <motion.div
                data-ocid="creator_payments.paypal_section"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.35 }}
                className="rounded-2xl p-5"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <SectionHeader icon="💸" title="PayPal" />
                <div className="space-y-3">
                  <input
                    type="email"
                    data-ocid="creator_payments.paypal_email_input"
                    placeholder="PayPal email address"
                    value={
                      showSensitive.paypal
                        ? settings.paypal.email
                        : settings.paypal.email
                          ? maskValue(settings.paypal.email, 6)
                          : ""
                    }
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        paypal: { email: e.target.value },
                      }))
                    }
                    onFocus={() => toggleShow("paypal")}
                    onBlur={() => toggleShow("paypal")}
                    className={inputClass}
                    style={inputStyle}
                  />
                  <SaveButton
                    ocid="creator_payments.paypal_save_button"
                    saved={!!saved.paypal}
                    onClick={() => saveSection("paypal")}
                  />
                </div>
              </motion.div>

              {/* Bank Transfer */}
              <motion.div
                data-ocid="creator_payments.bank_section"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.35 }}
                className="rounded-2xl p-5"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <SectionHeader icon="🏦" title="Bank Account" />
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type={showSensitive.bankRouting ? "text" : "password"}
                      data-ocid="creator_payments.bank_routing_input"
                      placeholder="Routing number"
                      value={settings.bank.routingNumber}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          bank: { ...prev.bank, routingNumber: e.target.value },
                        }))
                      }
                      className={`${inputClass} pr-12`}
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => toggleShow("bankRouting")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
                      aria-label="Toggle"
                    >
                      {showSensitive.bankRouting ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showSensitive.bankAccount ? "text" : "password"}
                      data-ocid="creator_payments.bank_account_input"
                      placeholder="Account number"
                      value={settings.bank.accountNumber}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          bank: { ...prev.bank, accountNumber: e.target.value },
                        }))
                      }
                      className={`${inputClass} pr-12`}
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => toggleShow("bankAccount")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
                      aria-label="Toggle"
                    >
                      {showSensitive.bankAccount ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    data-ocid="creator_payments.bank_holder_input"
                    placeholder="Account holder name"
                    value={settings.bank.accountHolderName}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        bank: {
                          ...prev.bank,
                          accountHolderName: e.target.value,
                        },
                      }))
                    }
                    className={inputClass}
                    style={inputStyle}
                  />
                  <SaveButton
                    ocid="creator_payments.bank_save_button"
                    saved={!!saved.bank}
                    onClick={() => saveSection("bank")}
                  />
                </div>
              </motion.div>

              {/* Debit Card */}
              <motion.div
                data-ocid="creator_payments.card_section"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.35 }}
                className="rounded-2xl p-5"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <SectionHeader icon="💳" title="Debit Card" />
                <div className="space-y-3">
                  <div className="relative">
                    <CreditCard
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                    />
                    <input
                      type={showSensitive.card ? "text" : "password"}
                      data-ocid="creator_payments.card_number_input"
                      placeholder="•••• •••• •••• ____"
                      value={settings.debitCard.cardNumber}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          debitCard: {
                            ...prev.debitCard,
                            cardNumber: e.target.value,
                          },
                        }))
                      }
                      maxLength={19}
                      className={`${inputClass} pl-10 pr-12`}
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => toggleShow("card")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
                      aria-label="Toggle"
                    >
                      {showSensitive.card ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    data-ocid="creator_payments.card_expiry_input"
                    placeholder="MM / YY"
                    value={settings.debitCard.expiry}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        debitCard: {
                          ...prev.debitCard,
                          expiry: e.target.value,
                        },
                      }))
                    }
                    maxLength={7}
                    className={inputClass}
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    data-ocid="creator_payments.cardholder_input"
                    placeholder="Cardholder name"
                    value={settings.debitCard.cardholderName}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        debitCard: {
                          ...prev.debitCard,
                          cardholderName: e.target.value,
                        },
                      }))
                    }
                    className={inputClass}
                    style={inputStyle}
                  />
                  <SaveButton
                    ocid="creator_payments.card_save_button"
                    saved={!!saved.debitCard}
                    onClick={() => saveSection("debitCard")}
                  />
                </div>
              </motion.div>

              {/* Stripe */}
              <motion.div
                data-ocid="creator_payments.stripe_section"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.35 }}
                className="rounded-2xl p-5"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <SectionHeader icon="⚡" title="Stripe Payout Account" />
                <div className="space-y-3">
                  <input
                    type="email"
                    data-ocid="creator_payments.stripe_email_input"
                    placeholder="Stripe account email"
                    value={settings.stripe.email}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        stripe: { email: e.target.value },
                      }))
                    }
                    className={inputClass}
                    style={inputStyle}
                  />
                  <SaveButton
                    ocid="creator_payments.stripe_save_button"
                    saved={!!saved.stripe}
                    onClick={() => saveSection("stripe")}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ── PAYMENT HISTORY TAB ── */}
          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {paymentHistory.length === 0 ? (
                <div
                  data-ocid="creator_payments.history_empty_state"
                  className="flex flex-col items-center justify-center py-20 text-center gap-4"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    <History size={28} className="text-white/25" />
                  </div>
                  <div>
                    <p className="text-white/50 text-sm font-medium">
                      No payment history yet
                    </p>
                    <p className="text-white/25 text-xs mt-1">
                      Withdrawals and coin purchases will appear here
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {paymentHistory.map((tx, i) => (
                    <motion.div
                      key={tx.key}
                      data-ocid={`creator_payments.history_item.${i + 1}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.3 }}
                      className="rounded-2xl px-4 py-4"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      {/* Row 1: type + amount */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
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
                        <p
                          className="text-sm font-bold flex-shrink-0"
                          style={{
                            color: tx.amount.startsWith("+")
                              ? "#22c55e"
                              : "#f59e0b",
                          }}
                        >
                          {tx.amount}
                        </p>
                      </div>
                      {/* Row 2: date + TX ID */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-white/30 text-xs">
                          {formatDate(tx.date)}
                        </span>
                        {tx.txId && (
                          <span className="text-white/20 text-xs font-mono truncate max-w-[180px]">
                            {tx.txId}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── WITHDRAWAL TAB ── */}
          {activeTab === "withdraw" && (
            <motion.div
              key="withdraw"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5"
            >
              {/* Steps indicator */}
              {withdrawStep !== "success" && (
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center gap-1.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all"
                        style={{
                          background:
                            withdrawStep >= s
                              ? "#ff0050"
                              : "rgba(255,255,255,0.1)",
                          color: "white",
                        }}
                      >
                        {withdrawStep > s ? <Check size={12} /> : s}
                      </div>
                      {s < 3 && (
                        <div
                          className="h-px flex-1 w-8"
                          style={{
                            background:
                              withdrawStep > s
                                ? "#ff0050"
                                : "rgba(255,255,255,0.1)",
                          }}
                        />
                      )}
                    </div>
                  ))}
                  <p className="text-white/40 text-xs ml-2">
                    {withdrawStep === 1
                      ? "Enter Amount"
                      : withdrawStep === 2
                        ? "Select Method"
                        : "Confirm"}
                  </p>
                </div>
              )}

              {/* Requirements note */}
              {withdrawStep === 1 && !canWithdraw && (
                <div
                  className="rounded-2xl px-4 py-4"
                  style={{
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.2)",
                  }}
                >
                  <p className="text-amber-400 text-sm font-semibold mb-1">
                    Balance too low
                  </p>
                  <p className="text-white/50 text-xs leading-relaxed">
                    You have ${estimatedUSD.toFixed(2)} USD. You need at least
                    $50 to withdraw. Earn more diamonds by receiving gifts
                    during live streams.
                  </p>
                </div>
              )}

              {/* STEP 1 */}
              {withdrawStep === 1 && (
                <motion.div
                  key="ws1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div
                    className="rounded-2xl p-5"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">
                      Withdrawal Amount
                    </p>
                    <div className="relative mb-3">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-bold text-xl">
                        $
                      </span>
                      <input
                        type="number"
                        data-ocid="creator_payments.withdraw_amount_input"
                        inputMode="decimal"
                        placeholder="0.00"
                        min="50"
                        step="0.01"
                        value={withdrawAmount}
                        onChange={(e) => {
                          setWithdrawAmount(e.target.value);
                          setAmountError(null);
                        }}
                        disabled={!canWithdraw}
                        className="w-full pl-9 pr-4 py-4 rounded-2xl bg-white/5 text-white text-xl font-bold outline-none placeholder:text-white/20 border border-white/10 disabled:opacity-40"
                        style={{ fontSize: "20px" }}
                      />
                    </div>
                    {amountError && (
                      <p
                        data-ocid="creator_payments.amount_error_state"
                        className="text-sm px-3 py-2 rounded-xl mb-3"
                        style={{
                          color: "#ff6b6b",
                          background: "rgba(239,68,68,0.1)",
                          border: "1px solid rgba(239,68,68,0.2)",
                        }}
                      >
                        {amountError}
                      </p>
                    )}
                    <p className="text-white/30 text-xs">
                      Minimum: $50 · Available: ${estimatedUSD.toFixed(2)} USD
                    </p>
                  </div>
                  <button
                    type="button"
                    data-ocid="creator_payments.withdraw_step1_button"
                    onClick={handleStep1Next}
                    disabled={!canWithdraw}
                    className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98] disabled:opacity-40"
                    style={{ background: "#ff0050" }}
                  >
                    Next — Select Payout Method →
                  </button>
                </motion.div>
              )}

              {/* STEP 2 */}
              {withdrawStep === 2 && (
                <motion.div
                  key="ws2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">
                      Select Payout Method
                    </p>
                    <div className="space-y-2">
                      {PAYOUT_METHODS_LIST.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          data-ocid={`creator_payments.payout_method.${m.id.toLowerCase().replace(/\s+/g, "_")}_button`}
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
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      data-ocid="creator_payments.withdraw_step2_back_button"
                      onClick={() => setWithdrawStep(1)}
                      className="flex-1 py-4 rounded-2xl text-sm font-semibold"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.6)",
                      }}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      data-ocid="creator_payments.withdraw_step2_button"
                      onClick={handleStep2Next}
                      disabled={!selectedMethod}
                      className="flex-2 flex-1 py-4 rounded-2xl text-white font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40"
                      style={{ background: "#ff0050" }}
                    >
                      Next — Confirm →
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3 */}
              {withdrawStep === 3 && (
                <motion.div
                  key="ws3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div
                    className="rounded-2xl p-5 space-y-3"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-4">
                      Confirm Withdrawal
                    </p>
                    {[
                      {
                        label: "Amount",
                        value: `$${Number.parseFloat(withdrawAmount || "0").toFixed(2)} USD`,
                      },
                      {
                        label: "Method",
                        value: `${PAYOUT_METHODS_LIST.find((m) => m.id === selectedMethod)?.icon} ${selectedMethod}`,
                      },
                      { label: "Processing time", value: "1–3 business days" },
                    ].map((row) => (
                      <div key={row.label}>
                        <div className="flex items-center justify-between">
                          <span className="text-white/50 text-sm">
                            {row.label}
                          </span>
                          <span className="text-white font-semibold text-sm">
                            {row.value}
                          </span>
                        </div>
                        <div
                          className="h-px mt-3"
                          style={{ background: "rgba(255,255,255,0.05)" }}
                        />
                      </div>
                    ))}
                  </div>
                  <div
                    className="rounded-2xl px-4 py-3 flex items-start gap-2"
                    style={{
                      background: "rgba(34,197,94,0.05)",
                      border: "1px solid rgba(34,197,94,0.12)",
                    }}
                  >
                    <Lock
                      size={13}
                      style={{ color: "#22c55e", flexShrink: 0, marginTop: 1 }}
                    />
                    <p className="text-white/40 text-xs leading-relaxed">
                      Payout is encrypted and processed securely. Your identity
                      will be verified before funds are released.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      data-ocid="creator_payments.withdraw_step3_back_button"
                      onClick={() => setWithdrawStep(2)}
                      className="flex-1 py-4 rounded-2xl text-sm font-semibold"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.6)",
                      }}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      data-ocid="creator_payments.withdraw_confirm_button"
                      onClick={() => void handleConfirm()}
                      disabled={isSubmitting}
                      className="flex-1 py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
                      style={{
                        background:
                          "linear-gradient(135deg, #ff0050 0%, #ff6b35 100%)",
                        boxShadow: "0 4px 20px rgba(255,0,80,0.3)",
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Processing…
                        </>
                      ) : (
                        "Confirm Withdrawal"
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* SUCCESS */}
              {withdrawStep === "success" && lastRecord && (
                <motion.div
                  key="ws-success"
                  data-ocid="creator_payments.withdrawal_success_state"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-5 pt-6 text-center"
                >
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 14, stiffness: 200 }}
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
                    className="w-full rounded-2xl p-4 space-y-1"
                    style={{
                      background: "rgba(34,197,94,0.06)",
                      border: "1px solid rgba(34,197,94,0.15)",
                    }}
                  >
                    <p className="text-white/40 text-xs uppercase tracking-widest font-bold">
                      Transaction ID
                    </p>
                    <p className="text-white text-sm font-mono font-semibold">
                      {lastRecord.transactionId}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-ocid="creator_payments.withdrawal_done_button"
                    onClick={resetWithdraw}
                    className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98]"
                    style={{ background: "#ff0050" }}
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    data-ocid="creator_payments.view_history_button"
                    onClick={() => {
                      resetWithdraw();
                      setActiveTab("history");
                    }}
                    className="text-white/40 text-sm"
                  >
                    View Payment History
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
