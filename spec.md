# Sub Stream

## Current State
- AuthContext tracks `userProfile` which has an `email` field
- SettingsPage has an "Admin Review" button visible to ALL users via `onOpenAdmin` prop
- AdminReviewPage shows flagged content reports
- No role-based access control exists in the frontend
- UserRole enum (admin/user/guest) is defined in backend.d.ts but unused in frontend
- App.tsx navigates to `screen === 'admin'` to show AdminReviewPage

## Requested Changes (Diff)

### Add
- `useIsAdmin()` hook in AuthContext that compares `userProfile.email` (lowercased) against `babucarrngum66@gmail.com` (lowercased constant)
- `AdminDashboardPage` with four panels: Admin Dashboard overview, Video Moderation Panel, Violation Review, Content Removal
- Role assigned at login: if email matches admin email → role = "admin", otherwise role = "user" (stored in component state/context, not hardcoded password)
- Admin-only badge/indicator in Settings when logged in as admin

### Modify
- SettingsPage: hide the entire Admin section when user is NOT admin
- AdminReviewPage: replace with enhanced AdminDashboardPage that includes Video Moderation Panel, Violation Review, Content Removal tabs
- App.tsx admin screen: wrap with admin guard so non-admin users who somehow navigate to admin screen see "Access Denied" message
- AuthContext: export `isAdmin` boolean derived from email comparison

### Remove
- Admin section visibility for non-admin users in SettingsPage

## Implementation Plan
1. Add `ADMIN_EMAIL` constant and `isAdmin` boolean to AuthContext, derived purely from `userProfile.email` comparison (no passwords)
2. Update SettingsPage to conditionally render the Admin section only when `isAdmin === true`
3. Replace/enhance AdminReviewPage with a tabbed AdminDashboardPage (Dashboard overview, Video Moderation, Violation Review, Content Removal)
4. Add admin guard in App.tsx: if `effectiveScreen === 'admin'` and `!isAdmin`, show access denied instead of admin page
