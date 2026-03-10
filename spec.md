# Sub Stream — Secure Login & Signup System

## Current State

The app has a working auth flow:
- `LoginPage` — Internet Identity + email/password login, basic 2FA step
- `RegisterPage` — email/password registration with math CAPTCHA and device limit
- `UsernameSetupPage` — username picker with availability check (case-insensitive)
- `AuthContext` — manages login state, email registration, II login

Limitations of the current system:
- No phone number signup path
- No Google/Apple login buttons
- No email/phone verification code step after signup
- 2FA resend has no 30s cooldown, no attempt limit, no 5-min expiry
- Login has no device fingerprinting or new-device detection
- Username similarity check only does exact lowercase match — no scam similarity detection

## Requested Changes (Diff)

### Add
- `SignupMethodPage` — choose between Phone, Email, Google (coming soon), Apple (coming soon)
- `PhoneSignupPage` — phone number input + 6-digit verification step
- `VerificationCodeStep` component — reusable 6-digit OTP UI with:
  - 5-minute code expiry countdown (shown as MM:SS timer)
  - Max 3 attempts (disables input after 3 failures, shows "Too many attempts" + retry button)
  - 30-second resend cooldown (button disabled with countdown)
  - Code generated client-side (random 6-digit, shown as demo since email is disabled)
- Device fingerprinting on login: store `device_id` (uuid from localStorage), `device_model` (from user agent), `ip_address` (placeholder "detected" text since backend can't fetch real IP in frontend)
- New-device detection: on email login, compare current `device_id` to stored `known_device_id_<email>` in localStorage; if new device, require 6-digit verification before completing login
- Username similarity check in `UsernameSetupPage`: flag usernames that are too similar to existing ones (Levenshtein distance <= 2, or contain substring matches of existing usernames)

### Modify
- `RegisterPage` → add signup method selector at top (Phone / Email), keep existing email form, add email verification code step after form submission before account is created
- `LoginPage` → add Phone login tab, add Google and Apple buttons ("Coming Soon" state), add device info collection and new-device guard
- `UsernameSetupPage` → improve similarity detection in availability check

### Remove
- Nothing removed

## Implementation Plan

1. Create `VerificationCodeStep` component with 5-min expiry, 3-attempt limit, 30s resend cooldown
2. Update `RegisterPage` to show signup method choice (Phone / Email / Google / Apple), add email verification step after form fill, add phone signup path
3. Update `LoginPage` to add Phone tab, Google/Apple coming-soon buttons, device fingerprinting, new-device detection flow
4. Update `UsernameSetupPage` to add Levenshtein similarity check against existing usernames
5. Create `deviceInfo.ts` utility for generating/storing device_id, detecting device_model from user agent
