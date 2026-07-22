import { deriveKey, encryptSecret, decryptSecret, randomBytes } from './crypto.js';
const KEY = 'lig_fin_lock';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const write = (o) => localStorage.setItem(KEY, JSON.stringify(o));

export function hasLock() { return !!read(); }
export function clearLock() { localStorage.removeItem(KEY); }

export async function saveEncrypted(refreshToken, pin) {
  const salt = randomBytes(16), iter = 310000;
  const key = await deriveKey(pin, salt, iter);
  const { iv, ct } = await encryptSecret(refreshToken, key);
  write({ salt: Array.from(salt), iter, iv, ct, ts: Date.now(), fails: 0 });
}

export async function tryUnlock(pin) {
  const o = read(); if (!o) throw new Error('no-lock');
  try {
    const key = await deriveKey(pin, new Uint8Array(o.salt), o.iter);
    const tok = await decryptSecret({ iv: o.iv, ct: o.ct }, key);
    o.fails = 0; write(o); return tok;
  } catch {
    o.fails = (o.fails || 0) + 1; write(o);
    if (o.fails >= 5) { clearLock(); throw new Error('wiped'); }
    throw new Error('bad-pin');
  }
}

// A device that has a saved PIN lock stays PIN-only — no periodic forced re-login.
// Full email+password is required only when there is no lock (new/cleared device),
// or when the PIN is wiped after 5 wrong attempts, or if the refresh token itself
// becomes invalid (unlockWithPin falls back to full login in that case).
export function needsFullLogin() {
  return !read();
}
