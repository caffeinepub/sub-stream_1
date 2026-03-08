# Sub Stream — Live Co-Host & Battle System

## Current State

- `LiveStreamViewPage` has a basic battle mode (local state only) with a simple `battleChallengeOpen` sheet listing hardcoded "Creator A/B/C" opponents
- The invite/guest system sends `LIVE_INVITE:${stream.id}` DMs but has no accept/decline UI
- Split screen shows host + cohost panels but cohost has no real video — just a gradient background
- Battle mode starts but has no proper 5-minute countdown, confetti win screen, or gift-to-score conversion
- No viewer-side "someone invited you to join live" notification UI exists
- No real co-host join flow exists (accepting the invite doesn't start a split screen)

## Requested Changes (Diff)

### Add

- **CoHostInviteNotification component**: floating banner/modal that appears when a `LIVE_INVITE:` DM is received while the user is in the app. Shows "[username] invited you to join LIVE" with Accept / Decline buttons. On Accept: opens the host's live stream in co-host mode.
- **Co-host join flow**: when guest accepts invite, their camera activates and split screen layout is shown
- **Split screen layout** (`CoHostSplitScreen` sub-layout inside `LiveStreamViewPage`):
  - Left: host video (real MediaStream or gradient fallback), creator name label, like count
  - Right: guest video (local camera if guest, or gradient fallback), guest name, like count
  - Both panels use `object-fit: cover`, fill equal halves of the screen
  - Viewer profile circles row below each creator (up to 6 avatar bubbles)
- **Battle interface**: when battle starts:
  - Top battle bar: `[Host name] ❤️ {hostScore} | ⏱ {MM:SS} | ❤️ {guestScore} [Guest name]`
  - Score fills from gifts sent to each side (gift.coins = points added to that creator's score)
  - Default duration: 5 minutes (300 seconds)
  - Viewers can tap "Support Host" or "Support Guest" side when sending gift
- **Win screen** (at battle end): overlay with confetti animation, "🏆 Winner: [name]" banner, final scores, Close button
- **Battle request popup** for the opponent: `"[hostName] wants to start a LIVE battle!"` with Accept / Decline
- **Exit co-host**: either creator can tap X on their panel to leave; if guest leaves → single view; if host ends → stream ends for both
- **Gift scoring**: gift sent during battle adds `gift.coins` to the selected side's score (left = host, right = guest)
- **Confetti animation**: pure CSS/JS particle confetti, 60 colored squares rain down on win

### Modify

- `LiveStreamViewPage`: replace the hardcoded "Creator A/B/C" battle sheet with a real user picker + battle request flow; extend split screen to support real guest camera; add proper 5-min battle timer; wire gift scoring to battle points
- `App.tsx`: poll for `LIVE_INVITE:` DMs while authenticated and not in a live stream; show the co-host invite notification when received
- Battle timer: change from 60s to 300s (5 minutes)

### Remove

- Hardcoded `["Creator A", "Creator B", "Creator C"]` in the battle challenge sheet
- The separate `battleChallengeOpen` logic replaced by real user invite system

## Implementation Plan

1. Create `src/components/CoHostInviteNotification.tsx` — floating invite banner with Accept/Decline
2. Create `src/hooks/useLiveInvitePoller.ts` — polls DMs for `LIVE_INVITE:` messages
3. Create `src/components/BattleConfetti.tsx` — confetti win animation
4. Extend `LiveStreamViewPage` with full split screen co-host, 5-min battle timer, gift-to-score routing, confetti win screen
5. Wire invite accept flow in `App.tsx` to launch split screen view
6. Validate and deploy
