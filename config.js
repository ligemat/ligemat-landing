// ============================================================
// LIGEMAT — configuration
// Paste your Supabase project values below (from the setup guide).
// Both values are SAFE to be public — the database is protected by
// Row Level Security, so the site can only read units you mark visible.
// ============================================================

window.LIGEMAT_CONFIG = {
  // Supabase → Project Settings → Data API → Project URL
  SUPABASE_URL: "https://xdirlxklggepfwvfmgeu.supabase.co",

  // Supabase publishable key (safe to be public; database is protected by RLS)
  SUPABASE_ANON_KEY: "sb_publishable_cgKDImKevrJct2z-WcAh4w_uh084cDk",

  // Your contact details (used across the site)
  WHATSAPP: "201507785755",        // international format, no + or spaces
  PHONE_DISPLAY: "0150 778 5755",
  EMAIL: "hello@ligemat.com",
  BOR_URL: "https://bank-re.com",  // Bank of Real Estate website

  // ---- Book-a-call calendar ----
  // Leave BOOKING_FN_URL empty to run the picker in DEMO mode (no real save / sync).
  // Once the Supabase Edge Function is deployed, paste its URL here to go live.
  BOOKING_FN_URL: "https://xdirlxklggepfwvfmgeu.supabase.co/functions/v1/ligemat-book",
  BOOKING: {
    tz: "Africa/Cairo",           // YOUR timezone — availability hours below are in this zone.
                                   // Visitors always SEE times in their own local timezone.
    days: [0,1,2,3,4,6],          // available weekdays (0=Sun … 6=Sat); default = all except Friday
    times: ["16:00","17:00","18:00","19:00","20:00"], // EXACT times offered (your time, 24h).
                                   // Only these show in the picker; visitors see them in their own timezone.
                                   // Leave empty ([]) to fall back to the startHour→endHour grid below.
    startHour: 9,                 // (fallback only when times[] is empty) first bookable slot start
    endHour: 23,                  // (fallback only) last slot must END by this hour (your time)
    preferredStart: 16,           // "best time" band start = 4 PM (your time)
    preferredEnd: 21,             // "best time" band end = 9 PM (your time)
    slotMin: 30,                  // call length in minutes
    leadHours: 3,                 // earliest bookable time from now
    horizonDays: 45               // how far ahead bookings are allowed
  }
};
