function LgHome({ t, go }) {
  return (
    <>
      <LgHeroPortrait t={t} go={go} />
      <section className="lg-sec" data-screen-label="How I work">
        <div className="lg-wrap">
          <div className="lg-sec-head"><div className="lg-kicker">{t.howKicker}</div><h2 className="lg-h2">{t.howTitle}</h2></div>
          <ol className="lg-steps">
            {t.steps.map(([h, b], i) => <li key={h}><span className="lg-fig sm">{"0" + (i + 1)}</span><h3>{h}</h3><p>{b}</p></li>)}
          </ol>
        </div>
      </section>
      <section className="lg-sec alt" data-screen-label="Who I work with">
        <div className="lg-wrap lg-split top">
          <div className="lg-stack" style={{ gap: 22 }}>
            <div className="lg-kicker">{t.forKicker}</div>
            {t.forList.map(([h, b]) => <div key={h} className="lg-for"><h3>{h}</h3><p>{b}</p></div>)}
          </div>
          <blockquote className="lg-quote">
            <p>{t.quote}</p>
            <footer><LgPortrait ratio="1/1" style={{ width: 48 }} /><div><strong>{t.name}</strong><a onClick={() => go("about")}>{t.aboutTeaser} ›</a></div></footer>
          </blockquote>
        </div>
      </section>
      <LgCtaBand t={t} go={go} />
    </>
  );
}

function LgAbout({ t, go }) {
  return (
    <>
      <section className="lg-sec first" data-screen-label="About">
        <div className="lg-wrap lg-split top">
          <div className="lg-stack" style={{ gap: 22 }}>
            <div className="lg-kicker">{t.aboutKicker}</div>
            <h1 className="lg-h1 md">{t.aboutTitle}</h1>
            {t.aboutBody.map((p, i) => <p key={i} className={i === 0 ? "lg-lead" : "lg-body"}>{p}</p>)}
            <div className="lg-meta-row"><span>{t.basedIn}</span><strong>{t.city}</strong></div>
          </div>
          <figure className="lg-split-fig"><LgPortrait /><figcaption><strong>{t.name}</strong><span>{t.role}</span></figcaption></figure>
        </div>
      </section>
      <section className="lg-sec alt" data-screen-label="Values">
        <div className="lg-wrap">
          <div className="lg-sec-head"><div className="lg-kicker">{t.valuesKicker}</div></div>
          <div className="lg-values">{t.values.map(([h, b]) => <div key={h}><h3>{h}</h3><p>{b}</p></div>)}</div>
          <div style={{ marginTop: 48 }}><LgStats t={t} /></div>
        </div>
      </section>
      <LgCtaBand t={t} go={go} />
    </>
  );
}

const LG_SLOTS = Array.from({ length: 18 }, (_, i) => String(10 + Math.floor(i / 2)).padStart(2, "0") + (i % 2 ? ":30" : ":00"));
function lgDays(n) {
  const out = [], d = new Date(); d.setHours(0, 0, 0, 0);
  for (let i = 1; out.length < n; i++) { const x = new Date(d); x.setDate(d.getDate() + i); out.push(x); }
  return out;
}
const lgF = (x) => x.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
function lgRange(date, time) {
  const [h, m] = time.split(":").map(Number);
  const s = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), h - 3, m));
  return [s, new Date(s.getTime() + 30 * 60000)];
}
function lgGcal(date, time, f) {
  const [s, e] = lgRange(date, time);
  const q = new URLSearchParams({ action: "TEMPLATE", text: "Call · " + f.name + " × Ligemat", dates: lgF(s) + "/" + lgF(e), details: "Phone/WhatsApp: " + f.phone + (f.email ? "\nEmail: " + f.email : "") + (f.note ? "\n\n" + f.note : ""), add: LG_CONTACT.email + (f.email ? "," + f.email : ""), ctz: "Africa/Cairo" });
  return "https://calendar.google.com/calendar/render?" + q.toString();
}
function lgIcs(date, time, name) {
  const [s, e] = lgRange(date, time);
  const f = lgF;
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ligemat//EN", "BEGIN:VEVENT", "UID:" + Date.now() + "@ligemat.com", "DTSTAMP:" + f(new Date()), "DTSTART:" + f(s), "DTEND:" + f(e), "SUMMARY:Call with Mohamed A. Osama (Ligemat)", "DESCRIPTION:Booked by " + (name || ""), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })); a.download = "ligemat-call.ics"; a.click();
}

function LgBook({ t, lang }) {
  const loc = lang === "ar" ? "ar-EG" : "en-GB";
  const days = React.useMemo(() => lgDays(14), []);
  const [day, setDay] = React.useState(null);
  const [slot, setSlot] = React.useState(null);
  const [f, setF] = React.useState({ name: "", phone: "", email: "", topic: 0, note: "" });
  const [done, setDone] = React.useState(false);
  const [tried, setTried] = React.useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const dayLabel = (d, o) => d.toLocaleDateString(loc, o);
  const ready = day && slot && f.name.trim() && f.phone.trim();
  const submit = () => { setTried(true); if (ready) setDone(true); };
  if (done) return (
    <section className="lg-sec first" data-screen-label="Booked">
      <div className="lg-wrap lg-stack" style={{ alignItems: "center", textAlign: "center", gap: 22, maxWidth: 640 }}>
        <div className="lg-check">✓</div>
        <h1 className="lg-h1 md">{t.bookedTitle}</h1>
        <div className="lg-booked">
          <div className="lg-fig sm">{dayLabel(day, { weekday: "long", day: "numeric", month: "long" })}</div>
          <div className="lg-fig sm" dir="ltr">{slot} · {t.tz}</div>
          <div>{t.topics[f.topic]} · {f.name}</div>
        </div>
        <p className="lg-body">{t.bookedSub}</p>
        <div className="lg-row" style={{ justifyContent: "center" }}>
          <a className="lg-btn lg" href={lgGcal(day, slot, f)} target="_blank">{t.addGcal}</a>
          <a className="lg-btn lg ghost" onClick={() => lgIcs(day, slot, f.name)}>{t.addCal}</a>
          <a className="lg-btn lg ghost" href={lgWaLink("Hello Osama, I booked a call on " + day.toDateString() + " at " + slot + ". " + f.name)} target="_blank"><LgWaIcon />{t.waConfirm}</a>
        </div>
        <a className="lg-link" onClick={() => { setDone(false); setSlot(null); setDay(null); setTried(false); }}>{t.another}</a>
      </div>
    </section>
  );
  return (
    <section className="lg-sec first" data-screen-label="Book a call">
      <div className="lg-wrap lg-book">
        <div className="lg-stack lg-book-intro" style={{ gap: 18 }}>
          <div className="lg-kicker">{t.bookKicker}</div>
          <h1 className="lg-h1 md">{t.bookTitle}</h1>
          <p className="lg-body">{t.bookSub}</p>
          <div className="lg-letter-id" style={{ marginTop: 10 }}><LgPortrait ratio="1/1" style={{ width: 56 }} /><div className="lg-stack" style={{ gap: 2 }}><strong>{t.name}</strong><span>{t.role}</span></div></div>
        </div>
        <div className="lg-panel">
          <div className="lg-step-l"><span className="lg-fig sm">01</span>{t.stepDate}</div>
          <div className="lg-days">
            {days.map(d => {
              const off = (window.LG_DAYS_OFF || [5]).includes(d.getDay()), on = day && d.getTime() === day.getTime();
              return (
                <button key={d.getTime()} disabled={off} className={"lg-day" + (on ? " on" : "")} onClick={() => { setDay(d); setSlot(null); }}>
                  <span>{dayLabel(d, { weekday: "short" })}</span>
                  <strong className="lg-mono">{dayLabel(d, { day: "numeric" })}</strong>
                  <span>{off ? t.closed : dayLabel(d, { month: "short" })}</span>
                </button>
              );
            })}
          </div>
          <div className="lg-step-l"><span className="lg-fig sm">02</span>{t.stepTime} <em>({t.tz})</em></div>
          <div className={"lg-slots" + (day ? "" : " dim")}>
            {(window.LG_SLOTS_OVERRIDE || LG_SLOTS).map(s => <button key={s} disabled={!day} className={"lg-slot lg-mono" + (slot === s ? " on" : "")} onClick={() => setSlot(s)}>{s}</button>)}
          </div>
          <div className="lg-step-l"><span className="lg-fig sm">03</span>{t.stepDetails}</div>
          <div className="lg-form">
            <label className={tried && !f.name.trim() ? "err" : ""}>{t.fName}<input value={f.name} onChange={set("name")} placeholder={t.pName} /></label>
            <label className={tried && !f.phone.trim() ? "err" : ""}>{t.fPhone}<input dir="ltr" value={f.phone} onChange={set("phone")} placeholder={t.pPhone} /></label>
            <label className="wide">{t.fEmail}<input dir="ltr" type="email" value={f.email} onChange={set("email")} placeholder={t.pEmail} /></label>
            <div className="wide lg-field-l">{t.fTopic}
              <div className="lg-row" style={{ gap: 8 }}>{t.topics.map((x, i) => <button key={x} className={"lg-chip" + (f.topic === i ? " on" : "")} onClick={() => setF({ ...f, topic: i })}>{x}</button>)}</div>
            </div>
            <label className="wide">{t.fNote}<textarea rows="3" value={f.note} onChange={set("note")} placeholder={t.pNote}></textarea></label>
          </div>
          <button className="lg-btn lg block" onClick={submit}>{t.confirm}{day && slot ? " · " + dayLabel(day, { day: "numeric", month: "short" }) + ", " + slot : ""}</button>
          {tried && !(day && slot) && <div className="lg-hint">{t.needDate}</div>}
        </div>
      </div>
    </section>
  );
}

function LgContact({ t, go }) {
  const rows = window.lgChannelRows ? lgChannelRows(t) : [
    [t.ch.wa, LG_CONTACT.phone, lgWaLink(), true],
    [t.ch.email, LG_CONTACT.email, "mailto:" + LG_CONTACT.email, true],
    [t.ch.ig, LG_CONTACT.ig, "https://instagram.com/" + LG_CONTACT.ig.slice(1), true],
    [t.ch.based, t.city, null, false]
  ];
  return (
    <>
      <section className="lg-sec first" data-screen-label="Contact">
        <div className="lg-wrap lg-split top">
          <div className="lg-stack" style={{ gap: 18 }}>
            <div className="lg-kicker">{t.contactKicker}</div>
            <h1 className="lg-h1 md">{t.contactTitle}</h1>
            <p className="lg-lead">{t.contactSub}</p>
            <div className="lg-row" style={{ marginTop: 8 }}>
              <a className="lg-btn lg" href={lgWaLink()} target="_blank"><LgWaIcon />WhatsApp</a>
              <a className="lg-btn lg ghost" onClick={() => go("book")}>{t.ctaBook}</a>
            </div>
          </div>
          <div className="lg-channels">
            {rows.map(([l, v, h, mono]) => {
              const inner = <><span>{l}</span><strong className={mono ? "lg-mono" : ""} dir={mono ? "ltr" : undefined}>{v}</strong>{h && <i>↗</i>}</>;
              return h ? <a key={l} href={h} target="_blank" className="lg-ch">{inner}</a> : <div key={l} className="lg-ch">{inner}</div>;
            })}
          </div>
        </div>
      </section>
    </>
  );
}

Object.assign(window, { LgHome, LgAbout, LgBook, LgContact });
