# Sub Stream

## Current State

Full-stack social video platform on ICP (Motoko backend + React/Tailwind frontend). Deployed as Version 16+.

**Working features:**
- Auth (Internet Identity / email+password), persistent login, username setup, online status
- Vertical video feed with swipe navigation, double-tap like, single-tap pause/play
- Video upload (3-step: camera → editor → publish), real thumbnails, video grid on profile
- Stories (add/view/expire 24h, story ring, story viewer)
- Live stream setup (practice mode, camera preview, countdown) and viewer page
- Co-host invite system (DM-based invite, split-screen layout)
- Battle mode: basic split screen, timer, gift point scoring, confetti win screen
- Gift system: coin wallet context, gift catalog (emoji-based), animation overlay, Stripe coin recharge
- Inbox: real DM conversations, activity section, Live Now section
- Search: users, videos, hashtags
- Profile: video grid, pin/edit/delete posts, follow/unfollow, bio editing
- Bottom/top nav, create menu

**Known gaps in last attempt:**
- Battle mode build failed — the full Match Battle System was incomplete
- Gift animations use emoji only, no 3D/CSS keyframe animation sequences
- Battle challenge list loads placeholder names instead of real live creators
- MVP crown animation, rematch flow, supporter display not implemented
- Gift goal progress bar for creators not implemented

## Requested Changes (Diff)

### Add
- **LiveMatchBattlePage** — dedicated full-screen battle view with proper split-screen layout, top battle score bar (red vs blue), animated fill bar, timer countdown (5 min default), double-tap support (1 point per tap per side), live chat overlay at bottom
- **BattleMatchmaking** — when host taps "Match Battle", show list of real currently-live creators (pulled from active principals), send a `BATTLE_INVITE:` DM, invited creator receives `BattleInviteNotification` (similar to CoHostInviteNotification), accept starts battle
- **BattleInviteNotification** — slide-in banner: "[name] wants to start a LIVE battle", Accept / Decline buttons, auto-dismiss 15s
- **MVP Crown Animation** — when timer hits 0, animated crown SVG drops from top onto winning side, "MVP" label, confetti burst, 3s duration
- **Rematch flow** — after battle end show "Rematch" and "Exit Battle" buttons; both players press Rematch → new 5-min battle starts immediately
- **Supporter display** — 3 small profile circles shown under each side during battle (top gifters for that session)
- **Enhanced gift animations** — CSS keyframe animations for: Rose (float up + sparkle), Lion (walk + shake), Phoenix (fire trail), Universe (galaxy burst), Plane (arc flight), Money Gun (bills scatter); all layered above video, GPU-accelerated, 3–6s duration, queued playback
- **Gift Goal bar** — creator can set a gift goal (e.g. "Rose Goal 500"); progress bar visible during live to all viewers; filled by incoming gifts
- **Creator earnings / diamond conversion** — display in profile wallet: coins spent, diamonds earned (100 coins = 50 diamonds), withdrawal section UI (non-functional placeholder for Stripe payout flow)

### Modify
- **LiveStreamViewPage** — wire "Match Battle" button to BattleMatchmaking flow; replace basic confetti end with MVP crown animation; show battle state when in battle mode
- **BattleMode** in LiveStreamViewPage — use real score from gift sends (each gift's coin cost = battle points); fix battle challenge list to load real users
- **GiftAnimation** component — replace emoji-only animations with CSS keyframe sequences per gift type
- **CoinWalletContext** — add `giftGoal` state, `setGiftGoal`, `giftProgress` tracker updated on each gift send during live
- **InboxPage** — BattleInviteNotification also surfaced here when a battle invite DM arrives

### Remove
- Placeholder/hardcoded creator names in battle challenge sheet
- Static battle score (replace with real per-session accumulator)

## Implementation Plan

1. Create `BattleInviteNotification.tsx` component (mirrors CoHostInviteNotification)
2. Create `useBattleInvitePoller.ts` hook — polls conversations for `BATTLE_INVITE:` prefix DMs
3. Update `LiveStreamViewPage.tsx`:
   - Wire "Match Battle" button to open creator picker → send `BATTLE_INVITE:` DM
   - Add battle invite detection for the current user (via hook)
   - Replace basic split-screen score with real per-session gift accumulator
   - Add `giftGoal` progress bar UI
   - MVP crown animation on battle end (CSS keyframes)
   - Rematch / Exit buttons on battle end screen
   - Supporter icons (track top 3 gifters per side)
4. Update `GiftAnimation.tsx` — add CSS keyframe animation variants per gift type
5. Update `CoinWalletContext.tsx` — add giftGoal state + diamond balance derived from earnings
6. Wire `BattleInviteNotification` into `App.tsx` (alongside CoHostInviteNotification)
7. Add `LiveMatchBattlePage.tsx` for standalone battle view if needed
8. Validate + deploy
