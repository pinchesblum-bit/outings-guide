import { createAccountStore } from './account-store.mjs';
import { createAuthFlow, profileFor } from './account-auth.mjs';

const config = window.OUTINGS_AUTH_CONFIG;
const changed = () => window.dispatchEvent(new Event('outings-account-change'));
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const guestIds = () => { try { const ids = JSON.parse(localStorage.getItem('outings-guide-trip-list') || '[]'); return Array.isArray(ids) ? ids : []; } catch { return []; } };
let client, store, flow, loadError = '', resendTimer;
const status = () => store?.snapshot() || { ready: !!loadError, user: null, ids: [], busy: false, error: loadError };
const personIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2"/></svg>';
const avatar = user => { const p = profileFor(user); return `<span class="profile-avatar" aria-hidden="true"><span>${escape(p.initials)}</span>${p.photo ? `<img src="${escape(p.photo)}" alt="" referrerpolicy="no-referrer">` : ''}</span>`; };
function bindPhotoFallback() { document.querySelectorAll('.profile-avatar img').forEach(img => { img.addEventListener('error', () => img.remove(), { once: true }); }); }
function renderNav() {
  const link = document.querySelector('[data-nav-page="account"]');
  if (!link) return;
  const user = status().user;
  link.classList.toggle('has-profile', !!user);
  link.setAttribute('aria-label', user ? `${profileFor(user).label}: open account` : 'Sign in');
  link.innerHTML = user ? `${avatar(user)}<span class="profile-nav-name">${escape(profileFor(user).shortName)}</span>` : `${personIcon}<span>Sign in</span>`;
  bindPhotoFallback();
}
const emailField = email => `<label class="account-field">Email<input name="email" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" value="${escape(email)}" required></label>`;
const passwordField = (isNew, label = 'Password') => `<label class="account-field">${label}<span class="password-input"><input id="account-password" name="password" type="password" autocomplete="${isNew ? 'new-password' : 'current-password'}" ${isNew ? 'minlength="8" aria-describedby="password-hint"' : ''} required><button type="button" class="password-toggle" data-show-password aria-controls="account-password" aria-label="Show password">Show</button></span></label>${isNew ? '<p class="account-hint" id="password-hint">At least 8 characters.</p>' : ''}`;
function render() {
  const current = status();
  const auth = flow?.snapshot();
  let content;
  if (!current.ready || !auth) content = '<h1 id="account-title">Opening your account…</h1><p role="status">Please wait a moment.</p>';
  if (loadError) content = `<h1 id="account-title">Sign in</h1><p role="alert">${escape(loadError)}</p><button class="btn primary" data-reload-account>Try again</button>`;
  else if (current.ready && auth) {
    const resetting = auth.view === 'reset' || (current.user && auth.recoveryUserId === current.user.id);
    if (current.user && !resetting && !['verify', 'confirm'].includes(auth.view)) {
      const p = profileFor(current.user);
      const importable = [...new Set(guestIds())].filter(id => !current.ids.includes(id) && window.OUTINGS_DATA.listings.some(item => item.id === id));
      content = `<h1 id="account-title">${escape(p.name || 'Your account')}</h1><p class="account-email">${escape(current.user.email || '')}</p><p>Your saved trips are available on all your devices.</p>
        ${auth.message ? `<p role="status">${escape(auth.message)}</p>` : ''}
        ${current.error ? `<p role="alert">${escape(current.error)}</p><button class="btn ghost" data-retry-sync>Try again</button>` : ''}
        <a class="btn primary" href="#/saved">View My Trips</a>
        ${importable.length ? `<div class="account-import"><p>Add ${importable.length} saved ${importable.length === 1 ? 'place' : 'places'} from this browser to your account.</p><button class="btn ghost" data-import-guest ${current.busy ? 'disabled' : ''}>Add to my account</button></div>` : ''}
        <button class="account-text-button" data-sign-out ${current.busy ? 'disabled' : ''}>Sign out</button>`;
    } else {
      const view = resetting ? 'reset' : auth.view;
      const signup = view === 'signup';
      const ordinary = ['signin', 'signup'].includes(view);
      const tripsGate = location.hash.split('?')[0] === '#/saved';
      const titles = { signin: 'Sign in', signup: 'Create account', forgot: 'Forgot password?', verify: 'Check your email', confirm: 'Confirm your email', reset: 'Choose a new password' };
      if (tripsGate && view === 'signin') titles.signin = 'Sign in to My Trips';
      const labels = { signin: 'Sign in', signup: 'Create account', forgot: 'Send reset code', verify: 'Verify code', confirm: 'Finish creating account', reset: 'Save password' };
      content = `<h1 id="account-title">${titles[view]}</h1>
        ${tripsGate && ordinary ? '<p class="account-intro">Save your favorite places and keep your trips together, on any device.</p>' : ''}
        ${ordinary ? `<div class="account-tabs" aria-label="Account options"><button type="button" data-account-view="signin" aria-pressed="${!signup}" ${auth.busy ? 'disabled' : ''}>Sign in</button><button type="button" data-account-view="signup" aria-pressed="${signup}" ${auth.busy ? 'disabled' : ''}>Create account</button></div>
          ${config.googleEnabled ? `<button type="button" class="google-sign-in" data-google ${auth.busy ? 'disabled' : ''}><img src="https://developers.google.com/static/identity/images/g-logo.png" width="20" height="20" alt="" aria-hidden="true"><span>Continue with Google</span></button><div class="account-divider"><span>or use your email</span></div>` : ''}` : ''}
        ${view === 'forgot' ? '<p>Enter your email to receive a password reset code.</p>' : ''}
        ${view === 'verify' ? `<p>Enter the eight-digit reset code for <strong>${escape(auth.email)}</strong>.</p>` : ''}
        <form id="account-form" data-account-action="${view}">
          ${signup ? `<label class="account-field">Name<input name="name" type="text" autocomplete="name" maxlength="100" value="${escape(auth.name)}" required></label>` : ''}
          ${ordinary || view === 'forgot' ? emailField(auth.email) : ''}
          ${ordinary || view === 'reset' ? passwordField(signup || view === 'reset', view === 'reset' ? 'New password' : 'Password') : ''}
          ${['verify', 'confirm'].includes(view) ? '<label class="account-field">Verification code<input name="code" type="text" inputmode="numeric" pattern="[0-9]{8}" minlength="8" maxlength="8" autocomplete="one-time-code" required></label>' : ''}
          <p id="account-message" role="status" aria-live="polite">${escape(auth.message)}</p>
          <button class="btn primary" type="submit" ${auth.busy ? 'disabled' : ''}>${auth.busy ? 'Please wait…' : labels[view]}</button>
        </form>
        ${view === 'signin' ? `<button class="account-text-button" data-account-view="forgot" ${auth.busy ? 'disabled' : ''}>Forgot password?</button>` : ''}
        ${view === 'verify' ? `<button class="account-text-button" data-resend-code ${Date.now() < auth.resendAt || auth.busy ? 'disabled' : ''}>Send a new code</button>` : ''}
        ${!ordinary ? `<button class="account-text-button" data-cancel-reset ${auth.busy ? 'disabled' : ''}>Back to sign in</button>` : ''}`;
    }
  }
  document.getElementById('app').innerHTML = `<section class="account-panel" aria-labelledby="account-title"><div class="account-emblem${current.user ? ' account-profile' : ''}">${current.user ? avatar(current.user) : personIcon}</div>${content}</section>`;
  document.getElementById('account-form')?.addEventListener('submit', submit);
  document.querySelectorAll('[name="name"], [name="email"]').forEach(input => input.addEventListener('input', () => flow.remember({ [input.name]: input.value })));
  document.querySelectorAll('[data-account-view]').forEach(button => button.addEventListener('click', () => flow.switchView(button.dataset.accountView)));
  document.querySelector('[data-show-password]')?.addEventListener('click', event => { const input = document.getElementById('account-password'); const show = input.type === 'password'; input.type = show ? 'text' : 'password'; event.currentTarget.textContent = show ? 'Hide' : 'Show'; event.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); });
  document.querySelector('[data-reload-account]')?.addEventListener('click', () => location.reload());
  document.querySelector('[data-retry-sync]')?.addEventListener('click', () => store.refresh());
  document.querySelector('[data-sign-out]')?.addEventListener('click', async () => { if (await store.signOut()) flow.switchView('signin'); });
  document.querySelector('[data-import-guest]')?.addEventListener('click', () => store.importGuest(guestIds()));
  document.querySelector('[data-resend-code]')?.addEventListener('click', () => flow.requestReset());
  document.querySelector('[data-cancel-reset]')?.addEventListener('click', () => flow.cancelReset());
  document.querySelector('[data-google]')?.addEventListener('click', () => flow.google());
  bindPhotoFallback();
  clearTimeout(resendTimer);
  if (auth?.view === 'verify' && auth.resendAt > Date.now()) resendTimer = setTimeout(() => { const button = document.querySelector('[data-resend-code]'); if (button && !flow.snapshot().busy) button.disabled = false; }, auth.resendAt - Date.now());
}
async function submit(event) {
  event.preventDefault();
  if (!flow || flow.snapshot().busy) return;
  const action = event.currentTarget.dataset.accountAction;
  const values = new FormData(event.currentTarget);
  let signedIn = false;
  if (action === 'signin') signedIn = await flow.signIn({ email: String(values.get('email')), password: String(values.get('password')) });
  if (action === 'signup') signedIn = await flow.signUp({ name: String(values.get('name')), email: String(values.get('email')), password: String(values.get('password')) }) && flow.snapshot().view === 'signin';
  if (action === 'forgot') await flow.requestReset(String(values.get('email')));
  if (action === 'verify') await flow.verifyReset(String(values.get('code')).trim());
  if (action === 'confirm') signedIn = await flow.verifySignup(String(values.get('code')).trim());
  if (action === 'reset') await flow.setPassword(String(values.get('password')));
  if (signedIn) { location.hash = '/'; return; }
  if (location.hash.startsWith('#/account')) document.querySelector('#account-form input')?.focus();
}
if (config?.enabled && config.url && config.publishableKey) {
  window.OutingsAccount = { status, render, renderNav, toggle: id => store?.toggle(id), refresh: () => store?.refresh() };
  changed();
  try {
    const oauthReturn = new URLSearchParams(location.search).has('code');
    const oauthError = new URLSearchParams(location.search).has('error');
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm');
    client = createClient(config.url, config.publishableKey, { auth: {
      persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce',
      storageKey: 'outings-guide-email-session',
    } });
    let recoveryStorage; try { recoveryStorage = sessionStorage; } catch {}
    flow = createAuthFlow(client.auth, changed, { storage: recoveryStorage, siteUrl: config.siteUrl });
    store = createAccountStore(client, window.OUTINGS_DATA.listings.map(item => item.id), changed);
    await store.initialize();
    if (oauthReturn || oauthError) {
      const cleanUrl = new URL(location.href);
      ['code', 'error', 'error_code', 'error_description'].forEach(key => cleanUrl.searchParams.delete(key));
      const signedIn = !oauthError && !!status().user;
      cleanUrl.hash = signedIn ? '/' : '/account'; history.replaceState(null, '', cleanUrl);
      if (!signedIn) loadError = 'Google sign-in did not finish. Please try again.';
      changed();
    }
    window.addEventListener('focus', () => store.refresh());
    window.addEventListener('online', () => store.refresh());
  } catch { client = null; loadError = 'Sign-in could not load. Check your connection and try again.'; changed(); }
}
