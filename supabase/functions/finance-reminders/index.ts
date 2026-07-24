// Ligemat finance — daily debt reminders via Resend.
// Runs on a daily pg_cron schedule (service-role auth). Emails the owner when a debt
// is due in 3 days, due today, or overdue (remaining > 0, not closed, has a due_date).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const TO = Deno.env.get("REMINDER_TO") ?? "iligemat@gmail.com";
const FROM = Deno.env.get("REMINDER_FROM") ?? "Ligemat Reminders <onboarding@resend.dev>";
const REPLY_TO = Deno.env.get("REMINDER_REPLY_TO") ?? "iligemat@gmail.com";
// Low-value trigger token (only lets the scheduled job fire a reminder email; no data access).
// Baked in as a default so no secret is required; can be overridden via the FIN_CRON_TOKEN env.
const CRON_TOKEN = Deno.env.get("FIN_CRON_TOKEN") ?? "fincron_c040b3860ac1762dc98e4eb4a05a1d79";

const money = (n: number) => "£E " + Math.round(n).toLocaleString("en-US");
const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  // Guard: only the scheduled cron (which knows the low-value trigger token) may fire this.
  // The token only allows triggering a reminder email; it grants no data access.
  if (!CRON_TOKEN || req.headers.get("x-fin-cron") !== CRON_TOKEN) return new Response("forbidden", { status: 403 });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  // Resend key: prefer env secret, else read from the RLS-locked fin_secrets table (service role only).
  let resendKey = RESEND_API_KEY;
  if (!resendKey) { const { data: s } = await sb.from("fin_secrets").select("value").eq("key", "RESEND_API_KEY").maybeSingle(); resendKey = s?.value ?? ""; }

  const { data: debts, error } = await sb.from("fin_debts").select("*").eq("closed", false).not("due_date", "is", null);
  if (error) return json({ error: error.message }, 500);
  const { data: pays } = await sb.from("fin_debt_payments").select("debt_id,amount_egp");
  const paid: Record<string, number> = {};
  for (const p of pays ?? []) paid[p.debt_id] = (paid[p.debt_id] || 0) + Number(p.amount_egp);

  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" }); // YYYY-MM-DD in Cairo
  const today = Date.parse(todayStr);
  const soon: any[] = [], dueToday: any[] = [], overdue: any[] = [];
  for (const d of debts ?? []) {
    const remaining = Number(d.original_amount_egp) - (paid[d.id] || 0);
    if (remaining <= 0.005) continue;
    const days = Math.round((Date.parse(d.due_date) - today) / 86400000);
    const row = { name: d.name, remaining, due: d.due_date, dir: d.direction };
    if (days === 3) soon.push(row); else if (days === 0) dueToday.push(row); else if (days < 0) overdue.push(row);
  }
  const total = soon.length + dueToday.length + overdue.length;
  if (!total) return json({ sent: false, reason: "nothing due today" });
  // Deliver to whatever is configured: email (Resend) AND Telegram.
  const { data: tgTokRow } = await sb.from("fin_secrets").select("value").eq("key", "TELEGRAM_BOT_TOKEN").maybeSingle();
  const { data: tgChatRow } = await sb.from("fin_secrets").select("value").eq("key", "TELEGRAM_OWNER_CHAT").maybeSingle();
  const tgToken = tgTokRow?.value ?? "", tgChat = tgChatRow?.value ?? "";
  const out: any = { count: total };

  const section = (title: string, rows: any[]) => rows.length
    ? `<h3 style="margin:18px 0 6px;color:#0F6E56;font-size:15px">${title}</h3>` + rows.map((r) =>
        `<div style="padding:8px 0;border-bottom:1px solid #eee"><b>${esc(r.name)}</b> — ${money(r.remaining)} <span style="color:#666">${r.dir === "i_owe" ? "you owe" : "owed to you"} · due ${r.due}</span></div>`).join("")
    : "";
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#222">
    <div style="background:#0F6E56;color:#fff;padding:18px 22px;border-radius:12px 12px 0 0"><h2 style="margin:0;font-size:19px">Ligemat · Debt reminders</h2></div>
    <div style="padding:6px 22px 24px;border:1px solid #eee;border-top:0;border-radius:0 0 12px 12px">
      ${section("Overdue", overdue)}${section("Due today", dueToday)}${section("Due in 3 days", soon)}
      <p style="margin-top:22px"><a href="https://ligemat.com/app" style="background:#C9956A;color:#1a1206;padding:11px 20px;border-radius:9px;text-decoration:none;font-weight:bold">Open dashboard</a></p>
    </div></div>`;
  const subject = overdue.length ? `Ligemat: ${overdue.length} debt${overdue.length > 1 ? "s" : ""} overdue`
    : dueToday.length ? "Ligemat: a debt is due today" : "Ligemat: a debt is due in 3 days";

  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: TO, reply_to: REPLY_TO, subject, html }),
    });
    out.email = { sent: res.ok, status: res.status };
  } else out.email = { sent: false, reason: "no RESEND_API_KEY" };

  if (tgToken && tgChat) {
    const escTg = (s: string) => String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
    const tgSec = (t: string, rows: any[]) => rows.length
      ? `\n<b>${t}</b>\n` + rows.map((r) => `• ${escTg(r.name)} — ${money(r.remaining)} (${r.dir === "i_owe" ? "you owe" : "owed to you"}, due ${r.due})`).join("\n")
      : "";
    const tgText = `🔔 <b>Ligemat debt reminders</b>\n` + tgSec("Overdue", overdue) + tgSec("Due today", dueToday) + tgSec("Due in 3 days", soon) + `\n\nOpen: https://ligemat.com/app`;
    const r = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: tgChat, text: tgText, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    out.telegram = { sent: r.ok, status: r.status };
  } else out.telegram = { sent: false, reason: "telegram not configured" };

  return json(out, (out.email?.sent || out.telegram?.sent) ? 200 : 502);
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
