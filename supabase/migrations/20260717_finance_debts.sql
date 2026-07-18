-- Finance dashboard: debt tracking (both directions) + payment history.
-- Applied to project xdirlxklggepfwvfmgeu as migration "finance_debts" on 2026-07-17.
create table if not exists fin_debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  direction text not null check (direction in ('i_owe','owed_to_me')),
  original_amount_egp numeric(14,2) not null check (original_amount_egp >= 0),
  note text,
  closed boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists fin_debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  debt_id uuid not null references fin_debts(id) on delete cascade,
  amount_egp numeric(14,2) not null check (amount_egp >= 0),
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists fin_debt_user on fin_debts(user_id);
create index if not exists fin_debtpay_debt on fin_debt_payments(debt_id);

alter table fin_debts enable row level security;
alter table fin_debt_payments enable row level security;

do $$
declare t text;
begin
  foreach t in array array['fin_debts','fin_debt_payments'] loop
    execute format('drop policy if exists owner_all on %I;', t);
    execute format(
      'create policy owner_all on %I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;
end $$;
