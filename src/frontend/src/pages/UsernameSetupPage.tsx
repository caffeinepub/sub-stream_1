import { useQuery } from "@tanstack/react-query";
import { Loader2, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { getUsername, sanitizeUsername } from "../lib/userFormat";

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

function validateDisplayName(value: string): string | null {
  if (!value.trim()) return "Display name is required.";
  return null;
}

export function UsernameSetupPage({ onLogout }: UsernameSetupPageProps) {
  const { setUsernameOnBackend, actor } = useAuth();
  const displayNameId = useId();
  const usernameId = useId();
  const realNameId = useId();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [realName, setRealName] = useState(
    () => localStorage.getItem("ss_real_name") ?? "",
  );
  const [displayNameTouched, setDisplayNameTouched] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Debounced username for availability check
  const [debouncedUsername, setDebouncedUsername] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const formatError = validateUsername(username);
    if (!username || formatError) {
      setDebouncedUsername("");
      return;
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedUsername(username);
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username]);

  // Fetch all user IDs for availability check
  const { data: allUserIds = [] } = useQuery({
    queryKey: ["allUserIds"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUserids();
    },
    enabled: !!actor,
    staleTime: 30_000,
  });

  // Check username availability
  const {
    data: availabilityResult,
    isLoading: isCheckingAvailability,
    isFetching: isFetchingAvailability,
  } = useQuery({
    queryKey: ["usernameAvailability", debouncedUsername],
    queryFn: async () => {
      if (!actor || !debouncedUsername || allUserIds.length === 0) return null;
      const profiles = await Promise.all(
        allUserIds.map((id) => actor.getUserProfile(id).catch(() => null)),
      );
      const targetLower = debouncedUsername.toLowerCase();
      const taken = profiles.some((profile) => {
        if (!profile) return false;
        return getUsername(profile.name ?? "").toLowerCase() === targetLower;
      });
      return taken ? "taken" : "available";
    },
    enabled: !!actor && !!debouncedUsername && allUserIds.length > 0,
    staleTime: 0,
  });

  const isChecking =
    !!debouncedUsername && (isCheckingAvailability || isFetchingAvailability);
  const isTaken = availabilityResult === "taken";
  const isAvailable = availabilityResult === "available";

  const displayNameError = displayName
    ? validateDisplayName(displayName)
    : null;
  const usernameError = username ? validateUsername(username) : null;

  const showDisplayNameError = displayNameTouched && !!displayNameError;
  const showUsernameError = usernameTouched && !!usernameError;

  const isDisplayNameValid = displayName.trim().length > 0 && !displayNameError;
  const isUsernameValid = username.length > 0 && !usernameError;
  const isFormValid =
    isDisplayNameValid && isUsernameValid && !isTaken && !isChecking;

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value.toUpperCase());
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(sanitizeUsername(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDisplayNameTouched(true);
    setUsernameTouched(true);
    if (!isFormValid || isLoading) return;

    // Save real name to localStorage before calling backend
    if (realName.trim()) {
      localStorage.setItem("ss_real_name", realName.trim());
    }

    setIsLoading(true);
    try {
      await setUsernameOnBackend(
        displayName.trim(),
        username.trim(),
        realName.trim() || undefined,
      );
      // needsUsername will flip to false in context → App routes to feed automatically
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to save profile. Please try again.",
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
          <p className="text-white/40 text-sm">Set up your public identity.</p>
        </motion.div>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          className="space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          noValidate
        >
          {/* Display Name input */}
          <div className="space-y-1.5">
            <label
              htmlFor={displayNameId}
              className="block text-white/70 text-xs font-medium tracking-wide uppercase"
            >
              Display Name
            </label>
            <div
              className="flex items-center h-12 rounded-xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${
                  showDisplayNameError
                    ? "rgba(255,0,80,0.5)"
                    : isDisplayNameValid
                      ? "rgba(255,0,80,0.3)"
                      : "rgba(255,255,255,0.10)"
                }`,
                transition: "border-color 0.2s",
              }}
            >
              <input
                id={displayNameId}
                data-ocid="username_setup.display_name_input"
                type="text"
                autoComplete="name"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                placeholder="ONE VIBZ"
                value={displayName}
                onChange={handleDisplayNameChange}
                onBlur={() => setDisplayNameTouched(true)}
                maxLength={60}
                className="flex-1 h-full bg-transparent text-white placeholder:text-white/25 outline-none px-4"
                style={{
                  fontSize: "16px",
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                }}
                aria-describedby={
                  showDisplayNameError ? `${displayNameId}-error` : undefined
                }
                aria-invalid={showDisplayNameError}
              />
            </div>

            <motion.div
              animate={{
                height: showDisplayNameError ? "auto" : 0,
                opacity: showDisplayNameError ? 1 : 0,
              }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              {showDisplayNameError && (
                <p
                  id={`${displayNameId}-error`}
                  className="text-xs pt-1"
                  style={{ color: "#ff0050" }}
                  role="alert"
                >
                  {displayNameError}
                </p>
              )}
            </motion.div>

            {!showDisplayNameError && (
              <p className="text-white/25 text-xs pt-0.5">
                Spaces and emojis allowed · auto-uppercased
              </p>
            )}
          </div>

          {/* Real Name input (optional) */}
          <div className="space-y-1.5">
            <label
              htmlFor={realNameId}
              className="block text-white/70 text-xs font-medium tracking-wide uppercase"
            >
              Real Name{" "}
              <span className="text-white/30 lowercase normal-case">
                (optional)
              </span>
            </label>
            <div
              className="flex items-center h-12 rounded-xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                transition: "border-color 0.2s",
              }}
            >
              <input
                id={realNameId}
                data-ocid="username_setup.real_name_input"
                type="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="John Smith"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                maxLength={100}
                className="flex-1 h-full bg-transparent text-white placeholder:text-white/25 outline-none px-4"
                style={{ fontSize: "16px" }}
              />
            </div>
            <p className="text-white/25 text-xs pt-0.5">
              Used for search and verification
            </p>
          </div>

          {/* Username input with @ prefix */}
          <div className="space-y-1.5">
            <label
              htmlFor={usernameId}
              className="block text-white/70 text-xs font-medium tracking-wide uppercase"
            >
              @Username
            </label>
            <div
              className="flex items-center h-12 rounded-xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${
                  showUsernameError || isTaken
                    ? "rgba(255,0,80,0.5)"
                    : isAvailable
                      ? "rgba(34,197,94,0.5)"
                      : isUsernameValid
                        ? "rgba(255,0,80,0.3)"
                        : "rgba(255,255,255,0.10)"
                }`,
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
                id={usernameId}
                data-ocid="username_setup.input"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="your_handle"
                value={username}
                onChange={handleUsernameChange}
                onBlur={() => setUsernameTouched(true)}
                maxLength={40}
                className="flex-1 h-full bg-transparent text-white placeholder:text-white/25 outline-none pr-4"
                style={{ fontSize: "16px" }}
                aria-describedby={
                  showUsernameError ? `${usernameId}-error` : undefined
                }
                aria-invalid={showUsernameError || isTaken}
              />
            </div>

            {/* Availability indicator */}
            <div
              data-ocid="username_setup.availability_state"
              className="min-h-[20px]"
            >
              {isChecking && (
                <p
                  className="text-xs pt-1 flex items-center gap-1"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  <Loader2 size={11} className="animate-spin" />
                  Checking…
                </p>
              )}
              {!isChecking && isTaken && (
                <p
                  data-ocid="username_setup.error_state"
                  className="text-xs pt-1"
                  style={{ color: "#ff0050" }}
                  role="alert"
                >
                  ✗ This username is already taken. Please choose another.
                </p>
              )}
              {!isChecking && isAvailable && (
                <p className="text-xs pt-1" style={{ color: "#22c55e" }}>
                  ✓ Available
                </p>
              )}
              {showUsernameError && !isTaken && !isChecking && (
                <p
                  id={`${usernameId}-error`}
                  data-ocid="username_setup.error_state"
                  className="text-xs pt-1"
                  style={{ color: "#ff0050" }}
                  role="alert"
                >
                  {usernameError}
                </p>
              )}
              {!showUsernameError &&
                !isChecking &&
                !isTaken &&
                !isAvailable && (
                  <p className="text-white/25 text-xs pt-0.5">
                    Min. 3 characters · letters, numbers, underscores
                  </p>
                )}
            </div>
          </div>

          {/* Continue button */}
          <button
            type="submit"
            data-ocid="username_setup.submit_button"
            disabled={!isFormValid || isLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-white text-sm transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none mt-2"
            style={{
              background: "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
              boxShadow:
                isFormValid && !isLoading
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
