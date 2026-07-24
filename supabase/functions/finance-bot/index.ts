// Ligemat finance — Telegram bot (button-menu driven, owner-locked).
// Persistent menu of buttons; guided add flows; quick-type still works ("500 groceries").
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

async function secret(key: string): Promise<string> {
  const { data } = await sb.from("fin_secrets").select("value").eq("key", key).maybeSingle();
  return data?.value ?? "";
}
async function setSecret(key: string, value: string) {
  await sb.from("fin_secrets").upsert({ key, value, updated_at: new Date().toISOString() });
}
async function getState(): Promise<any> { try { return JSON.parse(await secret("TELEGRAM_STATE") || "null"); } catch { return null; } }
const setState = (o: unknown) => setSecret("TELEGRAM_STATE", JSON.stringify(o));
const clearState = () => setSecret("TELEGRAM_STATE", "");

// Persistent bottom menu.
const MENU = {
  keyboard: [
    [{ text: "💰 Balance" }, { text: "📊 Summary" }],
    [{ text: "➕ Add expense" }, { text: "💵 Add income" }],
    [{ text: "🧾 Debts" }, { text: "💸 Pay debt" }],
  ],
  resize_keyboard: true, is_persistent: true,
};
const WELCOME = "👋 <b>Ligemat Finance</b>\nTap a button below, or just type an amount like <code>500 groceries</code> to log an expense fast.";

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

  // Ownership: first /start claims the bot.
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

    // Menu buttons (a menu tap always cancels any in-progress flow).
    if (text.includes("Balance")) { await clearState(); await send(await balanceMsg()); }
    else if (text.includes("Summary")) { await clearState(); await send(await summaryMsg()); }
    else if (text.includes("Debts")) { await clearState(); await send(await debtsMsg()); }
    else if (text.includes("Add expense")) { await setState({ mode: "amount", type: "expense" }); await send("💸 How much did you spend?\nSend the amount, e.g. <code>500</code>", undefined); }
    else if (text.includes("Add income")) { await setState({ mode: "amount", type: "income" }); await send("💵 How much did you receive?\nSend the amount, e.g. <code>20000</code>", undefined); }
    else if (text.includes("Pay debt")) { await clearState(); await startPay(); }
    else if (low === "/start" || low === "/help" || low === "/menu" || low.startsWith("/start") || low.startsWith("/help")) { await clearState(); await send(WELCOME); }
    else {
      const st = await getState();
      if (st?.mode === "amount") { await onAmount(st, text); }
      else if (st?.mode === "payamount") { await onPayAmount(st, text); }
      else if (text[0] >= "0" && text[0] <= "9") { await quickAdd(text); } // quick-type "500 groceries"
      else { await send("Tap a button below, or type an amount like <code>500 groceries</code>."); }
    }
  } catch (e) { await send("⚠️ " + esc(String((e as Error).message))); }
  return new Response("ok");

  // ---------- guided flows ----------
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
  async function startPay() {
    const { rows } = await debtRows();
    if (!rows.length) { await send("You have no open debts to pay. 🎉"); return; }
    const btns = rows.map((d: any) => [{ text: d.name + " — " + money(d.remaining) + " left", callback_data: "pd:" + d.id }]);
    await sendInline("Which debt did you pay?", btns);
  }
  async function onPayAmount(st: any, t: string) {
    const amount = num(t);
    if (!(amount >= 0)) { await send("Please send just the number, e.g. <code>1000</code>.", undefined); return; }
    await sb.from("fin_debt_payments").insert({ user_id: OWNER_UID, debt_id: st.debt_id, amount_egp: amount, date: todayCairo() });
    await clearState();
    await send("✅ Logged " + money(amount) + " payment on <b>" + esc(st.debt_name) + "</b>.");
  }
  async function handleCallback(q: any) {
    const parts = String(q.data).split(":");
    const ack = (t: string) => api("answerCallbackQuery", { callback_query_id: q.id, text: t });
    const stripKb = () => api("editMessageReplyMarkup", { chat_id: chatId, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } });
    if (parts[0] === "cat") {
      const st = await getState(); if (st?.mode !== "category") { await ack("Expired — start again."); await stripKb(); return; }
      const catId = parts[1] === "none" ? null : parts[1];
      let catName = "Uncategorized";
      if (catId) { const { data: c } = await sb.from("fin_categories").select("name").eq("id", catId).maybeSingle(); catName = c?.name ?? catName; }
      const { data: acct } = await sb.from("fin_accounts").select("id").eq("user_id", OWNER_UID).order("sort").limit(1).maybeSingle();
      await sb.from("fin_transactions").insert({ user_id: OWNER_UID, type: st.type, amount_egp: st.amount, category_id: catId, account_id: acct?.id ?? null, date: todayCairo(), note: null });
      await clearState(); await ack("Added"); await stripKb();
      await send("✅ Added " + st.type + " <b>" + money(st.amount) + "</b> — " + esc(catName));
    } else if (parts[0] === "pd") {
      const { data: d } = await sb.from("fin_debts").select("name").eq("id", parts[1]).maybeSingle();
      await setState({ mode: "payamount", debt_id: parts[1], debt_name: d?.name ?? "debt" });
      await ack(""); await stripKb();
      await send("How much did you pay on <b>" + esc(d?.name ?? "debt") + "</b>?\nSend the amount.", undefined);
    }
  }

  // ---------- quick add ----------
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

  // ---------- read helpers ----------
  async function balanceMsg() {
    const { data: accts } = await sb.from("fin_accounts").select("*").eq("user_id", OWNER_UID).order("sort");
    const { data: tx } = await sb.from("fin_transactions").select("amount_egp,type,account_id").eq("user_id", OWNER_UID);
    const bal: Record<string, number> = {}; let total = 0;
    for (const a of accts ?? []) { bal[a.id] = Number(a.opening_balance_egp); total += Number(a.opening_balance_egp); }
    for (const t of tx ?? []) { const d = (t.type === "income" ? 1 : -1) * Number(t.amount_egp); total += d; if (t.account_id && bal[t.account_id] != null) bal[t.account_id] += d; }
    const lines = (accts ?? []).map((a: any) => "• " + esc(a.name) + ": <b>" + money(bal[a.id]) + "</b>");
    return "💰 <b>Total balance: " + money(total) + "</b>\n" + (lines.length ? lines.join("\n") : "No accounts yet.");
  }
  async function summaryMsg() {
    const now = new Date(); const m = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-01";
    const end = new Date(m); end.setMonth(end.getMonth() + 1); const mEnd = end.toISOString().slice(0, 10);
    const { data: tx } = await sb.from("fin_transactions").select("amount_egp,type").eq("user_id", OWNER_UID).gte("date", m).lt("date", mEnd);
    let inc = 0, exp = 0; for (const t of tx ?? []) { if (t.type === "income") inc += Number(t.amount_egp); else exp += Number(t.amount_egp); }
    return "📊 <b>" + now.toLocaleDateString("en-US", { month: "long", year: "numeric" }) + "</b>\nIncome: <b>" + money(inc) + "</b>\nExpenses: <b>" + money(exp) + "</b>\nNet: <b>" + money(inc - exp) + "</b>";
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
