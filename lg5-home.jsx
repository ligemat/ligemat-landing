// Ligemat v5 — personal brand site from the 18 Oct brief.
const LG5_BG = "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=2400&q=90";
const LG5 = {
  en: {
    h1a: "I don't sell directions.", h1b: "I help you find yours.",
    sub: "Not a broker. A curator and a guide.",
    talk: "Talk to me", how: "How I work",
    noKicker: "Why I say no",
    noStory: ["An investor wanted to buy a villa. He needed a fast, easy exit. The villa was in a weak location, hard to resell, slow to move.", "I told him no. Not because it was a bad villa, but because it was wrong for him."],
    noLine: "Some things are good, just not good for you.",
    cKicker: "The compass · How I work", cTitle: "Three questions before any option.",
    qs: [["Who are you?", "Family, investor, resident, or first-time buyer. Each needs something different."], ["How do you live?", "Kids, car, quiet or social, 3 years or 10+. Lifestyle comes before price."], ["Is it truly solid?", "Developer, location, value, resale. If it's weak, you never see it."]],
    cResult: "No more than three options. Each with a clear reason.",
    cLine: "My job is to help you find your True North.",
    oKicker: "What I offer",
    offer: [["Real estate guidance", "Only what fits you, never more than three options."], ["Sales consultations", "Helping any business sell through trust, not pressure."], ["Marketing & creative direction", "CIM-certified strategy, with a media-production eye."]],
    stats: [["60+", "families guided"], ["5", "areas"], ["2021", "in real estate since"], ["COO", "Aqar TV"]],
    sKicker: "My story",
    story: [["Childhood", "Raised in a TV and media production world."], ["Nov 2021", "Aqar TV launches (test broadcast). Media production → networking & satellite → COO."], ["Nov 2022", "MORE Real Estate founded in Khartoum, with Aqar TV as partner."], ["2023", "Crisis in Sudan, one month before launch. Move to Cairo."], ["May 2023", "Started registering MORE in Cairo."], ["Nov 2023", "MORE officially registered in Cairo."], ["8 Aug 2026", "First office opens."]],
    aKicker: "Areas I know", areas: ["Nasr City", "Madinaty", "Rehab", "New Cairo", "New Capital"], badge: "TMG Ambassador",
    tKicker: "Trust",
    certs: [["CIM Level 3 Foundation Certificate in Professional Digital Marketing", "With Distinction · October 2025"], ["CIM Level 3 Award in Content and Channels", "October 2025"]],
    quote: "A good word is a passport.",
    kKicker: "Contact", kTitle: "Talk to me.", kSub: "WhatsApp is the quickest. I usually reply within the hour.",
    visitMore: "Visit MORE", slogan: "Made for More."
  },
  ar: {
    h1a: "لا أبيعك الاتجاه،", h1b: "بل أساعدك في إيجاد اتجاهك.",
    sub: "لستُ وسيطًا، بل منسّقٌ ومرشد.",
    talk: "تحدّث معي", how: "طريقة عملي",
    noKicker: "لماذا أقول لا",
    noStory: ["أراد مستثمر أن يشتري فيلا، وكان يحتاج إلى خروج سريع وسهل. الفيلا في موقع ضعيف، صعبة إعادة البيع وبطيئة الحركة.", "قلت له لا. ليس لأنها فيلا سيئة، بل لأنها لم تكن مناسبة له."],
    noLine: "بعض الأشياء جيدة، لكنها ليست جيدة لك.",
    cKicker: "البوصلة · طريقة عملي", cTitle: "ثلاثة أسئلة قبل أي خيار.",
    qs: [["من أنت؟", "أسرة، مستثمر، مقيم، أو مشترٍ لأول مرة. لكلٍّ منهم احتياج مختلف."], ["كيف تعيش؟", "أطفال، سيارة، هدوء أو حياة اجتماعية، 3 سنوات أو أكثر من 10. نمط الحياة قبل السعر."], ["هل هو متين حقاً؟", "المطوّر، الموقع، القيمة، إعادة البيع. إن كان ضعيفاً، لن تراه أبداً."]],
    cResult: "ثلاثة خيارات على الأكثر، ولكل منها سبب واضح.",
    cLine: "مهمتي أن أساعدك على إيجاد شمالك الحقيقي.",
    oKicker: "ما أقدّمه",
    offer: [["إرشاد عقاري", "فقط ما يناسبك، ولا أكثر من ثلاثة خيارات."], ["استشارات مبيعات", "أساعد أي نشاط على البيع بالثقة، لا بالضغط."], ["تسويق وإدارة إبداعية", "استراتيجية معتمدة من CIM، بعين خبير في الإنتاج الإعلامي."]],
    stats: [["+60", "أسرة أرشدتها"], ["5", "مناطق"], ["2021", "في العقارات منذ"], ["COO", "عقار TV"]],
    sKicker: "قصتي",
    story: [["الطفولة", "نشأت في عالم الإنتاج التلفزيوني والإعلامي."], ["نوفمبر 2021", "انطلاق عقار TV (بث تجريبي). الإنتاج الإعلامي ← الشبكات والأقمار الصناعية ← مدير العمليات."], ["نوفمبر 2022", "تأسيس MORE العقارية في الخرطوم، بشراكة مع عقار TV."], ["2023", "الأزمة في السودان، قبل الإطلاق بشهر. الانتقال إلى القاهرة."], ["مايو 2023", "بدء تسجيل MORE في القاهرة."], ["نوفمبر 2023", "تسجيل MORE رسمياً في القاهرة."], ["8 أغسطس 2026", "افتتاح أول مكتب."]],
    aKicker: "مناطق أعرفها", areas: ["مدينة نصر", "مدينتي", "الرحاب", "القاهرة الجديدة", "العاصمة الإدارية"], badge: "سفير TMG",
    tKicker: "الثقة",
    certs: [["CIM Level 3 Foundation Certificate in Professional Digital Marketing", "بامتياز · أكتوبر 2025"], ["CIM Level 3 Award in Content and Channels", "أكتوبر 2025"]],
    quote: "الكلمة الطيبة جواز سفر.",
    kKicker: "تواصل", kTitle: "تحدّث معي.", kSub: "واتساب هو الأسرع. أرد عادةً خلال ساعة.",
    visitMore: "زيارة MORE", slogan: "Made for More."
  }
};
LG3_DEFAULT.heroBg = LG5_BG;
["en", "ar"].forEach(l => {
  Object.assign(LG3_DEFAULT[l], { h1a: LG5[l].h1a, h1b: LG5[l].h1b, sub: LG5[l].sub });
  Object.assign(LG_T[l], { slogan: LG5[l].slogan, stats: LG5[l].stats.slice(0, 2) });
});
const lg5To = (id) => { const el = document.getElementById(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: "smooth" }); };

function Lg5Hero({ t, c, lang, x }) {
  const y = c[lang];
  return (
    <section className="lg3-hero lg5-hero" data-screen-label="Hero">
      <div className="lg3-hero-bg" style={{ backgroundImage: "url(" + c.heroBg + ")" }}></div>
      <div className="lg3-hero-shade"></div>
      <div className="lg3-hero-in lg-wrap">
        <div className="lg3-hero-txt">
          <h1 className="lg3-h1 lg5-h1">{y.h1a}<br /><em>{y.h1b}</em></h1>
          <p className="lg3-lead">{y.sub}</p>
          <div className="lg-row">
            <a className="lg-btn lg clay" href={lgWaLink()} target="_blank"><LgWaIcon />{x.talk}</a>
            <a className="lg-btn lg ghost on-dark" onClick={() => lg5To("lg5-compass")}>{x.how}</a>
          </div>
        </div>
        <div className="lg3-arch-wrap">
          <button className="lg3-arch" onClick={lgOpenMeet} aria-label={t.meet}><img src={LG_CONTACT.photo} alt={t.name} /></button>
          <div className="lg3-tag"><b>{t.name}</b><span>·</span>{y.moreKicker.replace(/^Founder of /, "Founder, ")}</div>
        </div>
      </div>
    </section>
  );
}

function LgHome5({ t, go, lang }) {
  const c = window.__lg3c, x = LG5[lang];
  return (
    <>
      <Lg5Hero t={t} c={c} lang={lang} x={x} />

      <section className="lg-sec" data-screen-label="The no story">
        <div className="lg-wrap lg5-no">
          <div className="lg-kicker">{x.noKicker}</div>
          <div className="lg5-no-body">{x.noStory.map((p, i) => <p key={i}>{p}</p>)}</div>
          <p className="lg5-no-line">{x.noLine}</p>
        </div>
      </section>

      <section className="lg-sec alt" id="lg5-compass" data-screen-label="The compass">
        <div className="lg-wrap">
          <div className="lg-sec-head"><div className="lg-kicker">{x.cKicker}</div><h2 className="lg-h2">{x.cTitle}</h2></div>
          <div className="lg5-qs">{x.qs.map(([q, a], i) => <article key={q} className="lg5-q"><span className="lg-fig sm">{"0" + (i + 1)}</span><h3>{q}</h3><p>{a}</p></article>)}</div>
          <div className="lg5-result"><strong>{x.cResult}</strong><span>{x.cLine}</span></div>
        </div>
      </section>

      <section className="lg-sec" data-screen-label="What I offer">
        <div className="lg-wrap">
          <div className="lg-sec-head"><div className="lg-kicker">{x.oKicker}</div></div>
          <div className="lg5-offer">{x.offer.map(([h, b]) => <article key={h}><h3>{h}</h3><p>{b}</p></article>)}</div>
          <div className="lg5-stats">{x.stats.map(([v, l]) => <div key={l}><b className="lg-mono">{v}</b><span>{l}</span></div>)}</div>
        </div>
      </section>

      <section className="lg-sec alt" data-screen-label="My story">
        <div className="lg-wrap lg5-story-wrap">
          <div className="lg-kicker">{x.sKicker}</div>
          <ol className="lg5-story">{x.story.map(([w, d]) => <li key={w}><span className="lg-mono">{w}</span><p>{d}</p></li>)}</ol>
        </div>
      </section>

      <section className="lg-sec" data-screen-label="Areas and trust">
        <div className="lg-wrap lg5-two">
          <div className="lg-stack" style={{ gap: 18 }}>
            <div className="lg-kicker">{x.aKicker}</div>
            <div className="lg5-areas">{x.areas.map(a => <span key={a}>{a}</span>)}</div>
            <div className="lg5-badge">{x.badge}</div>
          </div>
          <div className="lg-stack" style={{ gap: 18 }}>
            <div className="lg-kicker">{x.tKicker}</div>
            {x.certs.map(([n, d]) => <div key={n} className="lg5-cert"><span className="lg5-cim">CIM</span><div><b dir="ltr">{n}</b><span>{d}</span></div></div>)}
          </div>
        </div>
        <div className="lg-wrap"><blockquote className="lg5-quote">“{x.quote}”</blockquote></div>
      </section>

      <section className="lg-sec alt" data-screen-label="Contact">
        <div className="lg-wrap lg5-contact">
          <div className="lg-stack" style={{ gap: 14 }}>
            <div className="lg-kicker">{x.kKicker}</div>
            <h2 className="lg-h2">{x.kTitle}</h2>
            <p className="lg-body">{x.kSub}</p>
            <div className="lg-row" style={{ marginTop: 8 }}>
              <a className="lg-btn lg clay" href={lgWaLink()} target="_blank"><LgWaIcon />{t.ctaWa}</a>
              <a className="lg-btn lg ghost" href="https://more-re.com" target="_blank" rel="noopener">{x.visitMore} ↗︎</a>
            </div>
          </div>
          <ul className="lg5-ch">
            <li><span>{t.ch.wa}</span><a className="lg-mono" dir="ltr" href={lgWaLink()} target="_blank">{LG_CONTACT.phone}</a></li>
            <li><span>{t.ch.email}</span><a dir="ltr" href={"mailto:" + LG_CONTACT.email}>{LG_CONTACT.email}</a></li>
            <li><span>{t.ch.ig}</span><a dir="ltr" href={"https://instagram.com/" + LG_CONTACT.ig.replace("@", "")} target="_blank">{LG_CONTACT.ig}</a></li>
            <li><span>MORE</span><a className="lg-mono" dir="ltr" href="https://more-re.com" target="_blank" rel="noopener">more-re.com ↗︎</a></li>
          </ul>
        </div>
      </section>
    </>
  );
}
Object.assign(window, { LG5, LgHome5 });
