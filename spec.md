# SUB STREAM

## Current State

- React frontend with an `AuthContext` that uses Internet Identity (II) for auth
- Login page shows "Continue with Internet Identity" as the primary method, plus email/password fields
- The `isAuthenticated` state is derived from the II identity principal being non-anonymous
- On app start, `isInitializing` briefly shows a loading screen, but if no II session is stored, the user lands on the login page
- The `UserProfile` type has `name`, `email`, `avatarUrl`, `bio`, `followerCount`, `followingCount`, `isOnline`, `lastSeen` — but NO `username` / `@handle` field
- Registration (`registerUser`) stores a `name` and `email` but there is no separate username concept
- The profile page shows `@{displayName}` treating the display name as a username — but it is never uniquely enforced
- There is no "first-time user" username-setup screen
- "Google sign-in" is listed as a desired feature but is currently implemented as Internet Identity (the platform cannot support Google OAuth directly)
- Persistent login: II persists its session in IndexedDB automatically, but the frontend `isAuthenticated` check is flawed — it does not gracefully handle the case where an II session already exists on page load, causing users to see the login screen briefly or get stuck

## Requested Changes (Diff)

### Add
- `username` field to the `User` and `UserProfile` types in the Motoko backend
- `setUsername(username: Text)` backend function to set a unique username for a caller (returns error if taken or invalid)
- `isUsernameTaken(username: Text)` query function to check availability in real time
- `UsernameSetupPage` frontend component — shown after first login if no username is set yet; displays "Choose your @username to join the SUB STREAM community." with validation (min 3 chars, no spaces, letters/numbers/underscores only, unique check)
- New `needsUsername` state in `AuthContext` — set to `true` when user is authenticated but has no username
- Auth flow routing: if `needsUsername` is true, show `UsernameSetupPage` before the main app
- Persistent session recovery: on app start, immediately check for an existing II session and skip the login screen if one exists
- "Sign in with Google" button on both login and register pages (rendered as the primary CTA, clearly labelled; under the hood this opens Internet Identity since the platform does not support Google OAuth — keep the label honest and clear)
- Username display (`@handle`) propagated to: profile page, video feed creator info, comments, live chat, inbox placeholder

### Modify
- `AuthContext`: add `needsUsername: boolean` and `setUsernameOnBackend(username: string): Promise<void>` to the context value
- `AppShell` routing: add `UsernameSetupPage` gate between auth completion and main app
- `LoginPage`: rename "Continue with Internet Identity" to "Continue with Internet Identity" (keep as-is since Google OAuth is not available on ICP); add a visual note "Sign in with Internet Identity (fast & secure)"
- `RegisterPage`: same update
- `ProfilePage`: use `userProfile.username` for the `@handle` display instead of `userProfile.name`; display `name` as the display name above `@handle`
- Backend `UserProfile` type: add `username: Text`
- Backend `registerUser`: accept username parameter, or keep existing signature and add `setUsername` as a separate call

### Remove
- No features removed

## Implementation Plan

1. Update Motoko backend:
   - Add `username` field to `User` and `UserProfile` types
   - Add `usernameIndex` map (`Text -> Principal`) for uniqueness enforcement
   - Add `setUsername(username: Text)` shared function with validation (min 3, no spaces, alphanumeric + underscore, unique)
   - Add `isUsernameTaken(username: Text)` query function
   - Update `userToProfile` helper to include username
   - Keep `registerUser` signature unchanged; username starts as empty string ""

2. Update frontend `AuthContext`:
   - Add `needsUsername: boolean` derived from `isAuthenticated && userProfile?.username === ""`
   - Add `setUsernameOnBackend(username: string): Promise<void>` that calls `actor.setUsername(username)` then `refreshProfile()`
   - Export both via context

3. Create `UsernameSetupPage` component:
   - Full-screen dark page with SUB STREAM logo
   - Heading: "Choose your @username to join the SUB STREAM community."
   - Single `@username` input with real-time availability check (debounced)
   - Validation: min 3 chars, no spaces, only `[a-zA-Z0-9_]`
   - "Continue" button — calls `setUsernameOnBackend`, then context `needsUsername` flips to false and main app loads
   - Cancel / logout option

4. Update `App.tsx` routing:
   - After `isInitializing` check, if `isAuthenticated && needsUsername` → show `UsernameSetupPage`
   - Otherwise show existing auth/main flow

5. Update `ProfilePage`:
   - Show `userProfile.name` as the display name
   - Show `@userProfile.username` as the handle below it
   - Edit mode: allow editing display name; username is set once and NOT editable after setup

6. Propagate username in feed and comments:
   - Where creator info is shown, prefer `username` (prefixed with @) if available, fall back to `name`
