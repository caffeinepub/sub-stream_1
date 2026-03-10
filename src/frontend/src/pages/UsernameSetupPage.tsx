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

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
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

  const { data: allUserIds = [] } = useQuery({
    queryKey: ["allUserIds"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUserids();
    },
    enabled: !!actor,
    staleTime: 30_000,
  });

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

      const allUsernames = profiles
        .filter(Boolean)
        .map((p) => getUsername(p!.name ?? "").toLowerCase())
        .filter((u) => u.length > 0);

      // Exact match check
      const exactTaken = allUsernames.some((u) => u === targetLower);
      if (exactTaken) return "taken";

      // Similarity check
      if (targetLower.length >= 4) {
        for (const existing of allUsernames) {
          if (existing.length < 4) continue;
          const dist = levenshteinDistance(targetLower, existing);
          if (dist <= 2) return "similar";
          // Substring check for longer names
          if (
            targetLower.length >= 5 &&
            existing.length >= 5 &&
            (targetLower.includes(existing) || existing.includes(targetLower))
          ) {
            return "similar";
          }
        }
      }

      return "available";
    },
    enabled: !!actor && !!debouncedUsername && allUserIds.length > 0,
    staleTime: 0,
  });

  const isChecking =
    !!debouncedUsername && (isCheckingAvailability || isFetchingAvailability);
  const isTaken = availabilityResult === "taken";
  const isSimilar = availabilityResult === "similar";
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
    isDisplayNameValid &&
    isUsernameValid &&
    !isTaken &&
    !isSimilar &&
    !isChecking;

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
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to set username. Please try again.",
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
        <div className="text-center mb-8">
          <motion.div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
            }}
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
          >
            <Zap size={24} className="text-white" fill="white" />
          </motion.div>
          <h1
            className="text-2xl font-bold tracking-tight text-white"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Set Up Your Profile
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Choose your identity on SUB STREAM
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name */}
          <div>
            <label
              htmlFor={displayNameId}
              className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider"
            >
              Display Name
            </label>
            <input
              id={displayNameId}
              data-ocid="username.display_name_input"
              type="text"
              value={displayName}
              onChange={handleDisplayNameChange}
              onBlur={() => setDisplayNameTouched(true)}
              placeholder="YOUR NAME"
              maxLength={30}
              className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 text-sm font-bold tracking-wide"
            />
            {showDisplayNameError && (
              <p
                className="text-xs mt-1"
                style={{ color: "#ff0050" }}
                data-ocid="username.display_name_error"
              >
                {displayNameError}
              </p>
            )}
          </div>

          {/* Username */}
          <div>
            <label
              htmlFor={usernameId}
              className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider"
            >
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm font-medium">
                @
              </span>
              <input
                id={usernameId}
                data-ocid="username.username_input"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                onBlur={() => setUsernameTouched(true)}
                placeholder="yourhandle"
                maxLength={20}
                className="w-full h-12 rounded-xl border border-white/10 bg-white/5 pl-8 pr-10 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 text-sm"
              />
              {/* Status icon */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isChecking && (
                  <Loader2 size={14} className="animate-spin text-white/30" />
                )}
                {!isChecking && isAvailable && (
                  <span className="text-green-400 text-sm">✓</span>
                )}
                {!isChecking && (isTaken || isSimilar) && (
                  <span
                    style={{ color: isSimilar ? "#f59e0b" : "#ff0050" }}
                    className="text-sm"
                  >
                    ✗
                  </span>
                )}
              </div>
            </div>

            {showUsernameError && (
              <p
                className="text-xs mt-1"
                style={{ color: "#ff0050" }}
                data-ocid="username.username_error"
              >
                {usernameError}
              </p>
            )}
            {!showUsernameError && debouncedUsername && (
              <motion.div
                key={availabilityResult ?? "checking"}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1"
              >
                {isChecking && (
                  <p className="text-xs text-white/40">
                    Checking availability...
                  </p>
                )}
                {!isChecking && isAvailable && (
                  <p className="text-xs text-green-400">
                    ✓ Username is available
                  </p>
                )}
                {!isChecking && isTaken && (
                  <p
                    className="text-xs"
                    style={{ color: "#ff0050" }}
                    data-ocid="username.taken_error"
                  >
                    ✗ This username is already taken. Please choose another.
                  </p>
                )}
                {!isChecking && isSimilar && (
                  <p
                    className="text-xs"
                    style={{ color: "#f59e0b" }}
                    data-ocid="username.similar_error"
                  >
                    ⚠️ This username is too similar to an existing account.
                    Choose a more unique username to prevent confusion.
                  </p>
                )}
              </motion.div>
            )}
          </div>

          {/* Real Name */}
          <div>
            <label
              htmlFor={realNameId}
              className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider"
            >
              Real Name{" "}
              <span className="normal-case font-normal text-white/30">
                (optional)
              </span>
            </label>
            <input
              id={realNameId}
              data-ocid="username.real_name_input"
              type="text"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              placeholder="John Smith"
              maxLength={60}
              className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 text-sm"
            />
            <p className="text-xs text-white/25 mt-1">
              Used for search — not shown publicly
            </p>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            data-ocid="username.submit_button"
            disabled={!isFormValid || isLoading}
            className="w-full h-12 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #ff0050 0%, #ff3366 100%)",
            }}
            whileTap={{ scale: 0.97 }}
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin mx-auto" />
            ) : (
              "Continue →"
            )}
          </motion.button>
        </form>

        <p className="text-center text-white/20 text-xs mt-6">
          Not your account?{" "}
          <button
            type="button"
            data-ocid="username.logout_button"
            onClick={onLogout}
            className="font-semibold hover:text-white/50 transition-colors"
            style={{ color: "rgba(255,0,80,0.6)" }}
          >
            Sign out
          </button>
        </p>
      </motion.div>
    </div>
  );
}
