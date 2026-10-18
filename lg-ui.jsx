const LgWaIcon = ({ s = 18 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" /></svg>;
const lgWaLink = (msg) => "https://wa.me/" + LG_CONTACT.wa + (msg ? "?text=" + encodeURIComponent(msg) : "");
const lgOpenMeet = () => window.dispatchEvent(new Event("lg-meet"));

function LgMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", flex: "none" }} aria-hidden="true">
      <rect x="0" y="0" width="46" height="46" rx="10" fill="#EB9A6A" /><rect x="0" y="54" width="46" height="46" rx="10" fill="#C28F62" /><rect x="54" y="54" width="46" height="46" rx="10" fill="#FBF7F1" />
    </svg>
  );
}

function LgPortrait({ ratio = "4/5", style }) {
  const [bad, setBad] = React.useState(false);
  return (
    <div className="lg-portrait" style={{ aspectRatio: ratio, ...style }}>
      {!bad ? <img src={LG_CONTACT.photo} alt="Mohamed A. Osama" onError={() => setBad(true)} /> : <div className="lg-portrait-fallback">MO</div>}
    </div>
  );
}

function LgNav({ t, page, go, toggleLang, dark, mode, toggleMode }) {
  const [open, setOpen] = React.useState(false);
  const items = ["home", "about", "contact"].concat(typeof window !== "undefined" && window.innerWidth <= 430 ? ["book"] : []);
  return (
    <header className={"lg-nav" + (dark ? " dark" : "")}>
      <div className="lg-nav-in">
        <a className="lg-brand" onClick={() => go("home")}><LgMark size={34} /><span className="lg-brand-txt"><b>Ligemat</b><small>Real Estate · Marketing</small></span></a>
        <nav className={"lg-nav-links" + (open ? " open" : "")}>
          {items.map(k => <a key={k} className={page === k ? "on" : ""} onClick={() => { go(k); setOpen(false); }}>{t.nav[k]}</a>)}
          <button className="lg-lang" onClick={toggleLang}>{t.langSwitch}</button>
          {toggleMode && <button className="lg-mode lg-tip" onClick={toggleMode} aria-label={mode === "day" ? "Night mode" : "Day mode"}>{mode === "day" ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7z" /></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" /></svg>}</button>}
        </nav>
        <a className="lg-btn sm" onClick={() => go("book")}>{t.nav.book}</a>
        <button className="lg-burger lg-tip" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"}>{open ? "×" : "≡"}</button>
      </div>
    </header>
  );
}

function LgStats({ t, dark }) {
  return (
    <div className={"lg-stats" + (dark ? " dark" : "")}>
      {t.stats.map(([v, l]) => <div key={l}><div className="lg-fig">{v}</div><div className="lg-stat-l">{l}</div></div>)}
    </div>
  );
}

function LgHeroPortrait({ t, go }) {
  return (
    <section className="lg-hero-portrait" data-screen-label="Hero">
      <div className="lg-hp-photo" onClick={lgOpenMeet}><LgPortrait ratio="auto" style={{ height: "100%", borderRadius: 0 }} /></div>
      <div className="lg-hp-shade"></div>
      <button className="lg-meet-tag" onClick={lgOpenMeet}>{t.tapMeet} ↗︎</button>
      <div className="lg-wrap lg-hp-in">
        <div className="lg-stack" style={{ gap: 26, maxWidth: 620 }}>
          <div className="lg-kicker on-dark">{t.kicker}</div>
          <h1 className="lg-h1 on-dark">{t.h1a} <em>{t.h1b}</em></h1>
          <p className="lg-lead on-dark">{t.sub}</p>
          <div className="lg-row">
            <a className="lg-btn lg clay" onClick={() => go("book")}>{t.ctaBook}</a>
            <a className="lg-btn lg ghost on-dark" href={lgWaLink()} target="_blank"><LgWaIcon />{t.ctaWa}</a>
          </div>
        </div>
        <div className="lg-hp-foot">
          <div><strong>{t.name}</strong><span>{t.role}</span></div>
          <LgStats t={t} dark />
        </div>
      </div>
    </section>
  );
}

function lgChannelRows(t) {
  return [
    [t.ch.wa, LG_CONTACT.phone, lgWaLink(), true],
    [t.ch.email, LG_CONTACT.email, "mailto:" + LG_CONTACT.email, true],
    [t.ch.ig, LG_CONTACT.ig, "https://instagram.com/" + LG_CONTACT.ig.slice(1), true],
    [t.ch.more, "more-re.com", "https://more-re.com", true],
    [t.ch.based, t.city, null, false]
  ];
}

function LgMeetModal({ t, go, close }) {
  React.useEffect(() => { const k = (e) => e.key === "Escape" && close(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  return (
    <div className="lg-modal-bg" onClick={close}>
      <div className="lg-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t.meet}>
        <button className="lg-modal-x lg-tip" onClick={close} aria-label="Close">✕</button>
        <figure className="lg-modal-photo" style={{ margin: 0 }}>
          <LgPortrait ratio="4/4.2" />
          <figcaption><strong>{t.name}</strong><span>{t.role}</span></figcaption>
        </figure>
        <div className="lg-channels">
          {lgChannelRows(t).map(([l, v, h, mono]) => {
            const inner = <><span>{l}</span><strong className={mono ? "lg-mono" : ""} dir={mono ? "ltr" : undefined}>{v}</strong>{h ? <i>↗︎</i> : <i></i>}</>;
            return h ? <a key={l} href={h} target="_blank" className="lg-ch">{inner}</a> : <div key={l} className="lg-ch">{inner}</div>;
          })}
        </div>
        <div className="lg-modal-acts">
          <a className="lg-btn" onClick={() => go("book")}>{t.ctaBook}</a>
          <a className="lg-btn ghost" href={lgWaLink()} target="_blank">WhatsApp</a>
          <a className="lg-btn ghost" href={"tel:" + LG_CONTACT.phone.replace(/\s/g, "")}>{t.call}</a>
          <a className="lg-btn ghost" href={"mailto:" + LG_CONTACT.email}>{t.emailBtn}</a>
          <a className="lg-btn ghost" href={"https://instagram.com/" + LG_CONTACT.ig.slice(1)} target="_blank">IG</a>
        </div>
      </div>
    </div>
  );
}

function LgCtaBand({ t, go }) {
  return (
    <section className="lg-band" data-screen-label="CTA band">
      <div className="lg-wrap lg-band-in">
        <div className="lg-stack" style={{ gap: 10 }}>
          <h2 className="lg-h2 on-dark">{t.bandTitle}</h2>
          <p className="lg-body on-dark">{t.bandSub}</p>
        </div>
        <div className="lg-row">
          <a className="lg-btn lg clay" onClick={() => go("book")}>{t.ctaBook}</a>
          <a className="lg-btn lg ghost on-dark" href={lgWaLink()} target="_blank"><LgWaIcon />WhatsApp</a>
        </div>
      </div>
    </section>
  );
}

function LgFooter({ t, go }) {
  return (
    <footer className="lg-footer">
      <div className="lg-wrap lg-footer-in">
        <a className="lg-brand" onClick={() => go("home")}><LgMark size={34} /><span className="lg-brand-txt"><b>Ligemat</b><small>Real Estate · Marketing</small></span></a>
        <div className="lg-footer-links">
          {["about", "book", "contact"].map(k => <a key={k} onClick={() => go(k)}>{t.nav[k]}</a>)}
        </div>
        <div className="lg-footer-meta"><span className="lg-slogan">{t.slogan}</span><span className="lg-mono" dir="ltr">{LG_CONTACT.phone}</span><a href="https://more-re.com" target="_blank" rel="noopener" dir="ltr">{t.visitMore} · more-re.com ↗︎</a><span>© 2026 Ligemat · {t.footer}</span></div>
      </div>
    </footer>
  );
}

function LgFab({ t }) {
  return (
    <div className="lg-fabs">
      <button className="lg-meet-pill" onClick={lgOpenMeet}><LgPortrait ratio="1/1" />{t.meet}</button>
      <a className="lg-fab lg-tip" href={lgWaLink()} target="_blank" aria-label="WhatsApp"><LgWaIcon s={22} /></a>
    </div>
  );
}

Object.assign(window, { LgWaIcon, lgWaLink, lgOpenMeet, LgMark, LgPortrait, LgNav, LgStats, LgHeroPortrait, lgChannelRows, LgMeetModal, LgCtaBand, LgFooter, LgFab });
