const CACHE = "pinky-daily-plan-v1.5.2-sync-cachefix";
const SCOPE = self.registration.scope;
const asset = path => new URL(String(path).replace(/^\/+/, ""), SCOPE).href;
const SUPABASE_CDN = "https://unpkg.com/@supabase/supabase-js@2.57.4";
const SHELL = [
  "./", "index.html", "app.html", "reset.html", "privacy.html", "admin.html",
  "config.js", "manifest.json", "favicon.ico", "favicon-16x16.png",
  "favicon-32x32.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png",
  "assets/portal.css", "assets/auth.js", "assets/cloud-bridge.js",
  "assets/reset.js", "assets/admin.js"
].map(asset).concat(SUPABASE_CDN);

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

function navigationFallback(url) {
  const relative = url.href.startsWith(SCOPE) ? url.href.slice(SCOPE.length).split(/[?#]/)[0] : "";
  if (!relative || relative === "index.html" || relative === "login") return asset("index.html");
  if (relative.endsWith("reset.html")) return asset("reset.html");
  if (relative.endsWith("privacy.html")) return asset("privacy.html");
  if (relative.endsWith("admin.html")) return asset("admin.html");
  return asset("app.html");
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
        return response;
      } catch {
        return (await caches.match(request)) || (await caches.match(navigationFallback(url))) || Response.error();
      }
    })());
    return;
  }

  const sameOriginInScope = url.origin === self.location.origin && url.href.startsWith(SCOPE);
  const allowedCrossOrigin = request.url === SUPABASE_CDN || sameOriginInScope;
  if (!allowedCrossOrigin) return;

  const alwaysFreshPaths = new Set([
    new URL("app.html", SCOPE).pathname,
    new URL("assets/cloud-bridge.js", SCOPE).pathname
  ]);

  if (sameOriginInScope && alwaysFreshPaths.has(url.pathname)) {
    event.respondWith((async () => {
      try {
        const freshRequest = new Request(request, { cache: "no-store" });
        const response = await fetch(freshRequest);
        if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
        return response;
      } catch {
        return (await caches.match(request)) || Response.error();
      }
    })());
    return;
  }

  if (sameOriginInScope && url.pathname === new URL("config.js", SCOPE).pathname) {
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
    icon: asset("icon-192.png?v=15"),
    badge: asset("icon-192.png?v=15"),
    tag: payload.tag || `pinky-${Date.now()}`,
    data: { url: new URL(payload.url || "app.html#today", SCOPE).href }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification.data?.url || asset("app.html#today");
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    const existing = list.find(client => client.url.startsWith(SCOPE));
    if (existing) { existing.navigate(target); return existing.focus(); }
    return clients.openWindow(target);
  }));
});
