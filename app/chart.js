const esc = (s)=> String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// data: [{label, value, color}]; returns an SVG string. Values in EGP.
export function categoryBars(data, { egp }) {
  const rows = data.filter(d=>d.value>0).sort((a,b)=>b.value-a.value);
  if (!rows.length) return '<p style="color:var(--muted)">No spending yet this month.</p>';
  const max = Math.max(...rows.map(r=>r.value));
  return `<div role="img" aria-label="Spending by category">${rows.map(r=>`
    <div style="display:flex;align-items:center;gap:10px;margin:7px 0">
      <div style="width:110px;font-size:13px;color:var(--muted)">${esc(r.label)}</div>
      <div style="flex:1;background:#0E1714;border-radius:7px;overflow:hidden">
        <div style="width:${Math.max(4,Math.round(r.value/max*100))}%;height:16px;background:${r.color}"></div></div>
      <div style="width:90px;text-align:right;font-size:13px">${egp(r.value)}</div>
    </div>`).join('')}</div>`;
}
