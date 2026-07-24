// Ligemat finance — Telegram bot (button menu + guided flows, owner-locked).
// Menu: Balance, Summary, Budgets, Add expense, Add income, Debts, Pay debt.
// Manage accounts under Balance; manage debts under Debts. Quick-type "500 groceries" works.
// State + secrets in the RLS-locked fin_secrets table (service role only).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OWNER_UID = "5e2b89b0-507c-467b-b092-90632d102e48";

const sb = createClient(SUPABASE_URL, SERVICE_KEY);
const money = (n: number) => "£E " + Math.round(Number(n) || 0).toLocaleString("en-US");
const esc = (s: string) => String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
const num = (s: string) => { const m = String(s).match(/-?\d[\d.,]*/); return m ? parseFloat(m[0].split(",").join("")) : NaN; };
const todayCairo = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
const monthISO = () => todayCairo().slice(0, 7) + "-01";
const validDate = (d: string) => d.length === 10 && d[4] === "-" && d[7] === "-" && !isNaN(Date.parse(d));

async function secret(key: string): Promise<string> {
  const { data } = await sb.from("fin_secrets").select("value").eq("key", key).maybeSingle();
  return data?.value ?? "";
}
const setSecret = (key: string, value: string) => sb.from("fin_secrets").upsert({ key, value, updated_at: new Date().toISOString() });
async function getState(): Promise<any> { try { return JSON.parse(await secret("TELEGRAM_STATE") || "null"); } catch { return null; } }
const setState = (o: unknown) => setSecret("TELEGRAM_STATE", JSON.stringify(o));
const clearState = () => setSecret("TELEGRAM_STATE", "");

const MENU = {
  keyboard: [
    [{ text: "💰 Balance" }, { text: "📊 Summary" }, { text: "📈 Budgets" }],
    [{ text: "➕ Add expense" }, { text: "💵 Add income" }],
    [{ text: "🧾 Debts" }, { text: "💸 Pay debt" }],
  ],
  resize_keyboard: true, is_persistent: true,
};
const WELCOME = "👋 <b>Ligemat Finance</b>\nTap a button below, or type an amount like <code>500 groceries</code> to log an expense fast.";

Deno.serve(async (req) => {
  const webhookSecret = await secret("TELEGRAM_WEBHOOK_SECRET");
  if (webhookSecret && req.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret) return new Response("forbidden", { status: 403 });
  const token = await secret("TELEGRAM_BOT_TOKEN");
  if (!token) return new Response("bot not configured");

  let update: any;
  try { update = await req.json(); } catch { return new Response("ok"); }
  const msg = update.message ?? update.edited_message;
  const cbq = update.callback_query;
  const chatId = msg?.chat?.id ?? cbq?.message?.chat?.id;
  if (!chatId) return new Response("ok");

  const api = (method: string, body: unknown) => fetch("https://api.telegram.org/bot" + token + "/" + method, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const send = (text: string, markup: unknown = MENU) => api("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: markup });
  const sendInline = (text: string, rows: any[]) => api("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup: { inline_keyboard: rows } });

  const text: string = (msg?.text ?? "").trim();
  const low = text.toLowerCase();

  let owner = await secret("TELEGRAM_OWNER_CHAT");
  if (!owner) {
    if (low.startsWith("/start")) { await setSecret("TELEGRAM_OWNER_CHAT", String(chatId)); await send("✅ Connected!\n\n" + WELCOME); }
    else await send("Send /start to link this bot to the finance account.", undefined);
    return new Response("ok");
  }
  if (String(chatId) !== owner) { await send("This is a private finance bot.", undefined); return new Response("ok"); }

  try {
    if (cbq) { await handleCallback(cbq); return new Response("ok"); }
    if (!text) return new Response("ok");

    if (text.includes("Balance")) { await clearState(); await showBalance(); }
    else if (text.includes("Summary")) { await clearState(); await send(await summaryMsg()); }
    else if (text.includes("Budgets")) { await clearState(); await showBudgets(); }
    else if (text.includes("Add expense")) { await setState({ mode: "amount", type: "expense" }); await send("💸 How much did you spend?\nSend the amount, e.g. <code>500</code>", undefined); }
    else if (text.includes("Add income")) { await setState({ mode: "amount", type: "income" }); await send("💵 How much did you receive?\nSend the amount, e.g. <code>20000</code>", undefined); }
    else if (text.includes("Pay debt")) { await clearState(); await startPay(); }
    else if (text.includes("Debts")) { await clearState(); await showDebts(); }
    else if (low.startsWith("/start") || low.startsWith("/help") || low.startsWith("/menu")) { await clearState(); await send(WELCOME); }
    else { await onText(text); }
  } catch (e) { await send("⚠️ " + esc(String((e as Error).message))); }
  return new Response("ok");

  // ---------- text (guided-flow input) ----------
  async function onText(t: string) {
    const st = await getState();
    switch (st?.mode) {
      case "amount": return onAmount(st, t);
      case "payamount": return onPayAmount(st, t);
      case "acct_addname": { await setState({ mode: "acct_addbal", name: t }); return void send("Opening balance for <b>" + esc(t) + "</b>? Send a number (0 if none).", undefined); }
      case "acct_addbal": { const b = num(t); await sb.from("fin_accounts").insert({ user_id: OWNER_UID, name: st.name, opening_balance_egp: isNaN(b) ? 0 : b }); await clearState(); return void send("✅ Account <b>" + esc(st.name) + "</b> added."); }
      case "acct_rename": { await sb.from("fin_accounts").update({ name: t }).eq("id", st.id).eq("user_id", OWNER_UID); await clearState(); return void send("✅ Renamed to <b>" + esc(t) + "</b>."); }
      case "acct_adjust": { const delta = num(t); if (isNaN(delta)) return void send("Send a number like <code>+500</code> or <code>-300</code>.", undefined); const { data: a } = await sb.from("fin_accounts").select("opening_balance_egp").eq("id", st.id).maybeSingle(); await sb.from("fin_accounts").update({ opening_balance_egp: Number(a?.opening_balance_egp || 0) + delta }).eq("id", st.id).eq("user_id", OWNER_UID); await clearState(); return void send("✅ Adjusted <b>" + esc(st.name) + "</b> by " + money(delta) + "."); }
      case "debt_name": { await setState({ mode: "debt_amount", direction: st.direction, name: t }); return void send("Total amount for <b>" + esc(t) + "</b>? Send a number.", undefined); }
      case "debt_amount": { const amt = num(t); if (!(amt >= 0)) return void send("Send a number, e.g. <code>5000</code>.", undefined); await setState({ mode: "debt_due", direction: st.direction, name: st.name, amount: amt }); return void send("Due date? Send it as <code>YYYY-MM-DD</code>, or type <code>skip</code>.", undefined); }
      case "debt_due": { const due = (low === "skip") ? null : (validDate(t) ? t : undefined); if (due === undefined) return void send("Please send a date like <code>2026-09-01</code>, or <code>skip</code>.", undefined); await sb.from("fin_debts").insert({ user_id: OWNER_UID, name: st.name, direction: st.direction, original_amount_egp: st.amount, due_date: due }); await clearState(); return void send("✅ Debt <b>" + esc(st.name) + "</b> (" + money(st.amount) + ") added."); }
      case "debt_edit_name": { await sb.from("fin_debts").update({ name: t }).eq("id", st.id).eq("user_id", OWNER_UID); await clearState(); return void send("✅ Renamed to <b>" + esc(t) + "</b>."); }
      case "debt_edit_amount": { const amt = num(t); if (!(amt >= 0)) return void send("Send a number.", undefined); await sb.from("fin_debts").update({ original_amount_egp: amt }).eq("id", st.id).eq("user_id", OWNER_UID); await clearState(); return void send("✅ Amount set to " + money(amt) + "."); }
      case "debt_edit_due": { const due = (low === "skip" || low === "none") ? null : (validDate(t) ? t : undefined); if (due === undefined) return void send("Send a date like <code>2026-09-01</code>, or <code>skip</code> to clear.", undefined); await sb.from("fin_debts").update({ due_date: due }).eq("id", st.id).eq("user_id", OWNER_UID); await clearState(); return void send("✅ Due date " + (due ? "set to " + due : "cleared") + "."); }
      case "budget_amount": { const amt = num(t); if (!(amt >= 0)) return void send("Send a number (0 to clear).", undefined); await sb.from("fin_budgets").upsert({ user_id: OWNER_UID, category_id: st.cat_id, month: monthISO(), amount_egp: amt }, { onConflict: "user_id,category_id,month" }); await clearState(); return void send("✅ Budget for <b>" + esc(st.cat_name) + "</b> set to " + money(amt) + "/month."); }
      default:
        if (t[0] >= "0" && t[0] <= "9") return quickAdd(t);
        return void send("Tap a button below, or type an amount like <code>500 groceries</code>.");
    }
  }

  // ---------- add expense/income ----------
  async function onAmount(st: any, t: string) {
    const amount = num(t);
    if (!(amount >= 0)) { await send("Please send just the number, e.g. <code>500</code>.", undefined); return; }
    const { data: cats } = await sb.from("fin_categories").select("*").eq("user_id", OWNER_UID).eq("type", st.type).order("sort");
    await setState({ mode: "category", type: st.type, amount });
    const rows: any[] = []; const list = cats ?? [];
    for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2).map((c: any) => ({ text: c.name, callback_data: "cat:" + c.id })));
    rows.push([{ text: "⏭ Skip", callback_data: "cat:none" }]);
    await sendInline("Pick a category for " + money(amount) + ":", rows);
  }
  async function quickAdd(t: string) {
    const amount = num(t); if (!(amount >= 0)) { await send("Type an amount like <code>500 groceries</code>."); return; }
    const words = t.replace(String(t.match(/-?\d[\d.,]*/)?.[0] ?? ""), "").trim();
    const { data: cats } = await sb.from("fin_categories").select("*").eq("user_id", OWNER_UID).eq("type", "expense");
    const list = cats ?? [];
    let cat = words ? list.find((c: any) => words.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(words.toLowerCase())) : null;
    if (!cat) cat = list.find((c: any) => c.name.toLowerCase() === "other") ?? list[0];
    const { data: acct } = await sb.from("fin_accounts").select("id").eq("user_id", OWNER_UID).order("sort").limit(1).maybeSingle();
    await sb.from("fin_transactions").insert({ user_id: OWNER_UID, type: "expense", amount_egp: amount, category_id: cat?.id ?? null, account_id: acct?.id ?? null, date: todayCairo(), note: words || null });
    await send("✅ Added expense <b>" + money(amount) + "</b> — " + esc(cat?.name ?? "Uncategorized") + (words ? " (" + esc(words) + ")" : ""));
  }

  // ---------- pay debt ----------
  async function startPay() {
    const { rows } = await debtRows();
    if (!rows.length) { await send("You have no open debts to pay. 🎉"); return; }
    await sendInline("Which debt did you pay?", rows.map((d: any) => [{ text: d.name + " — " + money(d.remaining) + " left", callback_data: "dpay:" + d.id }]));
  }
  async function onPayAmount(st: any, t: string) {
    const amount = num(t);
    if (!(amount >= 0)) { await send("Please send just the number, e.g. <code>1000</code>.", undefined); return; }
    await sb.from("fin_debt_payments").insert({ user_id: OWNER_UID, debt_id: st.debt_id, amount_egp: amount, date: todayCairo() });
    await clearState();
    await send("✅ Logged " + money(amount) + " payment on <b>" + esc(st.debt_name) + "</b>.");
  }

  // ---------- screens with manage buttons ----------
  async function showBalance() {
    const { data: accts } = await sb.from("fin_accounts").select("*").eq("user_id", OWNER_UID).order("sort");
    const { data: tx } = await sb.from("fin_transactions").select("amount_egp,type,account_id").eq("user_id", OWNER_UID);
    const bal: Record<string, number> = {}; let total = 0;
    for (const a of accts ?? []) { bal[a.id] = Number(a.opening_balance_egp); total += Number(a.opening_balance_egp); }
    for (const t of tx ?? []) { const d = (t.type === "income" ? 1 : -1) * Number(t.amount_egp); total += d; if (t.account_id && bal[t.account_id] != null) bal[t.account_id] += d; }
    const rows: any[] = [[{ text: "➕ Add account", callback_data: "acctnew" }]];
    for (const a of accts ?? []) rows.push([{ text: "⚙️ " + a.name + " — " + money(bal[a.id]), callback_data: "acct:" + a.id }]);
    await sendInline("💰 <b>Total balance: " + money(total) + "</b>\nTap an account to rename, adjust, or remove it.", rows);
  }
  async function showDebts() {
    const { rows } = await debtRows();
    const btns: any[] = [[{ text: "➕ Add debt", callback_data: "debtnew" }]];
    for (const d of rows) btns.push([{ text: "⚙️ " + d.name + " — " + money(d.remaining) + (d.direction === "i_owe" ? " (you owe)" : " (owed to you)"), callback_data: "debt:" + d.id }]);
    await sendInline(await debtsMsg() + "\n\nTap a debt to pay, edit, close, or delete it.", btns);
  }
  async function showBudgets() {
    const m = monthISO();
    const { data: cats } = await sb.from("fin_categories").select("*").eq("user_id", OWNER_UID).eq("type", "expense").order("sort");
    const { data: buds } = await sb.from("fin_budgets").select("category_id,amount_egp").eq("user_id", OWNER_UID).eq("month", m);
    const end = new Date(m); end.setMonth(end.getMonth() + 1);
    const { data: tx } = await sb.from("fin_transactions").select("amount_egp,category_id").eq("user_id", OWNER_UID).eq("type", "expense").gte("date", m).lt("date", end.toISOString().slice(0, 10));
    const bud: Record<string, number> = {}; for (const b of buds ?? []) bud[b.category_id] = Number(b.amount_egp);
    const spent: Record<string, number> = {}; for (const t of tx ?? []) spent[t.category_id] = (spent[t.category_id] || 0) + Number(t.amount_egp);
    const rows: any[] = [];
    for (const c of cats ?? []) {
      const b = bud[c.id], sp = spent[c.id] || 0;
      const label = c.name + " — " + money(sp) + (b != null ? " / " + money(b) : " (no budget)");
      rows.push([{ text: label, callback_data: "budget:" + c.id }]);
    }
    await sendInline("📈 <b>Budgets — this month</b>\nTap a category to set its monthly budget.", rows.length ? rows : [[{ text: "Add expense categories first", callback_data: "noop" }]]);
  }

  // ---------- callbacks ----------
  async function handleCallback(q: any) {
    const parts = String(q.data).split(":");
    const key = parts[0], id = parts[1];
    const ack = (t = "") => api("answerCallbackQuery", { callback_query_id: q.id, text: t });
    const strip = () => api("editMessageReplyMarkup", { chat_id: chatId, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } });

    if (key === "cat") {
      const st = await getState(); if (st?.mode !== "category") { await ack("Expired — start again."); await strip(); return; }
      const catId = id === "none" ? null : id;
      let catName = "Uncategorized";
      if (catId) { const { data: c } = await sb.from("fin_categories").select("name").eq("id", catId).maybeSingle(); catName = c?.name ?? catName; }
      const { data: acct } = await sb.from("fin_accounts").select("id").eq("user_id", OWNER_UID).order("sort").limit(1).maybeSingle();
      await sb.from("fin_transactions").insert({ user_id: OWNER_UID, type: st.type, amount_egp: st.amount, category_id: catId, account_id: acct?.id ?? null, date: todayCairo(), note: null });
      await clearState(); await ack("Added"); await strip();
      await send("✅ Added " + st.type + " <b>" + money(st.amount) + "</b> — " + esc(catName));
    } else if (key === "dpay") {
      const { data: d } = await sb.from("fin_debts").select("name").eq("id", id).maybeSingle();
      await setState({ mode: "payamount", debt_id: id, debt_name: d?.name ?? "debt" });
      await ack(); await strip(); await send("How much did you pay on <b>" + esc(d?.name ?? "debt") + "</b>?\nSend the amount.", undefined);
    } else if (key === "acctnew") {
      await setState({ mode: "acct_addname" }); await ack(); await strip(); await send("New account name? (e.g. Bank, Wallet)", undefined);
    } else if (key === "acct") {
      const { data: a } = await sb.from("fin_accounts").select("name").eq("id", id).maybeSingle(); const nm = a?.name ?? "account";
      await ack(); await sendInline("Manage <b>" + esc(nm) + "</b>:", [[
        { text: "✏️ Rename", callback_data: "arn:" + id }, { text: "± Adjust", callback_data: "aadj:" + id }, { text: "🗑 Remove", callback_data: "adel:" + id },
      ]]);
    } else if (key === "arn") {
      await setState({ mode: "acct_rename", id }); await ack(); await strip(); await send("New name for the account?", undefined);
    } else if (key === "aadj") {
      const { data: a } = await sb.from("fin_accounts").select("name").eq("id", id).maybeSingle();
      await setState({ mode: "acct_adjust", id, name: a?.name ?? "account" }); await ack(); await strip();
      await send("Adjust <b>" + esc(a?.name ?? "account") + "</b> by how much? Send <code>+500</code> to add or <code>-300</code> to subtract.", undefined);
    } else if (key === "adel") {
      await ack(); await sendInline("Delete this account? Its transactions stay but become unassigned.", [[{ text: "🗑 Yes, delete", callback_data: "adelok:" + id }, { text: "Cancel", callback_data: "cancel" }]]);
    } else if (key === "adelok") {
      await sb.from("fin_accounts").delete().eq("id", id).eq("user_id", OWNER_UID); await ack("Removed"); await strip(); await send("✅ Account removed.");
    } else if (key === "debtnew") {
      await ack(); await sendInline("Is this money you owe, or owed to you?", [[{ text: "I owe", callback_data: "dnew:i_owe" }, { text: "Owed to me", callback_data: "dnew:owed_to_me" }]]);
    } else if (key === "dnew") {
      await setState({ mode: "debt_name", direction: id }); await ack(); await strip(); await send("Name of the debt? (e.g. Car installment, Loan to Ahmed)", undefined);
    } else if (key === "debt") {
      const { data: d } = await sb.from("fin_debts").select("name,closed").eq("id", id).maybeSingle(); const nm = d?.name ?? "debt";
      await ack(); await sendInline("Manage <b>" + esc(nm) + "</b>:", [
        [{ text: "💸 Pay", callback_data: "dpay:" + id }, { text: "✏️ Edit", callback_data: "dedit:" + id }],
        [{ text: d?.closed ? "↩ Reopen" : "✅ Mark paid/closed", callback_data: "dclose:" + id }, { text: "🗑 Delete", callback_data: "ddel:" + id }],
      ]);
    } else if (key === "dedit") {
      await ack(); await sendInline("What do you want to change?", [[{ text: "Name", callback_data: "den:" + id }, { text: "Amount", callback_data: "dea:" + id }, { text: "Due date", callback_data: "ded:" + id }]]);
    } else if (key === "den") { await setState({ mode: "debt_edit_name", id }); await ack(); await strip(); await send("New name for the debt?", undefined); }
    else if (key === "dea") { await setState({ mode: "debt_edit_amount", id }); await ack(); await strip(); await send("New total amount? Send a number.", undefined); }
    else if (key === "ded") { await setState({ mode: "debt_edit_due", id }); await ack(); await strip(); await send("New due date as <code>YYYY-MM-DD</code>, or <code>skip</code> to clear.", undefined); }
    else if (key === "dclose") {
      const { data: d } = await sb.from("fin_debts").select("closed,name").eq("id", id).maybeSingle();
      await sb.from("fin_debts").update({ closed: !d?.closed }).eq("id", id).eq("user_id", OWNER_UID);
      await ack(); await strip(); await send((d?.closed ? "↩ Reopened" : "✅ Closed") + " <b>" + esc(d?.name ?? "debt") + "</b>.");
    } else if (key === "ddel") {
      await ack(); await sendInline("Delete this debt and its payment history?", [[{ text: "🗑 Yes, delete", callback_data: "ddelok:" + id }, { text: "Cancel", callback_data: "cancel" }]]);
    } else if (key === "ddelok") {
      await sb.from("fin_debts").delete().eq("id", id).eq("user_id", OWNER_UID); await ack("Deleted"); await strip(); await send("✅ Debt deleted.");
    } else if (key === "budget") {
      const { data: c } = await sb.from("fin_categories").select("name").eq("id", id).maybeSingle();
      await setState({ mode: "budget_amount", cat_id: id, cat_name: c?.name ?? "category" }); await ack(); await strip();
      await send("Monthly budget for <b>" + esc(c?.name ?? "category") + "</b>? Send a number (0 to clear).", undefined);
    } else if (key === "cancel") { await clearState(); await ack("Cancelled"); await strip(); }
    else { await ack(); }
  }

  // ---------- read helpers ----------
  async function summaryMsg() {
    const m = monthISO(); const end = new Date(m); end.setMonth(end.getMonth() + 1);
    const { data: tx } = await sb.from("fin_transactions").select("amount_egp,type").eq("user_id", OWNER_UID).gte("date", m).lt("date", end.toISOString().slice(0, 10));
    let inc = 0, exp = 0; for (const t of tx ?? []) { if (t.type === "income") inc += Number(t.amount_egp); else exp += Number(t.amount_egp); }
    return "📊 <b>This month</b>\nIncome: <b>" + money(inc) + "</b>\nExpenses: <b>" + money(exp) + "</b>\nNet: <b>" + money(inc - exp) + "</b>";
  }
  async function debtRows() {
    const { data: debts } = await sb.from("fin_debts").select("*").eq("user_id", OWNER_UID).eq("closed", false);
    const { data: pays } = await sb.from("fin_debt_payments").select("debt_id,amount_egp").eq("user_id", OWNER_UID);
    const paid: Record<string, number> = {}; for (const p of pays ?? []) paid[p.debt_id] = (paid[p.debt_id] || 0) + Number(p.amount_egp);
    const rows = (debts ?? []).map((d: any) => ({ ...d, remaining: Number(d.original_amount_egp) - (paid[d.id] || 0) })).filter((d: any) => d.remaining > 0);
    return { rows };
  }
  async function debtsMsg() {
    const { rows } = await debtRows();
    const owe = rows.filter((d: any) => d.direction === "i_owe").map((d: any) => "• " + esc(d.name) + ": <b>" + money(d.remaining) + "</b>" + (d.due_date ? " (due " + d.due_date + ")" : ""));
    const owed = rows.filter((d: any) => d.direction === "owed_to_me").map((d: any) => "• " + esc(d.name) + ": <b>" + money(d.remaining) + "</b>" + (d.due_date ? " (due " + d.due_date + ")" : ""));
    return "🧾 <b>Debts</b>\n\n<u>I owe</u>\n" + (owe.length ? owe.join("\n") : "— nothing") + "\n\n<u>Owed to me</u>\n" + (owed.length ? owed.join("\n") : "— nothing");
  }
});
