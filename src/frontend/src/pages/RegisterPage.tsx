import { Eye, EyeOff, Loader2, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { VerificationCodeStep } from "../components/VerificationCodeStep";
import { useAuth } from "../context/AuthContext";
import { signInWithApple } from "../lib/appleAuth";
import { signInWithGoogle } from "../lib/googleAuth";

interface RegisterPageProps {
  onGoToLogin: () => void;
}

type Step =
  | "method"
  | "email-form"
  | "phone-form"
  | "email-verify"
  | "phone-verify";

const COUNTRY_CODES = [
  { code: "+1", country: "US" },
  { code: "+1", country: "CA" },
  { code: "+44", country: "UK" },
  { code: "+61", country: "AU" },
  { code: "+91", country: "IN" },
  { code: "+234", country: "NG" },
  { code: "+233", country: "GH" },
  { code: "+27", country: "ZA" },
  { code: "+49", country: "DE" },
  { code: "+33", country: "FR" },
  { code: "+55", country: "BR" },
  { code: "+52", country: "MX" },
];

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function RegisterPage({ onGoToLogin }: RegisterPageProps) {
  const { registerWithEmail, loginWithII } = useAuth();
  const [step, setStep] = useState<Step>("method");
  const [isIILoading, setIsIILoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    try {
      const profile = await signInWithGoogle();
      const derivedPassword = btoa(`google:${profile.sub}`);
      await registerWithEmail(
        profile.name || profile.email.split("@")[0],
        profile.email,
        derivedPassword,
      );
      localStorage.setItem("ss_auth_provider", "google");
      if (profile.picture) {
        localStorage.setItem("ss_avatar_url", profile.picture);
      }
      toast.success("Signed in with Google");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      toast.error(msg);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    setIsAppleLoading(true);
    try {
      const profile = await signInWithApple();
      const derivedPassword = btoa(`apple:${profile.sub}`);
      await registerWithEmail(
        profile.name || profile.email.split("@")[0],
        profile.email,
        derivedPassword,
      );
      localStorage.setItem("ss_auth_provider", "apple");
      toast.success("Signed in with Apple");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Apple sign-in failed";
      toast.error(msg);
    } finally {
      setIsAppleLoading(false);
    }
  };

  // Email form state
  const [name, setName] = useState("");
  const [realName, setRealName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  // Phone form state
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneDisplayName, setPhoneDisplayName] = useState("");
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);

  // CAPTCHA
  const [captchaA, setCaptchaA] = useState(0);
  const [captchaB, setCaptchaB] = useState(0);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [captchaSolved, setCaptchaSolved] = useState(false);

  // Verification
  const [verifyCode, setVerifyCode] = useState("");
  const [pendingContact, setPendingContact] = useState("");

  // Device account limit
  const [deviceLimitReached, setDeviceLimitReached] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("substream_device_accounts");
      const accounts: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      if (accounts.length >= 3) setDeviceLimitReached(true);
    } catch {
      /* silent */
    }
    refreshCaptcha();
  }, []);

  function refreshCaptcha() {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    setCaptchaA(a);
    setCaptchaB(b);
    setCaptchaAnswer("");
    setCaptchaError("");
    setCaptchaSolved(false);
  }

  function verifyCaptcha() {
    if (Number(captchaAnswer) === captchaA + captchaB) {
      setCaptchaSolved(true);
      setCaptchaError("");
    } else {
      setCaptchaError("Incorrect answer, please try again.");
      refreshCaptcha();
    }
  }

  const handleIILogin = () => {
    setIsIILoading(true);
    loginWithII();
    setTimeout(() => setIsIILoading(false), 3000);
  };

  // Email signup: validate → generate code → go to verify
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaSolved) {
      toast.error("Please solve the CAPTCHA first.");
      return;
    }
    if (!name.trim()) {
      toast.error("Please enter your display name.");
      return;
    }
    if (!email || !password) {
      toast.error("Please enter your email and password.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setIsEmailLoading(true);
    // Simulate checking if email format is valid
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      setIsEmailLoading(false);
      return;
    }
    const code = generateCode();
    setVerifyCode(code);
    setPendingContact(email);
    setIsEmailLoading(false);
    setStep("email-verify");
  };

  // After email verified → actually register
  const handleEmailVerified = async () => {
    setIsEmailLoading(true);
    try {
      await registerWithEmail(
        name.trim(),
        email,
        password,
        realName.trim() || undefined,
      );
      try {
        const raw = localStorage.getItem("substream_device_accounts");
        const accounts: string[] = raw ? JSON.parse(raw) : [];
        accounts.push(name.trim());
        localStorage.setItem(
          "substream_device_accounts",
          JSON.stringify(accounts),
        );
      } catch {
        /* silent */
      }
      toast.success("Account created! Welcome to SUB STREAM.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed.");
      setStep("email-form");
    } finally {
      setIsEmailLoading(false);
    }
  };

  // Phone signup
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaSolved) {
      toast.error("Please solve the CAPTCHA first.");
      return;
    }
    if (!phoneDisplayName.trim()) {
      toast.error("Please enter your display name.");
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error("Please enter your phone number.");
      return;
    }
    if (phoneNumber.replace(/\D/g, "").length < 7) {
      toast.error("Please enter a valid phone number.");
      return;
    }
    const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, "")}`;
    setIsPhoneLoading(true);
    const code = generateCode();
    setVerifyCode(code);
    setPendingContact(fullPhone);
    setIsPhoneLoading(false);
    setStep("phone-verify");
  };

  // After phone verified → register with phone-based email
  const handlePhoneVerified = async () => {
    setIsPhoneLoading(true);
    const phoneEmail = `${countryCode.replace("+", "")}${phoneNumber.replace(/\D/g, "")}@phone.substream.app`;
    const generatedPassword = `ss_${phoneNumber}_${Date.now()}`;
    try {
      await registerWithEmail(
        phoneDisplayName.trim(),
        phoneEmail,
        generatedPassword,
      );
      try {
        const raw = localStorage.getItem("substream_device_accounts");
        const accounts: string[] = raw ? JSON.parse(raw) : [];
        accounts.push(phoneDisplayName.trim());
        localStorage.setItem(
          "substream_device_accounts",
          JSON.stringify(accounts),
        );
      } catch {
        /* silent */
      }
      toast.success("Account created! Welcome to SUB STREAM.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed.");
      setStep("phone-form");
    } finally {
      setIsPhoneLoading(false);
    }
  };

  if (deviceLimitReached) {
    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-10"
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
        <div className="w-full max-w-sm relative z-10 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl"
            style={{
              background: "rgba(255,0,80,0.1)",
              border: "1px solid rgba(255,0,80,0.2)",
            }}
          >
            🚫
          </div>
          <h1
            className="text-xl font-bold text-white mb-3"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Account Limit Reached
          </h1>
          <p className="text-white/50 text-sm mb-8">
            Maximum 3 accounts can be created per device.
          </p>
          <button
            type="button"
            data-ocid="register.primary_button"
            onClick={onGoToLogin}
            className="w-full h-12 rounded-xl font-semibold text-sm text-white"
            style={{
              background: "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Verification steps
  if (step === "email-verify") {
    return (
      <VerificationCodeStep
        contact={pendingContact}
        contactType="email"
        generatedCode={verifyCode}
        onVerified={handleEmailVerified}
        onCancel={() => setStep("email-form")}
      />
    );
  }
  if (step === "phone-verify") {
    return (
      <VerificationCodeStep
        contact={pendingContact}
        contactType="phone"
        generatedCode={verifyCode}
        onVerified={handlePhoneVerified}
        onCancel={() => setStep("phone-form")}
      />
    );
  }

  const bgStyle = { background: "#000" };
  const glowStyle = {
    background:
      "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,0,80,0.12) 0%, transparent 65%)",
  };

  // ─── Method Selection ───────────────────────────────────────────────────────
  if (step === "method") {
    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden"
        style={bgStyle}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={glowStyle}
        />
        <motion.div
          className="w-full max-w-sm relative z-10"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Logo */}
          <div className="text-center mb-10">
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
            <p className="text-white/40 text-sm mt-1">Create your account</p>
          </div>

          {/* Internet Identity */}
          <motion.button
            type="button"
            data-ocid="register.ii_button"
            disabled={isIILoading}
            onClick={handleIILogin}
            className="w-full h-14 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-3 mb-6"
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

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span
                className="px-3 text-xs text-white/30"
                style={{ background: "#000" }}
              >
                or sign up with
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {/* Phone */}
            <motion.button
              type="button"
              data-ocid="register.phone_button"
              onClick={() => {
                setStep("phone-form");
                refreshCaptcha();
              }}
              className="w-full h-14 rounded-xl font-semibold text-sm text-white flex items-center gap-4 px-5 transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="text-2xl">📱</span>
              <span>Continue with Phone Number</span>
            </motion.button>

            {/* Email */}
            <motion.button
              type="button"
              data-ocid="register.email_button"
              onClick={() => {
                setStep("email-form");
                refreshCaptcha();
              }}
              className="w-full h-14 rounded-xl font-semibold text-sm text-white flex items-center gap-4 px-5 transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="text-2xl">✉️</span>
              <span>Continue with Email</span>
            </motion.button>

            {/* Continue with Google */}
            <button
              type="button"
              data-ocid="register.google_button"
              onClick={handleGoogleAuth}
              disabled={isGoogleLoading}
              className="w-full h-14 rounded-xl font-semibold text-sm flex items-center gap-4 px-5"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {isGoogleLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <span className="text-2xl">🔵</span>
              )}
              <span>Continue with Google</span>
            </button>

            {/* Continue with Apple */}
            <button
              type="button"
              data-ocid="register.apple_button"
              onClick={handleAppleAuth}
              disabled={isAppleLoading}
              className="w-full h-14 rounded-xl font-semibold text-sm flex items-center gap-4 px-5"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {isAppleLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <span className="text-2xl">🍎</span>
              )}
              <span>Continue with Apple</span>
            </button>
          </div>

          <p className="text-center text-white/30 text-xs mt-8">
            Already have an account?{" "}
            <button
              type="button"
              data-ocid="register.login_link"
              onClick={onGoToLogin}
              className="font-semibold"
              style={{ color: "#ff0050" }}
            >
              Sign In
            </button>
          </p>
        </motion.div>
      </div>
    );
  }

  // ─── Email Form ─────────────────────────────────────────────────────────────
  if (step === "email-form") {
    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden"
        style={bgStyle}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={glowStyle}
        />
        <motion.div
          className="w-full max-w-sm relative z-10"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl"
              style={{
                background: "rgba(255,0,80,0.12)",
                border: "1px solid rgba(255,0,80,0.25)",
              }}
            >
              ✉️
            </div>
            <h1
              className="text-2xl font-bold tracking-tight text-white"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Sign Up with Email
            </h1>
            <p className="text-white/40 text-sm mt-1">
              We'll send a verification code
            </p>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <p className="block text-xs font-medium text-white/50 mb-1.5">
                Display Name
              </p>
              <input
                data-ocid="register.email.name_input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                placeholder="YOUR NAME"
                className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 text-sm"
              />
            </div>
            <div>
              <p className="block text-xs font-medium text-white/50 mb-1.5">
                Real Name (optional)
              </p>
              <input
                data-ocid="register.email.realname_input"
                type="text"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                placeholder="John Smith"
                className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 text-sm"
              />
            </div>
            <div>
              <p className="block text-xs font-medium text-white/50 mb-1.5">
                Email Address
              </p>
              <input
                data-ocid="register.email.email_input"
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
                  data-ocid="register.email.password_input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 pr-11 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 text-sm"
                />
                <button
                  type="button"
                  data-ocid="register.email.toggle_password"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* CAPTCHA */}
            {!captchaSolved ? (
              <div
                className="rounded-2xl p-4 space-y-3"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Security Check
                </p>
                <p className="text-white/80 text-sm font-medium">
                  What is {captchaA} + {captchaB}?
                </p>
                <div className="flex gap-2">
                  <input
                    data-ocid="register.email.captcha_input"
                    type="number"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    placeholder="Answer"
                    className="flex-1 h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-white placeholder:text-white/20 focus:outline-none text-sm"
                  />
                  <button
                    type="button"
                    data-ocid="register.email.captcha_submit"
                    onClick={verifyCaptcha}
                    className="px-4 h-10 rounded-xl text-sm font-semibold text-white"
                    style={{ background: "rgba(255,0,80,0.3)" }}
                  >
                    ✓
                  </button>
                </div>
                {captchaError && (
                  <p className="text-xs" style={{ color: "#ff0050" }}>
                    {captchaError}
                  </p>
                )}
              </div>
            ) : (
              <div
                className="flex items-center gap-2 rounded-xl px-4 py-3"
                style={{
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.2)",
                }}
              >
                <span className="text-green-400">✓</span>
                <span className="text-green-400 text-sm font-medium">
                  CAPTCHA verified
                </span>
              </div>
            )}

            <button
              type="submit"
              data-ocid="register.email.submit_button"
              disabled={isEmailLoading}
              className="w-full h-12 rounded-xl font-semibold text-sm text-white disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
              }}
            >
              {isEmailLoading ? (
                <Loader2 size={16} className="animate-spin mx-auto" />
              ) : (
                "Send Verification Code"
              )}
            </button>

            <button
              type="button"
              data-ocid="register.email.back_button"
              onClick={() => setStep("method")}
              className="w-full h-11 rounded-xl text-sm font-medium text-white/40 hover:text-white/70 transition-colors"
            >
              ← Back
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ─── Phone Form ─────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden"
      style={bgStyle}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={glowStyle}
      />
      <motion.div
        className="w-full max-w-sm relative z-10"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl"
            style={{
              background: "rgba(255,0,80,0.12)",
              border: "1px solid rgba(255,0,80,0.25)",
            }}
          >
            📱
          </div>
          <h1
            className="text-2xl font-bold tracking-tight text-white"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Sign Up with Phone
          </h1>
          <p className="text-white/40 text-sm mt-1">
            We'll send a verification code
          </p>
        </div>

        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <div>
            <p className="block text-xs font-medium text-white/50 mb-1.5">
              Display Name
            </p>
            <input
              data-ocid="register.phone.name_input"
              type="text"
              value={phoneDisplayName}
              onChange={(e) =>
                setPhoneDisplayName(e.target.value.toUpperCase())
              }
              placeholder="YOUR NAME"
              className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 text-sm"
            />
          </div>
          <div>
            <p className="block text-xs font-medium text-white/50 mb-1.5">
              Phone Number
            </p>
            <div className="flex gap-2">
              <select
                data-ocid="register.phone.country_select"
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
                data-ocid="register.phone.phone_input"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Phone number"
                className="flex-1 h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 text-sm"
              />
            </div>
          </div>

          {/* CAPTCHA */}
          {!captchaSolved ? (
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Security Check
              </p>
              <p className="text-white/80 text-sm font-medium">
                What is {captchaA} + {captchaB}?
              </p>
              <div className="flex gap-2">
                <input
                  data-ocid="register.phone.captcha_input"
                  type="number"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  placeholder="Answer"
                  className="flex-1 h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-white placeholder:text-white/20 focus:outline-none text-sm"
                />
                <button
                  type="button"
                  data-ocid="register.phone.captcha_submit"
                  onClick={verifyCaptcha}
                  className="px-4 h-10 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "rgba(255,0,80,0.3)" }}
                >
                  ✓
                </button>
              </div>
              {captchaError && (
                <p className="text-xs" style={{ color: "#ff0050" }}>
                  {captchaError}
                </p>
              )}
            </div>
          ) : (
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-3"
              style={{
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              <span className="text-green-400">✓</span>
              <span className="text-green-400 text-sm font-medium">
                CAPTCHA verified
              </span>
            </div>
          )}

          <button
            type="submit"
            data-ocid="register.phone.submit_button"
            disabled={isPhoneLoading}
            className="w-full h-12 rounded-xl font-semibold text-sm text-white disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
            }}
          >
            {isPhoneLoading ? (
              <Loader2 size={16} className="animate-spin mx-auto" />
            ) : (
              "Send Verification Code"
            )}
          </button>

          <button
            type="button"
            data-ocid="register.phone.back_button"
            onClick={() => setStep("method")}
            className="w-full h-11 rounded-xl text-sm font-medium text-white/40 hover:text-white/70 transition-colors"
          >
            ← Back
          </button>
        </form>
      </motion.div>
    </div>
  );
}
