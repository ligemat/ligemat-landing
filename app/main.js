import { loginWithPassword, currentSession, setPin, unlockWithPin, hasLock, needsFullLogin, logout } from './auth.js';
import { renderLogin, renderPinUnlock, renderPinSet } from './ui.js';
import { renderDashboard } from './dash.js';

const NOT_OWNER_MSG = "This account can't access the dashboard.";

// finance /app owner-only guard: only window.LIGEMAT_CONFIG.OWNER_UID may use the dashboard.
// If OWNER_UID is unset (dev/bootstrap), allow any authenticated user through.
function isOwner(session){
  const CFG = window.LIGEMAT_CONFIG || {};
  if (!CFG.OWNER_UID) return true;
  return !!session?.user?.id && session.user.id === CFG.OWNER_UID;
}

async function rejectNonOwner(){
  await logout();
  renderLogin(async (e,p)=>{ await loginWithPassword(e,p); await afterLogin(); }, NOT_OWNER_MSG);
}

async function toDashboard(){ renderDashboard({ logout: async()=>{ await logout(); boot(); } }); }

async function afterLogin(){
  const session = await currentSession();
  if (!isOwner(session)) return rejectNonOwner();
  // Ask to set a PIN if none stored for this device.
  if (!hasLock()) { renderPinSet(async (pin)=>{ await setPin(pin); toDashboard(); }); }
  else toDashboard();
}

export async function boot(){
  const session = await currentSession();
  if (session && !needsFullLogin()) {
    if (!isOwner(session)) return rejectNonOwner();
    return afterLogin();
  }
  if (hasLock() && !needsFullLogin()) {
    return renderPinUnlock(
      async (pin)=>{
        await unlockWithPin(pin);
        const s = await currentSession();
        if (!isOwner(s)) return rejectNonOwner();
        await afterLogin();
      },
      ()=> renderLogin(async (e,p)=>{ await loginWithPassword(e,p); await afterLogin(); }));
  }
  renderLogin(async (e,p)=>{ await loginWithPassword(e,p); await afterLogin(); });
}
boot();
