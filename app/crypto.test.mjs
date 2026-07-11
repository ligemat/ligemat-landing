import { test } from 'node:test';
import assert from 'node:assert';
import { deriveKey, encryptSecret, decryptSecret, randomBytes } from './crypto.js';

test('round-trips a secret with the correct PIN', async () => {
  const salt = randomBytes(16);
  const key = await deriveKey('1234', salt);
  const enc = await encryptSecret('refresh-token-xyz', key);
  const out = await decryptSecret(enc, await deriveKey('1234', salt));
  assert.strictEqual(out, 'refresh-token-xyz');
});

test('wrong PIN fails to decrypt', async () => {
  const salt = randomBytes(16);
  const enc = await encryptSecret('secret', await deriveKey('1234', salt));
  const wrongKey = await deriveKey('9999', salt);
  await assert.rejects(() => decryptSecret(enc, wrongKey));
});

test('randomBytes returns requested length', () => {
  assert.strictEqual(randomBytes(16).length, 16);
});
