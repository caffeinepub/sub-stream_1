import { ArrowLeft, Check, CreditCard, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useCoinWallet } from "../context/CoinWalletContext";

// ─── Coin packages ─────────────────────────────────────────────────────────────

const COIN_PACKAGES = [
  {
    id: "pkg_100",
    coins: 100,
    priceUSD: 0.99,
    label: "Starter",
    badge: null,
  },
  {
    id: "pkg_500",
    coins: 500,
    priceUSD: 4.99,
    label: "Popular",
    badge: null,
  },
  {
    id: "pkg_1000",
    coins: 1000,
    priceUSD: 9.99,
    label: "Best Value",
    badge: "BEST VALUE",
  },
  {
    id: "pkg_5000",
    coins: 5000,
    priceUSD: 49.99,
    label: "Pro",
    badge: null,
  },
  {
    id: "pkg_10000",
    coins: 10000,
    priceUSD: 99.99,
    label: "Elite",
    badge: null,
  },
] as const;

const USD_TO_COINS = 100; // $1 = 100 coins

function formatCoins(n: number): string {
  return n >= 1000
    ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
    : String(n);
}

// ─── Stripe-style payment modal ────────────────────────────────────────────────

interface PaymentModalProps {
  coins: number;
  priceUSD: number;
  packageId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function PaymentModal({
  coins,
  priceUSD,
  packageId,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const { addCoins, recordPayment } = useCoinWallet();
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handlePay = async () => {
    if (!cardNumber || !expiry || !cvc) return;
    setProcessing(true);
    // Simulate Stripe processing
    await new Promise((r) => setTimeout(r, 1500));
    addCoins(coins);
    recordPayment({
      amountUSD: priceUSD,
      coins,
      createdAt: Date.now(),
      packageId,
    });
    setProcessing(false);
    setSuccess(true);
    setTimeout(() => {
      onSuccess();
    }, 1200);
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[90]"
        style={{ background: "rgba(0,0,0,0.75)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={!processing ? onClose : undefined}
        role="presentation"
      />

      {/* Sheet */}
      <motion.div
        data-ocid="recharge.payment_modal"
        className="fixed bottom-0 left-0 right-0 z-[100] rounded-t-3xl overflow-hidden pb-10"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        style={{ background: "#111" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Success state */}
        <AnimatePresence>
          {success && (
            <motion.div
              data-ocid="recharge.success_state"
              className="flex flex-col items-center justify-center py-12 gap-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(34,197,94,0.2)",
                  border: "2px solid #22c55e",
                }}
              >
                <Check size={28} stroke="#22c55e" strokeWidth={2.5} />
              </div>
              <p className="text-white font-bold text-lg">
                Payment Successful!
              </p>
              <p className="text-white/60 text-sm">
                {formatCoins(coins)} coins added to your wallet 🪙
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {!success && (
          <div className="px-5 pt-2">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-bold text-lg">Secure Payment</h3>
                <p className="text-white/50 text-sm mt-0.5">
                  🪙 {formatCoins(coins)} coins — ${priceUSD.toFixed(2)} USD
                </p>
              </div>
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.25)",
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-green-400 text-xs font-bold">
                  Secured by Stripe
                </span>
              </div>
            </div>

            {/* Card number */}
            <div className="space-y-3 mb-5">
              <div
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <CreditCard
                  size={18}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth={1.5}
                />
                <input
                  data-ocid="recharge.card_number_input"
                  type="text"
                  inputMode="numeric"
                  placeholder="Card number"
                  value={cardNumber}
                  onChange={(e) =>
                    setCardNumber(formatCardNumber(e.target.value))
                  }
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
                  style={{ fontSize: "16px" }}
                />
              </div>

              <div className="flex gap-3">
                <div
                  className="flex-1 flex items-center px-4 py-3.5 rounded-2xl"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <input
                    data-ocid="recharge.expiry_input"
                    type="text"
                    inputMode="numeric"
                    placeholder="MM / YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
                    style={{ fontSize: "16px" }}
                  />
                </div>
                <div
                  className="flex-1 flex items-center px-4 py-3.5 rounded-2xl"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <input
                    data-ocid="recharge.cvc_input"
                    type="text"
                    inputMode="numeric"
                    placeholder="CVC"
                    value={cvc}
                    onChange={(e) =>
                      setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
                    style={{ fontSize: "16px" }}
                  />
                </div>
              </div>
            </div>

            {/* Payment methods */}
            <div className="flex items-center gap-2 mb-5">
              <span className="text-white/30 text-xs">Also pay with</span>
              {["💳", "🍎", "G"].map((m) => (
                <div
                  key={m}
                  className="w-10 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  {m}
                </div>
              ))}
            </div>

            {/* Pay button */}
            <button
              type="button"
              data-ocid="recharge.pay_button"
              onClick={() => void handlePay()}
              disabled={processing || !cardNumber || !expiry || !cvc}
              className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background:
                  processing || !cardNumber || !expiry || !cvc
                    ? "rgba(255,0,80,0.3)"
                    : "#ff0050",
              }}
            >
              {processing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Processing…
                </>
              ) : (
                `Pay $${priceUSD.toFixed(2)}`
              )}
            </button>

            <p className="text-white/25 text-xs text-center mt-3">
              Payments processed securely. No card details stored.
            </p>
          </div>
        )}
      </motion.div>
    </>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

interface CoinRechargePageProps {
  onBack: () => void;
}

export function CoinRechargePage({ onBack }: CoinRechargePageProps) {
  const { coinBalance } = useCoinWallet();
  const [selectedPackage, setSelectedPackage] = useState<
    (typeof COIN_PACKAGES)[number] | null
  >(null);
  const [customAmount, setCustomAmount] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [pendingCoins, setPendingCoins] = useState(0);
  const [pendingPrice, setPendingPrice] = useState(0);
  const [pendingPackageId, setPendingPackageId] = useState("");

  const customCoins =
    customAmount && !Number.isNaN(Number(customAmount))
      ? Math.floor(Number(customAmount) * USD_TO_COINS)
      : 0;

  const handleSelectPackage = (pkg: (typeof COIN_PACKAGES)[number]) => {
    setSelectedPackage(pkg);
    setCustomAmount("");
  };

  const handleRecharge = () => {
    if (customAmount && customCoins > 0) {
      setPendingCoins(customCoins);
      setPendingPrice(Number(customAmount));
      setPendingPackageId("pkg_custom");
      setPaymentOpen(true);
      return;
    }
    if (selectedPackage) {
      setPendingCoins(selectedPackage.coins);
      setPendingPrice(selectedPackage.priceUSD);
      setPendingPackageId(selectedPackage.id);
      setPaymentOpen(true);
    }
  };

  const effectiveCoins =
    customAmount && customCoins > 0
      ? customCoins
      : (selectedPackage?.coins ?? 0);
  const effectivePrice =
    customAmount && customCoins > 0
      ? Number(customAmount)
      : (selectedPackage?.priceUSD ?? 0);

  return (
    <div
      data-ocid="recharge.page"
      className="fixed inset-0 bg-black overflow-y-auto"
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 pt-12 pb-4"
        style={{
          background: "rgba(0,0,0,0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          type="button"
          data-ocid="recharge.back_button"
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          aria-label="Go back"
        >
          <ArrowLeft size={20} stroke="white" strokeWidth={2} />
        </button>

        <h1
          className="text-white font-bold text-lg"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Recharge Coins
        </h1>

        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{
            background: "rgba(245,158,11,0.15)",
            border: "1px solid rgba(245,158,11,0.3)",
          }}
        >
          <span className="text-base leading-none">🪙</span>
          <span className="font-bold text-sm" style={{ color: "#f59e0b" }}>
            {coinBalance.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-5 space-y-6 pb-32">
        {/* Subtitle */}
        <div className="text-center">
          <p className="text-white/50 text-sm">
            1 coin = $0.01 USD · Pay securely via Stripe
          </p>
          <p className="text-white/30 text-xs mt-1">
            Coins convert to gifts for your favourite creators
          </p>
        </div>

        {/* Package grid */}
        <div>
          <h2 className="text-white font-bold text-sm mb-3 opacity-70 uppercase tracking-wider">
            Coin Packages
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {COIN_PACKAGES.map((pkg) => {
              const isSelected = selectedPackage?.id === pkg.id;
              return (
                <motion.button
                  key={pkg.id}
                  type="button"
                  data-ocid="recharge.package_button"
                  onClick={() => handleSelectPackage(pkg)}
                  whileTap={{ scale: 0.97 }}
                  className="relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all"
                  style={{
                    background: isSelected
                      ? "rgba(255,0,80,0.12)"
                      : "rgba(255,255,255,0.04)",
                    border: isSelected
                      ? "1.5px solid rgba(255,0,80,0.5)"
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {pkg.badge && (
                    <div
                      className="absolute -top-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider"
                      style={{
                        background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                        color: "#000",
                      }}
                    >
                      {pkg.badge}
                    </div>
                  )}

                  <span className="text-3xl">🪙</span>

                  <div className="text-center">
                    <p
                      className="text-2xl font-black"
                      style={{
                        color: isSelected ? "#ff0050" : "white",
                        fontFamily: "'Bricolage Grotesque', sans-serif",
                      }}
                    >
                      {formatCoins(pkg.coins)}
                    </p>
                    <p className="text-white/40 text-[11px]">coins</p>
                  </div>

                  <div
                    className="px-3 py-1 rounded-full text-sm font-bold"
                    style={{
                      background: isSelected
                        ? "#ff0050"
                        : "rgba(255,255,255,0.08)",
                      color: isSelected ? "white" : "rgba(255,255,255,0.7)",
                    }}
                  >
                    ${pkg.priceUSD.toFixed(2)}
                  </div>

                  {isSelected && (
                    <motion.div
                      className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{ background: "#ff0050" }}
                    >
                      <Check size={12} stroke="white" strokeWidth={3} />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Custom amount */}
        <div>
          <h2 className="text-white font-bold text-sm mb-3 opacity-70 uppercase tracking-wider">
            Custom Amount
          </h2>
          <div
            className="flex items-center gap-3 px-4 py-4 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${customAmount && customCoins > 0 ? "rgba(255,0,80,0.4)" : "rgba(255,255,255,0.08)"}`,
            }}
          >
            <span className="text-white/40 text-lg font-bold">$</span>
            <input
              data-ocid="recharge.custom_amount_input"
              type="number"
              inputMode="decimal"
              min="0.50"
              step="0.01"
              placeholder="Enter amount"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedPackage(null);
              }}
              className="flex-1 bg-transparent text-white text-base font-bold outline-none placeholder:text-white/25"
              style={{ fontSize: "16px" }}
            />
            {customCoins > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
                style={{
                  background: "rgba(245,158,11,0.15)",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                <span className="text-sm">🪙</span>
                <span
                  className="font-bold text-sm"
                  style={{ color: "#f59e0b" }}
                >
                  {formatCoins(customCoins)}
                </span>
              </motion.div>
            )}
          </div>
          <p className="text-white/25 text-xs mt-1.5 px-1">
            $1 = 100 coins · Minimum $0.50
          </p>
        </div>

        {/* Payment methods row */}
        <div>
          <h2 className="text-white font-bold text-sm mb-3 opacity-70 uppercase tracking-wider">
            Payment Methods
          </h2>
          <div className="flex items-center gap-3">
            {[
              { icon: "💳", label: "Card" },
              { icon: "🍎", label: "Apple Pay" },
              { icon: "G", label: "Google Pay" },
            ].map((method) => (
              <div
                key={method.label}
                className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span
                  className="text-xl font-bold"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  {method.icon}
                </span>
                <span className="text-white/40 text-[10px]">
                  {method.label}
                </span>
              </div>
            ))}
          </div>
          <p className="text-white/25 text-xs mt-2 text-center">
            All currencies accepted · Auto-converts to USD
          </p>
        </div>
      </div>

      {/* Sticky recharge button */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.95), transparent)",
        }}
      >
        <button
          type="button"
          data-ocid="recharge.recharge_button"
          onClick={handleRecharge}
          disabled={effectiveCoins === 0 || effectivePrice <= 0}
          className="w-full py-4 rounded-2xl font-black text-white text-base transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
          style={{
            background:
              effectiveCoins > 0 ? "#ff0050" : "rgba(255,255,255,0.1)",
            fontSize: "1rem",
          }}
        >
          {effectiveCoins > 0 ? (
            <>
              🪙 Get {formatCoins(effectiveCoins)} coins — $
              {effectivePrice.toFixed(2)}
            </>
          ) : (
            "Select a package"
          )}
        </button>
      </div>

      {/* Payment modal */}
      <AnimatePresence>
        {paymentOpen && (
          <PaymentModal
            coins={pendingCoins}
            priceUSD={pendingPrice}
            packageId={pendingPackageId}
            onClose={() => setPaymentOpen(false)}
            onSuccess={() => {
              setPaymentOpen(false);
              setSelectedPackage(null);
              setCustomAmount("");
              toast.success(
                `🪙 ${formatCoins(pendingCoins)} coins added to your wallet!`,
              );
              onBack();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
