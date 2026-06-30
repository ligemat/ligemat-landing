# Ligemat landing site — project brief (for Claude Code & Cowork)

This folder is the **single shared working copy** for both Cowork and Claude Code. Both tools edit these files; deploys go out via Git. Always work here: `~/Documents/GitHub/ligemat-landing`.

## What this is
Personal-brand real-estate landing page for **Mohamed A. Osama** (brand: **Ligemat**), a sub-brand of **Bank of Real Estate (BOR)**. Live at **https://ligemat.com**. Static site, content-driven live from Supabase, with a hidden visual admin for editing.

## Stack
- Static HTML/CSS/vanilla JS, **no build step**. Font: Sora. supabase-js v2 from jsDelivr CDN.
- **Supabase** project ref `xdirlxklggepfwvfmgeu` (eu-west-1) — data, auth, image storage.
- **Vercel** project `ligemat-app2` → domain `ligemat.com` (apex→www, HTTPS).
- **GitHub** repo `ligemat/ligemat-landing` (public) → connected to Vercel → push to `main` auto-deploys (~30s).

## Files
- `index.html` — public site. Renders ALL content from Supabase with fallbacks from `content-defaults.js`. Full design notes below.
- `admin.html` — visual inline editor (NOT a form dashboard). Mirrors the homepage; click any text to edit; editable cards for stats/about/locations/developers/units with add/delete; image uploads for portrait, unit images, location images, and the **hero background photo**. One **Save & Publish** writes to Supabase (instant). Supabase Auth login (`iligemat@gmail.com`).
- `content-defaults.js` — `window.LIGEMAT_DEFAULTS`: all default page content + demo units. Shared by index & admin so the page always renders.
- `config.js` — `window.LIGEMAT_CONFIG`: Supabase URL + **publishable** anon key (public-safe), WhatsApp/phone/email/BOR_URL.
- `osama.jpg` — bundled fallback founder photo.
- `CLAUDE.md` (this file) + `.gitignore` are LOCAL only (gitignored) — never deployed.

## Current design system (as of 2026-06-13, commit ec52850)

### Themes
Both themes share the same **"Dusk / Aurora Glass"** aesthetic — deep teal-green world, animated aurora blobs, gold + teal accents. The day/night toggle is a subtle shift between two dark-teal tones, NOT a white-to-dark flip.
- **Dark**: `--bg:#0A0F0D`, aurora blobs at 0.68 opacity, `screen` blend.
- **Light (Dusk)**: `--bg:#13201A`, same gold/teal variables, aurora blobs at 0.80 opacity, `screen` blend. Body: `linear-gradient(160deg,#13211A,#1A2E25,#142219) fixed`.

### ⚠️ Design hard rules
- **NEVER use flat static single-color fills.** Everything must be animated gradients, glass/blur, or translucent over the aurora. Stats strip and developer band are 35% opaque to let aurora show through.
- **For subjective design choices**, build a temporary numbered variant switcher (bottom-left panel, clearly marked `TEMP — DELETE BEFORE DEPLOY`) so the user can click between live options before anything is committed. Never commit a switcher block.
- Scroll reveals use **inline `style.opacity` + `style.transform`** set by JS + a 1600ms safety-net timeout. Do NOT revert to a `.reveal.in { opacity:1 }` CSS class toggle — it got stuck before.

### Aurora
4 animated blobs (`.b1`–`.b4`) fixed behind everything, `mix-blend-mode:screen`:
- b1: teal `#1da882`, top-left, 20s drift
- b2: gold `#caa06d`, top-right, 24s drift
- b3: deep teal `#0f6e56`, bottom-center, 28s drift
- b4: warm gold `#d8b27e`, bottom-right, 26s drift reversed

### Nav
`position:fixed`, fully **transparent** at the top (links forced white with text-shadow over the hero photo). Gains `background:color-mix(in srgb,var(--bg) 55%,transparent)` + `backdrop-filter:blur(14px)` + border + shadow as class `nav.scrolled` when `scrollY > 30`. The **"L" monogram → `admin.html`** (hidden login; public nav shows nothing linking to admin by name).

### Hero
- Exactly `100svh` tall — first screen fills the viewport, stats strip starts below the fold.
- Full-bleed luxury property photo (`content.hero.hero_image` from Supabase) loaded via JS into `header#heroSec` `backgroundImage`. Dark overlay gradient left→right (`rgba(5,10,8,.94)` → `.24`).
- **Headline + CTAs** on the left (max-width 720px), padding `120px 0 96px`.
- **Founder portrait card** (`.founder-tag`, a `<button>`) on the RIGHT, `position:absolute`, vertically centered (`top:50%;transform:translateY(-50%)`), `right:clamp(24px,5vw,80px)`. Size: `312px` wide, photo `288×348px`. On screens ≤1200px: shrinks to 248px / 228×266px photo. On mobile (≤880px): collapses to a small horizontal pill pinned `bottom:22px`, centered.
- Clicking `.founder-tag` opens `#founderModal`: full portrait + bio + contact detail rows (phone, email, Instagram, location) + WhatsApp / Call / Email / Instagram buttons. Portrait synced from Supabase `portrait_url` into both `#portraitImg` (badge) and `#modalPortrait` (popup). Close via ✕ button, clicking the backdrop, or Esc.

### Intro animation
On every fresh page load a full-screen curtain fires:
1. Gold "L" monogram pulses in, "Ligemat" wordmark fades in, gold→teal bar sweeps out.
2. After ~1.8s (or any click/keypress) the curtain's top half slides up and bottom half slides down, revealing the site.
3. Skipped entirely for `prefers-reduced-motion: reduce` users.
- Implemented as `#intro` (fixed, z-index 500). Adding class `done` triggers the split; after 1.6s class `gone` sets `display:none`.

### Other interactions
- **Cursor glow**: 480px radial gradient follows mouse, `mix-blend-mode:screen`.
- **Magnetic buttons**: `.magnetic` class; slight translate on mousemove, snaps back on leave.
- **Count-up stats**: triggered by IntersectionObserver when `#statStrip` enters viewport; eased over 1500ms.

## Supabase data model (ONLY these are Ligemat's)
- **`public.ligemat_units`**: name, developer, tag, price, price_per_m, area, beds, delivery, image_url, is_offer, offer_text, visible, sort_order. RLS: public SELECT where visible=true; authenticated all.
- **`public.ligemat_settings`** (single row id=1): `portrait_url` (text) + `content` (jsonb). RLS: public read; authenticated all. The `content` jsonb holds:
  `hero{eyebrow,headline_pre,headline_accent,subline,lead,name,role,cta_whatsapp,cta_bor,hero_image}`, `stats[{value,label}]`, `about{kicker,title,subtitle,cards[{icon,title,text}]}`, `locations{kicker,title,subtitle,items[{title,sub,image}]}`, `developers{kicker,title,items[{name,tier}]}`, `units_head{kicker,title,subtitle}`, `contact{title,subtitle,cta_whatsapp,cta_phone,phone,email,based,whatsapp,bor_url,instagram}`.
- Storage bucket **`ligemat-media`** (public): folders portrait/, units/, locations/, hero/. RLS scoped to this bucket: public read, authenticated write.
- Auth admin: `iligemat@gmail.com` (password is the user's). Any authenticated user has full write to ligemat_* (fine for single-user trial).

## ⚠️ HARD RULE — BOR isolation (this account also hosts BOR)
NEVER touch anything not `ligemat_*` / `ligemat-media`. Off-limits: Supabase tables developers, developer_projects, units_offplan/resale/rental, leads, bookings, car_rentals, brokers, bot_*, etc.; Vercel projects other than `ligemat-app2` (esp. `bor-internal`, `ligemat`, `ligemat-v3hi/eb4i/z7o1/sz1t`); GitHub repos `ligemat/ligemat` (that's the BOR app!) and `bor-internal`. When unsure, ask.

## Deploy (how a change goes live)
1. Edit files here.
2. Commit + push `main` (GitHub Desktop: Commit→Push, or `git push`).
3. Vercel auto-builds → live on `ligemat.com`. Content/unit edits via the admin publish instantly (no deploy); only code/design changes need a push.

NOTE: In Cowork, deploys were done by pushing from a throwaway `/tmp` clone with a scoped GitHub token, which can leave the local folder "behind" — if so, run: `git fetch origin && git reset --hard origin/main` (clears it). In Claude Code on the Mac there are no permission issues; just commit + push normally.

## Don't
- Don't commit secrets. Only the publishable anon key (public by design) belongs in the repo. Never the service_role key.
- Don't reintroduce the old form-style admin (the admin is the visual/inline editor).
- Don't revert the inline-style scroll reveal to a CSS class toggle (it broke before).
- Don't make either theme a flat white/light page — both themes are dark-teal Aurora Glass.
- Don't commit any `TEMP` switcher or picker blocks — those are local-only previews.

## Possible next ideas (from the user)
Swap the stock hero villa photo for a real listing; tighten RLS later; more interactivity. The BOR `/portal` upgrade (separate repo `ligemat/ligemat`) is its own task — see the BOR prompt the user has.
