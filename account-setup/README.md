# Email login activation

Status: prepared on the email-login-setup branch; not active on the public site.

## Proposed behavior

- A eight-digit code signs up or signs in an email address. No password is collected.
- The SDK handles persistent sessions, refreshing tokens, and cross-tab sign-out.
- Saved places belong to `auth.uid()`. There is no anonymous access to account lists.
- Existing `outings-guide-trip-list` data remains on the device. Importing that list into an account is an explicit action.
- Signed-in saves are acknowledged only after the database accepts them. Failed writes show an error with a retry path.
- Account lists are kept in memory. Switching accounts or signing out clears that list immediately.

## Remaining activation steps

1. DONE: Outings Guide project `boplgtgdaklsfmjcckgy` exists in the user-approved Free organization, us-east-1, healthy. The user approved browser fallback and completed project creation.
2. Configure email authentication and a verified custom SMTP sender. Default Supabase SMTP cannot email general visitors. The user approved `siksakapparos.org` as the sender domain. Proposed sender: Outings Guide <outings@siksakapparos.org>. A domain-restricted sending-only Resend key named Outings Guide Supabase SMTP was created (ID 61ab8480-aec4-4c68-8e5a-1c379c9fa9fe). The browser form has sender, host, username, port, and interval filled. The user must enter the SMTP credential and save, per the browser credential handoff rule. The key is not in this repository. Keep SMTP credentials on Supabase only.
3. DONE: Site URL set to `https://pinchesblum-bit.github.io/outings-guide/`; anonymous sign-in is off and email verification is on. Email OTP expiry set to 600 seconds; preserve the existing eight-digit code length. Use the email-code.html template for Magic Link and Confirm Signup, with subject `Your Outings Guide sign-in code`, eight-digit codes, 600-second expiry, and a minimum 60-second resend interval. Set appropriate server email rate limits.
4. DONE: Applied `create_outings_saved_places` and `restrict_automatic_rls_trigger_function`. Security advisors return no issues. SQL checks confirm RLS on, three ownership policies, no anon read/write, and no owner reassignment by authenticated users. Test as two distinct authenticated users: each can read/insert/delete only their rows; forged owner IDs are rejected; anonymous reads/writes are rejected. The unit tests do not replace live RLS verification.
5. DONE: Public project URL and publishable key set in auth-config.js; enabled remains false. Enable for verification after SMTP is operational. Never publish service-role keys, SMTP credentials, or management tokens.
6. Verify code delivery, new-account sign-in, invalid/expired codes, refresh persistence, sign-out, guest import, saved-list persistence on a second device/session, and network-failure recovery. Verify mobile UI. No live auth/database verification has happened yet.
7. Merge and publish only after checks succeed. Leave all 596 listings, 23 categories, images, source links, routes, and guest storage keys unchanged.

## Local checks

`node --test tests/account-store.test.mjs`

Covers failed-save behavior, retry loading, account changes during pending writes, old reads racing with saves, guest import filtering, and clearing account data on sign-out. JavaScript syntax checks pass. The Supabase browser SDK is version-pinned to 2.117.2; verify its CDN load before activation.
