// Ligemat v5 — Supabase storage + login for the website editor.
// Content lives in ligemat_settings (id=1) under content.v5, so the old /v2 content stays untouched.
// Images go to the public "ligemat-media" bucket.
(function () {
  var C = window.LIGEMAT_CONFIG || {};
  var sb = null;
  try { sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY); } catch (e) { console.warn("Supabase not available", e); }

  function parse(c) { if (!c) return {}; if (typeof c === "string") { try { return JSON.parse(c); } catch (e) { return {}; } } return c; }

  window.lgDb = {
    ready: !!sb,
    load: async function () {
      if (!sb) return null;
      var r = await sb.from("ligemat_settings").select("content").eq("id", 1).maybeSingle();
      if (r.error || !r.data) return null;
      return parse(r.data.content).v5 || null;
    },
    save: async function (v5) {
      if (!sb) throw new Error("Database not available");
      var s = await sb.auth.getSession();
      if (!s.data.session) throw new Error("Please sign in again");
      var r = await sb.from("ligemat_settings").select("content").eq("id", 1).single();
      if (r.error) throw r.error;
      var wasText = typeof r.data.content === "string";
      var c = parse(r.data.content); c.v5 = v5;
      var u = await sb.from("ligemat_settings").update({ content: wasText ? JSON.stringify(c) : c }).eq("id", 1).select("id");
      if (u.error) throw u.error;
      if (!u.data || !u.data.length) throw new Error("Save was blocked. Check you are signed in with the admin account.");
    },
    user: async function () { if (!sb) return null; var s = await sb.auth.getSession(); return s.data.session ? s.data.session.user : null; },
    isOwner: function (u) { return !!u && (!C.OWNER_UID || u.id === C.OWNER_UID); },
    signIn: async function (email, pw) {
      if (!sb) throw new Error("Database not available");
      var r = await sb.auth.signInWithPassword({ email: email, password: pw });
      if (r.error) throw r.error;
      return r.data.user;
    },
    signOut: async function () { if (sb) await sb.auth.signOut(); },
    upload: async function (blob, folder) {
      if (!sb) throw new Error("Database not available");
      var path = folder + "/v5-" + Date.now() + ".jpg";
      var r = await sb.storage.from("ligemat-media").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (r.error) throw r.error;
      return sb.storage.from("ligemat-media").getPublicUrl(path).data.publicUrl;
    }
  };
})();
