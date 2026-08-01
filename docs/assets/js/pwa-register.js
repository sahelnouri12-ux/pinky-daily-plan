import { appUrl } from "./supabase-client.js";

if ("serviceWorker" in navigator) {
  addEventListener("load", () => {
    navigator.serviceWorker
      .register(appUrl("sw.js?v=1.6.0"), { updateViaCache: "none" })
      .then(registration => registration.update().catch(() => {}))
      .catch(error => console.warn("Service worker registration failed", error));
  }, { once: true });
}
