// Only non-secret form state is retained. Passwords and reset codes stay in call arguments.
export function createAuthFlow(auth, onChange = () => {}, options = {}) {
  let state = { view: 'signin', email: '', name: '', busy: false, message: '', resendAt: 0, recoveryUserId: '' };
  const recoveryKey = 'outings-guide-password-recovery';
  try { state.recoveryUserId = options.storage?.getItem(recoveryKey) || ''; } catch {}
  const snapshot = () => ({ ...state });
  const notify = () => onChange();
  const remember = values => { for (const key of ['email', 'name']) if (typeof values[key] === 'string') state[key] = values[key]; };
  function recovery(id = '') {
    state.recoveryUserId = id;
    try { if (id) options.storage?.setItem(recoveryKey, id); else options.storage?.removeItem(recoveryKey); } catch {}
  }
  function switchView(view) {
    if (state.busy || !['signin', 'signup', 'forgot'].includes(view)) return;
    state.view = view; state.message = ''; notify();
  }
  async function run(task, fallback) {
    if (state.busy) return false;
    state.busy = true; state.message = ''; notify();
    let success = false;
    try { await task(); success = true; }
    catch (error) {
      state.message = error?.code === 'weak_password' ? 'Choose a stronger password with at least 8 characters.' : fallback;
    }
    finally { state.busy = false; notify(); }
    return success;
  }
  async function signUp({ name, email, password }) {
    remember({ name: name.trim(), email: email.trim() });
    if (!state.name || password.length < 8) { state.message = 'Enter your name and a password with at least 8 characters.'; notify(); return false; }
    return run(async () => {
      const { data, error } = await auth.signUp({ email: state.email, password, options: { data: { full_name: state.name } } });
      if (error) throw error;
      recovery(); state.view = data.session ? 'signin' : 'confirm';
      state.message = data.session ? 'Your account is ready.' : 'Enter the code sent to your email to finish creating your account.';
    }, 'Your account could not be created. If you already have an account, sign in or use Forgot password.');
  }
  async function signIn({ email, password }) {
    remember({ email: email.trim() });
    return run(async () => {
      const { error } = await auth.signInWithPassword({ email: state.email, password });
      if (error) throw error;
      recovery(); state.view = 'signin';
    }, 'Sign-in failed. Check your email and password, or use Forgot password.');
  }
  async function requestReset(email = state.email) {
    if (state.busy) return false;
    remember({ email: email.trim() });
    if (Date.now() < state.resendAt) { state.message = 'Please wait one minute before requesting another code.'; notify(); return false; }
    return run(async () => {
      const { error } = await auth.resetPasswordForEmail(state.email);
      if (error) throw error;
      state.view = 'verify'; state.resendAt = Date.now() + 60000;
      state.message = 'If an account exists for this email, a reset code is on its way. Check your spam folder too.';
    }, 'The reset email could not be sent. Please try again in a minute.');
  }
  async function verifyReset(token) {
    if (!/^\d{8}$/.test(token)) { state.message = 'Enter the eight-digit code from your email.'; notify(); return false; }
    return run(async () => {
      const { data, error } = await auth.verifyOtp({ email: state.email, token, type: 'recovery' });
      if (error || !data?.session?.user?.id) throw error || new Error('No recovery session');
      recovery(data.session.user.id); state.view = 'reset';
    }, 'This code is invalid or expired. Try the latest code, or request a new one.');
  }
  async function verifySignup(token) {
    if (!/^\d{8}$/.test(token)) { state.message = 'Enter the eight-digit code from your email.'; notify(); return false; }
    return run(async () => {
      const { data, error } = await auth.verifyOtp({ email: state.email, token, type: 'email' });
      if (error || !data?.session) throw error || new Error('No confirmed session');
      state.view = 'signin'; state.message = 'Your account is ready.';
    }, 'This code is invalid or expired. Try the latest code, or use Forgot password to recover your account.');
  }
  async function setPassword(password) {
    if (password.length < 8) { state.message = 'Use at least 8 characters for your new password.'; notify(); return false; }
    return run(async () => {
      const { data: { user }, error: userError } = await auth.getUser();
      if (userError || !state.recoveryUserId || user?.id !== state.recoveryUserId) throw new Error('Recovery session changed');
      const { error } = await auth.updateUser({ password });
      if (error) throw error;
      recovery(); state.view = 'signin'; state.message = 'Your password has been updated.';
    }, 'Your password could not be changed. Try again, or restart Forgot password if your session expired.');
  }
  async function cancelReset() {
    return run(async () => {
      if (state.recoveryUserId) { const { error } = await auth.signOut({ scope: 'local' }); if (error) throw error; }
      recovery(); state.view = 'signin';
    }, 'Please try again.');
  }
  async function google() {
    return run(async () => {
      const { error } = await auth.signInWithOAuth({ provider: 'google', options: { redirectTo: options.siteUrl } });
      if (error) throw error;
    }, 'Google sign-in could not open. Please try again.');
  }
  return { snapshot, remember, switchView, signUp, signIn, requestReset, verifyReset, verifySignup, setPassword, cancelReset, google };
}

export function profileFor(user) {
  const name = String(user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim();
  const label = name || 'Your account';
  const initials = (name ? name.split(/\s+/).slice(0, 2).map(part => [...part][0]).join('') : String(user?.email || 'A').slice(0, 1)).toUpperCase();
  let photo = '';
  try { const url = new URL(user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''); if (url.protocol === 'https:') photo = url.href; } catch {}
  return { name, label, initials, photo, shortName: name.split(/\s+/)[0] || 'Account' };
}
