import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

interface LoginPageProps {
  onGoToRegister: () => void;
}

export function LoginPage({ onGoToRegister }: LoginPageProps) {
  const { loginWithII, loginWithEmail, isInitializing } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isIILoading, setIsIILoading] = useState(false);

  const handleIILogin = () => {
    setIsIILoading(true);
    loginWithII();
    // II opens popup so we just set loading — it resolves via auth state
    setTimeout(() => setIsIILoading(false), 3000);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password.");
      return;
    }
    setIsEmailLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
    } finally {
      setIsEmailLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden"
      style={{ background: "#000" }}
    >
      {/* Atmospheric background glow */}
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
          className="text-center mb-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.55,
            delay: 0.05,
            ease: [0.34, 1.56, 0.64, 1],
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #ff0050 0%, #ff6b35 100%)",
                boxShadow: "0 0 28px rgba(255,0,80,0.5)",
              }}
            >
              <Zap size={20} fill="white" stroke="none" />
            </div>
          </div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              background:
                "linear-gradient(135deg, #ff0050 0%, #ff6b35 60%, #fff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            SUB STREAM
          </h1>
          <p className="text-white/50 text-sm mt-1.5 tracking-wide">
            Sign in to continue
          </p>
        </motion.div>

        {/* Internet Identity button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <button
            type="button"
            data-ocid="login.ii_button"
            onClick={handleIILogin}
            disabled={isIILoading || isInitializing}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-semibold text-white text-sm transition-all duration-200 active:scale-[0.97] disabled:opacity-60 disabled:pointer-events-none mb-6"
            style={{
              background: "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
              boxShadow:
                "0 8px 32px rgba(255,0,80,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            {isIILoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 40 40"
                fill="none"
                role="img"
                aria-label="Internet Identity"
              >
                <title>Internet Identity</title>
                <circle
                  cx="20"
                  cy="20"
                  r="20"
                  fill="white"
                  fillOpacity="0.15"
                />
                <circle cx="20" cy="20" r="8" fill="white" />
                <path
                  d="M20 4 L20 12 M20 28 L20 36 M4 20 L12 20 M28 20 L36 20"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
            {isIILoading
              ? "Opening Internet Identity…"
              : "Sign in with Internet Identity"}
          </button>
        </motion.div>

        {/* Divider */}
        <motion.div
          className="flex items-center gap-3 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs font-medium tracking-widest uppercase">
            or
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </motion.div>

        {/* Email/password form */}
        <motion.form
          onSubmit={handleEmailLogin}
          className="space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs font-medium tracking-wide uppercase">
              Email
            </Label>
            <Input
              data-ocid="login.email_input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-[#ff0050] focus-visible:border-[#ff0050]/50"
              style={{ fontSize: "16px" }}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs font-medium tracking-wide uppercase">
              Password
            </Label>
            <div className="relative">
              <Input
                data-ocid="login.password_input"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/30 pr-12 focus-visible:ring-1 focus-visible:ring-[#ff0050] focus-visible:border-[#ff0050]/50"
                style={{ fontSize: "16px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            data-ocid="login.submit_button"
            disabled={isEmailLoading || isInitializing}
            className="w-full h-12 rounded-xl font-semibold text-sm mt-2"
            style={{
              background: isEmailLoading
                ? "rgba(255,0,80,0.5)"
                : "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "white",
            }}
          >
            {isEmailLoading ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Signing in…
              </>
            ) : (
              "Sign In with Email"
            )}
          </Button>
        </motion.form>

        {/* Register link */}
        <motion.p
          className="text-center text-white/40 text-sm mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.35 }}
        >
          Don't have an account?{" "}
          <button
            type="button"
            data-ocid="login.register_link"
            onClick={onGoToRegister}
            className="font-semibold transition-colors"
            style={{ color: "#ff0050" }}
          >
            Sign up
          </button>
        </motion.p>
      </motion.div>
    </div>
  );
}
