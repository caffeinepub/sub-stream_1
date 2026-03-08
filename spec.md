# Sub Stream — Follow, Friend, Block & Live Status System

## Current State

The app is a full-stack TikTok-style social video platform. The backend (Motoko) already has:
- `follow`, `unfollow`, `isFollowing`, `getFollowers`, `getFollowing`, `getFollowerCount` endpoints
- Online/live status fields on User (`isOnline`, `lastSeen`)
- Notification system (frontend-only, `NotificationsPage.tsx`)
- Direct messaging system
- User profiles with follower/following counts (stored but not live-computed)

What is **missing**:
- Block system (no `blockUser`, `unblockUser`, `getBlockedUsers`, `isBlocked` endpoints)
- Follower/following counts are stored on User but not updated when follow/unfollow happens
- No `Notification` type or backend notification storage — follow notifications, friend notifications, live notifications are missing from the backend
- No `isFriend` (mutual follow) query
- No `isLive` flag on User; the "live status" indicator for profiles is missing
- No `FollowersListPage` / `FollowingListPage` UI with profile picture, username, follow button, follow date
- `getFollowers` returns `[Principal]` but does not include follow date
- Profile pages don't show clickable Followers / Following counts that open lists
- Block list UI missing from Settings → Privacy

## Requested Changes (Diff)

### Add

**Backend:**
- `BlockRecord` type: `{ blocker: Principal; blocked: Principal; createdAt: Int }`
- `FollowRecord` type: `{ follower: Principal; following: Principal; createdAt: Int }` — store follow timestamps
- `Notification` type: `{ id: Nat; recipientId: Principal; senderId: Principal; kind: Text; message: Text; isRead: Bool; createdAt: Int }`
- `blockUser(userId)` — create block record, remove any existing follow relationship both ways
- `unblockUser(userId)` — remove block record
- `getBlockedUsers()` — returns `[BlockRecord]` for the caller
- `isBlocked(userId)` — returns Bool (either direction)
- `getFollowersWithDate(userId)` — returns `[{ follower: Principal; createdAt: Int }]`
- `getFollowingWithDate(userId)` — returns `[{ following: Principal; createdAt: Int }]`
- `isFriend(userId)` — returns Bool (mutual follow check)
- `getFriends()` — returns `[Principal]` (mutual follows of caller)
- `setLiveStatus(isLive: Bool)` — update user's live status
- `getLiveStatus(userId)` — returns `?{ isLive: Bool }`
- `getLiveFollowing()` — returns `[Principal]` of followed users who are currently live
- `getNotifications()` — returns `[Notification]` for caller
- `markNotificationRead(id: Nat)` — mark single notification read
- `markAllNotificationsRead()` — mark all read
- `getUnreadNotificationCount()` — returns Nat

**Backend updates:**
- Update `follow()` to: check blocked status, store follow record with timestamp, update follower/following counts on both users, create notification for the followed user, and if mutual follow exists create a "friend" notification
- Update `unfollow()` to: remove follow record, decrement follower/following counts on both users
- Add `isLive: Bool` field to `User` type
- Update `User` to track `isLive`

**Frontend pages (new):**
- `FollowersListPage.tsx` — full-screen sheet/page showing followers with avatar, display name, @username, follow date, follow/unfollow button
- `FollowingListPage.tsx` — same for following list
- `BlockedUsersPage.tsx` — Settings → Privacy → Blocked Users; list with unblock button
- `FriendsPage.tsx` — mutual follows list, accessible from Profile → Friends tab

**Frontend components (new):**
- `LiveRingAvatar` — avatar component that shows red animated ring when `isLive=true`, green dot when `isOnline=true`
- `FollowButton` — reusable follow/unfollow button with friend state awareness
- `BlockUserModal` — confirmation modal for blocking a user (accessed via Profile → More Options)

**Frontend updates:**
- `UserProfilePage.tsx` — Followers / Following counts become tappable links. Add "More Options" menu with Block User. Show LIVE badge + tap-to-join when creator is live. Use `LiveRingAvatar`.
- `ProfilePage.tsx` — update follower/following count display to be tappable. Show LIVE ring on own avatar when streaming.
- `NotificationsPage.tsx` — wire to real backend notifications (new follower, friend connection, user went live)
- `SettingsPage.tsx` — add "Privacy" section with "Blocked Users" entry
- `InboxPage.tsx` / `LiveDiscoveryPage.tsx` — use `LiveRingAvatar` for live status indicators
- Home feed following row — respect block relationships (don't show blocked users)

### Modify

- `follow()` in backend: add block check, store timestamp, update counts, create notification
- `unfollow()` in backend: decrement counts
- `User` type: add `isLive: Bool` field
- `UserProfile` type: add `isLive: Bool` field
- `registerUser()`: initialize `isLive = false`

### Remove

- Nothing removed

## Implementation Plan

1. **Backend**: Add `isLive`, `BlockRecord`, `FollowRecord` (with timestamp), `Notification` types. Add `blockUsers` map, `followRecords` map, `notifications` map. Implement all new endpoints. Update `follow`/`unfollow` to manage counts, store records, create notifications, check blocks. Add `setLiveStatus`/`getLiveStatus`/`getLiveFollowing`.

2. **Backend.d.ts**: Regenerated automatically after Motoko generation.

3. **Frontend — LiveRingAvatar component**: Reusable avatar with animated red ring (isLive), gradient story ring (hasStory), green online dot.

4. **Frontend — FollowButton component**: Handles follow/unfollow/friend states, calls backend, shows correct label.

5. **Frontend — FollowersListPage / FollowingListPage**: Full-screen modal pages with real data, follow dates, tappable profiles.

6. **Frontend — BlockedUsersPage**: In Settings → Privacy, shows blocked list with unblock.

7. **Frontend — BlockUserModal**: Triggered from UserProfilePage → More Options.

8. **Frontend — UserProfilePage updates**: Tappable counts, More Options → Block, LIVE badge, `LiveRingAvatar`.

9. **Frontend — NotificationsPage updates**: Load real notifications from backend, mark read, tap to open profile.

10. **Frontend — SettingsPage updates**: Add Privacy → Blocked Users entry.

11. **Frontend — Home feed / InboxPage**: Swap plain avatars with `LiveRingAvatar`, filter blocked users.
