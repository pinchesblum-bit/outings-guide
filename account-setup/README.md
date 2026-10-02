# Email login

Email-code login and private saved trips are enabled for GitHub Pages.

## Behavior

- An eight-digit code signs up or signs in an email address. No password is collected.
- Codes expire after 10 minutes; resends have a 60-second minimum interval.
- The SDK persists sessions, refreshes tokens, and handles cross-tab sign-out.
- Saved places belong to the authenticated account. Anonymous visitors cannot access account lists.
- Existing `outings-guide-trip-list` data remains on the device. Importing it into an account is an explicit action.
- Cloud saves are acknowledged only after the database accepts them. Failed writes show a retry path.
- Account lists are kept in memory and cleared immediately when switching accounts or signing out.

## Backend configuration

Dedicated Supabase project: `boplgtgdaklsfmjcckgy`, in the user-approved Free organization, us-east-1.

Email authentication and email confirmation are enabled; anonymous sign-in is disabled. Site URL: `https://pinchesblum-bit.github.io/outings-guide/`.

Custom SMTP uses the user-approved verified sender `Outings Guide <outings@siksakapparos.org>` through Resend. The sending-only credential is restricted to this domain and stored only in Supabase. Never put SMTP credentials, management tokens, or service-role keys in this repository. `auth-config.js` contains only the public URL and publishable key.

Both Confirm Signup and Magic Link/OTP use `email-code.html`, with subject `Your Outings Guide sign-in code`. Auth email expiry is 600 seconds and code length is eight digits.

Applied migrations: `create_outings_saved_places` and `restrict_automatic_rls_trigger_function`. The saved-places table has RLS, three owner policies, SELECT/INSERT/DELETE access for authenticated users, and no anonymous or authenticated UPDATE access.

## Verification on 2026-10-02

- Four account-store tests pass: failed saves/retry, account changes during writes, stale reads racing with saves, guest import filtering and sign-out clearing.
- JavaScript syntax checks pass.
- Security advisors report no issues.
- `tests/account-rls.sql` passed against the live database with two temporary identities. Each could read, insert, and delete its own rows. Cross-account reads/deletes, forged owner inserts, owner reassignment, and anonymous access were rejected. The transaction rolled back all fixtures.
- The public Auth settings endpoint confirms email enabled, signup enabled, and email confirmation required.
- A new-account OTP request to Resend's official simulated delivery recipient returned HTTP 200. Resend reported the branded sign-in email delivered. This checks the SMTP connection; it does not prove delivery to every mailbox provider.

A real visitor's code entry, session persistence across devices, and complete signed-in browser flow still require an interactive test. Do not describe the simulated email delivery or store unit tests as full browser end-to-end verification.

Run local store checks with `node tests/account-store.test.mjs`. All 596 listings, 23 categories, assets, source URLs, existing routes, and guest storage key remain unchanged.
