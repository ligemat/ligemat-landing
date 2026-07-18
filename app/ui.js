const $ = (s,r=document)=>r.querySelector(s);
const loginView = ()=>$('#login-view'), dashView=()=>$('#dash-view');
function show(el){ $('#boot').hidden=true; loginView().hidden = el!=='login'; dashView().hidden = el!=='dash'; }
const esc = (s)=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const LOGO = `<span class="mono">L</span>`;

export function renderLogin(onSubmit, message){ show('login');
  loginView().innerHTML = `<div class="auth-wrap"><div class="auth-card card">
    <div class="brand" style="margin-bottom:16px">${LOGO}<span>Ligemat &nbsp;·&nbsp; Finance</span></div>
    <h2>Welcome back</h2>
    <p class="sub">Sign in to your private dashboard.</p>
    <label>Email</label><input id="lg-email" type="email" autocomplete="username" inputmode="email">
    <label>Password</label><input id="lg-pass" type="password" autocomplete="current-password">
    <div class="err" id="lg-err">${message ? esc(message) : ''}</div>
    <button class="btn btn-gold btn-block" id="lg-go" style="margin-top:16px">Sign in</button></div></div>`;
  const go = async ()=>{ $('#lg-err').textContent='';
    try{ await onSubmit($('#lg-email').value.trim(), $('#lg-pass').value); }
    catch(e){ $('#lg-err').textContent = 'Sign-in failed. Check your email and password.'; } };
  $('#lg-go').onclick = go;
  $('#lg-pass').addEventListener('keydown', e=>{ if(e.key==='Enter') go(); });
}

function pinPad(title, sub, onComplete){ show('login');
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  loginView().innerHTML = `<div class="auth-wrap"><div class="auth-card card" style="max-width:340px;text-align:center">
    <div class="brand" style="justify-content:center;margin-bottom:14px">${LOGO}</div>
    <h2>${esc(title)}</h2><p class="sub">${esc(sub)}</p>
    <div class="pin-dots">${[0,1,2,3].map(i=>`<div class="pin-dot" data-i="${i}"></div>`).join('')}</div>
    <div class="err" id="pin-err"></div>
    <div class="keypad" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:6px">
      ${keys.map(k=>k===''?`<div></div>`:`<button class="btn btn-line keypad-k" data-k="${k}" style="min-height:52px;font-size:20px">${k}</button>`).join('')}
    </div>
    <div id="pin-alt"></div></div></div>`;
  let buf='';
  const paint=()=>document.querySelectorAll('.pin-dot').forEach((d,i)=>d.classList.toggle('on',i<buf.length));
  const push=(k)=>{ if(k==='⌫'){ buf=buf.slice(0,-1); paint(); return; }
    if(buf.length<4){ buf+=k; paint(); }
    if(buf.length===4){ const v=buf; buf=''; setTimeout(()=>{paint();onComplete(v);},120); } };
  document.querySelectorAll('.keypad-k').forEach(b=> b.onclick=()=>push(b.dataset.k));
  const onKey=(e)=>{ if(e.key>='0'&&e.key<='9') push(e.key); else if(e.key==='Backspace') push('⌫'); };
  document.addEventListener('keydown', onKey);
  return ()=>document.removeEventListener('keydown', onKey);
}

export function renderPinUnlock(onPin,onFull){ const off=pinPad('Enter your PIN','4-digit quick unlock',async v=>{
    try{ await onPin(v); off(); }catch(e){ $('#pin-err').textContent = e.message==='wiped'
      ? 'Too many attempts — please sign in again.' : 'Wrong PIN. Try again.'; if(e.message==='wiped'){off();onFull();} } });
  $('#pin-alt').innerHTML = `<button class="btn btn-line btn-block" style="margin-top:14px" id="pin-full">Use password instead</button>`;
  $('#pin-full').onclick=()=>{ off(); onFull(); };
}
export function renderPinSet(onPin){ const off=pinPad('Set a PIN','Choose a 4-digit unlock code for this device',async v=>{ await onPin(v); off(); }); }
export { show };
