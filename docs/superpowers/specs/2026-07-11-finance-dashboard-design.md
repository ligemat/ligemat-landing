# Finance Dashboard — Design Spec

_Date: 2026-07-11 · Project: ligemat.com (ligemat-landing) · Status: approved design, pre-implementation_

## Summary

A private, login-gated personal **cash-flow & budgeting** dashboard added to ligemat.com at
`/app`. Single user (the owner). Manual transaction entry. EGP only. Built in the site's
existing no-build static stack (vanilla HTML/CSS/JS + `supabase-js` via CDN). Completely
separate from the public marketing site's content and excluded from search indexing.

This is **not** real-estate related — it is the owner's personal finance tool that happens to
be hosted on the same domain and Supabase project. Isolation is enforced at the data
(row-level security) and indexing (noindex) layers.

## Goals

- Log income and expenses manually, categorized, in EGP.
- See at a glance: this month's income, expenses, net, budget progress, spending by category,
  and a current cash balance.
- Set a monthly budget per category and track spent-vs-budget.
- Secure single-user access: full email+password login once per device, then a 4-digit
  quick-unlock, with a 30-day forced full re-login.

## Non-goals (v1) — explicitly deferred

Multi-currency, bank/CSV import, automatic bank sync, investment/portfolio tracking,
recurring transactions, exportable reports, multi-user/sharing, biometric unlock. Each can be
a later phase; none are built now, to minimize attack surface and maintenance.

---

## 1. Placement & isolation

- **Route:** a new standalone page `app.html`, served at `/app` (Vercel clean-URL /
  rewrite). It is a separate file with its own JS — the finance code never loads on the
  public marketing pages.
- **Same Vercel project / same Supabase project** as the public site (owner's choice — path,
  not subdomain). Isolation is therefore at the data + indexing layers, not the deploy layer.
- **Indexing:** `<meta name="robots" content="noindex,nofollow">` on the page; `/app`
  disallowed in `robots.txt`; the page is left out of `sitemap.xml`. (Ties into the parallel
  SEO work — the public site gets robots.txt/sitemap that exclude `/app`.)
- **Result:** a public visitor never loads the finance code and cannot reach the data even if
  they find the URL — the URL is not a secret, auth + RLS is the protection.

## 2. Authentication

**Mechanism:** Supabase Auth, email + password. Public sign-up is **disabled** in the Supabase
project's auth settings; the owner's single account is seeded once. No one can register.

**First login (per device):** email + password → Supabase issues a session (access +
refresh token).

**4-digit quick-unlock (returning, same device):**
- On first successful login the user sets a 4-digit PIN.
- A key is derived from the PIN via WebCrypto **PBKDF2** (high iteration count, per-device
  random salt). The PIN is never stored or transmitted.
- The Supabase **refresh token is encrypted** (AES-GCM) with that key; only the ciphertext +
  salt + iteration count are stored in `localStorage`.
- On return: user enters PIN → key derived → refresh token decrypted → session restored via
  `supabase.auth.setSession(...)`. No password re-entry.

**Fallbacks & limits:**
- Wrong PIN **5 times** → the encrypted token is wiped → user must do a full email+password
  login again.
- **New device / cleared browser storage** → no ciphertext present → full login required.
- **30-day cap:** even on a trusted device, a full email+password re-login is forced every 30
  days (store the last-full-login timestamp alongside the ciphertext; if older than 30 days,
  require full login and re-set/re-wrap the PIN).

**Rationale:** The PIN is a device-local convenience unlock, mirroring banking apps. Server-side
security never depends on it — it depends on the Supabase session and RLS. A weak 4-digit code
is acceptable because (a) it only gates an already-authenticated session on a trusted device,
(b) attempts are limited with wipe-on-failure, and (c) full re-auth is always the fallback.

## 3. Data model (Supabase)

All tables are prefixed `fin_` and carry a `user_id uuid` column. **Row-level security is
enabled on every table**, with policies requiring `auth.uid() = user_id` for **all four verbs**
(select, insert, update, delete). RLS denies anonymous access by default, so the public inline
anon key cannot read or write these tables.

Amounts are stored in **EGP** as `numeric(14,2)` (or integer piastres — decide in the plan;
numeric is simpler and adequate here).

- **`fin_accounts`** — the simple cash-balance model.
  - `id`, `user_id`, `name` (e.g. "Cash", "Bank"), `opening_balance_egp`, `sort`, `created_at`.
  - Current balance of an account = `opening_balance_egp + sum(income) - sum(expenses)` for its
    transactions. Total cash balance = sum across accounts.
- **`fin_categories`**
  - `id`, `user_id`, `name`, `type` (`income` | `expense`), `color`, `sort`, `created_at`.
- **`fin_transactions`**
  - `id`, `user_id`, `date`, `amount_egp`, `type` (`income` | `expense`),
    `category_id` (FK → fin_categories), `account_id` (FK → fin_accounts, nullable/default),
    `note`, `created_at`.
- **`fin_budgets`**
  - `id`, `user_id`, `category_id` (FK), `month` (first-of-month date or `YYYY-MM`),
    `amount_egp`, `created_at`. Unique per (user_id, category_id, month).

Seed on first run: a small set of default expense/income categories and one default account,
so the dashboard isn't empty.

## 4. Features / UI (v1)

Styled in the site's existing visual language — Sora font, teal/gold dark theme — so it reads
as one product.

1. **Login / PIN screen** — email+password form; PIN entry for returning devices; "set PIN"
   step after first login; clear fallback to full login.
2. **Overview (default view):**
   - This month: total income, total expenses, net.
   - **Current cash balance** (across accounts).
   - Budget progress bars (spent vs budget per budgeted category).
   - Spending-by-category chart for the month.
   - Recent transactions (last ~10).
   - Month navigation (prev/next).
3. **Add transaction** — quick form: amount, type (income/expense), category, account, date,
   note. Fast keyboard entry.
4. **Transactions** — list filterable by month and category; edit and delete.
5. **Budgets** — set/edit a monthly budget per category; see spent-vs-budget.
6. **Settings (light)** — manage categories and accounts (add/rename/set opening balance),
   change PIN, log out.

Charts follow the `dataviz` skill guidance (clear, accessible, theme-aware). Keep to one or
two charts in v1 (category breakdown; optionally a monthly income-vs-expense bar).

## 5. Security summary

- RLS enabled on all `fin_*` tables, `auth.uid() = user_id` for select/insert/update/delete.
- Supabase public sign-up disabled; single seeded account.
- `noindex,nofollow` + robots disallow `/app` + excluded from sitemap.
- Finance JS isolated to `/app`; never loaded by public pages.
- Service-role key never used client-side (unchanged from current site).
- PIN: local PBKDF2-derived AES-GCM encryption of the refresh token; 5-attempt wipe; 30-day
  forced full re-login. PIN never stored or sent.
- The inline public anon key is safe to remain inline — RLS is the access control, and it
  denies anonymous by default.

## 6. Architecture notes for implementation

- New files (approx.): `app.html` (page + inline CSS/JS, matching the repo's single-file
  style), possibly `app-auth.js` and `app-finance.js` if splitting helps clarity, `robots.txt`,
  `sitemap.xml`. Reuse `config.js` for the Supabase URL + anon key.
- Vercel routing so `/app` serves `app.html` (clean URL). Confirm current deploy config
  (repo currently has no `vercel.json`).
- Supabase migrations: create `fin_*` tables + RLS policies + seed. Apply via the Supabase
  workflow (do not hand SQL to the user to run).
- Keep each unit focused: auth/unlock, data access, and each view should be independently
  understandable and testable.

## Open questions for the plan (not blocking)

- `numeric` vs integer-piastres for amounts (lean `numeric(14,2)`).
- Whether to split JS into modules or keep one file (match repo convention — likely inline).
- Exact default categories to seed.
