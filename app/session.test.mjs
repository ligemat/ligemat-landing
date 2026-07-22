import { test } from 'node:test';
import assert from 'node:assert';
globalThis.localStorage = (() => { let s={}; return {
  getItem:k=>k in s?s[k]:null, setItem:(k,v)=>{s[k]=String(v)},
  removeItem:k=>{delete s[k]} }; })();
const { saveEncrypted, tryUnlock, hasLock, needsFullLogin, clearLock } = await import('./session.js');

test('unlock returns token with right pin', async () => {
  clearLock();
  await saveEncrypted('tok-1', '4321');
  assert.strictEqual(hasLock(), true);
  assert.strictEqual(await tryUnlock('4321'), 'tok-1');
});

test('five bad pins wipe the lock', async () => {
  clearLock(); await saveEncrypted('tok-2', '0000');
  for (let i=0;i<4;i++) await assert.rejects(()=>tryUnlock('1111'), /bad-pin/);
  await assert.rejects(()=>tryUnlock('1111'), /wiped/);
  assert.strictEqual(hasLock(), false);
});

test('needsFullLogin true when no lock', () => {
  clearLock();
  assert.strictEqual(needsFullLogin(), true);
});

test('needsFullLogin stays false on a trusted device regardless of age (no periodic re-login)', async () => {
  clearLock();
  await saveEncrypted('tok-3', '1234');
  assert.strictEqual(needsFullLogin(), false);

  // Even a very old lock must NOT force a full re-login — trusted device stays PIN-only.
  const raw = JSON.parse(localStorage.getItem('lig_fin_lock'));
  raw.ts = Date.now() - 400 * 864e5;
  localStorage.setItem('lig_fin_lock', JSON.stringify(raw));

  assert.strictEqual(needsFullLogin(), false);
});
