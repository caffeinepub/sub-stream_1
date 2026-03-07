# Sub Stream

## Current State
- Full mobile-first vertical video social app with video feed, live streaming discovery, inbox, and profile page
- Auth via Internet Identity (login/register with email, persistent session)
- Profile page: circular avatar with online dot, display name, @username, bio, stats, video grid tabs
- Backend: User, Video, Comment types; follow system; online presence heartbeat
- No Stories system exists

## Requested Changes (Diff)

### Add
- **Story data model** on backend: Story type with id, creator, mediaUrl, mediaType (photo/video), textOverlay, emojiOverlays, expiresAt (24h TTL), viewedBy (Set of Principal)
- **Backend story APIs**: addStory, getActiveStories (returns non-expired stories for all users), getMyStories, deleteStory, markStoryViewed
- **StoryRing component**: circular avatar with gradient colored ring (has story) or grey ring (all viewed) or plain ring (no story). Also shows "+" badge when no story
- **StoryCreator screen**: full-screen modal for creating photo/video stories; supports upload photo, upload video (max 2 min), record video, add text overlay, add emoji picker
- **StoryViewer screen**: fullscreen story viewer with progress bars at top, profile info overlay (avatar, display name, @username, time), tap left/right navigation, swipe left/right between users, auto-advance between stories and users
- **Own-profile story options sheet**: when owner taps their own avatar — Add Story / View Story / Delete Story options
- **Stories row on home feed**: horizontal scrollable row of story rings from followed users + own story at front
- **Story expiration**: 24-hour TTL enforced both on backend (filter) and frontend (display)

### Modify
- **ProfilePage**: replace plain avatar with StoryRing component; tapping own avatar shows options sheet (Add Story / View Story / Delete Story); tapping another user's avatar opens StoryViewer
- **App.tsx**: add "story-creator" and "story-viewer" to Screen type; wire up new screens
- **Backend main.mo**: add Story type, story storage, and story API functions

### Remove
- Nothing removed

## Implementation Plan
1. Regenerate backend to add Story type and story CRUD/query APIs
2. Create `StoryRing` component — handles ring color (gradient/grey/none) and "+" badge
3. Create `StoryCreator` page — photo upload, video upload/record, text+emoji overlay, post button
4. Create `StoryViewer` page — fullscreen viewer, progress bars, nav controls, swipe gestures, auto-advance
5. Create `StoryOptionsSheet` component — owner taps own avatar → Add/View/Delete options
6. Update `ProfilePage` to use StoryRing and wire tapping behavior
7. Update `App.tsx` to add story-creator and story-viewer screens
8. Add stories horizontal row to the home feed top area
