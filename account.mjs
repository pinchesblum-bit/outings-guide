import { createAccountStore } from './account-store.mjs';

const config = window.OUTINGS_AUTH_CONFIG;
const changed = () => window.dispatchEvent(new Event('outings-account-change'));
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const guestIds = () => {
  try {
    const value = JSON.parse(localStorage.getItem('outings-guide-trip-list') || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
};
let client, store, email = '', codeSent = false, submitting = false, message = '', resendAt = 0;
let loadError = '';
const status = () => store?.snapshot() || { ready: !!loadError, user: null, ids: [], busy: false, error: loadError };

function render() {
  const current = status();
  let content;
  if (!current.ready) {
    content = '<h1 id="account-title">Opening your account…</h1><p role="status">Please wait a moment.</p>';
  } else if (!client) {
    content = `<h1 id="account-title">Sign in</h1><p role="alert">${escape(loadError)}</p><button class="btn primary" data-reload-account>Try again</button>`;
  } else if (current.user) {
    const importable = guestIds().filter(id => !current.ids.includes(id) && window.OUTINGS_DATA.listings.some(item => item.id === id));
    content = `<h1 id="account-title">Your account</h1><p class="account-email">${escape(current.user.email || '')}</p>
      <p>Your saved trips are linked to this email, so you can open them on another device.</p>
      ${current.error ? `<p role="alert">${escape(current.error)}</p><button class="btn ghost" data-retry-sync>Try again</button>` : ''}
      <a class="btn primary" href="#/saved">View My Trips</a>
      ${importable.length ? `<div class="account-import"><p>This browser has ${importable.length} saved ${importable.length === 1 ? 'place' : 'places'} you can add to your account.</p><button class="btn ghost" data-import-guest ${current.busy ? 'disabled' : ''}>Add to my account</button></div>` : ''}
      <button class="account-text-button" data-sign-out ${current.busy ? 'disabled' : ''}>Sign out on this device</button>`;
  } else {
    content = `<h1 id="account-title">${codeSent ? 'Check your email' : 'Save your next outing'}</h1>
      <p>${codeSent ? `Enter the code sent to <strong>${escape(email)}</strong>. Check your spam folder too.` : 'Sign in or create an account with your email. We’ll send you a code—no password to remember.'}</p>
      <form id="account-form">
        ${codeSent
          ? '<label class="account-field">Email code<input name="code" type="text" inputmode="numeric" pattern="[0-9]{8}" minlength="8" maxlength="8" autocomplete="one-time-code" required></label>'
          : `<label class="account-field">Email address<input name="email" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" value="${escape(email)}" required></label>`}
        <p id="account-message" role="status" aria-live="polite">${escape(message)}</p>
        <button class="btn primary" type="submit" ${submitting ? 'disabled' : ''}>${submitting ? 'Please wait…' : codeSent ? 'Verify and sign in' : 'Send sign-in code'}</button>
      </form>
      ${codeSent ? `<div class="account-secondary"><button class="account-text-button" data-resend-code ${Date.now() < resendAt || submitting ? 'disabled' : ''}>Send a new code</button><button class="account-text-button" data-change-email ${submitting ? 'disabled' : ''}>Use another email</button></div>` : ''}`;
  }
  document.getElementById('app').innerHTML = `<section class="account-panel" aria-labelledby="account-title"><div class="account-emblem" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg></div>${content}</section>`;
  document.getElementById('account-form')?.addEventListener('submit', submit);
  document.querySelector('[data-reload-account]')?.addEventListener('click', () => location.reload());
  document.querySelector('[data-retry-sync]')?.addEventListener('click', () => store.refresh());
  document.querySelector('[data-sign-out]')?.addEventListener('click', () => store.signOut());
  document.querySelector('[data-import-guest]')?.addEventListener('click', () => store.importGuest(guestIds()));
  document.querySelector('[data-change-email]')?.addEventListener('click', () => { codeSent = false; message = ''; render(); });
  document.querySelector('[data-resend-code]')?.addEventListener('click', sendCode);
  if (codeSent && resendAt > Date.now()) setTimeout(() => {
    const button = document.querySelector('[data-resend-code]');
    if (button && !submitting) button.disabled = false;
  }, resendAt - Date.now());
}

async function sendCode() {
  if (submitting) return;
  if (Date.now() < resendAt) {
    message = 'Please wait one minute before requesting another code.';
    render();
    return;
  }
  submitting = true; message = ''; render();
  try {
    const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) throw error;
    codeSent = true;
    resendAt = Date.now() + 60000;
    message = 'Use the most recent code. You can request another in one minute.';
  } catch {
    message = 'The email could not be sent. Check your address and try again in a minute.';
  }
  submitting = false;
  if (location.hash.startsWith('#/account')) { render(); document.querySelector('[name="code"]')?.focus(); }
}

async function submit(event) {
  event.preventDefault();
  if (submitting) return;
  const fields = new FormData(event.currentTarget);
  if (!codeSent) {
    email = String(fields.get('email') || '').trim();
    await sendCode();
    return;
  }
  const token = String(fields.get('code') || '').trim();
  if (!/^\d{8}$/.test(token)) return;
  submitting = true; message = ''; render();
  try {
    const { error } = await client.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw error;
    email = ''; codeSent = false; message = '';
  } catch {
    message = 'This code is invalid or has expired. Try the latest code, or request a new one.';
  }
  submitting = false;
  if (location.hash.startsWith('#/account')) render();
}

if (config?.enabled && config.url && config.publishableKey) {
  window.OutingsAccount = { status, render, toggle: id => store?.toggle(id), refresh: () => store?.refresh() };
  changed();
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm');
    client = createClient(config.url, config.publishableKey, { auth: {
      persistSession: true, autoRefreshToken: true, detectSessionInUrl: false,
      storageKey: 'outings-guide-email-session',
    } });
    store = createAccountStore(client, window.OUTINGS_DATA.listings.map(item => item.id), changed);
    await store.initialize();
    window.addEventListener('focus', () => store.refresh());
    window.addEventListener('online', () => store.refresh());
  } catch {
    client = null;
    loadError = 'Email sign-in could not load. Check your connection and try again.';
    changed();
  }
}
