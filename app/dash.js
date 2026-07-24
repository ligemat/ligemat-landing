import * as D from './data.js';
import { setPin } from './auth.js';
import { categoryBars } from './chart.js';

const $ = (s,r=document)=>r.querySelector(s);
const esc = (s)=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const egp = (n)=> (Number(n)<0?'-':'')+'£E '+Math.abs(Math.round(Number(n)||0)).toLocaleString('en-US');
const pad2=(n)=>String(n).padStart(2,'0');
const todayLocal = ()=>{ const d=new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
const monthISO = (d)=> `${d.getFullYear()}-${pad2(d.getMonth()+1)}-01`;
const monthLabel = (d)=> d.toLocaleDateString('en-US',{month:'long',year:'numeric'});
const fmtDate = (s)=>{ try{ return new Date(s+'T00:00').toLocaleDateString('en-US',{day:'numeric',month:'short'}); }catch{ return s; } };
const fmtFull = (s)=>{ try{ return new Date(s+'T00:00').toLocaleDateString('en-US',{weekday:'short',day:'numeric',month:'short',year:'numeric'}); }catch{ return s; } };
const daysBetween=(a,b)=> Math.round((new Date(b+'T00:00')-new Date(a+'T00:00'))/864e5);

// Wrap every number input under `root` with − / + buttons that bump its value.
function upgradeSteppers(root){
  root.querySelectorAll('input[type="number"]:not([data-stepped])').forEach(inp=>{
    inp.setAttribute('data-stepped','1');
    const step=parseFloat(inp.getAttribute('data-step')||'50');
    const minAttr=inp.getAttribute('min');
    const min=(minAttr!==null&&minAttr!=='')?parseFloat(minAttr):-Infinity;
    const wrap=document.createElement('div'); wrap.className='stepper';
    inp.parentNode.insertBefore(wrap,inp);
    const mk=(t)=>{ const b=document.createElement('button'); b.type='button'; b.className='sb'; b.setAttribute('aria-label',t==='+'?'increase':'decrease'); b.textContent=t; return b; };
    const minus=mk('−'), plus=mk('+');
    wrap.appendChild(minus); wrap.appendChild(inp); wrap.appendChild(plus);
    const bump=(d)=>{ let v=parseFloat(inp.value); if(isNaN(v))v=0; v=Math.max(min,Math.round((v+d)*100)/100); inp.value=v; inp.dispatchEvent(new Event('input',{bubbles:true})); };
    minus.onclick=()=>bump(-step); plus.onclick=()=>bump(step);
  });
}

const I = (p)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ic = {
  overview:I('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
  tx:I('<path d="M17 4v13M17 4l-3 3M17 4l3 3M7 20V7M7 20l-3-3M7 20l3-3"/>'),
  calendar:I('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>'),
  budgets:I('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>'),
  debts:I('<path d="M12 3v18M5 7h9a3 3 0 0 1 0 6H5m0 4h10"/>'),
  summary:I('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>'),
  settings:I('<path d="M4 6h11M4 12h7M4 18h13"/><circle cx="18" cy="6" r="2"/><circle cx="14" cy="12" r="2"/><circle cx="20" cy="18" r="2"/>'),
  bell:I('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>'),
  plus:I('<path d="M12 5v14M5 12h14"/>'),
  close:I('<path d="M6 6l12 12M18 6L6 18"/>'),
  logout:I('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  trash:I('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>'),
  edit:I('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  left:I('<path d="M15 18l-6-6 6-6"/>'), right:I('<path d="M9 18l6-6-6-6"/>'),
  up:I('<path d="M12 19V5M5 12l7-7 7 7"/>'), down:I('<path d="M12 5v14M5 12l7 7 7-7"/>'),
  wallet:I('<path d="M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11"/><circle cx="17" cy="13" r="1.3"/>'),
  tag:I('<path d="M20 12l-8 8-8-8V4h8z"/><circle cx="9" cy="9" r="1.3"/>'),
  download:I('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
  clock:I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  empty:I('<path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7"/>'),
  chevron:I('<path d="M9 18l6-6-6-6"/>'),
};

let _pdf;
function loadJsPDF(){ if(_pdf) return _pdf; _pdf=new Promise((res,rej)=>{ const s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js'; s.onload=()=>res(window.jspdf.jsPDF); s.onerror=()=>rej(new Error('pdf')); document.head.appendChild(s); }); return _pdf; }

export async function renderDashboard({ logout }){
  $('#boot').hidden=true; $('#login-view').hidden=true;
  const view=$('#dash-view'); view.hidden=false;
  let cursor=new Date(); cursor.setDate(1);
  let tab='overview';
  let txFilter='all';
  let cats=await D.listCategories(), accts=await D.listAccounts();
  const catName=(id)=>{ const c=cats.find(x=>x.id===id); return c?c.name:'—'; };
  const catColor=(id)=>{ const c=cats.find(x=>x.id===id); return c?c.color:'#93A29B'; };

  const NAV=[['overview','Overview',ic.overview],['balance','Balance',ic.wallet],['tx','Transactions',ic.tx],['calendar','Calendar',ic.calendar],['debts','Debts',ic.debts],['summary','Summary',ic.summary]];
  view.innerHTML=`<div class="shell">
    <div class="topbar">
      <div class="brand"><span class="mono">L</span><span>Finance</span></div>
      <div class="spacer"></div>
      <div class="bal"><span class="k">Balance</span><span class="v" id="bal">—</span></div>
      <button class="icon-btn" id="bell" aria-label="Reminders" style="position:relative">${ic.bell}<span id="bellbadge" hidden style="position:absolute;top:-4px;right:-4px;min-width:17px;height:17px;padding:0 4px;border-radius:9px;background:var(--danger);color:#160a08;font-size:10px;font-weight:700;display:grid;place-items:center"></span></button>
      <button class="icon-btn" id="gear" aria-label="Settings">${ic.settings}</button>
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
  $('#gear').onclick=()=>{ tab='settings'; refresh(); };
  $('#bell').onclick=openReminders;
  $('#pm').onclick=()=>{ cursor.setMonth(cursor.getMonth()-1); refresh(); };
  $('#nm').onclick=()=>{ cursor.setMonth(cursor.getMonth()+1); refresh(); };
  $('#fab').onclick=()=>openAddTx();
  view.querySelectorAll('#nav a').forEach(a=>{ const go=()=>{ tab=a.dataset.t; if(tab!=='tx')txFilter='all'; refresh(); };
    a.onclick=go; a.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();go();} }; });

  updateReminders();

  async function refresh(){
    $('#mlabel').textContent=monthLabel(cursor);
    view.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.t===tab));
    $('#fab').hidden = (tab==='settings'||tab==='summary'||tab==='balance');
    D.cashBalance().then(b=>{ $('#bal').textContent=egp(b); }).catch(()=>{});
    const m=monthISO(cursor);
    if(tab==='overview') await panelOverview(m);
    else if(tab==='balance') await panelBalance();
    else if(tab==='tx') await panelTx(m);
    else if(tab==='calendar') await panelCalendar();
    else if(tab==='debts') await panelDebts();
    else if(tab==='summary') await panelSummary();
    else await panelSettings();
  }

  // ---------- reminders ----------
  let _reminders=[];
  async function updateReminders(){
    try{ const { rows }=await D.debtsSummary(); const t=todayLocal(); const out=[];
      for(const d of rows){ if(d.closed||d.remaining<=0||!d.due_date) continue;
        const dd=daysBetween(t,d.due_date);
        if(dd<0) out.push({level:'overdue',debt:d,days:dd,text:`${d.name} — ${egp(d.remaining)} overdue by ${-dd} day${-dd===1?'':'s'}`});
        else if(dd<=7) out.push({level:'soon',debt:d,days:dd,text:`${d.name} — ${egp(d.remaining)} due ${dd===0?'today':'in '+dd+' day'+(dd===1?'':'s')}`});
      }
      out.sort((a,b)=>a.days-b.days); _reminders=out;
      const badge=$('#bellbadge'); if(out.length){ badge.hidden=false; badge.textContent=out.length; } else badge.hidden=true;
    }catch{}
  }
  function openReminders(){
    const body=_reminders.length? _reminders.map(r=>`<div class="row">
      <div class="avatar" style="color:${r.level==='overdue'?'var(--danger)':'var(--gold-lt)'}">${ic.clock}</div>
      <div class="mid"><div class="t">${esc(r.debt.name)}</div><div class="s">${r.level==='overdue'?'Overdue by '+(-r.days)+'d':(r.days===0?'Due today':'Due in '+r.days+'d')} · due ${fmtDate(r.debt.due_date)}</div></div>
      <div class="val ${r.level==='overdue'?'neg':''}">${egp(r.debt.remaining)}</div></div>`).join('')
      : `<div class="empty">${ic.bell}<div>No upcoming or overdue debts. You're clear.</div></div>`;
    openSheet('Reminders', body+`<p class="s" style="color:var(--faint);font-size:12px;margin-top:12px">Shows debts due within 7 days or overdue. Add a due date to a debt to get reminded.</p>`);
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
    const bodyEl=wrap.querySelector('.sheet-body');
    bodyEl.innerHTML=body; upgradeSteppers(bodyEl);
    return { el:bodyEl, close };
  }

  // ---------- overview ----------
  async function panelOverview(m){
    const s=await D.monthSummary(m); const tx=await D.listTransactions(m); const budgets=await D.listBudgets(m); const bal=await D.cashBalance();
    const spend={}; tx.filter(t=>t.type==='expense').forEach(t=>{ spend[t.category_id]=(spend[t.category_id]||0)+Number(t.amount_egp); });
    const bars=Object.entries(spend).map(([id,v])=>({label:catName(id),value:v,color:catColor(id),id}));
    const budgetRows=budgets.length?budgets.map(b=>{ const sp=spend[b.category_id]||0; const pct=Math.min(100,Math.round(sp/Number(b.amount_egp)*100||0)); const cls=pct>=100?'over':pct>=80?'warn':'';
      return `<div class="bar-row"><div class="name">${esc(catName(b.category_id))}</div><div class="bar-track"><div class="bar-fill ${cls}" style="width:${pct}%"></div></div><div class="amt">${egp(sp)} / ${egp(b.amount_egp)}</div></div>`; }).join('')
      : `<div class="empty">No budgets set yet.</div>`;
    const recent=tx.slice(0,8);
    $('#panel').innerHTML=`
      <div class="kpis">
        <div class="kpi" data-jump="bal" style="cursor:pointer"><span class="k">${ic.wallet} Balance</span><span class="v">${egp(bal)}</span></div>
        <div class="kpi" data-jump="income" style="cursor:pointer"><span class="k">${ic.up} Income</span><span class="v pos">${egp(s.income)}</span></div>
        <div class="kpi" data-jump="expense" style="cursor:pointer"><span class="k">${ic.down} Expenses</span><span class="v neg">${egp(s.expense)}</span></div>
        <div class="kpi" data-jump="net" style="cursor:pointer"><span class="k">Net</span><span class="v ${s.net>=0?'pos':'neg'}">${egp(s.net)}</span></div>
      </div>
      <div class="grid-2">
        <div class="card"><h3>Spending by category</h3><div id="catbars">${categoryBars(bars,{egp})}</div></div>
        <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="margin:0">Budgets</h3><button class="btn btn-line btn-sm" id="editbudgets" style="min-height:32px;padding:6px 12px">${ic.edit} Edit</button></div>${budgetRows}</div>
      </div>
      <div class="card"><h3>Recent transactions</h3><div id="recent">${recent.length?recent.map(txRow).join(''):`<div class="empty">${ic.empty}<div>Nothing yet this month. Tap + to add.</div></div>`}</div></div>`;
    $('#panel').querySelector('[data-jump="income"]').onclick=()=>{ txFilter='income'; tab='tx'; refresh(); };
    $('#panel').querySelector('[data-jump="expense"]').onclick=()=>{ txFilter='expense'; tab='tx'; refresh(); };
    $('#panel').querySelector('[data-jump="net"]').onclick=()=>{ txFilter='all'; tab='tx'; refresh(); };
    $('#panel').querySelector('[data-jump="bal"]').onclick=()=>{ tab='balance'; refresh(); };
    $('#panel').querySelectorAll('#catbars .bar-row').forEach((el,i)=>{ const b=bars.filter(x=>x.value>0).sort((a,c)=>c.value-a.value)[i]; if(b){ el.style.cursor='pointer'; el.onclick=()=>openCategory(b.id,m); } });
    { const eb=$('#panel').querySelector('#editbudgets'); if(eb) eb.onclick=openBudgets; }
    bindTxRows('#recent', tx);
  }
  const txRow=(t)=>`<div class="row" data-tx="${t.id}" style="cursor:pointer">
    <div class="avatar">${t.type==='income'?ic.up:ic.down}</div>
    <div class="mid"><div class="t">${esc(catName(t.category_id))}</div><div class="s">${fmtDate(t.date)}${t.note?' · '+esc(t.note):''}</div></div>
    <div class="val ${t.type==='income'?'pos':'neg'}">${t.type==='income'?'+':'−'}${egp(t.amount_egp)}</div>
    <span class="row-chev" style="color:var(--faint);width:18px">${ic.chevron}</span></div>`;
  function bindTxRows(sel, list){ $('#panel').querySelectorAll(sel+' [data-tx]').forEach(el=>{ const t=list.find(x=>x.id===el.dataset.tx); if(t) el.onclick=()=>openEditTx(t); }); }

  async function panelBalance(){
    const { rows, unassigned, total }=await D.accountBalances();
    $('#panel').innerHTML=`
      <div class="kpi"><span class="k">${ic.wallet} Total cash balance</span><span class="v" style="font-size:26px">${egp(total)}</span></div>
      <div class="card"><h3>Accounts</h3>
        ${rows.length?rows.map(a=>`<div class="row" data-acc="${a.id}" style="cursor:pointer">
          <div class="avatar">${ic.wallet}</div>
          <div class="mid"><div class="t">${esc(a.name)}</div><div class="s">Opening ${egp(a.opening)}</div></div>
          <div class="val ${a.balance>=0?'pos':'neg'}">${egp(a.balance)}</div>
          <span class="row-chev" style="color:var(--faint);width:18px">${ic.chevron}</span></div>`).join('')
          :`<div class="empty">${ic.wallet}<div>No accounts yet. Add one below.</div></div>`}
        ${Math.abs(unassigned)>=1?`<div class="row"><div class="avatar">${ic.wallet}</div><div class="mid"><div class="t">Unassigned</div><div class="s">transactions with no account</div></div><div class="val ${unassigned>=0?'pos':'neg'}">${egp(unassigned)}</div></div>`:''}
        <button class="btn btn-gold btn-block" id="addacc" style="margin-top:12px">${ic.plus} Add account</button></div>
      <p class="s" style="color:var(--faint);font-size:12px;margin:0 2px">Tap an account to rename it, change its opening balance, or delete it. Each balance = opening + income − expenses.</p>`;
    $('#addacc').onclick=openAddAccount;
    $('#panel').querySelectorAll('[data-acc]').forEach(el=>{ const a=rows.find(x=>x.id===el.dataset.acc); if(a) el.onclick=()=>openEditAccount(a); });
  }
  function openAddAccount(){
    const { el, close }=openSheet('Add account',`
      <label>Account name</label><input id="nm" type="text" placeholder="e.g. Bank, Cash, Wallet">
      <label>Opening balance (EGP)</label><input id="ob" type="number" inputmode="decimal" step="0.01" value="0">
      <div class="err" id="e"></div>
      <button class="btn btn-gold btn-block" id="save" style="margin-top:16px">Add account</button>`);
    el.querySelector('#save').onclick=async()=>{ const nm=el.querySelector('#nm').value.trim(); if(!nm){ el.querySelector('#e').textContent='Enter a name.'; return; }
      try{ await D.addAccount(nm, parseFloat(el.querySelector('#ob').value)||0); close(); refresh(); }catch(err){ el.querySelector('#e').textContent='Could not save.'; } };
  }
  function openEditAccount(a){
    const { el, close }=openSheet('Edit account',`
      <label>Account name</label><input id="nm" type="text" value="${esc(a.name)}">
      <label>Opening balance (EGP)</label><input id="ob" type="number" inputmode="decimal" step="0.01" value="${a.opening}">
      <div class="s" style="color:var(--faint);font-size:12px;margin-top:6px">Current balance ${egp(a.balance)} = opening + this account's transactions.</div>
      <div class="err" id="e"></div>
      <div class="field-row" style="margin-top:16px"><button class="btn btn-line btn-danger" id="del">${ic.trash} Delete</button><button class="btn btn-gold" id="save">Save changes</button></div>`);
    el.querySelector('#del').onclick=async()=>{ if(confirm('Delete this account? Its transactions stay but become unassigned.')){ await D.deleteAccount(a.id); close(); refresh(); } };
    el.querySelector('#save').onclick=async()=>{ const nm=el.querySelector('#nm').value.trim(); if(!nm){ el.querySelector('#e').textContent='Enter a name.'; return; }
      try{ await D.updateAccount(a.id,{ name:nm, opening_balance_egp: parseFloat(el.querySelector('#ob').value)||0 }); close(); refresh(); }catch(err){ el.querySelector('#e').textContent='Could not save.'; } };
  }
  async function openBudgets(){
    const m=monthISO(cursor);
    const budgets=await D.listBudgets(m); const bmap={}; budgets.forEach(b=>bmap[b.category_id]=b.amount_egp);
    const exp=cats.filter(c=>c.type==='expense');
    const { el, close }=openSheet('Monthly budgets — '+monthLabel(cursor),
      (exp.length?exp.map(c=>`<label>${esc(c.name)}</label><input type="number" inputmode="decimal" min="0" step="0.01" data-cat="${c.id}" data-step="100" value="${bmap[c.id]!=null?bmap[c.id]:''}" placeholder="No budget">`).join('')
        :`<div class="empty">Add expense categories first (Settings).</div>`)
      + `<div class="err" id="e"></div><button class="btn btn-gold btn-block" id="save" style="margin-top:16px">Save budgets</button>`);
    el.querySelector('#save').onclick=async()=>{ for(const inp of el.querySelectorAll('input[data-cat]')){ const v=parseFloat(inp.value); if(v>=0) await D.upsertBudget(inp.dataset.cat,m,v); } close(); tab='overview'; refresh(); };
  }
  async function openCategory(catId,m){ const tx=(await D.listTransactions(m)).filter(t=>t.category_id===catId);
    const total=tx.reduce((s,t)=>s+Number(t.amount_egp),0);
    openSheet(catName(catId)+' — '+monthLabel(cursor), `<div class="kpi" style="margin-bottom:10px"><span class="k">Total</span><span class="v">${egp(total)}</span></div>`+
      (tx.length?tx.map(t=>`<div class="row"><div class="avatar">${t.type==='income'?ic.up:ic.down}</div><div class="mid"><div class="t">${fmtDate(t.date)}</div><div class="s">${t.note?esc(t.note):''}</div></div><div class="val ${t.type==='income'?'pos':'neg'}">${egp(t.amount_egp)}</div></div>`).join(''):`<div class="empty">No transactions.</div>`)); }

  // ---------- transactions ----------
  async function panelTx(m){
    const all=await D.listTransactions(m);
    const tx=txFilter==='all'?all:all.filter(t=>t.type===txFilter);
    $('#panel').innerHTML=`
      <div class="seg" id="tf" style="margin-bottom:4px">
        <button data-f="all" class="${txFilter==='all'?'on':''}">All</button>
        <button data-f="income" class="${txFilter==='income'?'on':''}">Income</button>
        <button data-f="expense" class="${txFilter==='expense'?'on':''}">Expenses</button></div>
      <div class="card"><h3>${esc(monthLabel(cursor))} · ${tx.length} item${tx.length===1?'':'s'}</h3><div id="txlist">
      ${tx.length?tx.map(txRow).join(''):`<div class="empty">${ic.empty}<div>No transactions.</div></div>`}</div></div>`;
    $('#panel').querySelectorAll('#tf button').forEach(b=> b.onclick=()=>{ txFilter=b.dataset.f; refresh(); });
    bindTxRows('#txlist', tx);
  }
  function openEditTx(t){
    const exp=cats.filter(c=>c.type==='expense'), inc=cats.filter(c=>c.type==='income');
    const list=t.type==='expense'?exp:inc;
    const { el, close }=openSheet('Edit transaction',`
      <div class="seg" id="ty"><button data-v="expense" class="${t.type==='expense'?'on':''}">Expense</button><button data-v="income" class="${t.type==='income'?'on':''}">Income</button></div>
      <label>Amount (EGP)</label><input id="amt" type="number" inputmode="decimal" min="0" step="0.01" value="${t.amount_egp}">
      <label>Category</label><select id="cat"></select>
      <div class="field-row"><div><label>Account</label><select id="acc">${accts.map(a=>`<option value="${a.id}" ${a.id===t.account_id?'selected':''}>${esc(a.name)}</option>`).join('')}</select></div>
        <div><label>Date</label><input id="dt" type="date" value="${t.date}"></div></div>
      <label>Note</label><input id="note" type="text" value="${t.note?esc(t.note):''}">
      <div class="err" id="e"></div>
      <div class="field-row" style="margin-top:16px"><button class="btn btn-line btn-danger" id="del">${ic.trash} Delete</button><button class="btn btn-gold" id="save">Save changes</button></div>`);
    let type=t.type;
    const fill=()=>{ const l=type==='expense'?exp:inc; el.querySelector('#cat').innerHTML=l.map(c=>`<option value="${c.id}" ${c.id===t.category_id?'selected':''}>${esc(c.name)}</option>`).join(''); };
    fill();
    el.querySelectorAll('#ty button').forEach(b=> b.onclick=()=>{ el.querySelectorAll('#ty button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); type=b.dataset.v; fill(); });
    el.querySelector('#del').onclick=async()=>{ if(confirm('Delete this transaction?')){ await D.deleteTransaction(t.id); close(); refresh(); } };
    el.querySelector('#save').onclick=async()=>{ el.querySelector('#e').textContent='';
      const amt=parseFloat(el.querySelector('#amt').value); if(!(amt>=0)){ el.querySelector('#e').textContent='Enter an amount.'; return; }
      try{ await D.updateTransaction(t.id,{ type, amount_egp:amt, category_id:el.querySelector('#cat').value, account_id:el.querySelector('#acc').value, date:el.querySelector('#dt').value, note:el.querySelector('#note').value||null }); close(); refresh(); }
      catch(err){ el.querySelector('#e').textContent='Could not save.'; } };
  }
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
    const fill=()=>{ const l=type==='expense'?exp:inc; el.querySelector('#cat').innerHTML=l.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join(''); };
    fill();
    el.querySelectorAll('#ty button').forEach(b=> b.onclick=()=>{ el.querySelectorAll('#ty button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); type=b.dataset.v; fill(); });
    el.querySelector('#save').onclick=async()=>{ el.querySelector('#e').textContent='';
      const amt=parseFloat(el.querySelector('#amt').value); if(!(amt>=0)){ el.querySelector('#e').textContent='Enter an amount.'; return; }
      try{ await D.addTransaction({ type, amount_egp:amt, category_id:el.querySelector('#cat').value, account_id:el.querySelector('#acc').value, date:el.querySelector('#dt').value, note:el.querySelector('#note').value||null }); close(); tab='overview'; refresh(); }
      catch(err){ el.querySelector('#e').textContent='Could not save.'; } };
  }

  // ---------- calendar ----------
  async function panelCalendar(){
    const m=monthISO(cursor); const tx=await D.listTransactions(m); const { rows }=await D.debtsSummary();
    const y=cursor.getFullYear(), mo=cursor.getMonth();
    const startDow=new Date(y,mo,1).getDay(); const nDays=new Date(y,mo+1,0).getDate();
    const byDay={}; tx.forEach(t=>{ (byDay[t.date]=byDay[t.date]||{inc:0,exp:0,items:[]}); if(t.type==='income')byDay[t.date].inc+=Number(t.amount_egp); else byDay[t.date].exp+=Number(t.amount_egp); byDay[t.date].items.push(t); });
    const dueBy={}; rows.forEach(d=>{ if(d.due_date&&d.due_date.slice(0,7)===`${y}-${pad2(mo+1)}`&&!d.closed&&d.remaining>0){ (dueBy[d.due_date]=dueBy[d.due_date]||[]).push(d); } });
    const dow=['S','M','T','W','T','F','S'];
    let cells='';
    for(let i=0;i<startDow;i++) cells+=`<div class="cal-cell empty-cell"></div>`;
    for(let d=1;d<=nDays;d++){ const key=`${y}-${pad2(mo+1)}-${pad2(d)}`; const day=byDay[key]; const due=dueBy[key];
      const isToday=key===todayLocal();
      cells+=`<div class="cal-cell${isToday?' today':''}" data-day="${key}">
        <span class="dn">${d}</span>
        <span class="dots">${day&&day.exp?'<i class="dot exp"></i>':''}${day&&day.inc?'<i class="dot inc"></i>':''}${due?'<i class="dot due"></i>':''}</span></div>`; }
    $('#panel').innerHTML=`
      <style>
        .cal{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}
        .cal-h{text-align:center;font-size:11px;color:var(--faint);padding:2px 0}
        .cal-cell{aspect-ratio:1;border:1px solid var(--line-2);border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;background:var(--panel);transition:border-color .15s}
        .cal-cell.empty-cell{border:0;background:transparent;cursor:default}
        .cal-cell:hover{border-color:var(--gold)} .cal-cell.today{border-color:var(--gold-lt);background:rgba(201,149,106,.08)}
        .cal-cell .dn{font-size:13px;font-weight:500} .dots{display:flex;gap:3px;height:6px}
        .dot{width:6px;height:6px;border-radius:50%} .dot.exp{background:var(--neg)} .dot.inc{background:var(--pos)} .dot.due{background:var(--gold-lt)}
      </style>
      <div class="card"><h3>${esc(monthLabel(cursor))}</h3>
        <div class="cal">${dow.map(d=>`<div class="cal-h">${d}</div>`).join('')}${cells}</div>
        <div style="display:flex;gap:16px;margin-top:12px;font-size:12px;color:var(--muted)">
          <span><i class="dot exp" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--neg)"></i> Expense</span>
          <span><i class="dot inc" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--pos)"></i> Income</span>
          <span><i class="dot due" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--gold-lt)"></i> Debt due</span></div></div>`;
    $('#panel').querySelectorAll('.cal-cell[data-day]').forEach(c=> c.onclick=()=>openDay(c.dataset.day, byDay[c.dataset.day], dueBy[c.dataset.day]));
  }
  function openDay(key, day, due){
    let body=`<div class="s" style="color:var(--muted);margin-bottom:10px">${fmtFull(key)}</div>`;
    if(due&&due.length) body+=due.map(d=>`<div class="row"><div class="avatar" style="color:var(--gold-lt)">${ic.clock}</div><div class="mid"><div class="t">Due: ${esc(d.name)}</div><div class="s">${d.direction==='i_owe'?'You owe':'Owed to you'} · ${egp(d.remaining)} left</div></div></div>`).join('');
    if(day&&day.items.length) body+=day.items.map(t=>`<div class="row"><div class="avatar">${t.type==='income'?ic.up:ic.down}</div><div class="mid"><div class="t">${esc(catName(t.category_id))}</div><div class="s">${t.note?esc(t.note):''}</div></div><div class="val ${t.type==='income'?'pos':'neg'}">${t.type==='income'?'+':'−'}${egp(t.amount_egp)}</div></div>`).join('');
    if(!(due&&due.length)&&!(day&&day.items.length)) body+=`<div class="empty">Nothing on this day.</div>`;
    openSheet('Day detail', body);
  }

  // ---------- debts ----------
  async function panelDebts(){
    const { rows, totals }=await D.debtsSummary();
    const owe=rows.filter(d=>d.direction==='i_owe'), owed=rows.filter(d=>d.direction==='owed_to_me');
    const debtCard=(d)=>{ const pct=d.original_amount_egp>0?Math.min(100,Math.round(d.paid/Number(d.original_amount_egp)*100)):0;
      const dueTag=d.due_date&&!d.closed&&d.remaining>0?`<span class="pill ${daysBetween(todayLocal(),d.due_date)<0?'owe':'owed'}" style="margin-left:8px">${ic.clock} ${fmtDate(d.due_date)}</span>`:'';
      return `<div class="debt" data-debt="${d.id}" style="cursor:pointer">
        <div class="top"><span class="nm">${esc(d.name)}${d.closed?' <span class="s" style="color:var(--faint)">· closed</span>':''}${dueTag}</span><span class="rem">${egp(d.remaining)}</span></div>
        <div class="meta">${egp(d.paid)} paid of ${egp(d.original_amount_egp)}${d.note?' · '+esc(d.note):''}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></div>`; };
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
    $('#panel').querySelectorAll('[data-add]').forEach(b=> b.onclick=(e)=>{ e.stopPropagation(); openAddDebt(b.dataset.add); });
    $('#panel').querySelectorAll('[data-debt]').forEach(c=> c.onclick=()=>{ const d=rows.find(x=>x.id===c.dataset.debt); openDebtDetail(d); });
  }
  async function openDebtDetail(d){
    const pays=await D.listDebtPayments(d.id);
    const { el, close }=openSheet(d.name, `
      <div class="kpis" style="grid-template-columns:repeat(2,1fr);margin-bottom:12px">
        <div class="kpi"><span class="k">Remaining</span><span class="v ${d.direction==='i_owe'?'neg':'pos'}">${egp(d.remaining)}</span></div>
        <div class="kpi"><span class="k">Paid</span><span class="v">${egp(d.paid)} / ${egp(d.original_amount_egp)}</span></div></div>
      <div class="s" style="color:var(--muted);margin-bottom:12px">${d.direction==='i_owe'?'You owe this':'Owed to you'}${d.due_date?' · due '+fmtFull(d.due_date):''}${d.start_date?' · from '+fmtDate(d.start_date):''}</div>
      <div class="field-row"><button class="btn btn-gold" id="pay">${ic.plus} Add payment</button><button class="btn btn-line" id="editd">${ic.edit} Edit</button></div>
      <button class="btn btn-line btn-block ${d.closed?'':'btn-danger'}" id="closed" style="margin-top:10px">${d.closed?'Reopen debt':'Mark as closed'}</button>
      <button class="btn btn-line btn-block btn-danger" id="deld" style="margin-top:10px">${ic.trash} Delete debt</button>
      <h3 style="margin:18px 0 4px;font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px">Payment history</h3>
      <div id="hist">${pays.length?pays.map(p=>`<div class="row"><div class="mid"><div class="t">${egp(p.amount_egp)}</div><div class="s">${fmtDate(p.date)}${p.note?' · '+esc(p.note):''}</div></div><button class="del" data-pid="${p.id}" aria-label="Delete">${ic.trash}</button></div>`).join(''):`<div class="empty">No payments yet.</div>`}</div>`);
    el.querySelector('#pay').onclick=()=>{ close(); openAddPayment(d.id); };
    el.querySelector('#editd').onclick=()=>{ close(); openEditDebt(d); };
    el.querySelector('#closed').onclick=async()=>{ await D.updateDebt(d.id,{closed:!d.closed}); close(); refresh(); };
    el.querySelector('#deld').onclick=async()=>{ if(confirm('Delete this debt and its payment history?')){ await D.deleteDebt(d.id); close(); refresh(); } };
    el.querySelectorAll('[data-pid]').forEach(b=> b.onclick=async()=>{ await D.deleteDebtPayment(b.dataset.pid); b.closest('.row').remove(); updateReminders(); });
  }
  function openAddDebt(direction){
    const { el, close }=openSheet(direction==='i_owe'?'Add something I owe':'Add money owed to me',`
      <label>Name</label><input id="nm" type="text" placeholder="${direction==='i_owe'?'e.g. Car installment':'e.g. Loan to Ahmed'}">
      <label>Total amount (EGP)</label><input id="amt" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0">
      <div class="field-row"><div><label>Start date (optional)</label><input id="sd" type="date"></div>
        <div><label>Due date (optional)</label><input id="dd" type="date"></div></div>
      <label>Note (optional)</label><input id="note" type="text">
      <div class="err" id="e"></div>
      <button class="btn btn-gold btn-block" id="save" style="margin-top:16px">Save</button>`);
    el.querySelector('#save').onclick=async()=>{ el.querySelector('#e').textContent='';
      const nm=el.querySelector('#nm').value.trim(), amt=parseFloat(el.querySelector('#amt').value);
      if(!nm){ el.querySelector('#e').textContent='Enter a name.'; return; } if(!(amt>=0)){ el.querySelector('#e').textContent='Enter an amount.'; return; }
      try{ await D.addDebt(nm,direction,amt,el.querySelector('#note').value||null,el.querySelector('#sd').value||null,el.querySelector('#dd').value||null); close(); updateReminders(); refresh(); }
      catch(err){ el.querySelector('#e').textContent='Could not save.'; } };
  }
  function openEditDebt(d){
    const { el, close }=openSheet('Edit debt',`
      <label>Name</label><input id="nm" type="text" value="${esc(d.name)}">
      <label>Total amount (EGP)</label><input id="amt" type="number" inputmode="decimal" min="0" step="0.01" value="${d.original_amount_egp}">
      <div class="field-row"><div><label>Start date</label><input id="sd" type="date" value="${d.start_date||''}"></div>
        <div><label>Due date</label><input id="dd" type="date" value="${d.due_date||''}"></div></div>
      <label>Note</label><input id="note" type="text" value="${d.note?esc(d.note):''}">
      <div class="err" id="e"></div>
      <button class="btn btn-gold btn-block" id="save" style="margin-top:16px">Save changes</button>`);
    el.querySelector('#save').onclick=async()=>{ el.querySelector('#e').textContent='';
      const nm=el.querySelector('#nm').value.trim(), amt=parseFloat(el.querySelector('#amt').value);
      if(!nm||!(amt>=0)){ el.querySelector('#e').textContent='Enter a name and amount.'; return; }
      try{ await D.updateDebt(d.id,{name:nm,original_amount_egp:amt,start_date:el.querySelector('#sd').value||null,due_date:el.querySelector('#dd').value||null,note:el.querySelector('#note').value||null}); close(); updateReminders(); refresh(); }
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
      try{ await D.addDebtPayment(debtId,amt,el.querySelector('#dt').value,el.querySelector('#note').value||null); close(); updateReminders(); refresh(); }
      catch(err){ el.querySelector('#e').textContent='Could not save.'; } };
  }

  // ---------- summary + PDF ----------
  async function panelSummary(){
    const from=$('#panel').querySelector('#sf')?.value || monthISO(cursor);
    const to=$('#panel').querySelector('#st')?.value || todayLocal();
    $('#panel').innerHTML=`
      <div class="card"><h3>Summary report</h3>
        <div class="field-row"><div><label>From</label><input id="sf" type="date" value="${from}"></div><div><label>To</label><input id="st" type="date" value="${to}"></div></div>
        <button class="btn btn-line btn-block" id="run" style="margin-top:14px">Preview</button>
        <div id="sumout" style="margin-top:14px"></div></div>`;
    $('#panel').querySelector('#run').onclick=()=>renderSummary($('#sf').value,$('#st').value);
    renderSummary(from,to);
  }
  async function renderSummary(from,to){
    if(!from||!to||from>to){ $('#sumout').innerHTML=`<div class="err">Pick a valid date range.</div>`; return; }
    const end=new Date(to+'T00:00'); end.setDate(end.getDate()+1); const toEx=`${end.getFullYear()}-${pad2(end.getMonth()+1)}-${pad2(end.getDate())}`;
    const tx=await D.listTransactionsRange(from,toEx);
    let income=0,expense=0; const byCat={};
    tx.forEach(t=>{ if(t.type==='income')income+=Number(t.amount_egp); else { expense+=Number(t.amount_egp); byCat[t.category_id]=(byCat[t.category_id]||0)+Number(t.amount_egp); } });
    const cbars=Object.entries(byCat).map(([id,v])=>({label:catName(id),value:v,color:catColor(id)}));
    const { totals }=await D.debtsSummary();
    window._sumData={ from, to, income, expense, net:income-expense, cbars, count:tx.length, debts:totals };
    $('#sumout').innerHTML=`
      <div class="kpis" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">
        <div class="kpi"><span class="k">Income</span><span class="v pos">${egp(income)}</span></div>
        <div class="kpi"><span class="k">Expenses</span><span class="v neg">${egp(expense)}</span></div>
        <div class="kpi"><span class="k">Net</span><span class="v ${income-expense>=0?'pos':'neg'}">${egp(income-expense)}</span></div></div>
      <h3 style="font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin:6px 0">Spending by category</h3>
      ${categoryBars(cbars,{egp})}
      <div class="s" style="color:var(--faint);font-size:12px;margin:10px 0">${tx.length} transactions · ${fmtDate(from)} – ${fmtDate(to)}</div>
      <button class="btn btn-gold btn-block" id="pdf">${ic.download} Download PDF</button>`;
    $('#sumout').querySelector('#pdf').onclick=downloadPDF;
  }
  async function downloadPDF(){
    const btn=$('#sumout').querySelector('#pdf'); const d=window._sumData; if(!d) return;
    btn.disabled=true; const prev=btn.innerHTML; btn.textContent='Preparing…';
    try{
      const jsPDF=await loadJsPDF(); const doc=new jsPDF({unit:'pt',format:'a4'}); const W=doc.internal.pageSize.getWidth();
      const money=(n)=> 'EGP '+(Number(n)<0?'-':'')+Math.abs(Math.round(Number(n)||0)).toLocaleString('en-US');
      doc.setFillColor(15,110,86); doc.rect(0,0,W,70,'F');
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(20); doc.text('Ligemat · Finance Summary',40,42);
      doc.setTextColor(40,40,40); doc.setFont('helvetica','normal'); doc.setFontSize(11);
      doc.text(`Period: ${fmtFull(d.from)}  —  ${fmtFull(d.to)}`,40,100);
      doc.text(`Transactions: ${d.count}`,40,116);
      let y=150; doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.text('Overview',40,y); y+=8;
      doc.setDrawColor(220,210,195); doc.line(40,y,W-40,y); y+=22; doc.setFont('helvetica','normal'); doc.setFontSize(12);
      const rowKV=(k,v,color)=>{ doc.setTextColor(90,90,90); doc.text(k,40,y); if(color)doc.setTextColor(...color); else doc.setTextColor(20,20,20); doc.text(money(v),W-40,y,{align:'right'}); y+=20; };
      rowKV('Income',d.income,[20,150,110]); rowKV('Expenses',d.expense,[200,90,70]); rowKV('Net',d.net, d.net>=0?[20,150,110]:[200,90,70]);
      y+=14; doc.setFont('helvetica','bold'); doc.setTextColor(20,20,20); doc.setFontSize(13); doc.text('Spending by category',40,y); y+=8;
      doc.line(40,y,W-40,y); y+=22; doc.setFont('helvetica','normal'); doc.setFontSize(12);
      const sorted=d.cbars.filter(c=>c.value>0).sort((a,b)=>b.value-a.value);
      if(sorted.length){ sorted.forEach(c=>{ if(y>790){doc.addPage();y=50;} doc.setTextColor(90,90,90); doc.text(String(c.label),40,y); doc.setTextColor(20,20,20); doc.text(money(c.value),W-40,y,{align:'right'}); y+=20; }); }
      else { doc.setTextColor(140,140,140); doc.text('No expenses in this period.',40,y); y+=20; }
      y+=14; if(y>760){doc.addPage();y=50;} doc.setFont('helvetica','bold'); doc.setTextColor(20,20,20); doc.setFontSize(13); doc.text('Debts (current)',40,y); y+=8;
      doc.line(40,y,W-40,y); y+=22; doc.setFont('helvetica','normal'); doc.setFontSize(12);
      rowKV('I owe',d.debts.owe,[200,90,70]); rowKV('Owed to me',d.debts.owed,[20,150,110]); rowKV('Net position',d.debts.net, d.debts.net>=0?[20,150,110]:[200,90,70]);
      doc.setTextColor(150,150,150); doc.setFontSize(9); doc.text('Generated by Ligemat Finance · '+fmtFull(todayLocal()),40,820);
      doc.save(`ligemat-summary-${d.from}_to_${d.to}.pdf`);
    }catch(e){ alert('Could not generate the PDF. Check your connection and try again.'); }
    finally{ btn.disabled=false; btn.innerHTML=prev; }
  }

  // ---------- settings ----------
  async function panelSettings(){
    accts=await D.listAccounts(); cats=await D.listCategories();
    $('#panel').innerHTML=`
      <div class="card"><h3>Categories</h3>
        ${cats.map(c=>`<div class="row"><div class="avatar" style="background:${c.color}22;color:${c.color}">${ic.tag}</div><div class="mid"><div class="t">${esc(c.name)}</div><div class="s">${c.type}</div></div><button class="del" data-cid="${c.id}" aria-label="Delete">${ic.trash}</button></div>`).join('')}
        <div class="field-row" style="margin-top:8px"><input id="cn" placeholder="New category"><select id="ct" style="max-width:130px"><option value="expense">Expense</option><option value="income">Income</option></select></div>
        <button class="btn btn-line btn-sm" id="cadd" style="margin-top:10px">${ic.plus} Add category</button></div>
      <div class="card"><h3>Security</h3>
        <label>Change device PIN</label><input id="pin" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" placeholder="New 4-digit PIN" style="max-width:180px">
        <button class="btn btn-line btn-sm" id="psave" style="margin-top:10px;display:block">Update PIN</button>
        <div class="err" id="pe"></div></div>`;
    $('#cadd').onclick=async()=>{ const n=$('#cn').value.trim(); if(n){ await D.addCategory(n,$('#ct').value,'#C9956A'); refresh(); } };
    $('#panel').querySelectorAll('[data-cid]').forEach(b=> b.onclick=async()=>{ if(confirm('Delete category?')){ await D.deleteCategory(b.dataset.cid); refresh(); } });
    $('#psave').onclick=async()=>{ const p=$('#pin').value; $('#pe').textContent=''; if(!/^\d{4}$/.test(p)){ $('#pe').textContent='PIN must be 4 digits.'; return; }
      try{ await setPin(p); $('#pe').style.color='var(--pos)'; $('#pe').textContent='PIN updated on this device.'; $('#pin').value=''; }catch(err){ $('#pe').textContent='Could not update PIN.'; } };
  }

  refresh();
}
