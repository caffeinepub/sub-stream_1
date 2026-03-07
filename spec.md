# SUB STREAM

## Current State
- Phase 1 mobile UI prototype with static/hardcoded data
- `App.tsx` renders TopNav, VideoFeed, BottomNav in a single-screen layout
- TopNav: 4 tabs (LIVE, Explore, Following, For You) — tab switching is visual only, no routing
- VideoFeed: swipe-based, driven entirely by `mockVideos.ts` hardcoded data, gradient placeholders
- BottomNav: 5 tabs (Home, Friends, Create, Inbox, Profile) — tab switching is visual only, no routing
- CreateMenu: slide-up sheet with 3 options — all close the sheet with no navigation
- Backend: stub actor with only `ping()` method
- No authentication, no user state, no routing system, no real pages

## Requested Changes (Diff)

### Add
- **Authentication system**: Login page with email/password form + Google OAuth button; registration form (name, email, password); persistent session via localStorage (JWT-style token); auto-restore session on app start; manual logout only
- **AuthContext**: global React context providing `currentUser`, `login`, `logout`, `register` state; wraps entire app
- **Online presence system**: `usePresence` hook tracking user as online while app is open; `PresenceDot` component (green = online, gray = offline) displayed bottom-right of circular profile images; appears in VideoCard, Comments, LiveChat, Inbox, ProfilePage
- **React Router**: full client-side routing with routes: `/`, `/home`, `/friends`, `/create`, `/inbox`, `/profile`, `/live`, `/explore`, `/following`, `/foryou`, `/search`; protected routes redirect to `/login` when unauthenticated
- **Page components**: HomeFeed, FriendsPage, InboxPage, ProfilePage, LivePage, ExplorePage, FollowingPage, ForYouPage, SearchPage, UploadPage, RecordPage, GoLivePage
- **Functional TopNav**: each tab click navigates to its route (`/live`, `/explore`, `/following`, `/foryou`)
- **Functional BottomNav**: each tab navigates to its route (`/home`, `/friends`, `/inbox`, `/profile`)
- **CreateMenu actions**: Upload Video → `/create/upload`, Record Short → `/create/record`, Go Live → `/create/live`
- **CommentsPanel**: slide-up sheet showing comments list for a video; triggered by Comment button on VideoCard
- **ShareMenu**: slide-up sheet with share options; triggered by Share button on VideoCard
- **GiftMenu**: slide-up sheet with gift options (emoji gifts); triggered by Gift button on VideoCard
- **VideoFeed engine**: replace mockVideos with a `VideoStore` (in-memory with seeded sample-free structure), real `<video>` elements for actual playback when URL present, autoplay/pause based on visibility via IntersectionObserver; maintain existing swipe gesture system
- **Backend**: add `getVideos`, `getUsers`, `likeVideo`, `createUser`, `loginUser`, `getUserPresence`, `setUserPresence` endpoints in Motoko

### Modify
- `App.tsx`: wrap with `AuthProvider` + `Router`; render route tree instead of static layout
- `VideoCard`: add PresenceDot on creator avatar; wire Comment/Share/Gift buttons to open their panels
- `VideoFeed`: replace `mockVideos` import with backend/store data; support empty state
- `BottomNav`: replace `setActiveTab` with `useNavigate`; highlight active tab based on current route
- `TopNav`: replace tab state with `useNavigate`; highlight active tab based on current route
- `CreateMenu`: wire each option to navigate to its route

### Remove
- `src/data/mockVideos.ts` — all hardcoded fake video/creator/count data
- All static placeholder counts (fake likes, comments, shares)
- Hardcoded `mockVideos` references throughout VideoFeed and VideoCard

## Implementation Plan
1. **Backend**: Add Motoko types and endpoints for users, videos, likes, presence
2. **Frontend routing**: Install react-router-dom; set up route tree in App.tsx
3. **AuthContext + Auth pages**: login form, register form, Google OAuth button (UI only — OAuth requires server config), localStorage persistence
4. **PresenceDot component**: reusable online indicator overlay for circular avatars
5. **Page stubs**: create all route pages (Live, Explore, Following, ForYou, Friends, Inbox, Profile, Search, Upload, Record, GoLive) with proper layouts
6. **Wire TopNav + BottomNav**: use useNavigate/useLocation for functional routing
7. **VideoFeed engine**: replace mock data with backend calls or local VideoStore; real video elements with autoplay/pause
8. **VideoCard interactions**: wire Comment → CommentsPanel, Share → ShareMenu, Gift → GiftMenu; add PresenceDot
9. **CreateMenu navigation**: route each option to its create page
