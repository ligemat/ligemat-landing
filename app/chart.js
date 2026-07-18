const esc = (s)=> String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// data: [{label, value, color}]; returns an HTML string of labelled bars. Values in EGP.
export function categoryBars(data, { egp }) {
  const rows = data.filter(d=>d.value>0).sort((a,b)=>b.value-a.value);
  if (!rows.length) return `<div class="empty">No spending recorded this month.</div>`;
  const max = Math.max(...rows.map(r=>r.value));
  return `<div role="img" aria-label="Spending by category">${rows.map(r=>`
    <div class="bar-row">
      <div class="name">${esc(r.label)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(5,Math.round(r.value/max*100))}%;background:linear-gradient(90deg,${r.color},${r.color})"></div></div>
      <div class="amt">${egp(r.value)}</div>
    </div>`).join('')}</div>`;
}
