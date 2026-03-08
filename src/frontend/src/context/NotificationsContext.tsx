import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  type: "follow" | "like" | "comment" | "gift" | "friend" | "live";
  actorName: string;
  actorAvatar: string;
  targetLabel: string;
  timestamp: number;
  isRead: boolean;
  /** Optional: principal string so tapping the notification opens their profile */
  tappedPrincipal?: string;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (
    n: Omit<AppNotification, "id" | "isRead" | "timestamp">,
  ) => void;
  markAllRead: () => void;
  clearAll: () => void;
  // ── Convenience methods ───────────────────────────────────────────────────
  addFollowNotification: (
    actorName: string,
    actorPrincipal: string,
    actorAvatar: string,
  ) => void;
  addFriendNotification: (actorName: string, actorAvatar: string) => void;
  addLiveNotification: (
    actorName: string,
    actorAvatar: string,
    actorPrincipal: string,
  ) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAllRead: () => {},
  clearAll: () => {},
  addFollowNotification: () => {},
  addFriendNotification: () => {},
  addLiveNotification: () => {},
});

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = "substream_notifications";

function loadNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveNotifications(notifications: AppNotification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // silent
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NotificationsProvider({ children }: PropsWithChildren) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadNotifications(),
  );

  // Persist on every change
  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const addNotification = useCallback(
    (n: Omit<AppNotification, "id" | "isRead" | "timestamp">) => {
      const newNotif: AppNotification = {
        ...n,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        isRead: false,
        timestamp: Date.now(),
      };
      setNotifications((prev) => [newNotif, ...prev].slice(0, 200));
    },
    [],
  );

  const addFollowNotification = useCallback(
    (actorName: string, actorPrincipal: string, actorAvatar: string) => {
      addNotification({
        type: "follow",
        actorName,
        actorAvatar,
        targetLabel: "you",
        tappedPrincipal: actorPrincipal,
      });
    },
    [addNotification],
  );

  const addFriendNotification = useCallback(
    (actorName: string, actorAvatar: string) => {
      addNotification({
        type: "friend",
        actorName,
        actorAvatar,
        targetLabel: "you — you're now friends!",
      });
    },
    [addNotification],
  );

  const addLiveNotification = useCallback(
    (actorName: string, actorAvatar: string, actorPrincipal: string) => {
      addNotification({
        type: "live",
        actorName,
        actorAvatar,
        targetLabel: "is now LIVE",
        tappedPrincipal: actorPrincipal,
      });
    },
    [addNotification],
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAllRead,
        clearAll,
        addFollowNotification,
        addFriendNotification,
        addLiveNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications(): NotificationsContextValue {
  return useContext(NotificationsContext);
}
