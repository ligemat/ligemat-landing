// Ligemat v5 — app shell.
const PAGES = ["home", "about", "book", "contact"];
function App() {
  const [c, save, reset] = useLg3Content();
  window.__lg3c = c;
  const [admin, setAdmin] = React.useState(null);
  const read = () => { const h = location.hash.slice(1); return PAGES.includes(h) ? h : "home"; };
  const [page, setPage] = React.useState(read);
  const [lang, setLang] = React.useState(() => localStorage.getItem("lg-lang") || "en");
  const [meet, setMeet] = React.useState(false);
  React.useEffect(() => { const f = () => document.documentElement.classList.toggle("lg-scrolled", window.scrollY > 40); f(); window.addEventListener("scroll", f, { passive: true }); return () => window.removeEventListener("scroll", f); }, []);
  const [mode, setMode] = React.useState(() => localStorage.getItem("lg3-mode") || "day");
  React.useEffect(() => { document.documentElement.dataset.mode = mode; localStorage.setItem("lg3-mode", mode); }, [mode]);
  React.useEffect(() => { const f = () => setPage(read()); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  React.useEffect(() => { const f = () => setMeet(true); window.addEventListener("lg-meet", f); return () => window.removeEventListener("lg-meet", f); }, []);
  const [leaving, setLeaving] = React.useState(false);
  const go = (p) => { setMeet(false); if (p === page) { window.scrollTo({ top: 0, behavior: "smooth" }); return; } setLeaving(true); setTimeout(() => { history.replaceState(null, "", "#" + p); setPage(p); window.scrollTo(0, 0); setLeaving(false); }, 220); };
  const t = LG_T[lang];
  React.useEffect(() => { document.documentElement.dir = t.dir; document.documentElement.lang = lang; localStorage.setItem("lg-lang", lang); }, [lang]);
  // a11y: links used as buttons (no href) become keyboard-reachable buttons
  React.useEffect(() => {
    document.querySelectorAll("a:not([href])").forEach(a => { if (!a.hasAttribute("tabindex")) { a.setAttribute("tabindex", "0"); a.setAttribute("role", "button"); } });
  });
  React.useEffect(() => { const k = (e) => { const a = e.target; if ((e.key === "Enter" || e.key === " ") && a && a.matches && a.matches('a[role="button"]:not([href])')) { e.preventDefault(); a.click(); } }; document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, []);
  const toggleLang = () => setLang(lang === "en" ? "ar" : "en");
  const P = { home: LgHome5, about: LgAbout, book: LgBook, contact: LgContact }[page];
  return (
    <>
      <LgNav t={t} page={page} go={go} toggleLang={toggleLang} dark={page === "home"} mode={mode} toggleMode={() => setMode(mode === "day" ? "night" : "day")} />
      <main key={page + lang + JSON.stringify(c).length} className={"lg-page" + (leaving ? " out" : "")}><P t={t} go={go} lang={lang} /></main>
      <LgFooter3 t={t} go={go} openAdmin={() => setAdmin("pin")} />
      <LgFab3 t={t} lang={lang} />
      <Lg3Glow />
      {admin === "pin" && <Lg3Login onOk={() => setAdmin("open")} onClose={() => setAdmin(null)} />}
      {admin === "open" && <Lg3Admin c={c} save={save} reset={reset} close={() => setAdmin(null)} />}
      {meet && <Lg3AboutModal t={t} lang={lang} go={go} close={() => setMeet(false)} />}
    </>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
