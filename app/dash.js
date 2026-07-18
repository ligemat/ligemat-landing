import * as D from './data.js';
import { setPin } from './auth.js';
import { categoryBars } from './chart.js';

const $ = (s,r=document)=>r.querySelector(s);
const esc = (s)=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const egp = (n)=> (Number(n)<0?'-':'')+'£E '+Math.abs(Math.round(Number(n)||0)).toLocaleString('en-US');
const todayLocal = ()=>{ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const monthISO = (d)=> `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
const monthLabel = (d)=> d.toLocaleDateString('en-US',{month:'long',year:'numeric'});
const fmtDate = (s)=>{ try{ return new Date(s+'T00:00').toLocaleDateString('en-US',{day:'numeric',month:'short'}); }catch{ return s; } };

// --- icons (Lucide-style, stroke 2) ---
const I = (p,extra='')=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${p}</svg>`;
const ic = {
  overview:I('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
  tx:I('<path d="M17 4v13M17 4l-3 3M17 4l3 3M7 20V7M7 20l-3-3M7 20l3-3"/>'),
  budgets:I('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>'),
  debts:I('<path d="M12 3v18M5 7h9a3 3 0 0 1 0 6H5m0 4h10"/>'),
  settings:I('<path d="M4 6h11M4 12h7M4 18h13"/><circle cx="18" cy="6" r="2"/><circle cx="14" cy="12" r="2"/><circle cx="20" cy="18" r="2"/>'),
  plus:I('<path d="M12 5v14M5 12h14"/>'),
  close:I('<path d="M6 6l12 12M18 6L6 18"/>'),
  logout:I('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  trash:I('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>'),
  left:I('<path d="M15 18l-6-6 6-6"/>'),
  right:I('<path d="M9 18l6-6-6-6"/>'),
  up:I('<path d="M12 19V5M5 12l7-7 7 7"/>'),
  down:I('<path d="M12 5v14M5 12l7 7 7-7"/>'),
  wallet:I('<path d="M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11"/><circle cx="17" cy="13" r="1.3"/>'),
  tag:I('<path d="M20 12l-8 8-8-8V4h8z"/><circle cx="9" cy="9" r="1.3"/>'),
  empty:I('<path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7"/>'),
};

export async function renderDashboard({ logout }){
  $('#boot').hidden=true; $('#login-view').hidden=true;
  const view=$('#dash-view'); view.hidden=false;
  let cursor=new Date(); cursor.setDate(1);
  let tab='overview';
  let cats=await D.listCategories(), accts=await D.listAccounts();
  const catName=(id)=>{ const c=cats.find(x=>x.id===id); return c?c.name:'—'; };
  const catColor=(id)=>{ const c=cats.find(x=>x.id===id); return c?c.color:'#93A29B'; };

  const NAV=[['overview','Overview',ic.overview],['tx','Transactions',ic.tx],['budgets','Budgets',ic.budgets],['debts','Debts',ic.debts],['settings','Settings',ic.settings]];
  view.innerHTML=`<div class="shell">
    <div class="topbar">
      <div class="brand"><span class="mono">L</span><span>Finance</span></div>
      <div class="spacer"></div>
      <div class="bal"><span class="k">Balance</span><span class="v" id="bal">—</span></div>
      <button class="icon-btn" id="logout" aria-label="Log out">${ic.logout}</button>
    </div>
    <div class="monthbar">
      <button class="month-nav" id="pm" aria-label="Previous month">${ic.left}</button>
      <div class="lbl" id="mlabel"></div>
      <button class="month-nav" id="nm" aria-label="Next month">${ic.right}</button>
    </div>
    <nav class="nav" id="nav">${NAV.map(([k,l,i])=>`<a data-t="${k}" role="button" tabindex="0">${i}<span>${l}</span></a>`).join('')}</nav>
    <div class="content" id="panel"></div>
  </div>
  <button class="fab" id="fab" aria-label="Add transaction">${ic.plus}</button>`;

  $('#logout').onclick=logout;
  $('#pm').onclick=()=>{ cursor.setMonth(cursor.getMonth()-1); refresh(); };
  $('#nm').onclick=()=>{ cursor.setMonth(cursor.getMonth()+1); refresh(); };
  $('#fab').onclick=()=>openAddTx();
  view.querySelectorAll('#nav a').forEach(a=>{ const go=()=>{ tab=a.dataset.t; refresh(); };
    a.onclick=go; a.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();go();} }; });

  async function refresh(){
    $('#mlabel').textContent=monthLabel(cursor);
    view.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.t===tab));
    $('#fab').hidden = (tab==='settings');
    D.cashBalance().then(b=>{ $('#bal').textContent=egp(b); }).catch(()=>{});
    const m=monthISO(cursor);
    if(tab==='overview') await panelOverview(m);
    else if(tab==='tx') await panelTx(m);
    else if(tab==='budgets') await panelBudgets(m);
    else if(tab==='debts') await panelDebts();
    else await panelSettings();
  }

  // ---------- modal ----------
  function openSheet(title, body){
    const wrap=document.createElement('div'); wrap.className='scrim';
    wrap.innerHTML=`<div class="sheet"><div class="grip"></div>
      <div class="sheet-h"><h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="Close">${ic.close}</button></div>
      <div class="sheet-body"></div></div>`;
    document.body.appendChild(wrap);
    const close=()=>{ wrap.remove(); document.removeEventListener('keydown',onEsc); };
    const onEsc=(e)=>{ if(e.key==='Escape') close(); };
    document.addEventListener('keydown',onEsc);
    wrap.addEventListener('click',e=>{ if(e.target===wrap) close(); });
    wrap.querySelector('[data-close]').onclick=close;
    wrap.querySelector('.sheet-body').innerHTML=body;
    return { el:wrap.querySelector('.sheet-body'), close };
  }

  // ---------- overview ----------
  async function panelOverview(m){
    const s=await D.monthSummary(m); const tx=await D.listTransactions(m); const budgets=await D.listBudgets(m);
    const bal=await D.cashBalance();
    const spend={}; tx.filter(t=>t.type==='expense').forEach(t=>{ spend[t.category_id]=(spend[t.category_id]||0)+Number(t.amount_egp); });
    const bars=Object.entries(spend).map(([id,v])=>({label:catName(id),value:v,color:catColor(id)}));
    const budgetRows=budgets.length?budgets.map(b=>{ const sp=spend[b.category_id]||0; const pct=Math.min(100,Math.round(sp/Number(b.amount_egp)*100||0));
      const cls=pct>=100?'over':pct>=80?'warn':'';
      return `<div class="bar-row"><div class="name">${esc(catName(b.category_id))}</div>
        <div class="bar-track"><div class="bar-fill ${cls}" style="width:${pct}%"></div></div>
        <div class="amt">${egp(sp)} / ${egp(b.amount_egp)}</div></div>`; }).join('')
      : `<div class="empty">No budgets set. Add them in the Budgets tab.</div>`;
    const recent=tx.slice(0,8);
    $('#panel').innerHTML=`
      <div class="kpis">
        <div class="kpi"><span class="k">${ic.wallet} Balance</span><span class="v">${egp(bal)}</span></div>
        <div class="kpi"><span class="k">${ic.up} Income</span><span class="v pos">${egp(s.income)}</span></div>
        <div class="kpi"><span class="k">${ic.down} Expenses</span><span class="v neg">${egp(s.expense)}</span></div>
        <div class="kpi"><span class="k">Net</span><span class="v ${s.net>=0?'pos':'neg'}">${egp(s.net)}</span></div>
      </div>
      <div class="grid-2">
        <div class="card"><h3>Spending by category</h3>${categoryBars(bars,{egp})}</div>
        <div class="card"><h3>Budgets</h3>${budgetRows}</div>
      </div>
      <div class="card"><h3>Recent transactions</h3>${recent.length?recent.map(txRow).join(''):`<div class="empty">${ic.empty}<div>Nothing yet this month. Tap + to add.</div></div>`}</div>`;
  }
  const txRow=(t)=>`<div class="row">
    <div class="avatar">${t.type==='income'?ic.up:ic.down}</div>
    <div class="mid"><div class="t">${esc(catName(t.category_id))}</div><div class="s">${fmtDate(t.date)}${t.note?' · '+esc(t.note):''}</div></div>
    <div class="val ${t.type==='income'?'pos':'neg'}">${t.type==='income'?'+':'−'}${egp(t.amount_egp)}</div></div>`;

  // ---------- transactions ----------
  async function panelTx(m){
    const tx=await D.listTransactions(m);
    $('#panel').innerHTML=`<div class="card"><h3>${esc(monthLabel(cursor))}</h3>
      ${tx.length?tx.map(t=>`<div class="row">
        <div class="avatar">${t.type==='income'?ic.up:ic.down}</div>
        <div class="mid"><div class="t">${esc(catName(t.category_id))}</div><div class="s">${fmtDate(t.date)}${t.note?' · '+esc(t.note):''}</div></div>
        <div class="val ${t.type==='income'?'pos':'neg'}">${t.type==='income'?'+':'−'}${egp(t.amount_egp)}</div>
        <button class="del" data-id="${t.id}" aria-label="Delete">${ic.trash}</button></div>`).join('')
        :`<div class="empty">${ic.empty}<div>No transactions this month.</div></div>`}</div>`;
    $('#panel').querySelectorAll('.del').forEach(b=> b.onclick=async()=>{ if(confirm('Delete this transaction?')){ await D.deleteTransaction(b.dataset.id); refresh(); } });
  }

  // ---------- add transaction (sheet) ----------
  function openAddTx(){
    const exp=cats.filter(c=>c.type==='expense'), inc=cats.filter(c=>c.type==='income');
    const { el, close }=openSheet('Add transaction',`
      <div class="seg" id="ty"><button data-v="expense" class="on">Expense</button><button data-v="income">Income</button></div>
      <label>Amount (EGP)</label><input id="amt" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0">
      <label>Category</label><select id="cat"></select>
      <div class="field-row"><div><label>Account</label><select id="acc">${accts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div>
        <div><label>Date</label><input id="dt" type="date" value="${todayLocal()}"></div></div>
      <label>Note (optional)</label><input id="note" type="text" placeholder="e.g. weekly shop">
      <div class="err" id="e"></div>
      <button class="btn btn-gold btn-block" id="save" style="margin-top:16px">Add transaction</button>`);
    let type='expense';
    const fill=()=>{ const list=type==='expense'?exp:inc; el.querySelector('#cat').innerHTML=list.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join(''); };
    fill();
    el.querySelectorAll('#ty button').forEach(b=> b.onclick=()=>{ el.querySelectorAll('#ty button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); type=b.dataset.v; fill(); });
    el.querySelector('#save').onclick=async()=>{ el.querySelector('#e').textContent='';
      const amt=parseFloat(el.querySelector('#amt').value); if(!(amt>=0)){ el.querySelector('#e').textContent='Enter an amount.'; return; }
      try{ await D.addTransaction({ type, amount_egp:amt, category_id:el.querySelector('#cat').value, account_id:el.querySelector('#acc').value, date:el.querySelector('#dt').value, note:el.querySelector('#note').value||null });
        close(); tab='overview'; refresh(); }catch(err){ el.querySelector('#e').textContent='Could not save.'; } };
  }

  // ---------- budgets ----------
  async function panelBudgets(m){
    const budgets=await D.listBudgets(m); const bmap={}; budgets.forEach(b=>bmap[b.category_id]=b.amount_egp);
    const exp=cats.filter(c=>c.type==='expense');
    $('#panel').innerHTML=`<div class="card"><h3>Monthly budgets — ${esc(monthLabel(cursor))}</h3>
      ${exp.map(c=>`<div class="row"><div class="mid"><div class="t">${esc(c.name)}</div></div>
        <input type="number" inputmode="decimal" min="0" step="0.01" data-cat="${c.id}" value="${bmap[c.id]!=null?bmap[c.id]:''}" placeholder="No budget" style="max-width:150px"></div>`).join('')}
      <button class="btn btn-gold btn-block" id="bsave" style="margin-top:14px">Save budgets</button></div>`;
    $('#bsave').onclick=async()=>{ for(const inp of $('#panel').querySelectorAll('input[data-cat]')){ const v=parseFloat(inp.value); if(v>=0) await D.upsertBudget(inp.dataset.cat,m,v); } tab='overview'; refresh(); };
  }

  // ---------- debts ----------
  async function panelDebts(){
    const { rows, totals }=await D.debtsSummary();
    const owe=rows.filter(d=>d.direction==='i_owe'), owed=rows.filter(d=>d.direction==='owed_to_me');
    const debtCard=(d)=>{ const pct=d.original_amount_egp>0?Math.min(100,Math.round(d.paid/Number(d.original_amount_egp)*100)):0;
      return `<div class="debt">
        <div class="top"><span class="nm">${esc(d.name)}${d.closed?' <span class="s" style="color:var(--faint)">· closed</span>':''}</span><span class="rem">${egp(d.remaining)}</span></div>
        <div class="meta">${egp(d.paid)} paid of ${egp(d.original_amount_egp)}${d.note?' · '+esc(d.note):''}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <div class="actions"><button class="btn btn-line btn-sm" data-pay="${d.id}">Add payment</button>
          <button class="btn btn-line btn-sm" data-hist="${d.id}">History</button>
          <button class="btn btn-line btn-sm btn-danger" data-del="${d.id}" style="margin-left:auto">${ic.trash}</button></div></div>`; };
    $('#panel').innerHTML=`
      <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
        <div class="kpi"><span class="k">I owe</span><span class="v neg">${egp(totals.owe)}</span></div>
        <div class="kpi"><span class="k">Owed to me</span><span class="v pos">${egp(totals.owed)}</span></div>
        <div class="kpi"><span class="k">Net</span><span class="v ${totals.net>=0?'pos':'neg'}">${egp(totals.net)}</span></div>
      </div>
      <div class="debt-group-h"><span class="section-t">I owe</span><button class="btn btn-line btn-sm" data-add="i_owe">${ic.plus} Add</button></div>
      ${owe.length?owe.map(debtCard).join(''):`<div class="empty">Nothing you owe. Nice.</div>`}
      <div class="debt-group-h" style="margin-top:8px"><span class="section-t">Owed to me</span><button class="btn btn-line btn-sm" data-add="owed_to_me">${ic.plus} Add</button></div>
      ${owed.length?owed.map(debtCard).join(''):`<div class="empty">No one owes you right now.</div>`}`;
    $('#panel').querySelectorAll('[data-add]').forEach(b=> b.onclick=()=>openAddDebt(b.dataset.add));
    $('#panel').querySelectorAll('[data-pay]').forEach(b=> b.onclick=()=>openAddPayment(b.dataset.pay));
    $('#panel').querySelectorAll('[data-hist]').forEach(b=> b.onclick=()=>openHistory(b.dataset.hist));
    $('#panel').querySelectorAll('[data-del]').forEach(b=> b.onclick=async()=>{ if(confirm('Delete this debt and its payment history?')){ await D.deleteDebt(b.dataset.del); refresh(); } });
  }
  function openAddDebt(direction){
    const { el, close }=openSheet(direction==='i_owe'?'Add something I owe':'Add money owed to me',`
      <label>Name</label><input id="nm" type="text" placeholder="${direction==='i_owe'?'e.g. Car installment':'e.g. Loan to Ahmed'}">
      <label>Total amount (EGP)</label><input id="amt" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0">
      <label>Note (optional)</label><input id="note" type="text">
      <div class="err" id="e"></div>
      <button class="btn btn-gold btn-block" id="save" style="margin-top:16px">Save</button>`);
    el.querySelector('#save').onclick=async()=>{ el.querySelector('#e').textContent='';
      const nm=el.querySelector('#nm').value.trim(), amt=parseFloat(el.querySelector('#amt').value);
      if(!nm){ el.querySelector('#e').textContent='Enter a name.'; return; }
      if(!(amt>=0)){ el.querySelector('#e').textContent='Enter an amount.'; return; }
      try{ await D.addDebt(nm,direction,amt,el.querySelector('#note').value||null); close(); refresh(); }
      catch(err){ el.querySelector('#e').textContent='Could not save.'; } };
  }
  function openAddPayment(debtId){
    const { el, close }=openSheet('Add payment',`
      <label>Amount (EGP)</label><input id="amt" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0">
      <label>Date</label><input id="dt" type="date" value="${todayLocal()}">
      <label>Note (optional)</label><input id="note" type="text">
      <div class="err" id="e"></div>
      <button class="btn btn-gold btn-block" id="save" style="margin-top:16px">Record payment</button>`);
    el.querySelector('#save').onclick=async()=>{ el.querySelector('#e').textContent='';
      const amt=parseFloat(el.querySelector('#amt').value); if(!(amt>=0)){ el.querySelector('#e').textContent='Enter an amount.'; return; }
      try{ await D.addDebtPayment(debtId,amt,el.querySelector('#dt').value,el.querySelector('#note').value||null); close(); refresh(); }
      catch(err){ el.querySelector('#e').textContent='Could not save.'; } };
  }
  async function openHistory(debtId){
    const pays=await D.listDebtPayments(debtId);
    const { el }=openSheet('Payment history', pays.length?pays.map(p=>`<div class="row">
      <div class="mid"><div class="t">${egp(p.amount_egp)}</div><div class="s">${fmtDate(p.date)}${p.note?' · '+esc(p.note):''}</div></div>
      <button class="del" data-id="${p.id}" aria-label="Delete">${ic.trash}</button></div>`).join(''):`<div class="empty">No payments logged yet.</div>`);
    el.querySelectorAll('.del').forEach(b=> b.onclick=async()=>{ await D.deleteDebtPayment(b.dataset.id); b.closest('.row').remove(); refresh(); });
  }

  // ---------- settings ----------
  async function panelSettings(){
    accts=await D.listAccounts(); cats=await D.listCategories();
    $('#panel').innerHTML=`
      <div class="card"><h3>Accounts</h3>
        ${accts.map(a=>`<div class="row"><div class="mid"><div class="t">${esc(a.name)}</div><div class="s">Opening ${egp(a.opening_balance_egp)}</div></div></div>`).join('')}
        <div class="field-row" style="margin-top:8px"><input id="an" placeholder="New account name"><input id="ab" type="number" inputmode="decimal" placeholder="Opening bal" style="max-width:130px"></div>
        <button class="btn btn-line btn-sm" id="aadd" style="margin-top:10px">${ic.plus} Add account</button></div>
      <div class="card"><h3>Categories</h3>
        ${cats.map(c=>`<div class="row"><div class="avatar" style="background:${c.color}22;color:${c.color}">${ic.tag}</div>
          <div class="mid"><div class="t">${esc(c.name)}</div><div class="s">${c.type}</div></div>
          <button class="del" data-cid="${c.id}" aria-label="Delete">${ic.trash}</button></div>`).join('')}
        <div class="field-row" style="margin-top:8px"><input id="cn" placeholder="New category"><select id="ct" style="max-width:130px"><option value="expense">Expense</option><option value="income">Income</option></select></div>
        <button class="btn btn-line btn-sm" id="cadd" style="margin-top:10px">${ic.plus} Add category</button></div>
      <div class="card"><h3>Security</h3>
        <label>Change device PIN</label><input id="pin" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" placeholder="New 4-digit PIN" style="max-width:180px">
        <button class="btn btn-line btn-sm" id="psave" style="margin-top:10px;display:block">Update PIN</button>
        <div class="err" id="pe"></div></div>`;
    $('#aadd').onclick=async()=>{ const n=$('#an').value.trim(); if(n){ await D.addAccount(n,parseFloat($('#ab').value)||0); refresh(); } };
    $('#cadd').onclick=async()=>{ const n=$('#cn').value.trim(); if(n){ await D.addCategory(n,$('#ct').value,'#C9956A'); refresh(); } };
    $('#panel').querySelectorAll('[data-cid]').forEach(b=> b.onclick=async()=>{ if(confirm('Delete category?')){ await D.deleteCategory(b.dataset.cid); refresh(); } });
    $('#psave').onclick=async()=>{ const p=$('#pin').value; $('#pe').textContent=''; if(!/^\d{4}$/.test(p)){ $('#pe').textContent='PIN must be 4 digits.'; return; }
      try{ await setPin(p); $('#pe').style.color='var(--pos)'; $('#pe').textContent='PIN updated on this device.'; $('#pin').value=''; }catch(err){ $('#pe').textContent='Could not update PIN.'; } };
  }

  refresh();
}
