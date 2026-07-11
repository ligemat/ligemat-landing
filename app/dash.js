export function renderDashboard(){ const d=document.querySelector('#dash-view');
  document.querySelector('#boot').hidden=true; document.querySelector('#login-view').hidden=true;
  d.hidden=false; d.innerHTML='<div class="card">Signed in ✓ (dashboard next)</div>'; }
