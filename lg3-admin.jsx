// Ligemat v3 — editable content, hidden admin (footer logo ×3 + PIN), personal finance.
const LG3_KEY = window.LG_CONTENT_KEY || "lg3-content", LG3_FIN = "lg3-finance";
const LG3_DEFAULT = {
  heroBg: "assets/more/cairo-nile-dusk.jpg",
  portrait: "",
  en: { roles: "Advisor · Salesman · Marketer · Designer", h1a: "Made", h1b: "for more.", sub: "I'm Osama. I help families moving to Cairo find the right home.", howTitle: "One person, from the first call to the keys.", bandTitle: "Moving soon? Let's talk before you sign anything.", moreKicker: "Founder of MORE Real Estate", moreTag: "more than real estate", moreLine: "My Cairo office. We find, hand over and manage homes for people arriving in Cairo, and look after the owners." },
  ar: { roles: "مستشار · مبيعات · تسويق · تصميم", h1a: "صُنع", h1b: "للمزيد.", sub: "أنا أسامة. أساعد الأسر القادمة إلى القاهرة على إيجاد البيت المناسب.", howTitle: "شخص واحد، من أول مكالمة حتى استلام المفاتيح.", bandTitle: "تنتقل قريباً؟ لنتحدث قبل أن توقّع أي شيء.", moreKicker: "مؤسس MORE العقارية", moreTag: "اكتر من مجرد عقارات", moreLine: "مكتبي في القاهرة. نجد البيوت ونسلّمها وندير شؤونها للقادمين إلى القاهرة، ونرعى ملّاكها." },
  contact: { phone: "+20 150 850 0099", email: "osama@more-re.com", ig: "@ligemat", cityEn: "Nasr City, Cairo", cityAr: "مدينة نصر، القاهرة" },
  hours: { start: "10:00", end: "18:30", daysOff: [5] },
  sections: { more: true, how: true, who: true, band: true }
};
const lg3Read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
const lg3Merge = (c) => ({ ...LG3_DEFAULT, ...c, en: { ...LG3_DEFAULT.en, ...(c.en || {}) }, ar: { ...LG3_DEFAULT.ar, ...(c.ar || {}) }, contact: { ...LG3_DEFAULT.contact, ...(c.contact || {}) }, hours: { ...LG3_DEFAULT.hours, ...(c.hours || {}) }, sections: { ...LG3_DEFAULT.sections, ...(c.sections || {}) } });
function lg3Slots(h) {
  const toM = (s) => { const [a, b] = s.split(":").map(Number); return a * 60 + b; };
  const out = []; for (let m = toM(h.start); m <= toM(h.end); m += 30) out.push(String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"));
  return out;
}
const LG3_BASE_PHOTO = LG_CONTACT.photo;
function lg3Apply(c) {
  ["en", "ar"].forEach(l => Object.assign(LG_T[l], { h1a: c[l].h1a, h1b: c[l].h1b, sub: c[l].sub, howTitle: c[l].howTitle, bandTitle: c[l].bandTitle }));
  LG_T.en.city = c.contact.cityEn; LG_T.ar.city = c.contact.cityAr;
  Object.assign(LG_CONTACT, { phone: c.contact.phone, wa: c.contact.phone.replace(/\D/g, ""), email: c.contact.email, ig: c.contact.ig, photo: c.portrait || LG3_BASE_PHOTO });
  window.LG_SLOTS_OVERRIDE = lg3Slots(c.hours);
  window.LG_DAYS_OFF = c.hours.daysOff;
}
function lg3Diff(v, d) { if (Array.isArray(v) || typeof v !== "object" || v === null) return JSON.stringify(v) === JSON.stringify(d) ? undefined : v; const o = {}; Object.keys(v).forEach(k => { const x = lg3Diff(v[k], d ? d[k] : undefined); if (x !== undefined && !(typeof x === "object" && !Array.isArray(x) && !Object.keys(x).length)) o[k] = x; }); return o; }
// Content: Supabase is the source of truth; localStorage is only a fast cache for returning visitors.
const lg3Cache = (v) => { try { localStorage.setItem(LG3_KEY, JSON.stringify(v)); } catch (e) {} };
function useLg3Content() {
  const [c, setC] = React.useState(() => lg3Merge(lg3Read(LG3_KEY, {})));
  lg3Apply(c);
  React.useEffect(() => {
    if (!window.lgDb || !lgDb.ready) return;
    lgDb.load().then(v => { const s = v || {}; lg3Cache(s); setC(lg3Merge(s)); }).catch(() => {});
  }, []);
  const save = async (n) => { const m = lg3Merge(n); const d = lg3Diff(m, LG3_DEFAULT) || {}; await lgDb.save(d); lg3Cache(d); setC(m); };
  const reset = async () => { await lgDb.save({}); lg3Cache({}); setC(lg3Merge({})); };
  return [c, save, reset];
}

// ---------- Public pages
function Lg3Hero({ t, c, lang, go }) {
  const x = c[lang];
  return (
    <section className="lg3-hero" data-screen-label="Hero">
      <div className="lg3-hero-bg" style={{ backgroundImage: "url(" + c.heroBg + ")" }}></div>
      <div className="lg3-hero-shade"></div>
      <div className="lg3-hero-in lg-wrap">
        <div className="lg3-hero-txt">
          <div className="lg3-roles">{x.roles.split("·").map((r, i) => <React.Fragment key={i}>{i > 0 && <span>·</span>}{r.trim()}</React.Fragment>)}</div>
          <h1 className="lg3-h1">{x.h1a}<br /><em>{x.h1b}</em></h1>
          <p className="lg3-lead">{x.sub}</p>
          <div className="lg-row">
            <a className="lg-btn lg clay" onClick={() => go("book")}>{t.ctaBook}</a>
            <a className="lg-btn lg ghost on-dark" href={lgWaLink()} target="_blank"><LgWaIcon />{t.ctaWa}</a>
          </div>
        </div>
        <div className="lg3-arch-wrap">
          <button className="lg3-arch" onClick={lgOpenMeet} aria-label={t.meet}><img src={LG_CONTACT.photo} alt={t.name} /></button>
          <div className="lg3-tag"><b>{t.name}</b><span>·</span>{x.moreKicker.replace(/^Founder of /, "Founder, ")}</div>
        </div>
      </div>
    </section>
  );
}
function Lg3More({ c, lang }) {
  const x = c[lang];
  return (
    <section className="lg-sec lg3-more-sec" data-screen-label="MORE">
      <div className="lg-wrap">
        <div className="lg3-more">
          <div className="lg3-marks">
            <div className="lg3-mark"><div className="lg3-tile"><svg width="54" height="54" viewBox="0 0 100 100"><rect x="0" y="0" width="46" height="46" rx="10" fill="#EB9A6A"></rect><rect x="0" y="54" width="46" height="46" rx="10" fill="#C28F62"></rect><rect x="54" y="54" width="46" height="46" rx="10" fill="#08304A"></rect></svg></div><span dir="ltr">Ligemat</span></div>
            <span className="lg3-x">×</span>
            <div className="lg3-mark"><div className="lg3-tile"><img src="assets/more/more-mark-peach.svg" alt="MORE" /></div><span className="more" dir="ltr">MORE</span></div>
          </div>
          <div className="lg3-more-txt">
            <div className="lg-kicker on-dark">{x.moreKicker}</div>
            <div className="lg3-more-tag" dir={lang === "ar" ? "rtl" : "ltr"}>{x.moreTag}</div>
            <p>{x.moreLine}</p>
          </div>
          <a className="lg3-more-link" href="https://more-re.com" target="_blank" rel="noopener" dir="ltr">more-re.com ↗︎</a>
        </div>
      </div>
    </section>
  );
}
function LgHome3({ t, go, lang }) {
  const c = window.__lg3c;
  const s = c.sections;
  return (
    <>
      <Lg3Hero t={t} c={c} lang={lang} go={go} />
      {s.more && <Lg3More c={c} lang={lang} />}
      {s.how && <section className="lg-sec" data-screen-label="How I work">
        <div className="lg-wrap">
          <div className="lg-sec-head"><div className="lg-kicker">{t.howKicker}</div><h2 className="lg-h2">{t.howTitle}</h2></div>
          <ol className="lg-steps">{t.steps.map(([h, b], i) => <li key={h}><span className="lg-fig sm">{"0" + (i + 1)}</span><h3>{h}</h3><p>{b}</p></li>)}</ol>
        </div>
      </section>}
      {s.who && <section className="lg-sec alt" data-screen-label="Who I work with">
        <div className="lg-wrap lg-split top">
          <div className="lg-stack" style={{ gap: 22 }}>
            <div className="lg-kicker">{t.forKicker}</div>
            {t.forList.map(([h, b]) => <div key={h} className="lg-for"><h3>{h}</h3><p>{b}</p></div>)}
          </div>
          <blockquote className="lg-quote"><p>{t.quote}</p>
            <footer><LgPortrait ratio="1/1" style={{ width: 48 }} /><div><strong>{t.name}</strong><a onClick={() => go("about")}>{t.aboutTeaser} ›</a></div></footer>
          </blockquote>
        </div>
      </section>}
      {s.band && <LgCtaBand t={t} go={go} />}
    </>
  );
}
function LgFooter3({ t, go, openAdmin }) {
  const taps = React.useRef([]);
  const tap = () => {
    const now = Date.now();
    taps.current = taps.current.filter(x => now - x < 700).concat(now);
    if (taps.current.length >= 3) { taps.current = []; openAdmin(); }
  };
  return (
    <footer className="lg-footer">
      <div className="lg-wrap lg-footer-in">
        <a className="lg-brand" onClick={tap} title="Ligemat"><LgMark size={34} /><span className="lg-brand-txt"><b>Ligemat</b><small>Real Estate · Marketing</small></span></a>
        <div className="lg-footer-links">{["about", "book", "contact"].map(k => <a key={k} onClick={() => go(k)}>{t.nav[k]}</a>)}<a href="/v2/" className="lg-v-switch" title="Switch to the classic design">{t.dir === "rtl" ? "التصميم الكلاسيكي ↗︎" : "Classic design ↗︎"}</a></div>
        <div className="lg-footer-meta"><span className="lg-slogan">{t.slogan}</span><span className="lg-mono" dir="ltr">{LG_CONTACT.phone}</span><a href="https://more-re.com" target="_blank" rel="noopener" dir="ltr">{t.visitMore} · more-re.com ↗︎</a><span>© 2026 Ligemat · {t.footer}</span></div>
      </div>
    </footer>
  );
}

// ---------- Admin login (Supabase email + password, owner account only)
function Lg3Login({ onOk, onClose }) {
  const [email, setEmail] = React.useState(""), [pw, setPw] = React.useState("");
  const [err, setErr] = React.useState(""), [busy, setBusy] = React.useState(true);
  React.useEffect(() => {
    if (!window.lgDb || !lgDb.ready) { setErr("Can't reach the database right now."); setBusy(false); return; }
    lgDb.user().then(u => { if (lgDb.isOwner(u)) onOk(); else setBusy(false); }).catch(() => setBusy(false));
  }, []);
  const submit = async () => {
    if (!email || !pw) return setErr("Add your email and password to sign in.");
    setBusy(true); setErr("");
    try {
      const u = await lgDb.signIn(email.trim(), pw);
      if (!lgDb.isOwner(u)) { await lgDb.signOut(); setErr("This account can't edit the site."); setBusy(false); return; }
      onOk();
    } catch (e) { setErr("That email and password didn't match. Try again."); setBusy(false); }
  };
  const key = (e) => e.key === "Enter" && submit();
  return (
    <div className="lg-modal-bg" onClick={onClose}>
      <div className="lg3-pin" onClick={e => e.stopPropagation()} dir="ltr">
        <LgMark size={44} />
        <h2>Admin sign in</h2>
        <p>Website editor · changes go live for everyone</p>
        <label className="lg3-login-l" htmlFor="lg-ad-email">Email</label>
        <input id="lg-ad-email" autoFocus type="email" placeholder="you@example.com" autoComplete="username" value={email} onChange={e => { setEmail(e.target.value); setErr(""); }} onKeyDown={key} className="lg3-pin-in" style={{ letterSpacing: 0, fontSize: 16 }} />
        <label className="lg3-login-l" htmlFor="lg-ad-pw">Password</label>
        <input id="lg-ad-pw" type="password" autoComplete="current-password" value={pw} onChange={e => { setPw(e.target.value); setErr(""); }} onKeyDown={key} className="lg3-pin-in" style={{ letterSpacing: 0, fontSize: 16 }} />
        {err && <span className="lg3-err">{err}</span>}
        <div className="lg-row" style={{ justifyContent: "center" }}><a className="lg-btn ghost on-dark" onClick={onClose}>Cancel</a><a className="lg-btn clay" onClick={busy ? undefined : submit}>{busy ? "…" : "Sign in"}</a></div>
      </div>
    </div>
  );
}

// ---------- Admin shell
function Lg3Admin({ c, save, reset, close }) {
  const [tab, setTab] = React.useState("site");
  React.useEffect(() => { const k = (e) => e.key === "Escape" && close(); window.addEventListener("keydown", k); document.body.style.overflow = "hidden"; return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; }; }, []);
  const signOut = async () => { await lgDb.signOut(); close(); };
  return (
    <div className="lg3-admin" dir="ltr" data-screen-label="Admin">
      <header className="lg3-ad-top">
        <div className="lg-brand"><LgMark size={30} /><span className="lg-brand-txt"><b>Ligemat</b><small>Admin</small></span></div>
        <nav className="lg3-tabs">{[["site", "Website"], ["fin", "Finance"]].map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</nav>
        <button className="lg-btn sm ghost on-dark" onClick={signOut}>Sign out</button>
        <button className="lg-btn sm ghost on-dark" onClick={close}>Exit</button>
      </header>
      <div className="lg3-ad-body">{tab === "site" ? <Lg3SiteEditor c={c} save={save} reset={reset} /> :
        <section className="lg3-card"><h3>Finance</h3><p className="lg3-hint">Your finance dashboard is synced across your devices.</p><a className="lg-btn clay" href="/app" target="_blank" rel="noopener">Open finance dashboard ↗︎</a></section>}</div>
    </div>
  );
}
function Lg3Glow() {
  const r1 = React.useRef(null), r2 = React.useRef(null), wrap = React.useRef(null);
  React.useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let mx = innerWidth * .7, my = innerHeight * .4, p1 = { x: mx, y: my }, p2 = { x: mx, y: my }, idle, raf, live = false;
    const show = (on) => { if (wrap.current) wrap.current.style.opacity = on ? 1 : 0; };
    const mv = (e) => { mx = e.clientX; my = e.clientY; if (!live) { p1 = { x: mx, y: my }; p2 = { x: mx, y: my }; live = true; } show(true); clearTimeout(idle); idle = setTimeout(() => show(false), 900); };
    const tick = () => {
      p1.x += (mx - p1.x) * .08; p1.y += (my - p1.y) * .08; p2.x += (p1.x - p2.x) * .03; p2.y += (p1.y - p2.y) * .03;
      if (r1.current) r1.current.style.transform = "translate(" + (p1.x - 310) + "px," + (p1.y - 310) + "px)";
      if (r2.current) r2.current.style.transform = "translate(" + (p2.x - 260) + "px," + (p2.y - 260) + "px)";
      raf = requestAnimationFrame(tick);
    };
    addEventListener("pointermove", mv, { passive: true });
    addEventListener("pointerleave", () => show(false));
    raf = requestAnimationFrame(tick);
    return () => { removeEventListener("pointermove", mv); cancelAnimationFrame(raf); clearTimeout(idle); };
  }, []);
  return <div ref={wrap} className="lg3-glow" aria-hidden="true"><i ref={r1} className="g1"></i><i ref={r2} className="g2"></i></div>;
}
function LgFab3({ t, lang }) {
  return (
    <div className="lg-fabs">
      <button className="lg-meet-pill lg3-about-pill" onClick={lgOpenMeet}><LgPortrait ratio="1/1" />{lang === "ar" ? "عني" : "About me"}</button>
      <a className="lg-fab lg-tip" href={lgWaLink()} target="_blank" aria-label="WhatsApp"><LgWaIcon s={22} /></a>
    </div>
  );
}
function Lg3AboutModal({ t, lang, go, close }) {
  const x = window.__lg3c[lang];
  React.useEffect(() => { const k = (e) => e.key === "Escape" && close(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  return (
    <div className="lg-modal-bg lg3-about-bg" onClick={close}>
      <div className="lg3-about" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={lang === "ar" ? "عني" : "About me"}>
        <button className="lg-modal-x lg-tip" onClick={close} aria-label="Close">✕</button>
        <div className="lg3-about-top">
          <div className="lg3-about-ph"><img src={LG_CONTACT.photo} alt={t.name} /></div>
          <div className="lg3-about-id">
            <div className="lg-kicker on-dark">{lang === "ar" ? "عني" : "About me"}</div>
            <h2>{t.name}</h2>
            <div className="lg3-roles sm">{x.roles.split("·").map((r, i) => <React.Fragment key={i}>{i > 0 && <span>·</span>}{r.trim()}</React.Fragment>)}</div>
          </div>
        </div>
        <p className="lg3-about-p">{t.aboutBody[0]}</p>
        <blockquote className="lg3-about-q">{t.quote}</blockquote>
        <a className="lg3-about-more" href="https://more-re.com" target="_blank" rel="noopener"><span>{x.moreKicker}</span><b dir="ltr">more-re.com ↗︎</b></a>
        <div className="lg3-about-acts">
          <a className="lg-btn clay" onClick={() => go("book")}>{t.ctaBook}</a>
          <a className="lg-btn ghost on-dark" href={lgWaLink()} target="_blank"><LgWaIcon />{t.ctaWa}</a>
          <a className="lg3-about-link" onClick={() => go("about")}>{t.aboutTeaser} ›</a>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { Lg3Glow, LgFab3, Lg3AboutModal, LG3_BASE_PHOTO, LG3_FIN, LG3_DEFAULT, useLg3Content, LgHome3, LgFooter3, Lg3Login, Lg3Admin, lg3Read });
