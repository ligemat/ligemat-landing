-- Finance dashboard: owner-only cash-flow tables. All amounts EGP numeric(14,2).
-- Applied to project xdirlxklggepfwvfmgeu as migration "finance_dashboard" on 2026-07-11.
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
