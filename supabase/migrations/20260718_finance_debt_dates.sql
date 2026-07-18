-- Finance dashboard: optional start/due dates on debts (feed reminders + calendar).
-- Applied to project xdirlxklggepfwvfmgeu as migration "finance_debt_dates" on 2026-07-18.
alter table fin_debts add column if not exists start_date date;
alter table fin_debts add column if not exists due_date date;
