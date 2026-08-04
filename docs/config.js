(() => {
  "use strict";
  const scriptUrl = document.currentScript?.src || location.href;
  const baseUrl = new URL("./", scriptUrl).href;
  window.PINKY_APP_BASE = baseUrl;
  window.PinkyAppUrl = (path = "") => new URL(String(path).replace(/^\/+/, ""), baseUrl).href;
  window.PINKY_PORTAL_CONFIG = {
    supabaseUrl: "https://hearabknorkmjlchnaue.supabase.co",
    supabaseAnonKey: "sb_publishable_hMCz4BDqLbt2TCbpLgvlUw_SLdlA9l_",
    vapidPublicKey: "BAt5szS3OrDvIGF9IKLl4ldfqm3Bh-7-Exv4KOYJWBjoatW2Nb71OEw_zbRM4pnTsN0o96Gf59B1fMNCRDUYxWk",
    appName: "Pinky Daily Plan",
    portalVersion: globalThis.PINKY_APP_VERSION || "2.4.3",
    hosting: "github-pages-supabase"
  };
})();
