# Sub Stream — Profile Chat System

## Current State
- UserProfilePage has a "Message" (Send icon) button below the Follow button, calls `onOpenDM?.(principalStr)`
- InboxPage has a full ChatView with header, messages, input bar
- Block system exists via `useFollowSystem` (`isBlockedByMe`, `isBlockedByThem`)
- `actor.getConversations()` and `actor.sendMessage()` exist; no explicit `createOrGetConversation` — `sendMessage` implicitly creates/opens conversation
- No username copy feature
- No message request UI in InboxPage
- App.tsx wires `onOpenDM` to set `dmOpenFor` and navigate to inbox

## Requested Changes (Diff)

### Add
- 💬 Chat button BESIDE the Follow button (not below) in UserProfilePage and ProfilePage
- Username tap-to-copy on profile pages: tap/long-press @username → copy to clipboard + "Username copied" toast
- Block guard: if blocked user tries to open chat show "You cannot message this user."
- Message Requests tab in InboxPage with Accept/Ignore UI (frontend-only using localStorage for request state)
- Emoji button in ChatView input bar

### Modify
- Move the Chat/Message button to sit inline beside the Follow button
- ChatView: add emoji picker toggle, improve input bar
- UserProfilePage message button: check block status before opening chat
- InboxPage: add Message Requests section at top of conversation list

### Remove
- Separate standalone Message button row below follow button (consolidate into follow row)

## Implementation Plan
1. Update UserProfilePage: add 💬 Chat icon beside Follow button; add username copy on tap; add block guard before opening DM
2. Update ProfilePage: same username copy feature on own profile
3. Update InboxPage/ChatView: add emoji button to input, add Message Requests section
4. Wire block check via `isBlockedByThem` before allowing chat open
