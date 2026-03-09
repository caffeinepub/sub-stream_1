# Sub Stream

## Current State

### Follow System
- Backend: `followMap` stores `follower → Set<following>`. `follow()`, `unfollow()`, `isFollowing()`, `getFollowerCount()`, `getFollowingCount()` (inferred from `followingCount` on User record) all exist.
- `UserProfilePage`: Uses `useQuery` for `isFollowing` and a separate `followerCount` query. Optimistic update is in place but stale data can cause the button to flash "Follow" briefly after a page re-render because the queries have a 30s staleTime and may not be refetched.
- `LiveStreamViewPage`: Has a separate local `followed` boolean state initialized to `false` on every mount — it never checks the backend, so it always starts as "Follow" regardless of whether the user is actually following the host.
- `ProfilePage`: Shows own follower/following counts from `userProfile` cache, which is not invalidated after a follow/unfollow from other pages.
- Counts: `getFollowerCount` iterates `allUserIds` — accurate. But `followingCount` on `User` is a denormalized counter that is never updated by the backend `follow()`/`unfollow()` functions (they only mutate `followMap`). So the "Following" count displayed on profiles is always 0.

### Livestream UI (LiveStreamViewPage)
- Right-side vertical icon column exists (Like, Share, Gift, Mute, Settings, etc.) that the user wants replaced.
- Host controls are in a separate bottom sheet accessed via a settings button.
- No dedicated power-button menu at top-right for "End live / Stream settings / Live info".
- Bottom toolbar already has some horizontal buttons but is cluttered with extra controls.
- Comments rendered as a simple chat list with no tap-to-action system.

## Requested Changes (Diff)

### Add
- Backend: `getFollowingCount(userId: Principal): Nat` — derived from `followMap` (accurate, not cached), mirroring `getFollowerCount`.
- `LiveStreamViewPage`: Power button (top-right) that opens a small popup menu with: End live, Stream settings, Live info.
- `LiveStreamViewPage`: Tap-on-comment action sheet: Mute user, Make moderator, Remove comment, Block user.
- `LiveStreamViewPage`: Initial follow state loaded from backend (`isFollowing`) so the Follow button starts in the correct state.

### Modify
- Backend `follow()`: After adding to `followMap`, also increment `followingCount` on the caller's User record.
- Backend `unfollow()`: After removing from `followMap`, also decrement `followingCount` on the caller's User record (min 0).
- `UserProfilePage` `isFollowing` query: Reduce staleTime to 0 so it always refetches when the page mounts. Remove optimistic followerCount manipulation on mutate (let invalidation handle it) to avoid count flicker.
- `LiveStreamViewPage`: Remove all vertical right-side icon buttons. Replace with a horizontal bottom toolbar: Co-host | Invite guest | Comments | Share | Effects | More (...). Remove old host-controls bottom sheet entry point from bottom bar. Move End Live and Stream Settings into the new power-button top-right menu.
- `LiveStreamViewPage`: "More" button opens a menu with: Switch camera, Gift box, Mute microphone, End live, Stream settings.
- `LiveStreamViewPage`: Follow button in top-left should initialize its state by calling `actor.isFollowing(hostPrincipal)` on mount.
- `ProfilePage` and `UserProfilePage`: Read `followingCount` from `getFollowingCount()` backend call rather than the stale `user.followingCount` field.

### Remove
- `LiveStreamViewPage`: Vertical right-side icon column (Like, Share, Gift individual buttons stacked vertically).
- `LiveStreamViewPage`: Separate "Host Controls" bottom sheet button in the bottom bar.

## Implementation Plan

1. **Backend** (`main.mo`):
   - Add `getFollowingCount(userId: Principal): async Nat` — scans `followMap.get(userId)?.size()`.
   - In `follow()`: after updating `followMap`, look up caller's User record and increment `followingCount` by 1.
   - In `unfollow()`: after updating `followMap`, look up caller's User record and decrement `followingCount` (floor 0).

2. **Frontend — Follow button state** (`UserProfilePage.tsx`):
   - Set `staleTime: 0` on the `isFollowing` query so it fetches fresh on every mount.
   - Remove optimistic `followerCount` setQueryData in `onMutate`; rely only on `invalidateQueries` in `onSuccess`.
   - Call `actor.getFollowingCount(principal)` for the Following stat instead of `profile.followingCount`.

3. **Frontend — Follow button on LiveStreamViewPage**:
   - On mount, if `actor` and `stream.hostPrincipal` are available, call `actor.isFollowing(hostPrincipal)` and seed the `followed` state from the result.

4. **Frontend — Livestream UI redesign** (`LiveStreamViewPage.tsx`):
   - Remove vertical right-side icon column.
   - Top-right: replace Share + Close buttons with a single power (⏻) button that opens an inline dropdown with: End live (host only), Stream settings (host only), Live info.
   - Keep top-left host info + Follow button unchanged.
   - Bottom controls: horizontal scrollable row of icon+label pills — Co-host | Invite guest | Comments | Share | Effects | More (...).
   - "More" menu: Switch camera, Gift box, Mute microphone, End live, Stream settings.
   - Comments overlay: make each message tappable; tapping opens an action sheet — Mute user, Make moderator, Remove comment, Block user.
   - Keep all existing battle mode, gift, chat, heart burst, and engagement bar logic intact.
