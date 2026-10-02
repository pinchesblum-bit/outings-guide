import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthFlow, profileFor } from '../account-auth.mjs';

test('account creation sends name metadata and password login does not send an OTP', async () => {
  const calls = [];
  const auth = {
    signUp: async value => { calls.push(['signup', value]); return { data: { session: { user: { id: 'a' } } } }; },
    signInWithPassword: async value => { calls.push(['signin', value]); return { error: null }; },
  };
  const flow = createAuthFlow(auth);
  await flow.signUp({ name: ' Ada Example ', email: ' ada@example.test ', password: 'test-only-password' });
  await flow.signIn({ email: 'ada@example.test', password: 'test-only-password' });
  assert.equal(calls[0][1].options.data.full_name, 'Ada Example');
  assert.equal(calls[1][0], 'signin');
  assert.equal(JSON.stringify(flow.snapshot()).includes('test-only-password'), false);
});

test('failed recovery verification cannot permit a password change', async () => {
  let writes = 0;
  const flow = createAuthFlow({
    resetPasswordForEmail: async () => ({ error: null }),
    verifyOtp: async () => ({ data: {}, error: new Error('expired') }),
    getUser: async () => ({ data: { user: { id: 'a' } } }),
    updateUser: async () => { writes++; return {}; },
  });
  await flow.requestReset('ada@example.test');
  assert.equal(await flow.verifyReset('00000000'), false);
  assert.equal(flow.snapshot().view, 'verify');
  assert.equal(await flow.setPassword('another-test-password'), false);
  assert.equal(writes, 0);
});

test('verified recovery survives refresh, checks the same user, and clears after success', async () => {
  const memory = new Map(); const storage = { getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
  let currentId = 'a', writes = 0, verifyType;
  const auth = {
    resetPasswordForEmail: async () => ({ error: null }),
    verifyOtp: async value => { verifyType = value.type; return { data: { session: { user: { id: 'a' } } } }; },
    getUser: async () => ({ data: { user: { id: currentId } } }),
    updateUser: async () => { writes++; return {}; },
  };
  const first = createAuthFlow(auth, () => {}, { storage });
  await first.requestReset('ada@example.test'); await first.verifyReset('12345678');
  assert.equal(verifyType, 'recovery');
  assert.equal(JSON.stringify(first.snapshot()).includes('12345678'), false);
  const restored = createAuthFlow(auth, () => {}, { storage });
  currentId = 'b'; assert.equal(await restored.setPassword('test-new-password'), false); assert.equal(writes, 0);
  currentId = 'a'; assert.equal(await restored.setPassword('test-new-password'), true); assert.equal(writes, 1);
  assert.equal(memory.size, 0);
});

test('profile safely uses Google photos or initials, and OAuth uses the fixed site URL', async () => {
  const p = profileFor({ email: 'a@example.test', user_metadata: { full_name: 'Ada Example', avatar_url: 'javascript:alert(1)' } });
  assert.equal(p.initials, 'AE'); assert.equal(p.photo, '');
  let request;
  const flow = createAuthFlow({ signInWithOAuth: async args => { request = args; return {}; } }, () => {}, { siteUrl: 'https://pinchesblum-bit.github.io/outings-guide/' });
  await flow.google(); assert.deepEqual(request, { provider: 'google', options: { redirectTo: 'https://pinchesblum-bit.github.io/outings-guide/' } });
});

test('signup remains usable while the server still requires confirmation', async () => {
  let type;
  const flow = createAuthFlow({ signUp: async () => ({ data: { session: null } }), verifyOtp: async value => { type = value.type; return { data: { session: { user: { id: 'a' } } } }; } });
  await flow.signUp({ name: 'Test', email: 'test@example.test', password: 'test-password' });
  assert.equal(flow.snapshot().view, 'confirm');
  await flow.verifySignup('12345678'); assert.equal(type, 'email'); assert.equal(flow.snapshot().view, 'signin');
});
