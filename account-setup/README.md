# Outings Guide accounts

The account UI supports name/email/password registration, email/password sign-in, password recovery, and a top-right photo or initials linking to the account page. Existing account IDs and private saved lists remain unchanged.

## Current activation status

- Email/password forms and profile display: implemented.
- Password reset template: configured in Supabase using `password-reset.html`, eight-digit recovery codes, 600-second expiry, and a 60-second minimum resend interval.
- **Signup confirmation remains ON.** The requested change to skip signup email verification requires final browser security confirmation before disabling Supabase's `Confirm email` setting. The client supports the existing confirmation flow during this transition so new accounts cannot get stuck.
- **Google remains OFF.** The Google OAuth flow and photo display are implemented but the public button is gated by `googleEnabled` until the backend provider is configured. Google Cloud Console returned Site Unavailable in the available browser after one reload. Do not expose an unusable Google button or claim Google login works.

## Google connection remaining

Create a dedicated Web application OAuth client in the user's Google Cloud project. Use only `openid`, `userinfo.email`, and `userinfo.profile` scopes. Set the JavaScript origin to `https://pinchesblum-bit.github.io` and authorized redirect URI to `https://boplgtgdaklsfmjcckgy.supabase.co/auth/v1/callback`. Set up the app's audience/branding so intended public visitors can sign in.

Enter the client ID and secret only in Supabase's Google provider configuration; the browser requires a user handoff for new credential entry. Do not store the client secret here. Keep nonce validation on. After configuration, verify Google is enabled in `/auth/v1/settings`, set `googleEnabled: true`, and test the actual OAuth round trip before calling it complete.

The browser client uses PKCE, Supabase's session handling, and the fixed existing Site URL as its return destination. It cleans the authorization code/error query parameters after return. Google is used only for authentication and basic profile information.

## Password flow

New accounts provide name, email, and an at-least-eight-character password. Name is display metadata only; authorization always uses `auth.uid()`. Passwords and recovery codes are never placed in retained application state, local storage, source files, or logs.

`Forgot password` sends a recovery code. The server verifies the recovery token before accepting a new password. The client checks that the recovery session still belongs to the same user. A session-storage marker retains only the user ID to restore the reset form after refresh; it is not authentication or authorization. Existing email-code-only users can use Forgot password to set their first password without losing saved trips.

## Backend

Dedicated Supabase project: `boplgtgdaklsfmjcckgy`, Free organization, us-east-1. Site URL: `https://pinchesblum-bit.github.io/outings-guide/`. Email auth is enabled and anonymous sign-in is disabled.

Custom SMTP: `Outings Guide <outings@siksakapparos.org>` through the user-approved verified Resend domain. The sending-only credential is restricted to that domain and stored only in Supabase. `auth-config.js` contains only public configuration.

Applied migrations: `create_outings_saved_places` and `restrict_automatic_rls_trigger_function`. RLS restricts each saved list to its owner. Authenticated users have SELECT/INSERT/DELETE only; there is no anonymous or UPDATE access. Guest lists retain the `outings-guide-trip-list` storage key and are imported only by an explicit action.

## Verification

`node tests/account-auth.test.mjs` and `node tests/account-store.test.mjs` cover password-login routing, name metadata, no retained secrets, invalid recovery codes, account changes during recovery, recovery persistence, safe profile URLs, fixed OAuth destination, server-confirmation compatibility, failed saves, stale reads/writes, import filtering, and sign-out clearing.

The previous live transaction in `tests/account-rls.sql` verified isolation between two temporary identities and rolled back all fixtures. The only current security advisor warning is that leaked-password screening is disabled; Supabase limits that feature to Pro plans and above, so no paid upgrade was made. The server minimum password length is 8 characters. Google OAuth and a real visitor's password-recovery code entry still require interactive verification.

All 596 listings, 23 categories, approved visuals, search behavior, routes, and guest saved data are preserved.

Live API checks also passed for a disposable test account: name metadata on signup, password login, wrong-password rejection, authenticated saved-place insert/read/delete, token refresh, sign-out, and a password-reset email request. The test identity was confirmed separately because signup verification remains enabled. All sessions were signed out and the test user removed afterward. This does not verify the requested no-confirmation signup setting, which remains pending approval.
