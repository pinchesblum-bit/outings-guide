// Only these two internal destinations are allowed after signing in.
export function signInDestination(hash = '') {
  return hash.split('?')[0] === '#/saved' ? '/saved' : '/';
}

export function createSignInReturn(storage) {
  const key = 'outings-guide-sign-in-return';
  const clear = () => { try { storage?.removeItem(key); } catch {} };
  return {
    remember(hash) {
      const destination = signInDestination(hash);
      try { storage?.setItem(key, destination); } catch {}
      return destination;
    },
    consume() {
      let destination;
      try { destination = storage?.getItem(key); } catch {}
      clear();
      return destination === '/saved' ? '/saved' : '/';
    },
    clear,
  };
}
