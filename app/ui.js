const $ = (s,r=document)=>r.querySelector(s);
const loginView = ()=>$('#login-view'), dashView=()=>$('#dash-view');
function show(el){ $('#boot').hidden=true; loginView().hidden = el!=='login'; dashView().hidden = el!=='dash'; }

export function renderLogin(onSubmit, message){ show('login');
  loginView().innerHTML = `<div class="card" style="max-width:380px;margin:12vh auto">
    <h2>Sign in</h2>
    <label>Email</label><input id="lg-email" type="email" autocomplete="username">
    <label>Password</label><input id="lg-pass" type="password" autocomplete="current-password">
    <div class="err" id="lg-err">${message ? message : ''}</div>
    <button class="btn" id="lg-go" style="width:100%;margin-top:14px">Sign in</button></div>`;
  $('#lg-go').onclick = async ()=>{ $('#lg-err').textContent='';
    try{ await onSubmit($('#lg-email').value.trim(), $('#lg-pass').value); }
    catch(e){ $('#lg-err').textContent = 'Sign-in failed. Check your email and password.'; } };
}
function pinPad(title, sub, onComplete){ show('login');
  loginView().innerHTML = `<div class="card" style="max-width:340px;margin:14vh auto;text-align:center">
    <h2>${title}</h2><p style="color:var(--muted);font-size:14px">${sub}</p>
    <div class="pin-dots">${[0,1,2,3].map(i=>`<div class="pin-dot" data-i="${i}"></div>`).join('')}</div>
    <div class="err" id="pin-err"></div>
    <div id="pin-alt"></div></div>`;
  let buf='';
  const paint=()=>document.querySelectorAll('.pin-dot').forEach((d,i)=>d.classList.toggle('on',i<buf.length));
  const onKey=(e)=>{ if(e.key>='0'&&e.key<='9'&&buf.length<4){buf+=e.key;paint();}
    else if(e.key==='Backspace'){buf=buf.slice(0,-1);paint();}
    if(buf.length===4){ const v=buf; buf=''; paint(); onComplete(v); } };
  document.addEventListener('keydown', onKey);
  return ()=>document.removeEventListener('keydown', onKey);
}
export function renderPinUnlock(onPin,onFull){ const off=pinPad('Enter PIN','4-digit unlock',async v=>{
    try{ await onPin(v); off(); }catch(e){ $('#pin-err').textContent = e.message==='wiped'
      ? 'Too many attempts — please sign in again.' : 'Wrong PIN.'; if(e.message==='wiped'){off();onFull();} } });
  $('#pin-alt').innerHTML = `<button class="btn-line btn" style="margin-top:12px" id="pin-full">Use password instead</button>`;
  $('#pin-full').onclick=()=>{ off(); onFull(); };
}
export function renderPinSet(onPin){ const off=pinPad('Set a PIN','Choose a 4-digit unlock code',async v=>{ await onPin(v); off(); }); }
export { show };
