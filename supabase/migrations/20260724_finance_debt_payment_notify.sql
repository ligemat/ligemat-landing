-- On each debt payment, message the owner on Telegram (token + chat from fin_secrets).
-- SECURITY DEFINER so it can read the RLS-locked fin_secrets regardless of who inserted.
-- Applied to project xdirlxklggepfwvfmgeu as "finance_debt_payment_notify" on 2026-07-24.
create or replace function fin_notify_debt_payment() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare tok text; chat text; dname text; rem numeric; msg text;
begin
  select value into tok  from fin_secrets where key = 'TELEGRAM_BOT_TOKEN';
  select value into chat from fin_secrets where key = 'TELEGRAM_OWNER_CHAT';
  if tok is null or chat is null then return NEW; end if;

  select name into dname from fin_debts where id = NEW.debt_id;
  select original_amount_egp - coalesce((select sum(amount_egp) from fin_debt_payments where debt_id = NEW.debt_id), 0)
    into rem from fin_debts where id = NEW.debt_id;

  msg := '💸 Payment logged: £E ' || to_char(round(NEW.amount_egp), 'FM999,999,999,990')
      || ' on ' || coalesce(dname, 'a debt') || E'\n'
      || 'Remaining: £E ' || to_char(round(coalesce(rem,0)), 'FM999,999,999,990');

  perform net.http_post(
    url := 'https://api.telegram.org/bot' || tok || '/sendMessage',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object('chat_id', chat, 'text', msg)
  );
  return NEW;
end $$;

drop trigger if exists fin_debt_payment_notify on fin_debt_payments;
create trigger fin_debt_payment_notify after insert on fin_debt_payments
  for each row execute function fin_notify_debt_payment();
