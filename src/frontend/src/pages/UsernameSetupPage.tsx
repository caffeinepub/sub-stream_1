import { Loader2, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

interface UsernameSetupPageProps {
  onLogout: () => void;
}

// Username validation: letters, numbers, underscores only, min 3 chars, no spaces
function validateUsername(value: string): string | null {
  if (value.length < 3) return "Username must be at least 3 characters.";
  if (/\s/.test(value)) return "Username cannot contain spaces.";
  if (!/^[a-zA-Z0-9_]+$/.test(value))
    return "Only letters, numbers, and underscores are allowed.";
  return null;
}

export function UsernameSetupPage({ onLogout }: UsernameSetupPageProps) {
  const { setUsernameOnBackend } = useAuth();
  const inputId = useId();

  const [username, setUsername] = useState("");
  const [touched, setTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validationError = username ? validateUsername(username) : null;
  const showError = touched && !!validationError;
  const isValid = username.length > 0 && validationError === null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip spaces immediately as the user types
    setUsername(e.target.value.replace(/\s/g, ""));
  };

  const handleBlur = () => setTouched(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid || isLoading) return;

    setIsLoading(true);
    try {
      await setUsernameOnBackend(username.trim());
      // needsUsername will flip to false in context → App routes to feed automatically
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to save username. Please try again.",
      );
    } finally {
      setIsLoading(false);
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
        </motion.div>

        {/* Heading */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
        >
          <h2
            className="text-white font-bold text-xl leading-snug mb-2"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Choose your @username to join the SUB STREAM community.
          </h2>
          <p className="text-white/40 text-sm">You can't change this later.</p>
        </motion.div>

        {/* Username input form */}
        <motion.form
          onSubmit={handleSubmit}
          className="space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          noValidate
        >
          {/* Input with @ prefix */}
          <div className="space-y-1.5">
            <label
              htmlFor={inputId}
              className="block text-white/70 text-xs font-medium tracking-wide uppercase"
            >
              @username
            </label>
            <div
              className="flex items-center h-12 rounded-xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${showError ? "rgba(255,0,80,0.5)" : isValid ? "rgba(255,0,80,0.3)" : "rgba(255,255,255,0.10)"}`,
                transition: "border-color 0.2s",
              }}
            >
              <span
                className="pl-4 pr-1 text-white/50 font-bold text-lg select-none flex-shrink-0"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                @
              </span>
              <input
                id={inputId}
                data-ocid="username_setup.input"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="your_handle"
                value={username}
                onChange={handleChange}
                onBlur={handleBlur}
                maxLength={40}
                className="flex-1 h-full bg-transparent text-white placeholder:text-white/25 outline-none pr-4"
                style={{ fontSize: "16px" }}
                aria-describedby={showError ? `${inputId}-error` : undefined}
                aria-invalid={showError}
              />
            </div>

            {/* Inline validation message */}
            <motion.div
              animate={{
                height: showError ? "auto" : 0,
                opacity: showError ? 1 : 0,
              }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              {showError && (
                <p
                  id={`${inputId}-error`}
                  data-ocid="username_setup.error_state"
                  className="text-xs pt-1"
                  style={{ color: "#ff0050" }}
                  role="alert"
                >
                  {validationError}
                </p>
              )}
            </motion.div>

            {/* Requirements hint */}
            {!showError && (
              <p className="text-white/25 text-xs pt-0.5">
                Min. 3 characters · letters, numbers, underscores
              </p>
            )}
          </div>

          {/* Continue button */}
          <button
            type="submit"
            data-ocid="username_setup.submit_button"
            disabled={!isValid || isLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-white text-sm transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none mt-2"
            style={{
              background: "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
              boxShadow:
                isValid && !isLoading
                  ? "0 8px 32px rgba(255,0,80,0.4), inset 0 1px 0 rgba(255,255,255,0.15)"
                  : "none",
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Setting up your profile…
              </>
            ) : (
              "Continue"
            )}
          </button>
        </motion.form>

        {/* Logout escape hatch */}
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <button
            type="button"
            data-ocid="username_setup.cancel_button"
            onClick={onLogout}
            className="text-white/30 text-sm hover:text-white/50 transition-colors"
          >
            Log out
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
