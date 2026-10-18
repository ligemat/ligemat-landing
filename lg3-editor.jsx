// Ligemat v3 — website editor + personal finance.
function lg3Resize(file, max = 1800) {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => { const img = new Image(); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const cv = document.createElement("canvas"); cv.width = img.width * k; cv.height = img.height * k; cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height); res(cv.toDataURL("image/jpeg", 0.85)); }; img.src = r.result; };
    r.readAsDataURL(file);
  });
}
const Lg3F = ({ label, value, onChange, area, dir, mono }) => (
  <label className="lg3-f"><span>{label}</span>
    {area ? <textarea rows={3} dir={dir} value={value} onChange={e => onChange(e.target.value)} /> : <input dir={dir} className={mono ? "lg-mono" : ""} value={value} onChange={e => onChange(e.target.value)} />}
  </label>
);
const LG3_BGS = [["assets/more/cairo-nile-dusk.jpg", "Nile at dusk"], ["assets/more/cairo-modern.jpg", "Modern Cairo"], ["assets/more/cairo-rooftops.jpg", "Rooftops"], ["assets/more/cairo-panorama.jpg", "Panorama"]];
const LG3_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Lg3SiteEditor({ c, save, reset }) {
  const [d, setD] = React.useState(c);
  const [saved, setSaved] = React.useState(false);
  const set = (path, v) => setD(prev => { const n = JSON.parse(JSON.stringify(prev)); const ks = path.split("."); let o = n; ks.slice(0, -1).forEach(k => o = o[k]); o[ks[ks.length - 1]] = v; return n; });
  const dirty = JSON.stringify(d) !== JSON.stringify(c);
  const doSave = () => { save(d); setSaved(true); setTimeout(() => setSaved(false), 1800); };
  const upload = async (e, key) => { const f = e.target.files[0]; if (!f) return; set(key, await lg3Resize(f)); };
  const txt = [["roles", "Roles line (separate with ·)"], ["h1a", "Headline, line 1"], ["h1b", "Headline, line 2 (peach)"], ["sub", "Intro", 1], ["howTitle", "How I work, title"], ["bandTitle", "Call-to-action band", 1], ["moreKicker", "MORE label"], ["moreLine", "MORE description", 1]];
  return (
    <div className="lg3-ed">
      <div className="lg3-savebar">
        <span>{saved ? "Saved. The website is updated." : dirty ? "Unsaved changes" : "All changes saved"}</span>
        <div className="lg-row">
          <button className="lg-btn sm ghost on-dark" onClick={() => { if (confirm("Reset all website content to the original?")) { reset(); setD(LG3_DEFAULT); } }}>Reset</button>
          <button className="lg-btn sm clay" disabled={!dirty} onClick={doSave}>Save</button>
        </div>
      </div>

      <section className="lg3-card"><h3>Hero images</h3>
        <div className="lg3-sub">Background</div>
        <div className="lg3-bgs">
          {LG3_BGS.map(([src, n]) => <button key={src} className={"lg3-bg" + (d.heroBg === src ? " on" : "")} style={{ backgroundImage: "url(" + src + ")" }} onClick={() => set("heroBg", src)}><span>{n}</span></button>)}
          {!LG3_BGS.some(([s]) => s === d.heroBg) && <button className="lg3-bg on" style={{ backgroundImage: "url(" + d.heroBg + ")" }}><span>Your upload</span></button>}
          <label className="lg3-bg up">+ Upload<input type="file" accept="image/*" hidden onChange={e => upload(e, "heroBg")} /></label>
        </div>
        <div className="lg3-sub">Portrait</div>
        <div className="lg-row" style={{ alignItems: "center" }}>
          <div className="lg3-thumb" style={{ backgroundImage: "url(" + (d.portrait || LG3_BASE_PHOTO) + ")" }}></div>
          <label className="lg-btn sm ghost on-dark">Upload new<input type="file" accept="image/*" hidden onChange={e => upload(e, "portrait")} /></label>
          {d.portrait && <button className="lg-btn sm ghost on-dark" onClick={() => set("portrait", "")}>Use original</button>}
        </div>
      </section>

      <section className="lg3-card"><h3>Texts</h3>
        <div className="lg3-bi"><div className="lg3-sub">English</div><div className="lg3-sub" dir="rtl">العربية</div></div>
        {txt.map(([k, l, area]) => <div key={k} className="lg3-bi">
          <Lg3F label={l} area={area} value={d.en[k]} onChange={v => set("en." + k, v)} />
          <Lg3F label={l} area={area} dir="rtl" value={d.ar[k]} onChange={v => set("ar." + k, v)} />
        </div>)}
      </section>

      <section className="lg3-card"><h3>Booking hours</h3>
        <div className="lg3-bi">
          <Lg3F label="First slot" mono value={d.hours.start} onChange={v => set("hours.start", v)} />
          <Lg3F label="Last slot" mono value={d.hours.end} onChange={v => set("hours.end", v)} />
        </div>
        <div className="lg3-sub">Days off</div>
        <div className="lg3-chips">{LG3_DAYS.map((n, i) => { const on = d.hours.daysOff.includes(i); return <button key={n} className={"lg-chip" + (on ? " on" : "")} onClick={() => set("hours.daysOff", on ? d.hours.daysOff.filter(x => x !== i) : [...d.hours.daysOff, i])}>{n}</button>; })}</div>
        <p className="lg3-hint">30-minute slots. {/^\d\d:\d\d$/.test(d.hours.start) && /^\d\d:\d\d$/.test(d.hours.end) ? lg3SlotsCount(d.hours) + " slots a day." : "Use HH:MM."}</p>
      </section>

      <section className="lg3-card"><h3>Contact details</h3>
        <div className="lg3-bi">
          <Lg3F label="Phone / WhatsApp" mono value={d.contact.phone} onChange={v => set("contact.phone", v)} />
          <Lg3F label="Email" value={d.contact.email} onChange={v => set("contact.email", v)} />
          <Lg3F label="Instagram" value={d.contact.ig} onChange={v => set("contact.ig", v)} />
          <div></div>
          <Lg3F label="City (English)" value={d.contact.cityEn} onChange={v => set("contact.cityEn", v)} />
          <Lg3F label="City (Arabic)" dir="rtl" value={d.contact.cityAr} onChange={v => set("contact.cityAr", v)} />
        </div>
      </section>

      <section className="lg3-card"><h3>Homepage sections</h3>
        {[["more", "MORE band"], ["how", "How I work"], ["who", "Who I work with"], ["band", "Call-to-action band"]].map(([k, l]) =>
          <label key={k} className="lg3-tog"><span>{l}</span><input type="checkbox" checked={d.sections[k]} onChange={e => set("sections." + k, e.target.checked)} /><i></i></label>)}
      </section>
    </div>
  );
}
function lg3SlotsCount(h) { const m = s => { const [a, b] = s.split(":").map(Number); return a * 60 + b; }; return Math.max(0, Math.floor((m(h.end) - m(h.start)) / 30) + 1); }

// ---------- Personal finance
const LG3_CATS = { in: ["Commission", "Marketing work", "Design work", "Salary", "Other income"], out: ["Rent", "Bills & utilities", "Food", "Transport", "Phone & internet", "Family", "Business costs", "Other"] };
const lg3Fmt = (n) => Math.round(n).toLocaleString("en-US");
const lg3Month = (d) => d.slice(0, 7);
function Lg3Finance() {
  const [rows, setRows] = React.useState(() => lg3Read(LG3_FIN, []));
  const persist = (r) => { setRows(r); localStorage.setItem(LG3_FIN, JSON.stringify(r)); };
  const today = new Date().toISOString().slice(0, 10);
  const [month, setMonth] = React.useState(lg3Month(today));
  const [f, setF] = React.useState({ type: "in", date: today, amount: "", category: LG3_CATS.in[0], note: "" });
  const add = () => { const a = parseFloat(String(f.amount).replace(/,/g, "")); if (!a || a <= 0) return; persist([{ ...f, amount: a, id: Date.now() }, ...rows]); setF({ ...f, amount: "", note: "" }); };
  const inMonth = rows.filter(r => lg3Month(r.date) === month).sort((a, b) => b.date.localeCompare(a.date));
  const sum = (arr, t) => arr.filter(r => r.type === t).reduce((s, r) => s + r.amount, 0);
  const inc = sum(inMonth, "in"), exp = sum(inMonth, "out"), net = inc - exp;
  const months = [...Array(6)].map((_, i) => { const d = new Date(month + "-01T00:00:00"); d.setMonth(d.getMonth() - (5 - i)); return d.toISOString().slice(0, 7); });
  const series = months.map(m => { const r = rows.filter(x => lg3Month(x.date) === m); return [m, sum(r, "in"), sum(r, "out")]; });
  const peak = Math.max(1, ...series.flatMap(s => [s[1], s[2]]));
  const cats = LG3_CATS.out.map(cn => [cn, inMonth.filter(r => r.type === "out" && r.category === cn).reduce((s, r) => s + r.amount, 0)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  const mLabel = (m) => new Date(m + "-01T00:00:00").toLocaleDateString("en-GB", { month: "short" });
  const shift = (k) => { const d = new Date(month + "-01T00:00:00"); d.setMonth(d.getMonth() + k); setMonth(d.toISOString().slice(0, 7)); };
  return (
    <div className="lg3-fin">
      <div className="lg3-fin-head">
        <div><div className="lg-kicker on-dark">Personal finance · EGP</div><h2 className="lg3-fin-t">Income vs expenses</h2></div>
        <div className="lg3-month"><button onClick={() => shift(-1)} aria-label="Previous month"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></button><span className="lg-mono">{new Date(month + "-01T00:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span><button onClick={() => shift(1)} aria-label="Next month"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg></button></div>
      </div>
      <div className="lg3-kpis">
        <div className="lg3-card"><span>Income</span><b className="lg-mono">{lg3Fmt(inc)}</b></div>
        <div className="lg3-card"><span>Expenses</span><b className="lg-mono">{lg3Fmt(exp)}</b></div>
        <div className="lg3-card"><span>Net</span><b className={"lg-mono " + (net < 0 ? "neg" : "pos")}>{net < 0 ? "−" : ""}{lg3Fmt(Math.abs(net))}</b></div>
      </div>
      <div className="lg3-fin-grid">
        <section className="lg3-card"><h3>Last 6 months</h3>
          <div className="lg3-bars">{series.map(([m, i, o]) => <div key={m} className={"lg3-bar" + (m === month ? " cur" : "")} onClick={() => setMonth(m)}>
            <div className="lg3-bar-pair"><i className="in" style={{ height: (i / peak * 100) + "%" }}></i><i className="out" style={{ height: (o / peak * 100) + "%" }}></i></div><span>{mLabel(m)}</span></div>)}</div>
          {series.every(s => !s[1] && !s[2]) && <p className="lg3-hint">Add your first entry below to see the chart.</p>}
          <div className="lg3-legend"><span><i className="in"></i>Income</span><span><i className="out"></i>Expenses</span></div>
        </section>
        <section className="lg3-card"><h3>Where it went</h3>
          {cats.length ? cats.map(([cn, v]) => <div key={cn} className="lg3-cat"><div className="lg3-cat-r"><span>{cn}</span><span className="lg-mono">{lg3Fmt(v)}</span></div><div className="lg3-cat-b"><i style={{ width: (v / exp * 100) + "%" }}></i></div></div>) : <p className="lg3-hint">No expenses this month.</p>}
        </section>
      </div>
      <section className="lg3-card"><h3>Add an entry</h3>
        <div className="lg3-add">
          <div className="lg3-seg">{[["in", "Income"], ["out", "Expense"]].map(([k, l]) => <button key={k} className={f.type === k ? "on" : ""} onClick={() => setF({ ...f, type: k, category: LG3_CATS[k][0] })}>{l}</button>)}</div>
          <input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} className="lg-mono" />
          <input placeholder="Amount (EGP)" inputMode="decimal" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} className="lg-mono" onKeyDown={e => e.key === "Enter" && add()} />
          <select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{LG3_CATS[f.type].map(x => <option key={x}>{x}</option>)}</select>
          <input placeholder="Note (optional)" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} onKeyDown={e => e.key === "Enter" && add()} />
          <button className="lg-btn clay" onClick={add}>Add</button>
        </div>
      </section>
      <section className="lg3-card"><h3>Entries · {inMonth.length}</h3>
        {inMonth.length ? <div className="lg3-rows">{inMonth.map(r => <div key={r.id} className="lg3-row">
          <span className="lg-mono lg3-d">{r.date.slice(8)} {mLabel(lg3Month(r.date))}</span>
          <span>{r.category}{r.note && <em> · {r.note}</em>}</span>
          <span className={"lg-mono " + (r.type === "in" ? "pos" : "neg")}>{r.type === "in" ? "+" : "−"}{lg3Fmt(r.amount)}</span>
          <button onClick={() => persist(rows.filter(x => x.id !== r.id))} aria-label="Delete">×</button></div>)}</div>
          : <p className="lg3-hint">Nothing recorded for this month yet.</p>}
      </section>
      <p className="lg3-hint">Saved in this browser only. Clearing browser data removes it.</p>
    </div>
  );
}
Object.assign(window, { Lg3SiteEditor, Lg3Finance });
