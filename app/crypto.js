const enc = new TextEncoder();
const dec = new TextDecoder();

export function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

export async function deriveKey(pin, salt, iterations = 310000) {
  const base = await crypto.subtle.importKey(
    'raw', enc.encode(String(pin)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptSecret(plaintext, key) {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  return { iv: Array.from(iv), ct: Array.from(new Uint8Array(ct)) };
}

export async function decryptSecret(payload, key) {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(payload.iv) },
    key, new Uint8Array(payload.ct));
  return dec.decode(pt);
}
