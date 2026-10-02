# Email login activation

Status: prepared on the email-login-setup branch; not active on the public site.

## Proposed behavior

- A six-digit code signs up or signs in an email address. No password is collected.
- The SDK handles persistent sessions, refreshing tokens, and cross-tab sign-out.
- Saved places belong to `auth.uid()`. There is no anonymous access to account lists.
- Existing `outings-guide-trip-list` data remains on the device. Importing that list into an account is an explicit action.
- Signed-in saves are acknowledged only after the database accepts them. Failed writes show an error with a retry path.
- Account lists are kept in memory. Switching accounts or signing out clears that list immediately.

## Remaining activation steps

1. Create a separate Outings Guide project in the user-approved organization, after confirming any cost. The organization is currently on Free. The connector's `get_cost` function is unavailable (two attempts on October 2, 2026); do not invent a confirmation ID or provision around its required cost check. Browser fallback needs user approval under the browser guidance.
2. Configure email authentication and a verified custom SMTP sender. Default Supabase SMTP cannot email general visitors. Resend currently has only `siksakapparos.org` verified; decide the Outings Guide sender before activation. Keep SMTP credentials on Supabase only.
3. Set Site URL to `https://pinchesblum-bit.github.io/outings-guide/`. Disable anonymous sign-in. Keep email verification on. Use the email-code.html template for Magic Link and Confirm Signup, with subject `Your Outings Guide sign-in code`, six-digit codes, 600-second expiry, and a minimum 60-second resend interval. Set appropriate server email rate limits.
4. Apply schema.sql through the migration tool to the new project. Run Supabase security advisors. Test as two distinct authenticated users: each can read/insert/delete only their rows; forged owner IDs are rejected; anonymous reads/writes are rejected. The unit tests do not replace live RLS verification.
5. Put only the new project URL and publishable key in auth-config.js. Enable locally for verification. Never publish service-role keys, SMTP credentials, or management tokens.
6. Verify code delivery, new-account sign-in, invalid/expired codes, refresh persistence, sign-out, guest import, saved-list persistence on a second device/session, and network-failure recovery. Verify mobile UI. No live auth/database verification has happened yet.
7. Merge and publish only after checks succeed. Leave all 596 listings, 23 categories, images, source links, routes, and guest storage keys unchanged.

## Local checks

`node --test tests/account-store.test.mjs`

Covers failed-save behavior, retry loading, account changes during pending writes, old reads racing with saves, guest import filtering, and clearing account data on sign-out. JavaScript syntax checks pass. The Supabase browser SDK is version-pinned to 2.117.2; verify its CDN load before activation.
