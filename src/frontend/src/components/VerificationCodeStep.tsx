import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface VerificationCodeStepProps {
  contact: string;
  contactType: "email" | "phone";
  onVerified: () => void;
  onCancel: () => void;
  generatedCode: string;
}

function maskContact(contact: string, type: "email" | "phone"): string {
  if (type === "email") {
    const [local, domain] = contact.split("@");
    if (!local || !domain) return contact;
    const masked = `${local.slice(0, 1)}***`;
    return `${masked}@${domain}`;
  }
  // phone: show last 4 digits
  const digits = contact.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  return `+* ***-***-${last4}`;
}

const CODE_EXPIRY_SECONDS = 300; // 5 minutes
const MAX_ATTEMPTS = 3;
const RESEND_COOLDOWN = 30;

export function VerificationCodeStep({
  contact,
  contactType,
  onVerified,
  onCancel,
  generatedCode: initialCode,
}: VerificationCodeStepProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState(CODE_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);
  const [currentCode, setCurrentCode] = useState(initialCode);
  const [locked, setLocked] = useState(false);
  const [shake, setShake] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setExpired(true);
      return;
    }
    const t = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  // Resend cooldown
  useEffect(() => {
    if (canResend) return;
    if (resendCooldown <= 0) {
      setCanResend(true);
      return;
    }
    const t = setInterval(() => setResendCooldown((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown, canResend]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleDigitChange = (idx: number, value: string) => {
    if (locked || expired) return;
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    setError("");
    if (digit && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
    // Auto-verify when all 6 digits entered
    if (digit && idx === 5) {
      const code = [...next].join("");
      if (code.length === 6) {
        verifyCode([...next]);
      }
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (digits[idx]) {
        const next = [...digits];
        next[idx] = "";
        setDigits(next);
      } else if (idx > 0) {
        inputRefs.current[idx - 1]?.focus();
      }
    }
  };

  const verifyCode = (d: string[]) => {
    const entered = d.join("");
    if (entered === currentCode) {
      setError("");
      onVerified();

      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        setLocked(true);
        setError("Too many attempts. Please request a new code.");

        setError(
          `Incorrect code. ${MAX_ATTEMPTS - newAttempts} attempt(s) remaining.`,
        );
        setShake(true);
        setTimeout(() => setShake(false), 600);
        setDigits(Array(6).fill(""));
        inputRefs.current[0]?.focus();
      }
    }
  };

  const handleResend = () => {
    if (!canResend) return;
    const newCode = String(Math.floor(100000 + Math.random() * 900000));
    setCurrentCode(newCode);
    setDigits(Array(6).fill(""));
    setAttempts(0);
    setError("");
    setExpired(false);
    setLocked(false);
    setTimeLeft(CODE_EXPIRY_SECONDS);
    setResendCooldown(RESEND_COOLDOWN);
    setCanResend(false);
    inputRefs.current[0]?.focus();
  };

  const isDisabled = locked || expired;

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden"
      style={{ background: "#000" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,0,80,0.12) 0%, transparent 65%)",
        }}
      />

      <motion.div
        className="w-full max-w-sm relative z-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Icon */}
        <div className="text-center mb-8">
          <motion.div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl"
            style={{
              background: "rgba(255,0,80,0.12)",
              border: "1px solid rgba(255,0,80,0.25)",
            }}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {contactType === "email" ? "✉️" : "📱"}
          </motion.div>
          <h1
            className="text-2xl font-bold tracking-tight text-white mb-2"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Verify Your {contactType === "email" ? "Email" : "Phone"}
          </h1>
          <p className="text-white/40 text-sm">
            We sent a 6-digit code to{" "}
            <span className="text-white/70 font-medium">
              {maskContact(contact, contactType)}
            </span>
          </p>
        </div>

        {/* Demo code display */}
        <motion.div
          className="rounded-2xl px-4 py-3 mb-6"
          style={{
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.2)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p
            className="text-xs font-semibold text-center"
            style={{ color: "#22c55e" }}
          >
            Demo code: {currentCode}
          </p>
        </motion.div>

        {/* Timer */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/40 text-xs">Code expires in</span>
          <span
            className="text-sm font-mono font-bold"
            style={{ color: timeLeft < 60 ? "#ff0050" : "#22c55e" }}
          >
            {expired ? "Expired" : formatTime(timeLeft)}
          </span>
        </div>

        {/* OTP Input boxes */}
        <AnimatePresence>
          <motion.div
            className="flex gap-2 justify-center mb-4"
            animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {digits.map((d, i) => (
              <input
                key={`digit-pos-${i + 1}`}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                data-ocid={`verify.digit_input.${i + 1}` as string}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={d}
                disabled={isDisabled}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                className="w-11 h-14 rounded-xl text-center text-xl font-bold text-white transition-all focus:outline-none disabled:opacity-30"
                style={{
                  background: d
                    ? "rgba(255,0,80,0.15)"
                    : "rgba(255,255,255,0.05)",
                  border: d
                    ? "2px solid rgba(255,0,80,0.6)"
                    : "1px solid rgba(255,255,255,0.12)",
                }}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Error message */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-sm mb-4"
            style={{ color: "#ff0050" }}
            data-ocid="verify.error_state"
          >
            {error}
          </motion.p>
        )}

        {/* Expired message */}
        {expired && !error && (
          <p className="text-center text-sm text-white/40 mb-4">
            Code expired. Please request a new one.
          </p>
        )}

        {/* Verify button */}
        <button
          type="button"
          data-ocid="verify.submit_button"
          disabled={isDisabled || digits.join("").length !== 6}
          onClick={() => verifyCode(digits)}
          className="w-full h-12 rounded-xl font-semibold text-sm text-white mb-3 transition-all disabled:opacity-40"
          style={{
            background: "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
          }}
        >
          Verify Code
        </button>

        {/* Resend */}
        <button
          type="button"
          data-ocid="verify.resend_button"
          disabled={!canResend}
          onClick={handleResend}
          className="w-full h-11 rounded-xl text-sm font-medium mb-3 transition-all disabled:opacity-40"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: canResend
              ? "rgba(255,255,255,0.8)"
              : "rgba(255,255,255,0.35)",
          }}
        >
          {canResend ? "Resend Code" : `Resend in ${resendCooldown}s...`}
        </button>

        {/* Cancel */}
        <button
          type="button"
          data-ocid="verify.cancel_button"
          onClick={onCancel}
          className="w-full h-11 rounded-xl text-sm font-medium transition-all"
          style={{
            color: "rgba(255,255,255,0.35)",
          }}
        >
          ← Go Back
        </button>
      </motion.div>
    </div>
  );
}
