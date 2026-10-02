// Saved lists are separated by the authenticated user; guest storage stays in app.js.
export function createAccountStore(client, listingIds, onChange = () => {}) {
  const allowed = new Set(listingIds);
  let state = { ready: false, user: null, ids: [], busy: false, error: '' };
  let generation = 0;
  let readVersion = 0;
  let currentUserId;
  let pendingRefresh = false;
  const notify = () => onChange();
  const snapshot = () => ({ ...state, ids: [...state.ids] });
  const validIds = ids => [...new Set(ids)].filter(id => allowed.has(id));

  function acceptSession(session) {
    const user = session?.user || null;
    if (currentUserId === (user?.id || null)) return;
    currentUserId = user?.id || null;
    generation++;
    readVersion++;
    state = { ready: !user, user, ids: [], busy: false, error: '' };
    notify();
  }

  async function refresh() {
    if (!state.user) return;
    if (state.busy) { pendingRefresh = true; return; }
    const epoch = generation;
    const version = ++readVersion;
    const userId = state.user.id;
    try {
      const { data, error } = await client.from('outings_saved_places')
        .select('listing_id').eq('user_id', userId).order('created_at');
      if (error) throw error;
      if (epoch !== generation || version !== readVersion) return;
      state.ids = validIds((data || []).map(row => row.listing_id));
      state.error = '';
    } catch {
      if (epoch !== generation || version !== readVersion) return;
      state.error = 'Your saved trips could not be loaded. Check your connection and try again.';
    }
    if (epoch === generation && version === readVersion) {
      state.ready = true;
      notify();
    }
  }

  const subscription = client.auth.onAuthStateChange((_event, session) => {
    acceptSession(session);
    // Keep SDK/network operations outside the synchronous auth callback.
    setTimeout(() => { refresh(); }, 0);
  }).data.subscription;

  async function initialize() {
    const epoch = generation;
    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (epoch !== generation) return;
      acceptSession(data.session);
      await refresh();
    } catch {
      if (epoch !== generation) return;
      state.ready = true;
      state.error = 'Sign-in could not be restored. Please try again.';
      notify();
    }
  }

  async function write(ids, remove = false) {
    if (!state.user || !state.ready || state.busy || state.error) return false;
    const selected = validIds(ids);
    if (!selected.length) return true;
    const userId = state.user.id;
    const epoch = generation;
    state.busy = true;
    readVersion++; // Ignore reads that started before this change.
    notify();
    let success = false;
    try {
      const table = client.from('outings_saved_places');
      const { error } = remove
        ? await table.delete().eq('user_id', userId).in('listing_id', selected)
        : await table.upsert(selected.map(listing_id => ({ user_id: userId, listing_id })),
            { onConflict: 'user_id,listing_id', ignoreDuplicates: true });
      if (error) throw error;
      if (epoch !== generation) return false;
      state.ids = remove ? state.ids.filter(id => !selected.includes(id)) : validIds([...state.ids, ...selected]);
      success = true;
    } catch {
      if (epoch === generation) state.error = 'That change was not saved. Check your connection and try again.';
    } finally {
      if (epoch === generation) {
        state.busy = false;
        notify();
        if (pendingRefresh) { pendingRefresh = false; refresh(); }
      }
    }
    return success;
  }

  async function signOut() {
    if (state.busy) return false;
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) {
      state.error = 'Sign-out did not finish. Please try again.';
      notify();
      return false;
    }
    acceptSession(null);
    return true;
  }

  return {
    snapshot, initialize, refresh, signOut,
    toggle: id => write([id], state.ids.includes(id)),
    importGuest: ids => write(ids),
    destroy: () => { generation++; subscription.unsubscribe(); },
  };
}
