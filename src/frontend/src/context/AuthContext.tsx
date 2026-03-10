import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { UserProfile, backendInterface } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { packName, sanitizeUsername } from "../lib/userFormat";

const DISPLAY_NAME_KEY = "ss_display_name";
const EMAIL_KEY = "ss_email";
const HAS_USERNAME_KEY = "ss_has_username";
const USERNAME_KEY = "ss_username";
const REAL_NAME_KEY = "ss_real_name";
// Stores the principal string so we can detect identity switches
const PRINCIPAL_KEY = "ss_principal";

// All localStorage keys used by the app — wipe all of them on full reset
const ALL_SESSION_KEYS = [
  DISPLAY_NAME_KEY,
  EMAIL_KEY,
  HAS_USERNAME_KEY,
  USERNAME_KEY,
  PRINCIPAL_KEY,
  REAL_NAME_KEY,
];

/** Clears every SUB STREAM session key from localStorage */
function clearLocalSessionData() {
  for (const key of ALL_SESSION_KEYS) {
    localStorage.removeItem(key);
  }
  // Also wipe any ICP / Internet Identity keys stored in localStorage
  const keysToDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (
      k &&
      (k.startsWith("ic-") ||
        k.startsWith("identity") ||
        k.startsWith("delegation") ||
        k.startsWith("keyPair") ||
        k.startsWith("ii-"))
    ) {
      keysToDelete.push(k);
    }
  }
  for (const k of keysToDelete) {
    localStorage.removeItem(k);
  }
}

interface AuthContextValue {
  isAuthenticated: boolean;
  isInitializing: boolean;
  needsUsername: boolean;
  userProfile: UserProfile | null;
  loginWithII: () => void;
  logout: () => void;
  /** Wipes all local session data AND signs out — fresh start */
  clearAllSessions: () => void;
  registerWithEmail: (
    name: string,
    email: string,
    password: string,
    realName?: string,
  ) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  setUsernameOnBackend: (
    displayName: string,
    username: string,
    realName?: string,
  ) => Promise<void>;
  actor: backendInterface | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Ensure the caller has a registered user record on the backend.
 * This is safe to call multiple times — if the user already exists, the
 * `registerUser` call will throw "already exists" which we swallow.
 *
 * Returns the UserProfile once guaranteed to exist.
 */
async function ensureUserExists(
  actor: backendInterface,
  fallbackName: string,
  fallbackEmail: string,
): Promise<UserProfile | null> {
  // 1. Try fetching the profile first (cheapest path for returning users)
  let profile: UserProfile | null = null;
  try {
    profile = await actor.getCallerUserProfile();
  } catch {
    // If the call itself traps (e.g. no role yet), continue to registration
    profile = null;
  }

  if (profile) return profile;

  // 2. Profile is null → register the user (idempotent: "already exists" is OK)
  const name = fallbackName.trim() || fallbackEmail.split("@")[0] || "User";
  try {
    await actor.registerUser(name, fallbackEmail, "");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // If user already existed, that's fine — we just need their profile
    if (!msg.toLowerCase().includes("already")) {
      // A genuine error — bail out rather than loop
      return null;
    }
  }

  // 3. Fetch again after registration
  try {
    profile = await actor.getCallerUserProfile();
  } catch {
    profile = null;
  }

  return profile;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: PropsWithChildren) {
  const ii = useInternetIdentity();
  const { actor, isFetching } = useActor();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const profileFetchedRef = useRef(false);

  // Determine authentication state: identity exists and is not anonymous
  const isAuthenticated =
    !!ii.identity && !ii.identity.getPrincipal().isAnonymous();
  const isInitializing = ii.isInitializing || isFetching;

  // needsUsername: authenticated but no username set yet
  // Belt-and-suspenders: check both the backend profile and localStorage flag
  const needsUsername =
    isAuthenticated &&
    !isInitializing &&
    !localStorage.getItem(HAS_USERNAME_KEY) &&
    (!userProfile || !userProfile.name || userProfile.name.trim() === "");

  // ─── fetchProfile ────────────────────────────────────────────────────────
  // Guarantees a user record exists before trying to read the profile.
  const fetchProfile = useCallback(async () => {
    if (!actor || !isAuthenticated) return;

    const storedName = localStorage.getItem(DISPLAY_NAME_KEY) ?? "";
    const storedEmail = localStorage.getItem(EMAIL_KEY) ?? "";

    const profile = await ensureUserExists(actor, storedName, storedEmail);
    if (profile) {
      setUserProfile(profile);
      if (profile.name && profile.name.trim() !== "") {
        localStorage.setItem(HAS_USERNAME_KEY, "1");
      }
    } else {
      // Could not create/fetch profile — set null so username setup is shown
      setUserProfile(null);
    }
  }, [actor, isAuthenticated]);

  // Fetch profile once when actor + auth is ready
  useEffect(() => {
    if (!isAuthenticated || !actor || isFetching || profileFetchedRef.current)
      return;
    profileFetchedRef.current = true;
    void fetchProfile();
  }, [isAuthenticated, actor, isFetching, fetchProfile]);

  // Reset when auth state changes (e.g. logout or identity switch)
  useEffect(() => {
    if (!isAuthenticated) {
      profileFetchedRef.current = false;
      setUserProfile(null);
    }
  }, [isAuthenticated]);

  // ─── Heartbeat (online presence) ────────────────────────────────────────
  // Only start after we have confirmed the user exists (profile loaded)
  useEffect(() => {
    if (isAuthenticated && actor && userProfile) {
      // Attempt update; silently ignore if it still fails for any reason
      void actor.updateOnlineStatus(true).catch(() => {});
      heartbeatRef.current = setInterval(() => {
        void actor.updateOnlineStatus(true).catch(() => {});
      }, 30_000);
    }
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isAuthenticated, actor, userProfile]);

  // ─── Auth actions ────────────────────────────────────────────────────────

  const loginWithII = useCallback(() => {
    ii.login();
  }, [ii]);

  const logout = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (actor) {
      void actor.updateOnlineStatus(false).catch(() => {});
    }
    setUserProfile(null);
    profileFetchedRef.current = false;
    // Clear session keys so next user goes through the setup flow
    localStorage.removeItem(HAS_USERNAME_KEY);
    localStorage.removeItem(PRINCIPAL_KEY);
    ii.clear();
  }, [actor, ii]);

  /**
   * Nuclear option: clears ALL local session data (SUB STREAM keys + ICP keys)
   * then signs out. Equivalent to "factory reset" of the auth state.
   */
  const clearAllSessions = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (actor) {
      void actor.updateOnlineStatus(false).catch(() => {});
    }
    setUserProfile(null);
    profileFetchedRef.current = false;
    clearLocalSessionData();
    ii.clear();
  }, [actor, ii]);

  /**
   * Register a brand-new account with email/password.
   * After registration the user still needs to set a username, so we do NOT
   * set HAS_USERNAME_KEY here.
   */
  const registerWithEmail = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      realName?: string,
    ) => {
      if (!actor) throw new Error("Not connected");
      const hash = btoa(`${email}:${password}`);

      try {
        await actor.registerUser(name, email, hash);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.toLowerCase().includes("already")) throw err;
        // "already exists" → treat as login success, continue below
      }

      // Persist for fallback identification on subsequent loads
      localStorage.setItem(DISPLAY_NAME_KEY, name);
      localStorage.setItem(EMAIL_KEY, email);
      if (realName?.trim()) {
        localStorage.setItem(REAL_NAME_KEY, realName.trim());
      }

      // Fetch profile — user was just registered so it must exist
      const profile = await actor.getCallerUserProfile();
      setUserProfile(profile);
      profileFetchedRef.current = true;

      // New registrations need username setup — do NOT set HAS_USERNAME_KEY
    },
    [actor],
  );

  /**
   * Login with email/password.
   * If no record exists yet (e.g. first time on a new device), auto-create one.
   */
  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!actor) throw new Error("Not connected");
      const hash = btoa(`${email}:${password}`);

      const displayName =
        localStorage.getItem(DISPLAY_NAME_KEY) || email.split("@")[0];

      // Attempt register (idempotent)
      try {
        await actor.registerUser(displayName, email, hash);
        localStorage.setItem(DISPLAY_NAME_KEY, displayName);
        localStorage.setItem(EMAIL_KEY, email);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.toLowerCase().includes("already")) throw err;
      }

      // Fetch profile — guaranteed to exist now
      const profile = await actor.getCallerUserProfile();
      if (profile) {
        setUserProfile(profile);
        // If they already had a username saved, mark it
        if (profile.name && profile.name.trim() !== "") {
          localStorage.setItem(HAS_USERNAME_KEY, "1");
        }
      }
      profileFetchedRef.current = true;
    },
    [actor],
  );

  /**
   * Called from UsernameSetupPage after the user chooses their handle.
   * Accepts a display name, username, and optional real name, packs them into
   * the "DISPLAYNAME|username|Real Name" storage format.
   */
  const setUsernameOnBackend = useCallback(
    async (displayName: string, username: string, realName?: string) => {
      if (!actor) throw new Error("Not connected");

      // If profile doesn't exist yet, ensure it does before updating
      if (!userProfile) {
        const storedName = localStorage.getItem(DISPLAY_NAME_KEY) ?? "";
        const storedEmail = localStorage.getItem(EMAIL_KEY) ?? "";
        await ensureUserExists(actor, storedName, storedEmail);
      }

      // Use realName param first, then fall back to localStorage
      const effectiveRealName =
        realName?.trim() || localStorage.getItem(REAL_NAME_KEY) || undefined;

      const packed = packName(displayName, username, effectiveRealName);
      await actor.updateUserProfile(
        packed,
        userProfile?.bio ?? "",
        userProfile?.avatarUrl ?? "",
      );
      localStorage.setItem(HAS_USERNAME_KEY, "1");
      localStorage.setItem(DISPLAY_NAME_KEY, displayName.toUpperCase());
      localStorage.setItem(USERNAME_KEY, sanitizeUsername(username));
      if (effectiveRealName) {
        localStorage.setItem(REAL_NAME_KEY, effectiveRealName);
      }
      await fetchProfile();
    },
    [actor, userProfile, fetchProfile],
  );

  const refreshProfile = useCallback(async () => {
    profileFetchedRef.current = false;
    await fetchProfile();
    profileFetchedRef.current = true;
  }, [fetchProfile]);

  const value: AuthContextValue = {
    isAuthenticated,
    isInitializing,
    needsUsername,
    userProfile,
    loginWithII,
    logout,
    clearAllSessions,
    registerWithEmail,
    loginWithEmail,
    setUsernameOnBackend,
    actor,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
