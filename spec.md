# SUB STREAM

## Current State

A fresh Caffeine project with a React + TypeScript frontend and Motoko backend scaffold. No app-specific UI has been built yet. The frontend has shadcn/ui, Tailwind CSS, and standard hooks set up.

## Requested Changes (Diff)

### Add
- Fullscreen vertical video feed (mock videos, swipe up/down navigation, autoplay)
- Top floating navigation bar with tabs: LIVE, Explore, Following, Shop, For You ("For You" active); search icon on right; glass blur effect
- Right-side interaction icons on video: Like, Comment, Share, Gift with counts
- Creator info overlay on lower-left: username, caption, hashtags, music
- Creator circular profile image (bottom of right icon stack); glowing red ring when live
- Bottom fixed navigation bar: Home, Friends, Create, Inbox, Profile
- Center Create button (larger, #ff0050 gradient)
- Create button tap menu with: Upload Video, Record Short, Go Live
- Dark mode, black background, #ff0050 accent, rounded corners, smooth animations
- Mobile-first layout optimized for iPhone screen dimensions

### Modify
- index.css: update design tokens to use dark theme by default with #ff0050 accent

### Remove
- Nothing removed

## Implementation Plan

1. Update index.css with dark-mode-first tokens and #ff0050 accent color
2. Create mock video data array (username, caption, hashtags, music, isLive flag)
3. Build `TopNav` component — glass blur, tab list, search icon
4. Build `VideoFeed` component — fullscreen swipe, touch handlers, autoplay placeholder
5. Build `VideoCard` component — overlay layout with creator info, right-side icons, profile circle
6. Build `BottomNav` component — 5 tabs, oversized Create button
7. Build `CreateMenu` component — slide-up sheet with 3 options
8. Compose all in `App.tsx`
9. Validate and fix any type/lint errors
