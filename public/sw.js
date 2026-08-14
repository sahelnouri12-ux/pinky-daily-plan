const CACHE = "pinky-daily-plan-v2.1.0-theme253-r5-sf-arabic-1";
const SUPABASE_CDN = "https://unpkg.com/@supabase/supabase-js@2.57.4";
const SHELL = [
  "/", "/index.html", "/app.html", "/reset.html", "/privacy.html", "/admin.html",
  "/config.js", "/manifest.json", "/favicon.ico", "/favicon-16x16.png",
  "/favicon-32x32.png", "/apple-touch-icon.png", "/icon-192.png", "/icon-512.png",
  "/fonts/sf-arabic-thin.woff2", "/fonts/sf-arabic-light.woff2", "/fonts/sf-arabic-regular.woff2",
  "/fonts/sf-arabic-medium.woff2", "/fonts/sf-arabic-semibold.woff2", "/fonts/sf-arabic-bold.woff2",
  "/fonts/sf-arabic-heavy.woff2",
  "/assets/portal.css", "/assets/fonts.css", "/assets/auth.js", "/assets/cloud-bridge.js",
  "/assets/reset.js", "/assets/admin.js", SUPABASE_CDN
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(SHELL.map(url => cache.add(new Request(url, { cache: "reload" }))));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

function navigationFallback(pathname) {
  if (pathname === "/" || pathname === "/login" || pathname.endsWith("/index.html")) return "/index.html";
  if (pathname.endsWith("/reset.html")) return "/reset.html";
  if (pathname.endsWith("/privacy.html")) return "/privacy.html";
  if (pathname.endsWith("/admin.html")) return "/admin.html";
  if (pathname === "/portal" || pathname.endsWith("/app.html")) return "/app.html";
  return "/app.html";
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
        return response;
      } catch {
        return (await caches.match(request)) || (await caches.match(navigationFallback(url.pathname))) || Response.error();
      }
    })());
    return;
  }

  const allowedCrossOrigin = request.url === SUPABASE_CDN || url.origin === self.location.origin;
  if (!allowedCrossOrigin) return;

  if (url.origin === self.location.origin && url.pathname === "/config.js") {
    event.respondWith((async () => {
      try {
        const response = await fetch(new Request(request, { cache: "no-store" }));
        if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
        return response;
      } catch {
        return (await caches.match(request)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    const network = fetch(request).then(async response => {
      if (response && (response.ok || response.type === "opaque")) {
        (await caches.open(CACHE)).put(request, response.clone());
      }
      return response;
    }).catch(() => null);
    return cached || (await network) || Response.error();
  })());
});

self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { payload = { body: event.data?.text() || "" }; }
  const title = payload.title || "Pinky Daily Plan ♡";
  const options = {
    body: payload.body || "یک یادآوری برایت داری.",
    icon: "/icon-192.png?v=14",
    badge: "/icon-192.png?v=14",
    tag: payload.tag || `pinky-${Date.now()}`,
    data: { url: payload.url || "/app.html#today" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification.data?.url || "/app.html#today";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    const existing = list.find(client => new URL(client.url).pathname === "/app.html");
    if (existing) { existing.navigate(target); return existing.focus(); }
    return clients.openWindow(target);
  }));
});
