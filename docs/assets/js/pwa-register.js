import { appUrl } from "./supabase-client.js";

if ("serviceWorker" in navigator) {
  addEventListener("load", () => {
    const version = window.PINKY_APP_VERSION || "1.8.0";
    navigator.serviceWorker
      .register(appUrl(`sw.js?v=${encodeURIComponent(version)}`), { updateViaCache: "none" })
      .then(registration => registration.update().catch(() => {}))
      .catch(error => console.warn("Service worker registration failed", error));
  }, { once: true });
}
