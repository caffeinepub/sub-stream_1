import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

export interface BattleInvite {
  fromPrincipal: string;
  fromName: string;
  streamId: string;
  messageId: string;
}

interface UseBattleInvitePollerOptions {
  enabled: boolean;
  onInviteReceived: (invite: BattleInvite) => void;
}

export function useBattleInvitePoller({
  enabled,
  onInviteReceived,
}: UseBattleInvitePollerOptions) {
  const { actor } = useAuth();
  const seenMessageIds = useRef<Set<string>>(new Set());
  const onInviteReceivedRef = useRef(onInviteReceived);

  // Keep the callback ref fresh without re-running the effect
  useEffect(() => {
    onInviteReceivedRef.current = onInviteReceived;
  });

  useEffect(() => {
    if (!enabled || !actor) return;

    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        const conversations = await actor.getConversations();
        if (cancelled) return;

        for (const conv of conversations) {
          const lastMsg = conv.lastMessage;
          if (!lastMsg || !lastMsg.startsWith("BATTLE_INVITE:")) continue;

          // Use otherUser + lastMessageAt as the dedup ID
          const messageId = `${conv.otherUser.toText()}-${conv.lastMessageAt.toString()}`;
          if (seenMessageIds.current.has(messageId)) continue;
          seenMessageIds.current.add(messageId);

          // Parse stream ID from "BATTLE_INVITE:{streamId}"
          const streamId = lastMsg.replace("BATTLE_INVITE:", "").trim();
          const fromPrincipal = conv.otherUser.toText();

          // Try to resolve sender name
          let fromName = fromPrincipal.slice(0, 8);
          try {
            const profile = await actor.getUserProfile(conv.otherUser);
            if (profile) {
              fromName = profile.name ?? fromName;
            }
          } catch {
            // silent — use truncated principal as name
          }

          if (!cancelled) {
            onInviteReceivedRef.current({
              fromPrincipal,
              fromName,
              streamId,
              messageId,
            });
          }
        }
      } catch {
        // silent polling failure
      }
    };

    void poll();
    const interval = setInterval(() => void poll(), 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, actor]);
}
