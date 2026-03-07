# SUB STREAM

## Current State

The app is a mobile-first vertical video platform with:
- TopNav with tabs: LIVE, Explore, Following, Shop, For You ("For You" active)
- Fullscreen vertical video feed with swipe navigation and right-side interaction icons
- BottomNav with: Home, Friends, Create (center), Inbox, Profile
- CreateMenu sheet with: Upload Video, Record Short, Go Live
- No backend shopping/ecommerce code exists

## Requested Changes (Diff)

### Add
- Nothing new to add

### Modify
- TopNav: Remove "Shop" tab from the TABS array, keeping only LIVE, Explore, Following, For You

### Remove
- "Shop" tab from TopNav
- Any remaining references to shop/products/cart/checkout (none found in current codebase beyond the tab label)

## Implementation Plan

1. In `TopNav.tsx`, update the TABS constant to `["LIVE", "Explore", "Following", "For You"]` — removing "Shop"
2. Verify no other files reference shop/ecommerce concepts
3. Validate and deploy
