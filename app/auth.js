import { saveEncrypted, tryUnlock, hasLock, needsFullLogin, clearLock } from './session.js';
let _client;
export function getClient() {
  if (!_client) {
    const CFG = window.LIGEMAT_CONFIG;
    // persistSession:false is load-bearing: supabase-js must NOT write the session
    // (incl. the refresh JWT) to localStorage in plaintext. The only durable copy of
    // the refresh token is the PIN-encrypted lig_fin_lock (see session.js). Without
    // this, boot() would find a restored session on reload and skip the PIN prompt.
    _client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: true } });
  }
  return _client;
}
export async function loginWithPassword(email, password) {
  const { error } = await getClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
}
export async function currentSession() {
  const { data } = await getClient().auth.getSession();
  return data.session;
}
export async function setPin(pin) {
  const s = await currentSession();
  if (!s?.refresh_token) throw new Error('no-session');
  await saveEncrypted(s.refresh_token, pin);
}
export async function unlockWithPin(pin) {
  const refresh_token = await tryUnlock(pin); // throws bad-pin | wiped
  const { data, error } = await getClient().auth.refreshSession({ refresh_token });
  if (error || !data.session) { clearLock(); throw new Error('wiped'); }
  await saveEncrypted(data.session.refresh_token, pin); // re-wrap rotated token + refresh ts
}
export async function logout() { await getClient().auth.signOut(); clearLock(); }
export { hasLock, needsFullLogin };
