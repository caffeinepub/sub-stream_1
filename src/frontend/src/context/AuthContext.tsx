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

const DISPLAY_NAME_KEY = "ss_display_name";
const EMAIL_KEY = "ss_email";
const HAS_USERNAME_KEY = "ss_has_username";

interface AuthContextValue {
  isAuthenticated: boolean;
  isInitializing: boolean;
  needsUsername: boolean;
  userProfile: UserProfile | null;
  loginWithII: () => void;
  logout: () => void;
  registerWithEmail: (
    name: string,
    email: string,
    password: string,
  ) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  setUsernameOnBackend: (username: string) => Promise<void>;
  actor: backendInterface | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

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

  // needsUsername: true when authenticated but has no username set yet
  // Uses belt-and-suspenders: check both the backend profile and localStorage flag
  const needsUsername =
    isAuthenticated &&
    !isInitializing &&
    !localStorage.getItem(HAS_USERNAME_KEY) &&
    (!userProfile || !userProfile.name || userProfile.name.trim() === "");

  const fetchProfile = useCallback(async () => {
    if (!actor || !isAuthenticated) return;
    try {
      const profile = await actor.getCallerUserProfile();
      if (profile) {
        setUserProfile(profile);
        // If the backend profile has a name, mark username as set
        if (profile.name && profile.name.trim() !== "") {
          localStorage.setItem(HAS_USERNAME_KEY, "1");
        }
      } else {
        // No profile yet — new user from II login without email registration
        // Build a basic profile from localStorage display name if available
        const name = localStorage.getItem(DISPLAY_NAME_KEY) ?? "";
        const email = localStorage.getItem(EMAIL_KEY) ?? "";
        if (name) {
          try {
            await actor.registerUser(name, email, "");
            const created = await actor.getCallerUserProfile();
            setUserProfile(created);
          } catch {
            // Already registered or error — try fetching again
            const retry = await actor.getCallerUserProfile();
            setUserProfile(retry);
          }
        } else {
          // New II user — set null profile, App will show a prompt or treat as guest
          setUserProfile(null);
        }
      }
    } catch {
      setUserProfile(null);
    }
  }, [actor, isAuthenticated]);

  // Fetch profile once when actor + auth ready
  useEffect(() => {
    if (!isAuthenticated || !actor || isFetching || profileFetchedRef.current)
      return;
    profileFetchedRef.current = true;
    void fetchProfile();
  }, [isAuthenticated, actor, isFetching, fetchProfile]);

  // Reset ref when auth state changes
  useEffect(() => {
    if (!isAuthenticated) {
      profileFetchedRef.current = false;
      setUserProfile(null);
    }
  }, [isAuthenticated]);

  // Heartbeat: keep online status alive every 30s
  useEffect(() => {
    if (isAuthenticated && actor) {
      void actor.updateOnlineStatus(true).catch(() => {});
      heartbeatRef.current = setInterval(() => {
        void actor.updateOnlineStatus(true).catch(() => {});
      }, 30_000);
    }
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isAuthenticated, actor]);

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
    // Clear username flag so the next user goes through the username setup flow
    localStorage.removeItem(HAS_USERNAME_KEY);
    ii.clear();
  }, [actor, ii]);

  const registerWithEmail = useCallback(
    async (name: string, email: string, password: string) => {
      if (!actor) throw new Error("Not connected");
      const hash = btoa(`${email}:${password}`);
      try {
        await actor.registerUser(name, email, hash);
      } catch (err) {
        // If "already exists" treat as login success
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.toLowerCase().includes("already")) throw err;
      }
      localStorage.setItem(DISPLAY_NAME_KEY, name);
      localStorage.setItem(EMAIL_KEY, email);
      localStorage.setItem(HAS_USERNAME_KEY, "1");
      const profile = await actor.getCallerUserProfile();
      setUserProfile(profile);
      profileFetchedRef.current = true;
    },
    [actor],
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!actor) throw new Error("Not connected");
      const hash = btoa(`${email}:${password}`);
      // Attempt to register — if already exists, treat as login
      try {
        const displayName =
          localStorage.getItem(DISPLAY_NAME_KEY) ?? email.split("@")[0];
        await actor.registerUser(displayName, email, hash);
        localStorage.setItem(DISPLAY_NAME_KEY, displayName);
        localStorage.setItem(EMAIL_KEY, email);
        localStorage.setItem(HAS_USERNAME_KEY, "1");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.toLowerCase().includes("already")) throw err;
      }
      const profile = await actor.getCallerUserProfile();
      setUserProfile(profile);
      profileFetchedRef.current = true;
    },
    [actor],
  );

  const setUsernameOnBackend = useCallback(
    async (username: string) => {
      if (!actor) throw new Error("Not connected");
      await actor.updateUserProfile(
        username,
        userProfile?.bio ?? "",
        userProfile?.avatarUrl ?? "",
      );
      localStorage.setItem(HAS_USERNAME_KEY, "1");
      localStorage.setItem(DISPLAY_NAME_KEY, username);
      await fetchProfile();
    },
    [actor, userProfile, fetchProfile],
  );

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const value: AuthContextValue = {
    isAuthenticated,
    isInitializing,
    needsUsername,
    userProfile,
    loginWithII,
    logout,
    registerWithEmail,
    loginWithEmail,
    setUsernameOnBackend,
    actor,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
