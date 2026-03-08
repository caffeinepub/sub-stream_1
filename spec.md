# Sub Stream — Profile Video System & Post Management

## Current State

- Profile page shows a 3-column video grid with gradient placeholders when no thumbnailUrl is present
- Videos are stored with a `thumbnailUrl` field (Text) but no automated thumbnail extraction happens at upload time
- No pin-to-profile feature exists on videos
- No post management (edit/delete) menu exists on video cards in the profile grid
- Comment panel shows comments but uses `author.toString()` truncated as the display name — no real user profile picture, display name, or @username is shown
- Comment interactions (like, reply, tap avatar to view profile) are visual stubs only
- ProfileVideoPlayer comment panel has the same shortcoming

## Requested Changes (Diff)

### Add

- **Client-side thumbnail generation**: When a video is uploaded, extract a frame at 1 second using a hidden `<video>` element + `<canvas>`, convert to a base64 data URL, and pass it as the `thumbnailUrl` to `addVideo` (frontend only — no backend change needed, the field already exists)
- **2-column profile video grid**: Change grid from `grid-cols-3` to `grid-cols-2`; each card shows thumbnail image, duration badge (`MM:SS`), and view count (`• N views`)
- **Pin video feature**: Backend — add `pinnedVideoIds: [Nat]` field to User, plus `pinVideo(videoId)` and `unpinVideo(videoId)` mutations. Frontend — pinned videos sort to the top of the profile grid; pinned cards show a `📌 Pinned` label
- **Post management menu** (three-dots `⋯` button on each video card in own profile):
  - Edit post — opens a bottom sheet to edit caption, hashtags, and privacy
  - Delete post — shows a confirmation dialog ("Delete this post?"), then calls backend `deleteVideo`
  - Pin to profile / Unpin from profile — calls pin/unpin backend
- **`updateVideo` backend method**: allows creator to update `caption`, `hashtags`, and `privacy` on their own video
- **`deleteVideo` backend method**: creator removes their own video; also removes the video from all feeds
- **`privacy` field on Video**: add `privacy: Text` (values: "everyone", "followers", "only_me") defaulting to "everyone"
- **Real user data in comments**: Both `VideoCard` and `ProfileVideoPlayer` comment panels must look up `getUserProfile(comment.author)` and display: circular avatar (or initials fallback), Display Name, @username, comment text, timestamp. Tapping the avatar navigates to that user's profile
- **Comment like**: `likeComment(commentId)` backend call wired to the heart button in comment panels
- **Comment reply**: reply input per comment — calls `addComment` with a `replyToId` context (displayed as "Replying to @username" inline)
- **`replyToId` field on Comment**: optional `?Nat` for threading

### Modify

- `VideoCard.tsx` — comment panel: replace truncated principal string with real user profile lookup per comment author
- `ProfileVideoPlayer.tsx` — comment panel: same real user profile upgrade
- `ProfilePage.tsx` — `VideoGrid`: change to 2-column layout, add three-dots menu per card, add 📌 Pinned label, sort pinned videos first
- Upload flow (`PublishPage.tsx` or `VideoUploadPage.tsx`) — auto-generate thumbnail from video file before calling `addVideo`
- `Video` type in backend — add `privacy: Text` field
- `Comment` type in backend — add `replyToId: ?Nat` field
- `User` type in backend — add `pinnedVideoIds: [Nat]` field

### Remove

- Gradient placeholder fallback in profile grid (when a real thumbnailUrl is present — keep gradient only as fallback for videos without thumbnails)

## Implementation Plan

1. **Backend (`main.mo`)**: Add `pinnedVideoIds` to User, `privacy` to Video, `replyToId` to Comment. Add `pinVideo`, `unpinVideo`, `deleteVideo`, `updateVideo`, `likeComment` methods
2. **Frontend — thumbnail generation**: In upload flow (PublishPage/VideoUploadPage), use canvas to extract frame at 1s, produce data URL, store as `thumbnailUrl`
3. **Frontend — ProfilePage VideoGrid**: Switch to 2-column, add `• N views` + duration, three-dots menu with Edit/Delete/Pin/Unpin, 📌 Pinned label, pin-sorted order
4. **Frontend — Edit post sheet**: Bottom sheet with caption textarea, hashtags input, privacy select; calls `updateVideo`
5. **Frontend — Delete confirmation**: AlertDialog with "Delete this post?" — calls `deleteVideo`, invalidates `profileVideos` and `allVideos` queries
6. **Frontend — Comment panels (VideoCard + ProfileVideoPlayer)**: For each comment, call `getUserProfile(comment.author)` to get avatar, display name, @username; render circular avatar + name + @handle; wire heart to `likeComment`; add reply UI
