# Finance Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a private, login-gated personal cash-flow & budgeting dashboard to ligemat.com at `/app`, for a single user, in the site's existing no-build static stack.

**Architecture:** Standalone `/app` page (separate from the public marketing site) built from focused ES modules loaded by `app.html`. Auth is Supabase email+password with a device-local 4-digit PIN that AES-GCM-encrypts the refresh token (PBKDF2-derived key). All data lives in RLS-locked `fin_*` tables in the existing Supabase project, reachable only by the authenticated owner. The page is `noindex` and excluded from robots/sitemap.

**Tech Stack:** Vanilla HTML/CSS/JS ES modules, `@supabase/supabase-js@2` via CDN (existing), WebCrypto (browser + Node global), Supabase Postgres + Auth + RLS. Tests: Node built-in `node:test` (no npm install) for crypto; `curl` for RLS; Chrome browser checks for UI.

## Global Constraints

- **No build step / no npm dependencies.** Repo has no `package.json`; do not add a bundler or test framework. Use `node --test` (built into Node v22.16.0) and `curl` only.
- **Supabase project:** URL `https://xdirlxklggepfwvfmgeu.supabase.co`, publishable anon key `sb_publishable_cgKDImKevrJct2z-WcAh4w_uh084cDk` (in `config.js` as `window.LIGEMAT_CONFIG`). Reuse these — never embed the service-role key client-side.
- **Single user only.** No sharing, roles, or public sign-up. EGP only. Manual entry only.
- **Every `fin_*` table:** RLS enabled, policies require `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE. No anonymous access.
- **`/app` must be `noindex,nofollow`,** disallowed in `robots.txt`, and absent from `sitemap.xml`.
- **Amounts:** `numeric(14,2)`, EGP. Store dates as `date`.
- **Visual language:** Sora font, dark teal/gold theme matching `index.html` (`--teal:#0F6E56; --gold:#C9956A; --txt:#EDEFEC; --bg:#0A0F0D`).
- **Apply all SQL via the Supabase tooling** (MCP `apply_migration` / `execute_sql`), never by asking the user to run SQL.
- **Work on branch `feat/finance-dashboard`. Do not push or deploy without explicit user approval.**

---

## File Structure

- Create: `app.html` — page shell; loads `config.js`, supabase-js CDN, and `app/main.js` (module).
- Create: `app/crypto.js` — PIN key-derivation + refresh-token encrypt/decrypt. Pure, testable.
- Create: `app/crypto.test.mjs` — `node:test` unit tests for crypto.
- Create: `app/session.js` — encrypted-session store (localStorage), attempt counter, 30-day stamp.
- Create: `app/auth.js` — Supabase client, login, PIN set/unlock, route guard orchestration.
- Create: `app/data.js` — all `fin_*` CRUD + monthly aggregates.
- Create: `app/ui.js` — view rendering + event wiring (overview, transactions, budgets, settings).
- Create: `app/chart.js` — category spending chart (inline SVG, theme-aware).
- Create: `app/main.js` — entry point: boots auth guard, routes to login vs dashboard.
- Create: `app/app.css` — dashboard styles (imported by `app.html`).
- Create: `robots.txt`, `sitemap.xml` — site-root SEO files that exclude `/app`.
- Create: `supabase/migrations/20260711_finance.sql` — reference copy of the applied migration.
- Modify: `vercel.json` (create if absent) — clean-URL route so `/app` serves `app.html`.

---

## Task 1: Finance schema + RLS + seed (Supabase)

**Files:**
- Create: `supabase/migrations/20260711_finance.sql` (reference copy; also applied via MCP)

**Interfaces:**
- Produces tables: `fin_accounts`, `fin_categories`, `fin_transactions`, `fin_budgets`, each with `user_id uuid`, RLS on, owner-only policies. Consumed by Task 7 (`app/data.js`).

- [ ] **Step 1: Write the migration SQL** into `supabase/migrations/20260711_finance.sql`:

```sql
-- Finance dashboard: owner-only cash-flow tables. All amounts EGP numeric(14,2).
create table if not exists fin_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  opening_balance_egp numeric(14,2) not null default 0,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists fin_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income','expense')),
  color text not null default '#C9956A',
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists fin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null default current_date,
  amount_egp numeric(14,2) not null check (amount_egp >= 0),
  type text not null check (type in ('income','expense')),
  category_id uuid references fin_categories(id) on delete set null,
  account_id uuid references fin_accounts(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create table if not exists fin_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid not null references fin_categories(id) on delete cascade,
  month date not null, -- first day of month
  amount_egp numeric(14,2) not null check (amount_egp >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);
create index if not exists fin_tx_user_date on fin_transactions(user_id, date);
create index if not exists fin_budget_user_month on fin_budgets(user_id, month);

alter table fin_accounts     enable row level security;
alter table fin_categories   enable row level security;
alter table fin_transactions enable row level security;
alter table fin_budgets      enable row level security;

-- One owner-only policy per table (applies to all verbs via FOR ALL).
do $$
declare t text;
begin
  foreach t in array array['fin_accounts','fin_categories','fin_transactions','fin_budgets'] loop
    execute format('drop policy if exists owner_all on %I;', t);
    execute format(
      'create policy owner_all on %I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;
end $$;
```

- [ ] **Step 2: Apply the migration** via MCP `apply_migration` (name `finance_dashboard`, project `xdirlxklggepfwvfmgeu`) with the SQL above.

- [ ] **Step 3: Verify tables + RLS exist.** Run via MCP `execute_sql`:

```sql
select tablename, rowsecurity from pg_tables
where tablename like 'fin_%';
select tablename, policyname, cmd from pg_policies where tablename like 'fin_%';
```
Expected: 4 tables all `rowsecurity = true`; each has policy `owner_all` with `cmd = ALL`.

- [ ] **Step 4: Verify anonymous is denied** (RLS proof). Run:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://xdirlxklggepfwvfmgeu.supabase.co/rest/v1/fin_transactions?select=id" \
  -H "apikey: sb_publishable_cgKDImKevrJct2z-WcAh4w_uh084cDk"
```
Expected: prints `200` with body `[]` on a GET (RLS returns zero rows to anon), OR a 401 — either proves no data leaks. Confirm the body is empty:
```bash
curl -s "https://xdirlxklggepfwvfmgeu.supabase.co/rest/v1/fin_accounts?select=*" \
  -H "apikey: sb_publishable_cgKDImKevrJct2z-WcAh4w_uh084cDk"
```
Expected: `[]` (no rows visible to anonymous).

- [ ] **Step 5: Commit**
```bash
git add supabase/migrations/20260711_finance.sql
git commit -m "feat(finance): fin_* schema with owner-only RLS"
```

---

## Task 2: Disable public sign-up + seed owner account & defaults

**Files:** none in repo (Supabase config + data). Record steps in commit message.

**Interfaces:**
- Produces: exactly one `auth.users` row (the owner) and a seeded default account + starter categories owned by that user. Consumed by all later tasks (the login target).

- [ ] **Step 1: Disable public sign-up.** In Supabase Auth settings for project `xdirlxklggepfwvfmgeu`, turn **off** "Allow new users to sign up" (email provider: enabled; signups: disabled). If not doable via MCP, list this as a one-line manual action for the user and STOP for their confirmation before continuing.

- [ ] **Step 2: Create the owner account.** Create the single user (owner's email, a strong temporary password to be changed on first login). Prefer the Supabase admin API/dashboard. Capture the resulting `user_id`.

- [ ] **Step 3: Seed defaults for that user.** Run via MCP `execute_sql`, substituting `:uid` with the owner `user_id`:

```sql
insert into fin_accounts (user_id, name, opening_balance_egp, sort)
values (':uid','Cash',0,0);
insert into fin_categories (user_id, name, type, color, sort) values
 (':uid','Salary','income','#23C39A',0),
 (':uid','Other income','income','#0F6E56',1),
 (':uid','Rent','expense','#C9956A',0),
 (':uid','Groceries','expense','#E2B98C',1),
 (':uid','Transport','expense','#9BA8A2',2),
 (':uid','Utilities','expense','#b9844f',3),
 (':uid','Dining','expense','#d8b27e',4),
 (':uid','Health','expense','#1da882',5),
 (':uid','Other','expense','#6b7a73',6);
```
Expected: 1 account + 9 categories inserted.

- [ ] **Step 4: Verify seed.** Run:
```sql
select (select count(*) from fin_accounts) accounts,
       (select count(*) from fin_categories) categories;
```
Expected: `accounts = 1`, `categories = 9`.

- [ ] **Step 5: Commit** (record-only; no repo files changed except a note):
```bash
git commit --allow-empty -m "chore(finance): disable public signup, seed owner account + default categories"
```

---

## Task 3: `/app` route shell, noindex, robots, sitemap

**Files:**
- Create: `app.html`, `app/app.css`, `robots.txt`, `sitemap.xml`
- Create/Modify: `vercel.json`

**Interfaces:**
- Produces: a served `/app` route rendering a shell with `#login-view` and `#dash-view` containers and a `<div id="app-root">`. Consumed by `app/main.js` (Task 9+).

- [ ] **Step 1: Create `app.html`** (shell; views populated later):

```html
<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>Ligemat — Private</title>
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="stylesheet" href="app/app.css">
</head>
<body>
<div id="app-root">
  <section id="login-view" hidden></section>
  <main id="dash-view" hidden></main>
  <div id="boot">Loading…</div>
</div>
<script src="config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script type="module" src="app/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `app/app.css`** with the theme tokens and base layout (match `index.html`):

```css
:root{--bg:#0A0F0D;--panel:#121C18;--line:rgba(201,149,106,.16);--teal:#0F6E56;--teal-lt:#23C39A;--gold:#C9956A;--gold-lt:#E2B98C;--txt:#EDEFEC;--muted:#9BA8A2;}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Sora',system-ui,sans-serif;background:linear-gradient(160deg,#0A0F0D,#0D1613 45%,#0A1110) fixed;color:var(--txt);line-height:1.6;min-height:100vh}
#app-root{max-width:960px;margin:0 auto;padding:24px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:20px}
.btn{display:inline-flex;align-items:center;gap:8px;font:600 14px/1 'Sora',sans-serif;padding:12px 20px;border-radius:12px;border:none;cursor:pointer;background:linear-gradient(135deg,var(--gold),#b9844f);color:#1a1206}
.btn-line{background:transparent;border:1px solid var(--line);color:var(--txt)}
input,select{width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--line);background:#0E1714;color:var(--txt);font:400 15px 'Sora',sans-serif}
label{display:block;font-size:13px;color:var(--muted);margin:12px 0 5px}
[hidden]{display:none!important}
.err{color:#ff9b8a;font-size:13px;margin-top:8px;min-height:16px}
.pin-dots{display:flex;gap:12px;justify-content:center;margin:18px 0}
.pin-dot{width:14px;height:14px;border-radius:50%;border:2px solid var(--gold);opacity:.35}
.pin-dot.on{opacity:1;background:var(--gold)}
```

- [ ] **Step 3: Create `robots.txt`** at repo root:
```
User-agent: *
Disallow: /app
Disallow: /app.html

Sitemap: https://ligemat.com/sitemap.xml
```

- [ ] **Step 4: Create `sitemap.xml`** listing ONLY public pages (no `/app`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://ligemat.com/</loc></url>
</urlset>
```

- [ ] **Step 5: Create/patch `vercel.json`** so `/app` serves `app.html` cleanly:
```json
{
  "cleanUrls": true,
  "rewrites": [{ "source": "/app", "destination": "/app.html" }]
}
```

- [ ] **Step 6: Verify locally.** Serve the folder and load `/app`:
```bash
cd /Users/s/Documents/GitHub/ligemat-landing && python3 -m http.server 8099 >/dev/null 2>&1 &
sleep 1
curl -s http://localhost:8099/app.html | grep -c 'noindex,nofollow'
curl -s http://localhost:8099/robots.txt | grep -c 'Disallow: /app'
kill %1 2>/dev/null
```
Expected: both print `1`.

- [ ] **Step 7: Commit**
```bash
git add app.html app/app.css robots.txt sitemap.xml vercel.json
git commit -m "feat(finance): /app shell, noindex, robots + sitemap exclusion"
```

---

## Task 4: PIN crypto module (unit-tested)

**Files:**
- Create: `app/crypto.js`, `app/crypto.test.mjs`

**Interfaces:**
- Produces (imported by `app/session.js`, Task 5):
  - `deriveKey(pin: string, salt: Uint8Array, iterations=310000): Promise<CryptoKey>`
  - `encryptSecret(plaintext: string, key: CryptoKey): Promise<{iv:number[], ct:number[]}>`
  - `decryptSecret(payload:{iv:number[],ct:number[]}, key: CryptoKey): Promise<string>`
  - `randomBytes(n:number): Uint8Array`
  - All use the global `crypto.subtle` (works in browser and Node v22).

- [ ] **Step 1: Write the failing test** `app/crypto.test.mjs`:

```js
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
  await assert.rejects(() => decryptSecret(enc, await deriveKey('9999', salt)));
});

test('randomBytes returns requested length', () => {
  assert.strictEqual(randomBytes(16).length, 16);
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test app/crypto.test.mjs`
Expected: FAIL — cannot find module `./crypto.js` / exports undefined.

- [ ] **Step 3: Write `app/crypto.js`**:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test app/crypto.test.mjs`
Expected: PASS — 3 tests, 0 failures.

- [ ] **Step 5: Commit**
```bash
git add app/crypto.js app/crypto.test.mjs
git commit -m "feat(finance): PIN key-derivation + AES-GCM encrypt/decrypt (tested)"
```

---

## Task 5: Encrypted session store + auth orchestration

**Files:**
- Create: `app/session.js`, `app/auth.js`

**Interfaces:**
- `app/session.js` produces (consumed by `app/auth.js`):
  - `saveEncrypted(refreshToken:string, pin:string): Promise<void>` — wraps token, stores `{salt,iter,iv,ct,ts,fails:0}` under key `lig_fin_lock` in localStorage; stamps `ts=Date.now()`.
  - `hasLock(): boolean`
  - `tryUnlock(pin:string): Promise<string>` — returns refresh token, or throws `'bad-pin'`; increments `fails`, and after 5 fails calls `clearLock()` then throws `'wiped'`. On success resets `fails`.
  - `needsFullLogin(maxDays=30): boolean` — true if no lock or `ts` older than maxDays.
  - `clearLock(): void`
- `app/auth.js` produces (consumed by `app/main.js`, Task 9):
  - `getClient(): SupabaseClient` (singleton from `window.supabase.createClient`)
  - `loginWithPassword(email, password): Promise<void>` (throws on failure)
  - `currentSession(): Promise<Session|null>`
  - `setPin(pin): Promise<void>` — saves encrypted current refresh token.
  - `unlockWithPin(pin): Promise<void>` — decrypts token, `setSession`, verify.
  - `logout(): Promise<void>` — supabase signOut + `clearLock()`.

- [ ] **Step 1: Write the failing test** `app/session.test.mjs` (uses a localStorage shim):

```js
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
```

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test app/session.test.mjs`
Expected: FAIL — cannot find `./session.js`.

- [ ] **Step 3: Write `app/session.js`**:

```js
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

export function needsFullLogin(maxDays = 30) {
  const o = read(); if (!o) return true;
  return (Date.now() - o.ts) > maxDays * 864e5;
}
```
> Note: uses `Date.now()` — fine in the browser/Node runtime (this is app code, not a workflow script).

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test app/session.test.mjs`
Expected: PASS — 3 tests.

- [ ] **Step 5: Write `app/auth.js`**:

```js
import { saveEncrypted, tryUnlock, hasLock, needsFullLogin, clearLock } from './session.js';
const CFG = window.LIGEMAT_CONFIG;
let _client;
export function getClient() {
  if (!_client) _client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY,
    { auth: { persistSession: true, autoRefreshToken: true } });
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
```

- [ ] **Step 6: Commit**
```bash
git add app/session.js app/session.test.mjs app/auth.js
git commit -m "feat(finance): encrypted session store + auth (login, PIN set/unlock, 30-day)"
```

---

## Task 6: Data access module

**Files:**
- Create: `app/data.js`

**Interfaces:**
- Produces (consumed by `app/ui.js`, `app/chart.js`). All return Promises; all reads/writes go through the authenticated client from `getClient()`; `user_id` is filled by the column default `auth.uid()` on insert.
  - `listCategories(): Promise<Array<{id,name,type,color,sort}>>`
  - `listAccounts(): Promise<Array<{id,name,opening_balance_egp,sort}>>`
  - `listTransactions(monthISO:string): Promise<Array<Tx>>` where `monthISO='YYYY-MM-01'`; returns that calendar month, newest first. `Tx = {id,date,amount_egp,type,category_id,account_id,note}`
  - `addTransaction(t:{date,amount_egp,type,category_id,account_id,note}): Promise<Tx>`
  - `updateTransaction(id, patch): Promise<void>`
  - `deleteTransaction(id): Promise<void>`
  - `listBudgets(monthISO): Promise<Array<{id,category_id,amount_egp}>>`
  - `upsertBudget(category_id, monthISO, amount_egp): Promise<void>`
  - `addCategory(name,type,color): Promise<void>` / `renameCategory(id,name)` / `deleteCategory(id)`
  - `addAccount(name,opening_balance_egp)` / `updateAccount(id,patch)` / `deleteAccount(id)`
  - `cashBalance(): Promise<number>` — sum(opening balances) + sum(income) − sum(expense) across ALL transactions.
  - `monthSummary(monthISO): Promise<{income:number, expense:number, net:number}>`

- [ ] **Step 1: Write `app/data.js`**:

```js
import { getClient } from './auth.js';
const sb = () => getClient();
const monthRange = (m) => { const s = new Date(m); const e = new Date(s); e.setMonth(e.getMonth()+1);
  const iso = d => d.toISOString().slice(0,10); return [iso(s), iso(e)]; };

export async function listCategories(){ const {data,error}=await sb().from('fin_categories').select('*').order('sort'); if(error)throw error; return data; }
export async function listAccounts(){ const {data,error}=await sb().from('fin_accounts').select('*').order('sort'); if(error)throw error; return data; }

export async function listTransactions(monthISO){ const [a,b]=monthRange(monthISO);
  const {data,error}=await sb().from('fin_transactions').select('*').gte('date',a).lt('date',b).order('date',{ascending:false}); if(error)throw error; return data; }
export async function addTransaction(t){ const {data,error}=await sb().from('fin_transactions').insert(t).select().single(); if(error)throw error; return data; }
export async function updateTransaction(id,patch){ const {error}=await sb().from('fin_transactions').update(patch).eq('id',id); if(error)throw error; }
export async function deleteTransaction(id){ const {error}=await sb().from('fin_transactions').delete().eq('id',id); if(error)throw error; }

export async function listBudgets(monthISO){ const {data,error}=await sb().from('fin_budgets').select('id,category_id,amount_egp').eq('month',monthISO); if(error)throw error; return data; }
export async function upsertBudget(category_id,monthISO,amount_egp){ const {error}=await sb().from('fin_budgets').upsert({category_id,month:monthISO,amount_egp},{onConflict:'user_id,category_id,month'}); if(error)throw error; }

export async function addCategory(name,type,color){ const {error}=await sb().from('fin_categories').insert({name,type,color}); if(error)throw error; }
export async function renameCategory(id,name){ const {error}=await sb().from('fin_categories').update({name}).eq('id',id); if(error)throw error; }
export async function deleteCategory(id){ const {error}=await sb().from('fin_categories').delete().eq('id',id); if(error)throw error; }
export async function addAccount(name,opening_balance_egp){ const {error}=await sb().from('fin_accounts').insert({name,opening_balance_egp}); if(error)throw error; }
export async function updateAccount(id,patch){ const {error}=await sb().from('fin_accounts').update(patch).eq('id',id); if(error)throw error; }
export async function deleteAccount(id){ const {error}=await sb().from('fin_accounts').delete().eq('id',id); if(error)throw error; }

export async function cashBalance(){
  const acc=await listAccounts(); let bal=acc.reduce((s,a)=>s+Number(a.opening_balance_egp),0);
  const {data,error}=await sb().from('fin_transactions').select('amount_egp,type'); if(error)throw error;
  for(const t of data) bal += (t.type==='income'?1:-1)*Number(t.amount_egp);
  return bal;
}
export async function monthSummary(monthISO){ const tx=await listTransactions(monthISO);
  let income=0,expense=0; for(const t of tx){ if(t.type==='income')income+=Number(t.amount_egp); else expense+=Number(t.amount_egp); }
  return { income, expense, net: income-expense }; }
```

- [ ] **Step 2: Static verification** (no live session needed): confirm the module parses and exports resolve.
Run:
```bash
node --input-type=module -e "await import('./app/data.js').then(m=>console.log(Object.keys(m).sort().join(',')))" 2>&1 | head
```
Expected: prints the export names (addAccount,addCategory,addTransaction,cashBalance,...). If it errors that `window` is undefined, wrap the `getClient` call is lazy (it is — only called inside functions), so import alone must succeed; if not, fix so no top-level `window` access runs at import.

- [ ] **Step 3: Commit**
```bash
git add app/data.js
git commit -m "feat(finance): Supabase data-access layer for fin_* tables"
```

---

## Task 7: App entry + login/PIN UI + route guard

**Files:**
- Create: `app/main.js`; Modify: `app/ui.js` (create with `renderLogin`, `renderPinSet`, `renderPinUnlock`)

**Interfaces:**
- `app/ui.js` produces: `renderLogin(onSubmit)`, `renderPinUnlock(onPin,onFull)`, `renderPinSet(onPin)`, each rendering into `#login-view` and calling back with entered values. Consumed by `app/main.js`.
- `app/main.js` produces: `boot()` — the guard: chooses login vs unlock vs dashboard.

- [ ] **Step 1: Create `app/ui.js` login/PIN renderers** (dashboard views added in Task 8):

```js
const $ = (s,r=document)=>r.querySelector(s);
const loginView = ()=>$('#login-view'), dashView=()=>$('#dash-view');
function show(el){ $('#boot').hidden=true; loginView().hidden = el!=='login'; dashView().hidden = el!=='dash'; }

export function renderLogin(onSubmit){ show('login');
  loginView().innerHTML = `<div class="card" style="max-width:380px;margin:12vh auto">
    <h2>Sign in</h2>
    <label>Email</label><input id="lg-email" type="email" autocomplete="username">
    <label>Password</label><input id="lg-pass" type="password" autocomplete="current-password">
    <div class="err" id="lg-err"></div>
    <button class="btn" id="lg-go" style="width:100%;margin-top:14px">Sign in</button></div>`;
  $('#lg-go').onclick = async ()=>{ $('#lg-err').textContent='';
    try{ await onSubmit($('#lg-email').value.trim(), $('#lg-pass').value); }
    catch(e){ $('#lg-err').textContent = 'Sign-in failed. Check your email and password.'; } };
}
function pinPad(title, sub, onComplete){ show('login');
  loginView().innerHTML = `<div class="card" style="max-width:340px;margin:14vh auto;text-align:center">
    <h2>${title}</h2><p style="color:var(--muted);font-size:14px">${sub}</p>
    <div class="pin-dots">${[0,1,2,3].map(i=>`<div class="pin-dot" data-i="${i}"></div>`).join('')}</div>
    <div class="err" id="pin-err"></div>
    <div id="pin-alt"></div></div>`;
  let buf='';
  const paint=()=>document.querySelectorAll('.pin-dot').forEach((d,i)=>d.classList.toggle('on',i<buf.length));
  const onKey=(e)=>{ if(e.key>='0'&&e.key<='9'&&buf.length<4){buf+=e.key;paint();}
    else if(e.key==='Backspace'){buf=buf.slice(0,-1);paint();}
    if(buf.length===4){ const v=buf; buf=''; paint(); onComplete(v); } };
  document.addEventListener('keydown', onKey);
  return ()=>document.removeEventListener('keydown', onKey);
}
export function renderPinUnlock(onPin,onFull){ const off=pinPad('Enter PIN','4-digit unlock',async v=>{
    try{ await onPin(v); off(); }catch(e){ $('#pin-err').textContent = e.message==='wiped'
      ? 'Too many attempts — please sign in again.' : 'Wrong PIN.'; if(e.message==='wiped'){off();onFull();} } });
  $('#pin-alt').innerHTML = `<button class="btn-line btn" style="margin-top:12px" id="pin-full">Use password instead</button>`;
  $('#pin-full').onclick=()=>{ off(); onFull(); };
}
export function renderPinSet(onPin){ const off=pinPad('Set a PIN','Choose a 4-digit unlock code',async v=>{ await onPin(v); off(); }); }
export { show };
```

- [ ] **Step 2: Create `app/main.js`** (the guard):

```js
import { loginWithPassword, currentSession, setPin, unlockWithPin, hasLock, needsFullLogin, logout } from './auth.js';
import { renderLogin, renderPinUnlock, renderPinSet } from './ui.js';
import { renderDashboard } from './dash.js';

async function toDashboard(){ renderDashboard({ logout: async()=>{ await logout(); boot(); } }); }

async function afterLogin(){
  // Ask to set a PIN if none stored for this device.
  if (!hasLock()) { renderPinSet(async (pin)=>{ await setPin(pin); toDashboard(); }); }
  else toDashboard();
}

export async function boot(){
  const session = await currentSession();
  if (session && !needsFullLogin()) return afterLogin();
  if (hasLock() && !needsFullLogin()) {
    return renderPinUnlock(
      async (pin)=>{ await unlockWithPin(pin); afterLogin(); },
      ()=> renderLogin(async (e,p)=>{ await loginWithPassword(e,p); afterLogin(); }));
  }
  renderLogin(async (e,p)=>{ await loginWithPassword(e,p); afterLogin(); });
}
boot();
```

- [ ] **Step 3: Create a temporary `app/dash.js` stub** so the guard runs before Task 8:
```js
export function renderDashboard(){ const d=document.querySelector('#dash-view');
  document.querySelector('#boot').hidden=true; document.querySelector('#login-view').hidden=true;
  d.hidden=false; d.innerHTML='<div class="card">Signed in ✓ (dashboard next)</div>'; }
```

- [ ] **Step 4: Browser verify the auth flow.** Serve locally, open `/app` in the browser (Chrome tools), and check:
  1. Login form renders; wrong credentials show the error.
  2. Correct owner credentials → "Set a PIN" screen → entering 4 digits → "Signed in ✓".
  3. Reload → PIN unlock screen appears (lock stored); correct PIN → signed in; "Use password instead" falls back to login.
  4. In DevTools application storage, `lig_fin_lock` exists and contains `ct`/`iv` (ciphertext), NOT the raw token.
Expected: all four hold. Record the check in the commit.

- [ ] **Step 5: Commit**
```bash
git add app/ui.js app/main.js app/dash.js
git commit -m "feat(finance): login + PIN set/unlock UI and route guard"
```

---

## Task 8: Dashboard views — overview, add, transactions, budgets, settings

**Files:**
- Modify: `app/dash.js` (replace stub with full dashboard), `app/ui.js` (add helpers if needed)
- Create: `app/chart.js`

**Interfaces:**
- Consumes: all of `app/data.js`, plus `logout` passed in from `main.js`.
- Produces: `renderDashboard({logout})` mounting a tabbed dashboard into `#dash-view`.

- [ ] **Step 1: Create `app/chart.js`** — category spending as an inline SVG horizontal bar set (theme-aware, accessible):

```js
// data: [{label, value, color}]; returns an SVG string. Values in EGP.
export function categoryBars(data, { egp }) {
  const rows = data.filter(d=>d.value>0).sort((a,b)=>b.value-a.value);
  if (!rows.length) return '<p style="color:var(--muted)">No spending yet this month.</p>';
  const max = Math.max(...rows.map(r=>r.value));
  return `<div role="img" aria-label="Spending by category">${rows.map(r=>`
    <div style="display:flex;align-items:center;gap:10px;margin:7px 0">
      <div style="width:110px;font-size:13px;color:var(--muted)">${r.label}</div>
      <div style="flex:1;background:#0E1714;border-radius:7px;overflow:hidden">
        <div style="width:${Math.max(4,Math.round(r.value/max*100))}%;height:16px;background:${r.color}"></div></div>
      <div style="width:90px;text-align:right;font-size:13px">${egp(r.value)}</div>
    </div>`).join('')}</div>`;
}
```

- [ ] **Step 2: Replace `app/dash.js`** with the full dashboard. It renders a header (cash balance + month nav + tabs) and four tab panels. Complete logic:

```js
import * as D from './data.js';
import { categoryBars } from './chart.js';
const $ = (s,r=document)=>r.querySelector(s);
const egp = (n)=> new Intl.NumberFormat('en-EG',{style:'currency',currency:'EGP',maximumFractionDigits:0}).format(n||0);
const monthISO = (d)=> `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
const monthLabel = (d)=> d.toLocaleDateString('en-US',{month:'long',year:'numeric'});

export async function renderDashboard({ logout }){
  $('#boot').hidden=true; $('#login-view').hidden=true; const view=$('#dash-view'); view.hidden=false;
  let cursor = new Date(); cursor.setDate(1);
  let cats = await D.listCategories(), accts = await D.listAccounts();

  view.innerHTML = `
    <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div><div style="color:var(--muted);font-size:13px">Cash balance</div>
        <div id="bal" style="font-size:28px;font-weight:700">—</div></div>
      <button class="btn-line btn" id="lo">Log out</button></header>
    <div class="card" style="display:flex;gap:10px;align-items:center;margin-bottom:14px">
      <button class="btn-line btn" id="pm">‹</button>
      <div id="mlabel" style="flex:1;text-align:center;font-weight:600"></div>
      <button class="btn-line btn" id="nm">›</button></div>
    <nav style="display:flex;gap:8px;margin-bottom:14px">
      ${['Overview','Add','Transactions','Budgets','Settings'].map((t,i)=>
        `<button class="btn-line btn tab" data-t="${i}">${t}</button>`).join('')}</nav>
    <div id="panel"></div>`;
  $('#lo').onclick = logout;
  $('#pm').onclick = ()=>{ cursor.setMonth(cursor.getMonth()-1); refresh(); };
  $('#nm').onclick = ()=>{ cursor.setMonth(cursor.getMonth()+1); refresh(); };
  let tab = 0;
  view.querySelectorAll('.tab').forEach(b=> b.onclick=()=>{ tab=+b.dataset.t; refresh(); });

  async function refresh(){
    $('#mlabel').textContent = monthLabel(cursor);
    $('#bal').textContent = egp(await D.cashBalance());
    const m = monthISO(cursor);
    if (tab===0) await panelOverview(m);
    else if (tab===1) panelAdd(m);
    else if (tab===2) await panelTx(m);
    else if (tab===3) await panelBudgets(m);
    else await panelSettings();
  }
  const catName = (id)=> (cats.find(c=>c.id===id)||{}).name || '—';
  const catColor = (id)=> (cats.find(c=>c.id===id)||{}).color || '#9BA8A2';

  async function panelOverview(m){
    const s = await D.monthSummary(m); const tx = await D.listTransactions(m);
    const budgets = await D.listBudgets(m);
    const spendByCat = {}; tx.filter(t=>t.type==='expense').forEach(t=>{ spendByCat[t.category_id]=(spendByCat[t.category_id]||0)+Number(t.amount_egp); });
    const bars = Object.entries(spendByCat).map(([id,v])=>({label:catName(id),value:v,color:catColor(id)}));
    const budgetRows = budgets.map(b=>{ const spent=spendByCat[b.category_id]||0; const pct=Math.min(100,Math.round(spent/Number(b.amount_egp)*100||0));
      return `<div style="margin:8px 0"><div style="display:flex;justify-content:between;font-size:13px"><span>${catName(b.category_id)}</span> <span style="margin-left:auto">${egp(spent)} / ${egp(b.amount_egp)}</span></div>
        <div style="background:#0E1714;border-radius:6px;overflow:hidden"><div style="width:${pct}%;height:10px;background:${pct>=100?'#ff9b8a':'var(--teal-lt)'}"></div></div></div>`;}).join('') || '<p style="color:var(--muted)">No budgets set.</p>';
    $('#panel').innerHTML = `
      <div class="card" style="display:flex;gap:20px;margin-bottom:12px">
        <div><div style="color:var(--muted);font-size:12px">Income</div><div style="font-size:20px;color:var(--teal-lt)">${egp(s.income)}</div></div>
        <div><div style="color:var(--muted);font-size:12px">Expenses</div><div style="font-size:20px;color:var(--gold-lt)">${egp(s.expense)}</div></div>
        <div><div style="color:var(--muted);font-size:12px">Net</div><div style="font-size:20px">${egp(s.net)}</div></div></div>
      <div class="card" style="margin-bottom:12px"><h3>Spending by category</h3>${categoryBars(bars,{egp})}</div>
      <div class="card" style="margin-bottom:12px"><h3>Budgets</h3>${budgetRows}</div>
      <div class="card"><h3>Recent</h3>${tx.slice(0,10).map(t=>txLine(t)).join('')||'<p style="color:var(--muted)">No transactions.</p>'}</div>`;
  }
  const txLine = (t)=> `<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--line)">
    <span style="width:74px;color:var(--muted);font-size:12px">${t.date}</span>
    <span style="flex:1">${catName(t.category_id)}${t.note?` · <span style="color:var(--muted)">${t.note}</span>`:''}</span>
    <span style="color:${t.type==='income'?'var(--teal-lt)':'var(--gold-lt)'}">${t.type==='income'?'+':'−'}${egp(t.amount_egp)}</span></div>`;

  function panelAdd(m){
    $('#panel').innerHTML = `<div class="card" style="max-width:440px">
      <h3>Add transaction</h3>
      <label>Type</label><select id="a-type"><option value="expense">Expense</option><option value="income">Income</option></select>
      <label>Amount (EGP)</label><input id="a-amt" type="number" min="0" step="0.01" inputmode="decimal">
      <label>Category</label><select id="a-cat"></select>
      <label>Account</label><select id="a-acc">${accts.map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}</select>
      <label>Date</label><input id="a-date" type="date" value="${new Date().toISOString().slice(0,10)}">
      <label>Note</label><input id="a-note" type="text">
      <div class="err" id="a-err"></div>
      <button class="btn" id="a-go" style="width:100%;margin-top:14px">Add</button></div>`;
    const fillCats=()=>{ const ty=$('#a-type').value; $('#a-cat').innerHTML=cats.filter(c=>c.type===ty).map(c=>`<option value="${c.id}">${c.name}</option>`).join(''); };
    $('#a-type').onchange=fillCats; fillCats();
    $('#a-go').onclick=async()=>{ $('#a-err').textContent='';
      const amt=parseFloat($('#a-amt').value); if(!(amt>=0)){$('#a-err').textContent='Enter an amount.';return;}
      try{ await D.addTransaction({ type:$('#a-type').value, amount_egp:amt, category_id:$('#a-cat').value, account_id:$('#a-acc').value, date:$('#a-date').value, note:$('#a-note').value||null });
        tab=0; await refresh(); }catch(e){ $('#a-err').textContent='Could not save.'; } };
  }
  async function panelTx(m){ const tx=await D.listTransactions(m);
    $('#panel').innerHTML = `<div class="card"><h3>${monthLabel(cursor)} — transactions</h3>
      ${tx.map(t=>`<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)">
        <span style="width:74px;color:var(--muted);font-size:12px">${t.date}</span>
        <span style="flex:1">${catName(t.category_id)}${t.note?` · ${t.note}`:''}</span>
        <span style="color:${t.type==='income'?'var(--teal-lt)':'var(--gold-lt)'}">${t.type==='income'?'+':'−'}${egp(t.amount_egp)}</span>
        <button class="btn-line btn del" data-id="${t.id}" style="padding:4px 10px">✕</button></div>`).join('')||'<p style="color:var(--muted)">No transactions.</p>'}</div>`;
    $('#panel').querySelectorAll('.del').forEach(b=> b.onclick=async()=>{ if(confirm('Delete this transaction?')){ await D.deleteTransaction(b.dataset.id); await refresh(); } });
  }
  async function panelBudgets(m){ const budgets=await D.listBudgets(m); const bmap={}; budgets.forEach(b=>bmap[b.category_id]=b.amount_egp);
    $('#panel').innerHTML = `<div class="card"><h3>Monthly budgets — ${monthLabel(cursor)}</h3>
      ${cats.filter(c=>c.type==='expense').map(c=>`<div style="display:flex;gap:10px;align-items:center;margin:8px 0">
        <span style="flex:1">${c.name}</span>
        <input type="number" min="0" step="0.01" style="width:140px" value="${bmap[c.id]??''}" data-cat="${c.id}" placeholder="EGP"></div>`).join('')}
      <button class="btn" id="b-save" style="margin-top:12px">Save budgets</button></div>`;
    $('#b-save').onclick=async()=>{ for(const inp of $('#panel').querySelectorAll('input[data-cat]')){ const v=parseFloat(inp.value); if(v>=0) await D.upsertBudget(inp.dataset.cat,m,v); } tab=0; await refresh(); };
  }
  async function panelSettings(){ accts=await D.listAccounts(); cats=await D.listCategories();
    $('#panel').innerHTML = `<div class="card" style="margin-bottom:12px"><h3>Accounts</h3>
      ${accts.map(a=>`<div style="display:flex;gap:10px;margin:6px 0"><span style="flex:1">${a.name}</span><span style="color:var(--muted)">opening ${egp(a.opening_balance_egp)}</span></div>`).join('')}
      <label>New account name</label><input id="s-acc"><label>Opening balance (EGP)</label><input id="s-accbal" type="number" step="0.01" value="0">
      <button class="btn" id="s-accgo" style="margin-top:10px">Add account</button></div>
      <div class="card" style="margin-bottom:12px"><h3>Categories</h3>
      ${cats.map(c=>`<div style="display:flex;gap:10px;margin:6px 0"><span style="flex:1">${c.name}</span><span style="color:var(--muted)">${c.type}</span>
        <button class="btn-line btn cdel" data-id="${c.id}" style="padding:3px 9px">✕</button></div>`).join('')}
      <label>New category</label><input id="s-cat"><label>Type</label><select id="s-cattype"><option value="expense">expense</option><option value="income">income</option></select>
      <button class="btn" id="s-catgo" style="margin-top:10px">Add category</button></div>`;
    $('#s-accgo').onclick=async()=>{ if($('#s-acc').value.trim()){ await D.addAccount($('#s-acc').value.trim(), parseFloat($('#s-accbal').value)||0); await refresh(); } };
    $('#s-catgo').onclick=async()=>{ if($('#s-cat').value.trim()){ await D.addCategory($('#s-cat').value.trim(), $('#s-cattype').value, '#C9956A'); await refresh(); } };
    $('#panel').querySelectorAll('.cdel').forEach(b=> b.onclick=async()=>{ if(confirm('Delete category?')){ await D.deleteCategory(b.dataset.id); await refresh(); } });
  }
  refresh();
}
```

- [ ] **Step 3: Browser verify each tab** against the live owner account (`/app`, signed in):
  1. **Add** an expense (e.g. 500 Groceries) → returns to Overview; cash balance drops by 500; it appears in Recent.
  2. **Add** income (e.g. 20000 Salary) → balance rises; Overview income shows it.
  3. **Overview** shows income/expense/net, a category bar for Groceries, and Recent list.
  4. **Budgets** — set Groceries = 3000, save → Overview budget bar shows spent/3000.
  5. **Transactions** — delete the test expense → it disappears, balance restores.
  6. **Settings** — add an account "Bank" opening 100000 → balance includes it; add a category → appears in Add.
  7. **Month nav** ‹ › changes the label and reloads that month's data.
Expected: all hold, no console errors.

- [ ] **Step 4: Commit**
```bash
git add app/dash.js app/chart.js app/ui.js
git commit -m "feat(finance): dashboard views — overview, add, transactions, budgets, settings, chart"
```

---

## Task 9: Final security + SEO-exclusion verification

**Files:** none (verification + fixes only)

- [ ] **Step 1: RLS cross-check.** With the owner signed in, confirm data loads. Then, unauthenticated, re-run the Task 1 Step 4 curl — still `[]`. Confirm a second-user scenario is impossible (public signup disabled): attempt a signUp and expect it to be rejected:
```bash
curl -s -X POST "https://xdirlxklggepfwvfmgeu.supabase.co/auth/v1/signup" \
  -H "apikey: sb_publishable_cgKDImKevrJct2z-WcAh4w_uh084cDk" -H "Content-Type: application/json" \
  -d '{"email":"test-block@example.com","password":"Abcd1234!"}'
```
Expected: an error/`signups not allowed`-type response, NOT a created user. If a user is created, sign-up is still enabled — fix in Supabase before proceeding.

- [ ] **Step 2: Indexing exclusion.** Confirm `app.html` has `noindex,nofollow`, `robots.txt` disallows `/app`, and `/app` is not in `sitemap.xml`.
```bash
grep -c 'noindex,nofollow' app.html; grep -c '/app' robots.txt; grep -c '/app' sitemap.xml
```
Expected: `1`, `≥1`, `0`.

- [ ] **Step 3: Token-at-rest check.** In the browser after setting a PIN, confirm `localStorage.lig_fin_lock` contains only `salt/iter/iv/ct/ts/fails` and NO readable JWT/refresh token substring.
Expected: no `eyJ` (JWT prefix) present in the stored value.

- [ ] **Step 4: Run all unit tests once more.**
Run: `node --test app/*.test.mjs`
Expected: all pass.

- [ ] **Step 5: Commit any fixes + final.**
```bash
git add -A
git commit -m "test(finance): final security + indexing verification" --allow-empty
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** placement/isolation → T3; auth email+password → T5; 4-digit PIN encrypt + 5-attempt wipe + 30-day → T4/T5 (+session.test); RLS `fin_*` → T1; single user / no signup → T2; cash balance/accounts → T6 `cashBalance` + T8 settings; cash-flow overview/add/transactions/budgets → T8; category chart → T8/chart.js; noindex+robots+sitemap → T3, verified T9; EGP-only numeric → T1/T6. All covered.
- **Placeholder scan:** no TBD/TODO; every code step shows complete code; the only "stub" (T7 `dash.js`) is explicitly replaced in T8.
- **Type consistency:** `deriveKey/encryptSecret/decryptSecret/randomBytes` consistent across crypto→session; `tryUnlock`→`bad-pin`/`wiped` used consistently in session→ui; data-layer names match calls in dash.js (`listTransactions`, `cashBalance`, `monthSummary`, `upsertBudget`, `addTransaction`, `deleteTransaction`, `addAccount`, `addCategory`, `deleteCategory`).
