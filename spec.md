# SUB STREAM — Creator Profile Video Gallery

## Current State

Both `ProfilePage.tsx` (own profile) and `UserProfilePage.tsx` (other creator's profile) contain a `VideoGrid` / basic video grid that:
- Fetches videos via `actor.getAllVideos()` (own) or `actor.getUserVideos(principal)` (other)
- Renders a 3-column grid of `aspect-[9/16]` tiles
- Shows thumbnail image (if available) + a Play/view count badge in the bottom-left
- Empty state shows "No videos yet"
- Tapping a tile does nothing (no video player opens)
- No video duration indicator on thumbnails
- No fullscreen video player with swipe navigation from the profile
- No swipe-up hint indicator

The existing `VideoCard` component and `VideoFeed` (the main feed) already implement:
- Fullscreen video playback with single-tap pause/play, double-tap like
- Swipe up/down navigation between videos
- Right-side interaction icons (Like, Comment, Share, Gift, Bookmark)
- Comment and share bottom sheets
- Creator info overlay

## Requested Changes (Diff)

### Add
- `ProfileVideoPlayer` component: a fullscreen video player modal that opens when a thumbnail is tapped on the profile page. It accepts a list of videos and a starting index, and supports:
  - Immediate autoplay of the selected video
  - Swipe up → next video, swipe down → previous video (same gesture logic as VideoFeed)
  - Single tap → pause/play with Play overlay
  - Double tap → like with heart burst animation
  - Tap comment icon → open comments bottom sheet
  - Tap share icon → open share bottom sheet
  - Swipe-up gesture indicator (animated arrow + "Swipe up for next" text) that fades out after a few seconds for new users to discover navigation
  - Back/close button (X) to return to the profile
  - Right-side icons: Like, Comment, Share (same style as VideoCard)
  - Creator info overlay at bottom-left (username, caption, hashtags)
  - Uses `actor.getVideosByCreator` for the video list so it's scoped to the creator

- Duration overlay on each thumbnail in the grid:
  - Extract video duration using an `<video>` element's `onLoadedMetadata` event (lazy — only when in viewport or already loaded)
  - Format as `MM:SS` (e.g., `00:32`)
  - Displayed at bottom-right of thumbnail
  - View count (if > 0) displayed at bottom-left with Play icon

### Modify
- `ProfilePage.tsx` → `VideoGrid` component:
  - Make each thumbnail tap open `ProfileVideoPlayer` at the tapped video index
  - Add duration badge (bottom-right corner)
  - Keep view count badge (bottom-left corner)
  - Use `actor.getAllVideos()` filtered to own creator principal for the player list (already fetched)

- `UserProfilePage.tsx` → video grid section:
  - Extract into a reusable component or apply same tap-to-play pattern
  - Make each thumbnail tap open `ProfileVideoPlayer` at the tapped video index
  - Add duration badge (bottom-right corner)
  - Keep view count badge (bottom-left corner)
  - Video list scoped to the viewed creator

### Remove
- Nothing removed; existing VideoGrid structure is kept and enhanced

## Implementation Plan

1. Create `src/frontend/src/components/ProfileVideoPlayer.tsx`:
   - Props: `videos: Video[]`, `initialIndex: number`, `onClose: () => void`, `isAuthenticated: boolean`, `onNavigateToProfile?: (p: string) => void`
   - Renders fullscreen overlay (fixed, inset-0, z-50, bg-black)
   - Reuses VideoCard internals (gesture handling, heart burst, comment/share panels, right-side icons) — can import VideoCard and pass isMuted/onMuteChange; or inline the player logic
   - Swipe up/down navigation between videos in the provided array
   - Close button top-left
   - Swipe-up indicator: animated chevron-up + label, visible for first 3s or until user swipes, then fades out permanently (stored in local state)
   - Uses `data-ocid` markers: `profile-player.canvas_target`, `profile-player.close_button`, `profile-player.item.{n}`, `profile-player.swipe_hint`

2. Update `ProfilePage.tsx` → `VideoGrid`:
   - Add `onVideoTap: (index: number) => void` prop
   - Add `VideoDurationBadge` sub-component that lazily reads video duration from a hidden `<video>` element (loads `src={video.videoUrl}` with `preload="metadata"`) and displays `MM:SS`
   - Wire tap on each tile to call `onVideoTap(i)`
   - In `ProfilePage`, manage `playerOpen: boolean` and `playerIndex: number` state
   - Render `<ProfileVideoPlayer>` conditionally with AnimatePresence

3. Update `UserProfilePage.tsx` → video grid section:
   - Same VideoDurationBadge + tap-to-open pattern
   - Pass `videos` (already fetched via `getUserVideos`) to `ProfileVideoPlayer`
   - Manage `playerOpen` / `playerIndex` state

4. Ensure `ProfileVideoPlayer` uses `actor.incrementViewCount` when a video becomes active, same as the main feed.

5. Add CSS animation for swipe-up hint (bounce-up keyframes) via Tailwind `animate-bounce` or custom inline animation.
