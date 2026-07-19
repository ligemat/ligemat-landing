-- Finance dashboard: RLS-locked key/value store read only by the service role
-- (used by the finance-reminders edge function to hold RESEND_API_KEY).
-- Applied to project xdirlxklggepfwvfmgeu as migration "finance_secrets_store" on 2026-07-19.
-- The RESEND_API_KEY row is inserted at runtime (not committed here — it's a secret).
create table if not exists fin_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
-- RLS on with NO policies => no anon/authenticated access; only the service role can read.
alter table fin_secrets enable row level security;
revoke all on fin_secrets from anon, authenticated;
