import * as D from './data.js';
import { categoryBars } from './chart.js';
const $ = (s,r=document)=>r.querySelector(s);
const egp = (n)=> new Intl.NumberFormat('en-EG',{style:'currency',currency:'EGP',maximumFractionDigits:0}).format(n||0);
const monthISO = (d)=> `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
const monthLabel = (d)=> d.toLocaleDateString('en-US',{month:'long',year:'numeric'});
const todayLocal = ()=>{ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const esc = (s)=> String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export async function renderDashboard({ logout }){
  $('#boot').hidden=true; $('#login-view').hidden=true; const view=$('#dash-view'); view.hidden=false;
  let cursor = new Date(); cursor.setDate(1);
  let cats = await D.listCategories(), accts = await D.listAccounts();

  view.innerHTML = `
    <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div><div style="color:var(--muted);font-size:13px">Cash balance</div>
        <div id="bal" style="font-size:28px;font-weight:700">—</div></div>
      <button class="btn-line btn" id="lo">Log out</button></header>
    <div class="card" style="display:flex;gap:10px;align-items:center;margin-bottom:14px">
      <button class="btn-line btn" id="pm">‹</button>
      <div id="mlabel" style="flex:1;text-align:center;font-weight:600"></div>
      <button class="btn-line btn" id="nm">›</button></div>
    <nav style="display:flex;gap:8px;margin-bottom:14px">
      ${['Overview','Add','Transactions','Budgets','Settings'].map((t,i)=>
        `<button class="btn-line btn tab" data-t="${i}">${t}</button>`).join('')}</nav>
    <div id="panel"></div>`;
  $('#lo').onclick = logout;
  $('#pm').onclick = ()=>{ cursor.setMonth(cursor.getMonth()-1); refresh(); };
  $('#nm').onclick = ()=>{ cursor.setMonth(cursor.getMonth()+1); refresh(); };
  let tab = 0;
  view.querySelectorAll('.tab').forEach(b=> b.onclick=()=>{ tab=+b.dataset.t; refresh(); });

  async function refresh(){
    $('#mlabel').textContent = monthLabel(cursor);
    $('#bal').textContent = egp(await D.cashBalance());
    const m = monthISO(cursor);
    if (tab===0) await panelOverview(m);
    else if (tab===1) panelAdd(m);
    else if (tab===2) await panelTx(m);
    else if (tab===3) await panelBudgets(m);
    else await panelSettings();
  }
  const catName = (id)=> (cats.find(c=>c.id===id)||{}).name || '—';
  const catColor = (id)=> (cats.find(c=>c.id===id)||{}).color || '#9BA8A2';

  async function panelOverview(m){
    const s = await D.monthSummary(m); const tx = await D.listTransactions(m);
    const budgets = await D.listBudgets(m);
    const spendByCat = {}; tx.filter(t=>t.type==='expense').forEach(t=>{ spendByCat[t.category_id]=(spendByCat[t.category_id]||0)+Number(t.amount_egp); });
    const bars = Object.entries(spendByCat).map(([id,v])=>({label:catName(id),value:v,color:catColor(id)}));
    const budgetRows = budgets.map(b=>{ const spent=spendByCat[b.category_id]||0; const pct=Math.min(100,Math.round(spent/Number(b.amount_egp)*100||0));
      return `<div style="margin:8px 0"><div style="display:flex;justify-content:space-between;font-size:13px"><span>${esc(catName(b.category_id))}</span> <span style="margin-left:auto">${egp(spent)} / ${egp(b.amount_egp)}</span></div>
        <div style="background:#0E1714;border-radius:6px;overflow:hidden"><div style="width:${pct}%;height:10px;background:${pct>=100?'#ff9b8a':'var(--teal-lt)'}"></div></div></div>`;}).join('') || '<p style="color:var(--muted)">No budgets set.</p>';
    $('#panel').innerHTML = `
      <div class="card" style="display:flex;gap:20px;margin-bottom:12px">
        <div><div style="color:var(--muted);font-size:12px">Income</div><div style="font-size:20px;color:var(--teal-lt)">${egp(s.income)}</div></div>
        <div><div style="color:var(--muted);font-size:12px">Expenses</div><div style="font-size:20px;color:var(--gold-lt)">${egp(s.expense)}</div></div>
        <div><div style="color:var(--muted);font-size:12px">Net</div><div style="font-size:20px">${egp(s.net)}</div></div></div>
      <div class="card" style="margin-bottom:12px"><h3>Spending by category</h3>${categoryBars(bars,{egp})}</div>
      <div class="card" style="margin-bottom:12px"><h3>Budgets</h3>${budgetRows}</div>
      <div class="card"><h3>Recent</h3>${tx.slice(0,10).map(t=>txLine(t)).join('')||'<p style="color:var(--muted)">No transactions.</p>'}</div>`;
  }
  const txLine = (t)=> `<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--line)">
    <span style="width:74px;color:var(--muted);font-size:12px">${t.date}</span>
    <span style="flex:1">${esc(catName(t.category_id))}${t.note?` · <span style="color:var(--muted)">${esc(t.note)}</span>`:''}</span>
    <span style="color:${t.type==='income'?'var(--teal-lt)':'var(--gold-lt)'}">${t.type==='income'?'+':'−'}${egp(t.amount_egp)}</span></div>`;

  function panelAdd(m){
    $('#panel').innerHTML = `<div class="card" style="max-width:440px">
      <h3>Add transaction</h3>
      <label>Type</label><select id="a-type"><option value="expense">Expense</option><option value="income">Income</option></select>
      <label>Amount (EGP)</label><input id="a-amt" type="number" min="0" step="0.01" inputmode="decimal">
      <label>Category</label><select id="a-cat"></select>
      <label>Account</label><select id="a-acc">${accts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select>
      <label>Date</label><input id="a-date" type="date" value="${todayLocal()}">
      <label>Note</label><input id="a-note" type="text">
      <div class="err" id="a-err"></div>
      <button class="btn" id="a-go" style="width:100%;margin-top:14px">Add</button></div>`;
    const fillCats=()=>{ const ty=$('#a-type').value; $('#a-cat').innerHTML=cats.filter(c=>c.type===ty).map(c=>`<option value="${c.id}">${c.name}</option>`).join(''); };
    $('#a-type').onchange=fillCats; fillCats();
    $('#a-go').onclick=async()=>{ $('#a-err').textContent='';
      const amt=parseFloat($('#a-amt').value); if(!(amt>=0)){$('#a-err').textContent='Enter an amount.';return;}
      try{ await D.addTransaction({ type:$('#a-type').value, amount_egp:amt, category_id:$('#a-cat').value, account_id:$('#a-acc').value, date:$('#a-date').value, note:$('#a-note').value||null });
        tab=0; await refresh(); }catch(e){ $('#a-err').textContent='Could not save.'; } };
  }
  async function panelTx(m){ const tx=await D.listTransactions(m);
    $('#panel').innerHTML = `<div class="card"><h3>${monthLabel(cursor)} — transactions</h3>
      ${tx.map(t=>`<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)">
        <span style="width:74px;color:var(--muted);font-size:12px">${t.date}</span>
        <span style="flex:1">${esc(catName(t.category_id))}${t.note?` · ${esc(t.note)}`:''}</span>
        <span style="color:${t.type==='income'?'var(--teal-lt)':'var(--gold-lt)'}">${t.type==='income'?'+':'−'}${egp(t.amount_egp)}</span>
        <button class="btn-line btn del" data-id="${t.id}" style="padding:4px 10px">✕</button></div>`).join('')||'<p style="color:var(--muted)">No transactions.</p>'}</div>`;
    $('#panel').querySelectorAll('.del').forEach(b=> b.onclick=async()=>{ if(confirm('Delete this transaction?')){ await D.deleteTransaction(b.dataset.id); await refresh(); } });
  }
  async function panelBudgets(m){ const budgets=await D.listBudgets(m); const bmap={}; budgets.forEach(b=>bmap[b.category_id]=b.amount_egp);
    $('#panel').innerHTML = `<div class="card"><h3>Monthly budgets — ${monthLabel(cursor)}</h3>
      ${cats.filter(c=>c.type==='expense').map(c=>`<div style="display:flex;gap:10px;align-items:center;margin:8px 0">
        <span style="flex:1">${esc(c.name)}</span>
        <input type="number" min="0" step="0.01" style="width:140px" value="${bmap[c.id]??''}" data-cat="${c.id}" placeholder="EGP"></div>`).join('')}
      <button class="btn" id="b-save" style="margin-top:12px">Save budgets</button></div>`;
    $('#b-save').onclick=async()=>{ for(const inp of $('#panel').querySelectorAll('input[data-cat]')){ const v=parseFloat(inp.value); if(v>=0) await D.upsertBudget(inp.dataset.cat,m,v); } tab=0; await refresh(); };
  }
  async function panelSettings(){ accts=await D.listAccounts(); cats=await D.listCategories();
    $('#panel').innerHTML = `<div class="card" style="margin-bottom:12px"><h3>Accounts</h3>
      ${accts.map(a=>`<div style="display:flex;gap:10px;margin:6px 0"><span style="flex:1">${esc(a.name)}</span><span style="color:var(--muted)">opening ${egp(a.opening_balance_egp)}</span></div>`).join('')}
      <label>New account name</label><input id="s-acc"><label>Opening balance (EGP)</label><input id="s-accbal" type="number" step="0.01" value="0">
      <button class="btn" id="s-accgo" style="margin-top:10px">Add account</button></div>
      <div class="card" style="margin-bottom:12px"><h3>Categories</h3>
      ${cats.map(c=>`<div style="display:flex;gap:10px;margin:6px 0"><span style="flex:1">${esc(c.name)}</span><span style="color:var(--muted)">${esc(c.type)}</span>
        <button class="btn-line btn cdel" data-id="${c.id}" style="padding:3px 9px">✕</button></div>`).join('')}
      <label>New category</label><input id="s-cat"><label>Type</label><select id="s-cattype"><option value="expense">expense</option><option value="income">income</option></select>
      <button class="btn" id="s-catgo" style="margin-top:10px">Add category</button></div>`;
    $('#s-accgo').onclick=async()=>{ if($('#s-acc').value.trim()){ await D.addAccount($('#s-acc').value.trim(), parseFloat($('#s-accbal').value)||0); await refresh(); } };
    $('#s-catgo').onclick=async()=>{ if($('#s-cat').value.trim()){ await D.addCategory($('#s-cat').value.trim(), $('#s-cattype').value, '#C9956A'); await refresh(); } };
    $('#panel').querySelectorAll('.cdel').forEach(b=> b.onclick=async()=>{ if(confirm('Delete category?')){ await D.deleteCategory(b.dataset.id); await refresh(); } });
  }
  refresh();
}
