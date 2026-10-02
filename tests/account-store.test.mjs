import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountStore } from '../account-store.mjs';

function fixture() {
  let session = { user: { id: 'user-a', email: 'a@example.test' } };
  let callback;
  const requests = [];
  const client = {
    auth: {
      onAuthStateChange(fn) { callback = fn; return { data: { subscription: { unsubscribe() {} } } }; },
      async getSession() { return { data: { session }, error: null }; },
      async signOut() { session = null; callback('SIGNED_OUT', null); return { error: null }; },
    },
    from(table) {
      assert.equal(table, 'outings_saved_places');
      const query = { op: '', filters: {} };
      const builder = {
        select() { query.op = 'read'; return builder; },
        order() { return builder; },
        eq(key, value) { query.filters[key] = value; return builder; },
        in(key, value) { query.filters[key] = value; return builder; },
        delete() { query.op = 'delete'; return builder; },
        upsert(rows) { query.op = 'insert'; query.rows = rows; return builder; },
        then(resolve, reject) {
          return new Promise(done => requests.push({ ...query, resolve: done })).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  const store = createAccountStore(client, ['zoo', 'park']);
  return { store, requests, change(user) { session = user ? { user } : null; callback('SIGNED_IN', session); } };
}
const tick = () => new Promise(resolve => setTimeout(resolve, 5));
async function ready(f, ids = []) {
  const pending = f.store.initialize();
  await tick();
  const request = f.requests.shift();
  assert.equal(request.filters.user_id, 'user-a');
  request.resolve({ data: ids.map(listing_id => ({ listing_id })), error: null });
  await pending;
}

test('failed cloud saves never appear successful, and retry reload restores usability', async () => {
  const f = fixture(); await ready(f, ['park']);
  const pending = f.store.toggle('zoo'); await tick();
  assert.equal(f.store.snapshot().busy, true);
  assert.deepEqual(f.store.snapshot().ids, ['park']);
  f.requests.shift().resolve({ error: new Error('offline') });
  assert.equal(await pending, false);
  assert.deepEqual(f.store.snapshot().ids, ['park']);
  assert.match(f.store.snapshot().error, /not saved/);
  const retry = f.store.refresh(); await tick();
  f.requests.shift().resolve({ data: [{ listing_id: 'park' }], error: null });
  await retry; assert.equal(f.store.snapshot().error, '');
  f.store.destroy();
});

test('an old account write finishing after sign-out cannot populate the new account', async () => {
  const f = fixture(); await ready(f, ['park']);
  const pending = f.store.toggle('zoo'); await tick();
  const oldWrite = f.requests.shift();
  f.change({ id: 'user-b', email: 'b@example.test' });
  assert.deepEqual(f.store.snapshot().ids, []);
  await tick();
  const newRead = f.requests.shift();
  assert.equal(newRead.filters.user_id, 'user-b');
  newRead.resolve({ data: [], error: null });
  await tick();
  oldWrite.resolve({ error: null }); await pending;
  assert.equal(f.store.snapshot().user.id, 'user-b');
  assert.deepEqual(f.store.snapshot().ids, []);
  f.store.destroy();
});

test('a read started before a save cannot erase the completed save', async () => {
  const f = fixture(); await ready(f);
  const read = f.store.refresh(); await tick();
  const staleRead = f.requests.shift();
  const write = f.store.toggle('zoo'); await tick();
  const save = f.requests.shift();
  assert.deepEqual(save.rows, [{ user_id: 'user-a', listing_id: 'zoo' }]);
  save.resolve({ error: null }); await write;
  staleRead.resolve({ data: [], error: null }); await read;
  assert.deepEqual(f.store.snapshot().ids, ['zoo']);
  f.store.destroy();
});

test('guest import only adds valid IDs to the current owner and logout clears account data', async () => {
  const f = fixture(); await ready(f, ['park']);
  const pending = f.store.importGuest(['zoo', 'zoo', 'not-a-listing']); await tick();
  const save = f.requests.shift();
  assert.deepEqual(save.rows, [{ user_id: 'user-a', listing_id: 'zoo' }]);
  save.resolve({ error: null }); assert.equal(await pending, true);
  assert.deepEqual(f.store.snapshot().ids, ['park', 'zoo']);
  await f.store.signOut();
  assert.deepEqual(f.store.snapshot().ids, []);
  assert.equal(f.store.snapshot().user, null);
  f.store.destroy();
});
