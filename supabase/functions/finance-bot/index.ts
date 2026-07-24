// Ligemat finance — Telegram bot webhook.
// Private to one owner (claims on first /start). Commands: /balance /summary /debts /help,
// add by chatting ("500 groceries" or /add 500 groceries), /income, /pay.
// Secrets live in the RLS-locked fin_secrets table (service role only):
//   TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_OWNER_CHAT (set on claim).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OWNER_UID = "5e2b89b0-507c-467b-b092-90632d102e48"; // the finance owner's Supabase user id

const sb = createClient(SUPABASE_URL, SERVICE_KEY);
const money = (n: number) => "£E " + Math.round(Number(n) || 0).toLocaleString("en-US");
const esc = (s: string) => String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
const num = (s: string) => { const m = s.match(/-?\d[\d.,]*/); return m ? parseFloat(m[0].split(",").join("")) : NaN; };
const todayCairo = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });

async function secret(key: string): Promise<string> {
  const { data } = await sb.from("fin_secrets").select("value").eq("key", key).maybeSingle();
  return data?.value ?? "";
}
async function setSecret(key: string, value: string) {
  await sb.from("fin_secrets").upsert({ key, value, updated_at: new Date().toISOString() });
}
async function tg(token: string, method: string, body: unknown) {
  return fetch("https://api.telegram.org/bot" + token + "/" + method, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

const HELP = [
  "<b>Ligemat Finance bot</b>",
  "",
  "💰 /balance — total + per account",
  "📊 /summary — this month income / expenses / net",
  "🧾 /debts — what you owe / are owed",
  "➕ Add an expense: type <code>500 groceries</code> or <code>/add 500 groceries</code>",
  "💵 Add income: <code>/income 20000 salary</code>",
  "💸 Log a debt payment: <code>/pay CIM 1000</code>",
  "❓ /help — this message",
].join("\n");

Deno.serve(async (req) => {
  const webhookSecret = await secret("TELEGRAM_WEBHOOK_SECRET");
  if (webhookSecret && req.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret) {
    return new Response("forbidden", { status: 403 });
  }
  const token = await secret("TELEGRAM_BOT_TOKEN");
  if (!token) return new Response("bot not configured");

  let update: any;
  try { update = await req.json(); } catch { return new Response("ok"); }
  const msg = update.message ?? update.edited_message;
  const cbq = update.callback_query;
  const chatId = msg?.chat?.id ?? cbq?.message?.chat?.id;
  if (!chatId) return new Response("ok");
  const send = (text: string, extra: Record<string, unknown> = {}) =>
    tg(token, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra });

  const text: string = (msg?.text ?? "").trim();
  const low = text.toLowerCase();

  // Ownership: first /start claims the bot; afterwards only the owner is served.
  let owner = await secret("TELEGRAM_OWNER_CHAT");
  if (!owner) {
    if (low.startsWith("/start")) {
      await setSecret("TELEGRAM_OWNER_CHAT", String(chatId)); owner = String(chatId);
      await send("✅ Connected! This bot is now linked to your Ligemat finance account.\n\n" + HELP);
      return new Response("ok");
    }
    await send("Send /start to link this bot to the finance account.");
    return new Response("ok");
  }
  if (String(chatId) !== owner) { await send("This is a private finance bot."); return new Response("ok"); }

  // Category-fix buttons after /add
  if (cbq) {
    try {
      const parts = String(cbq.data).split(":");
      if (parts[0] === "setcat") {
        await sb.from("fin_transactions").update({ category_id: parts[2] }).eq("id", parts[1]).eq("user_id", OWNER_UID);
        await tg(token, "answerCallbackQuery", { callback_query_id: cbq.id, text: "Category updated" });
        await tg(token, "editMessageReplyMarkup", { chat_id: chatId, message_id: cbq.message.message_id, reply_markup: { inline_keyboard: [] } });
      }
    } catch { /* ignore */ }
    return new Response("ok");
  }
  if (!text) return new Response("ok");

  try {
    if (low.startsWith("/start") || low.startsWith("/help")) { await send(HELP); }
    else if (low.startsWith("/balance")) { await send(await balanceMsg()); }
    else if (low.startsWith("/summary")) { await send(await summaryMsg()); }
    else if (low.startsWith("/debts")) { await send(await debtsMsg()); }
    else if (low.startsWith("/income")) { const r = await addTx(text.slice(7).trim(), "income"); await send(r.text, r.extra); }
    else if (low.startsWith("/pay")) { await send(await payDebt(text.slice(4).trim())); }
    else if (low.startsWith("/add")) { const r = await addTx(text.slice(4).trim(), "expense"); await send(r.text, r.extra); }
    else if (text[0] >= "0" && text[0] <= "9") { const r = await addTx(text, "expense"); await send(r.text, r.extra); }
    else { await send("Not sure what you mean. Try /help."); }
  } catch (e) { await send("⚠️ Something went wrong: " + esc(String((e as Error).message))); }
  return new Response("ok");

  // ---------- helpers ----------
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
    return "📊 <b>" + now.toLocaleDateString("en-US", { month: "long", year: "numeric" }) + "</b>\n" +
      "Income: <b>" + money(inc) + "</b>\nExpenses: <b>" + money(exp) + "</b>\nNet: <b>" + money(inc - exp) + "</b>";
  }
  async function debtsMsg() {
    const { data: debts } = await sb.from("fin_debts").select("*").eq("user_id", OWNER_UID).eq("closed", false);
    const { data: pays } = await sb.from("fin_debt_payments").select("debt_id,amount_egp").eq("user_id", OWNER_UID);
    const paid: Record<string, number> = {}; for (const p of pays ?? []) paid[p.debt_id] = (paid[p.debt_id] || 0) + Number(p.amount_egp);
    const owe: string[] = [], owed: string[] = [];
    for (const d of debts ?? []) {
      const rem = Number(d.original_amount_egp) - (paid[d.id] || 0); if (rem <= 0) continue;
      const line = "• " + esc(d.name) + ": <b>" + money(rem) + "</b>" + (d.due_date ? " (due " + d.due_date + ")" : "");
      (d.direction === "i_owe" ? owe : owed).push(line);
    }
    return "🧾 <b>Debts</b>\n\n<u>I owe</u>\n" + (owe.length ? owe.join("\n") : "— nothing") +
      "\n\n<u>Owed to me</u>\n" + (owed.length ? owed.join("\n") : "— nothing");
  }
  async function addTx(rest: string, type: "income" | "expense") {
    const amount = num(rest);
    if (!(amount >= 0)) return { text: "Use e.g. <code>" + (type === "income" ? "/income 20000 salary" : "500 groceries") + "</code>", extra: {} };
    const words = rest.replace(String(rest.match(/-?\d[\d.,]*/)?.[0] ?? ""), "").trim();
    const { data: cats } = await sb.from("fin_categories").select("*").eq("user_id", OWNER_UID).eq("type", type);
    const list = cats ?? [];
    let cat = words ? list.find((c: any) => words.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(words.toLowerCase())) : null;
    if (!cat) cat = list.find((c: any) => c.name.toLowerCase() === "other") ?? list[0];
    const { data: acct } = await sb.from("fin_accounts").select("id").eq("user_id", OWNER_UID).order("sort").limit(1).maybeSingle();
    const { data: ins } = await sb.from("fin_transactions").insert({
      user_id: OWNER_UID, type, amount_egp: amount, category_id: cat?.id ?? null, account_id: acct?.id ?? null, date: todayCairo(), note: words || null,
    }).select("id").single();
    const buttons = list.slice(0, 6).map((c: any) => ({ text: c.name, callback_data: "setcat:" + (ins?.id ?? "") + ":" + c.id }));
    const rows: any[] = []; for (let i = 0; i < buttons.length; i += 3) rows.push(buttons.slice(i, i + 3));
    return {
      text: "✅ Added " + type + " <b>" + money(amount) + "</b> — " + esc(cat?.name ?? "Uncategorized") + (words ? " (" + esc(words) + ")" : "") + "\nWrong category? Tap below.",
      extra: rows.length ? { reply_markup: { inline_keyboard: rows } } : {},
    };
  }
  async function payDebt(rest: string) {
    const toks = rest.split(" ").filter(Boolean);
    const amount = parseFloat((toks[toks.length - 1] ?? "").split(",").join(""));
    const name = toks.slice(0, -1).join(" ");
    if (!name || !(amount >= 0)) return "Use: <code>/pay &lt;debt name&gt; &lt;amount&gt;</code>, e.g. <code>/pay CIM 1000</code>";
    const { data: debts } = await sb.from("fin_debts").select("*").eq("user_id", OWNER_UID).eq("closed", false);
    const debt = (debts ?? []).find((d: any) => d.name.toLowerCase().includes(name.toLowerCase()));
    if (!debt) return "No open debt matching “" + esc(name) + "”. Try /debts to see names.";
    await sb.from("fin_debt_payments").insert({ user_id: OWNER_UID, debt_id: debt.id, amount_egp: amount, date: todayCairo() });
    return "✅ Logged " + money(amount) + " payment on <b>" + esc(debt.name) + "</b>.";
  }
});
