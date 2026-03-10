import {
  Eye,
  EyeOff,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { VerificationCodeStep } from "../components/VerificationCodeStep";
import { useAuth } from "../context/AuthContext";
import {
  getDeviceInfo,
  isKnownDevice,
  storeKnownDevice,
} from "../lib/deviceInfo";

interface LoginPageProps {
  onGoToRegister: () => void;
}

const COUNTRY_CODES = [
  { code: "+1", country: "US" },
  { code: "+44", country: "UK" },
  { code: "+61", country: "AU" },
  { code: "+91", country: "IN" },
  { code: "+234", country: "NG" },
  { code: "+49", country: "DE" },
  { code: "+33", country: "FR" },
  { code: "+55", country: "BR" },
];

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function LoginPage({ onGoToRegister }: LoginPageProps) {
  const { loginWithII, loginWithEmail, isInitializing } = useAuth();
  const [tab, setTab] = useState<"email" | "phone">("email");

  // Email login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  // Phone login
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phonePassword, setPhonePassword] = useState("");
  const [showPhonePassword, setShowPhonePassword] = useState(false);

  // II login
  const [isIILoading, setIsIILoading] = useState(false);

  // Device verification step
  const [deviceVerifyStep, setDeviceVerifyStep] = useState(false);
  const [deviceVerifyCode, setDeviceVerifyCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");

  // 2FA legacy step
  const [twoFaStep, setTwoFaStep] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [twoFaError, setTwoFaError] = useState("");

  const deviceInfo = getDeviceInfo();
  const isDeviceKnown = email ? isKnownDevice(email) : false;

  const handleIILogin = () => {
    setIsIILoading(true);
    loginWithII();
    setTimeout(() => setIsIILoading(false), 3000);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password.");
      return;
    }
    setIsEmailLoading(true);

    // Check 2FA
    const is2FaEnabled =
      localStorage.getItem("substream_2fa_enabled") === "true";
    if (is2FaEnabled) {
      const code = generateCode();
      setDemoCode(code);
      setTwoFaStep(true);
      setIsEmailLoading(false);
      return;
    }

    // Check device
    if (!isKnownDevice(email)) {
      // New device — require verification
      const code = generateCode();
      setDeviceVerifyCode(code);
      setPendingEmail(email);
      setPendingPassword(password);
      setIsEmailLoading(false);
      setDeviceVerifyStep(true);
      return;
    }

    try {
      await loginWithEmail(email, password);
      storeKnownDevice(email);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !phonePassword) {
      toast.error("Please enter your phone number and password.");
      return;
    }
    const phoneEmail = `${countryCode.replace("+", "")}${phoneNumber.replace(/\D/g, "")}@phone.substream.app`;
    setIsEmailLoading(true);
    try {
      await loginWithEmail(phoneEmail, phonePassword);
      storeKnownDevice(phoneEmail);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleDeviceVerified = async () => {
    setIsEmailLoading(true);
    try {
      await loginWithEmail(pendingEmail, pendingPassword);
      storeKnownDevice(pendingEmail);
      toast.success("Device verified and login successful!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setIsEmailLoading(false);
      setDeviceVerifyStep(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFaCode !== demoCode) {
      setTwoFaError("Incorrect code. Please try again.");
      return;
    }
    setTwoFaError("");
    setIsEmailLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setIsEmailLoading(false);
    }
  };

  // Device verification screen
  if (deviceVerifyStep) {
    return (
      <VerificationCodeStep
        contact={pendingEmail}
        contactType="email"
        generatedCode={deviceVerifyCode}
        onVerified={handleDeviceVerified}
        onCancel={() => {
          setDeviceVerifyStep(false);
          setPendingEmail("");
          setPendingPassword("");
        }}
      />
    );
  }

  // 2FA screen
  if (twoFaStep) {
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
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(34,197,94,0.12) 0%, transparent 65%)",
          }}
        />
        <motion.div
          className="w-full max-w-sm relative z-10"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: "rgba(34,197,94,0.15)",
                border: "1px solid rgba(34,197,94,0.25)",
              }}
            >
              <ShieldCheck size={26} style={{ color: "#22c55e" }} />
            </div>
            <h1
              className="text-2xl font-bold tracking-tight text-white mb-2"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              2FA Verification
            </h1>
            <p className="text-white/40 text-sm">
              A 6-digit code has been sent to your email/phone.
            </p>
          </div>
          <form onSubmit={handleVerify2FA} className="space-y-4">
            <div
              className="rounded-2xl px-4 py-3 mb-2"
              style={{
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              <p className="text-xs font-semibold" style={{ color: "#22c55e" }}>
                Demo code: {demoCode}
              </p>
            </div>
            <input
              data-ocid="login.2fa_input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="Enter 6-digit code"
              value={twoFaCode}
              onChange={(e) => {
                setTwoFaCode(e.target.value.replace(/\D/g, ""));
                setTwoFaError("");
              }}
              className="w-full h-14 rounded-xl border border-white/10 bg-white/5 text-white text-center text-2xl font-bold tracking-widest placeholder:text-white/20 focus:outline-none focus:border-green-500/50"
              style={{ fontSize: "24px", letterSpacing: "0.25em" }}
            />
            {twoFaError && (
              <p className="text-red-400 text-xs text-center">{twoFaError}</p>
            )}
            <button
              type="submit"
              data-ocid="login.2fa_submit_button"
              disabled={twoFaCode.length !== 6 || isEmailLoading}
              className="w-full h-12 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
              }}
            >
              {isEmailLoading ? (
                <Loader2 size={16} className="animate-spin mx-auto" />
              ) : (
                "Verify & Sign In"
              )}
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                data-ocid="login.2fa_resend_button"
                onClick={() => {
                  const c = generateCode();
                  setDemoCode(c);
                  setTwoFaCode("");
                  setTwoFaError("");
                  toast.success("New code generated");
                }}
                className="flex-1 h-11 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                <RotateCcw size={14} /> Resend
              </button>
              <button
                type="button"
                onClick={() => {
                  setTwoFaStep(false);
                  setTwoFaCode("");
                  setTwoFaError("");
                }}
                className="flex-1 h-11 rounded-xl text-sm font-medium"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                ← Back
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

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
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 100%, rgba(255,0,80,0.07) 0%, transparent 70%)",
        }}
      />

      <motion.div
        className="w-full max-w-sm relative z-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
            }}
          >
            <Zap size={24} className="text-white" fill="white" />
          </div>
          <h1
            className="text-3xl font-black tracking-tight text-white"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            SUB STREAM
          </h1>
          <p className="text-white/40 text-sm mt-1">Sign in to your account</p>
        </motion.div>

        {/* Internet Identity */}
        <motion.button
          type="button"
          data-ocid="login.ii_button"
          disabled={isInitializing || isIILoading}
          onClick={handleIILogin}
          className="w-full h-14 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-3 mb-4 transition-all disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
          }}
          whileTap={{ scale: 0.97 }}
        >
          {isIILoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Zap size={18} fill="white" />
          )}
          Continue with Internet Identity
        </motion.button>

        {/* Social login row */}
        <div className="flex gap-3 mb-5">
          <button
            type="button"
            data-ocid="login.google_button"
            onClick={() => toast.info("Google login coming soon")}
            className="flex-1 h-11 rounded-xl text-sm font-medium text-white/70 flex items-center justify-center gap-2 transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            🔵 Google
          </button>
          <button
            type="button"
            data-ocid="login.apple_button"
            onClick={() => toast.info("Apple login coming soon")}
            className="flex-1 h-11 rounded-xl text-sm font-medium text-white/70 flex items-center justify-center gap-2 transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            🍎 Apple
          </button>
        </div>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span
              className="px-3 text-xs text-white/30"
              style={{ background: "#000" }}
            >
              or sign in with
            </span>
          </div>
        </div>

        {/* Email/Phone tabs */}
        <div
          className="flex rounded-xl p-1 mb-5"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <button
            type="button"
            data-ocid="login.email_tab"
            onClick={() => setTab("email")}
            className="flex-1 h-9 rounded-lg text-sm font-semibold transition-all"
            style={
              tab === "email"
                ? {
                    background: "rgba(255,0,80,0.2)",
                    color: "#ff0050",
                    border: "1px solid rgba(255,0,80,0.3)",
                  }
                : { color: "rgba(255,255,255,0.4)" }
            }
          >
            ✉️ Email
          </button>
          <button
            type="button"
            data-ocid="login.phone_tab"
            onClick={() => setTab("phone")}
            className="flex-1 h-9 rounded-lg text-sm font-semibold transition-all"
            style={
              tab === "phone"
                ? {
                    background: "rgba(255,0,80,0.2)",
                    color: "#ff0050",
                    border: "1px solid rgba(255,0,80,0.3)",
                  }
                : { color: "rgba(255,255,255,0.4)" }
            }
          >
            📱 Phone
          </button>
        </div>

        {tab === "email" ? (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <p className="block text-xs font-medium text-white/50 mb-1.5">
                Email Address
              </p>
              <input
                data-ocid="login.email_input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 text-sm"
              />
            </div>
            <div>
              <p className="block text-xs font-medium text-white/50 mb-1.5">
                Password
              </p>
              <div className="relative">
                <input
                  data-ocid="login.password_input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 pr-11 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 text-sm"
                />
                <button
                  type="button"
                  data-ocid="login.toggle_password"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Device security banner */}
            {email && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs"
                style={
                  isDeviceKnown
                    ? {
                        background: "rgba(34,197,94,0.08)",
                        border: "1px solid rgba(34,197,94,0.2)",
                        color: "#22c55e",
                      }
                    : {
                        background: "rgba(255,165,0,0.08)",
                        border: "1px solid rgba(255,165,0,0.2)",
                        color: "#f59e0b",
                      }
                }
              >
                <ShieldCheck size={12} />
                {isDeviceKnown
                  ? "🔒 Device verified • Your login is secured"
                  : `⚠️ New device detected (${deviceInfo.device_model}) — verification required`}
              </motion.div>
            )}

            <button
              type="submit"
              data-ocid="login.email_submit_button"
              disabled={isEmailLoading}
              className="w-full h-12 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
              }}
            >
              {isEmailLoading ? (
                <Loader2 size={16} className="animate-spin mx-auto" />
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePhoneLogin} className="space-y-4">
            <div>
              <p className="block text-xs font-medium text-white/50 mb-1.5">
                Phone Number
              </p>
              <div className="flex gap-2">
                <select
                  data-ocid="login.country_select"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="h-12 rounded-xl border border-white/10 bg-white/5 px-3 text-white focus:outline-none text-sm w-24"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option
                      key={`${c.code}-${c.country}`}
                      value={c.code}
                      style={{ background: "#1a1a1a" }}
                    >
                      {c.country} {c.code}
                    </option>
                  ))}
                </select>
                <input
                  data-ocid="login.phone_input"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Phone number"
                  className="flex-1 h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 text-sm"
                />
              </div>
            </div>
            <div>
              <p className="block text-xs font-medium text-white/50 mb-1.5">
                Password
              </p>
              <div className="relative">
                <input
                  data-ocid="login.phone_password_input"
                  type={showPhonePassword ? "text" : "password"}
                  value={phonePassword}
                  onChange={(e) => setPhonePassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 pr-11 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 text-sm"
                />
                <button
                  type="button"
                  data-ocid="login.toggle_phone_password"
                  onClick={() => setShowPhonePassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPhonePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              data-ocid="login.phone_submit_button"
              disabled={isEmailLoading}
              className="w-full h-12 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
              }}
            >
              {isEmailLoading ? (
                <Loader2 size={16} className="animate-spin mx-auto" />
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        )}

        <p className="text-center text-white/30 text-xs mt-6">
          Don't have an account?{" "}
          <button
            type="button"
            data-ocid="login.register_link"
            onClick={onGoToRegister}
            className="font-semibold"
            style={{ color: "#ff0050" }}
          >
            Sign Up
          </button>
        </p>
      </motion.div>
    </div>
  );
}
