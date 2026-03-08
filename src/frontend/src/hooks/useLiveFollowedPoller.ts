/**
 * useLiveFollowedPoller
 *
 * Polls every 30 seconds. When a followed creator transitions to isLive=true,
 * fires addLiveNotification.
 */

import { Principal } from "@icp-sdk/core/principal";
import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import { useInternetIdentity } from "./useInternetIdentity";
import { getLiveStatusStatic } from "./useLiveStatus";

const POLL_INTERVAL_MS = 30_000;

export function useLiveFollowedPoller() {
  const { actor, isAuthenticated } = useAuth();
  const { identity } = useInternetIdentity();
  const { addLiveNotification } = useNotifications();
  const prevLiveRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!isAuthenticated || !actor || !identity) return;

    const poll = async () => {
      try {
        const myPrincipal = identity.getPrincipal();
        const followingPrincipals = await actor.getFollowing(myPrincipal);

        for (const p of followingPrincipals) {
          const pStr = p.toString();
          const isLiveNow = getLiveStatusStatic(pStr);
          const wasLive = prevLiveRef.current[pStr] ?? false;

          if (isLiveNow && !wasLive) {
            // Transition to live — fetch their profile for display name
            try {
              const profile = await actor.getUserProfile(
                Principal.fromText(pStr),
              );
              const name = profile?.name ?? pStr.slice(0, 8);
              addLiveNotification(name, profile?.avatarUrl ?? "", pStr);
            } catch {
              addLiveNotification(pStr.slice(0, 8), "", pStr);
            }
          }

          prevLiveRef.current[pStr] = isLiveNow;
        }
      } catch {
        // silent
      }
    };

    void poll();
    const id = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isAuthenticated, actor, identity, addLiveNotification]);
}
