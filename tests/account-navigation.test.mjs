import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createSignInReturn, signInDestination } from '../account-navigation.mjs';

const source = readFileSync(new URL('../account.mjs', import.meta.url), 'utf8');
const submitSource = source.slice(source.indexOf('async function submit(event)'), source.indexOf('if (config?.enabled'));
function passwordForm(hash, success) {
  const location = { hash };
  let updates = 0;
  const submit = vm.runInNewContext(`${submitSource}\nsubmit`, {
    location, signInDestination, signInReturn: createSignInReturn(),
    changed: () => updates++,
    flow: { snapshot: () => ({ busy: false }), signIn: async () => success },
    FormData: class { get(key) { return key === 'email' ? 'example@example.test' : 'test-only-password'; } },
    document: { querySelector: () => null },
  });
  return { location, updates: () => updates, submit: () => submit({ preventDefault() {}, currentTarget: { dataset: { accountAction: 'signin' } } }) };
}

test('email sign-in returns to My Trips only when started there', async () => {
  for (const [entry, target] of [['#/saved', '/saved'], ['#/saved?view=all', '/saved'], ['#/account', '/']]) {
    const form = passwordForm(entry, true);
    await form.submit();
    assert.equal(form.location.hash, target);
    assert.equal(form.updates(), 1);
  }
});

test('failed email sign-in leaves the original sign-in page in place', async () => {
  const form = passwordForm('#/saved', false);
  await form.submit();
  assert.equal(form.location.hash, '#/saved');
  assert.equal(form.updates(), 0);
});

test('Google return survives module reload, is single-use, and regular sign-in overrides it', () => {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
  createSignInReturn(storage).remember('#/saved');
  assert.equal(createSignInReturn(storage).consume(), '/saved');
  assert.equal(createSignInReturn(storage).consume(), '/');
  const flow = createSignInReturn(storage);
  flow.remember('#/saved'); flow.remember('#/account');
  assert.equal(createSignInReturn(storage).consume(), '/');
});

test('untrusted destinations and unavailable browser storage fall back to the homepage', () => {
  assert.equal(createSignInReturn({ getItem: () => 'https://example.invalid', removeItem() {} }).consume(), '/');
  assert.equal(signInDestination('#/account?next=https://example.invalid'), '/');
  const blocked = createSignInReturn({ getItem() { throw Error(); }, setItem() { throw Error(); }, removeItem() { throw Error(); } });
  assert.equal(blocked.remember('#/saved'), '/saved');
  assert.equal(blocked.consume(), '/');
});
