importScripts("./assets/js/app-version.js");

const APP_VERSION = self.PINKY_APP_VERSION || "2.1.0";
const CACHE = `pinky-daily-plan-v${APP_VERSION}-auth-portal-theme253-r5-sf-arabic-1`;
const SCOPE = self.registration.scope;
const asset = path => new URL(String(path).replace(/^\/+/, ""), SCOPE).href;
const SUPABASE_CDN = "https://unpkg.com/@supabase/supabase-js@2.57.4";
const SUPABASE_UMD = "https://unpkg.com/@supabase/supabase-js@2.57.4/dist/umd/supabase.js";

const SHELL = [
  "./",
  "index.html",
  "login.html",
  "signup.html",
  "forgot-password.html",
  "reset-password.html",
  "reset.html",
  "verify-email.html",
  "account.html",
  "app.html",
  "privacy.html",
  "admin.html",
  "config.js",
  "manifest.json",
  "favicon.ico",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "fonts/sf-arabic-thin.woff2",
  "fonts/sf-arabic-light.woff2",
  "fonts/sf-arabic-regular.woff2",
  "fonts/sf-arabic-medium.woff2",
  "fonts/sf-arabic-semibold.woff2",
  "fonts/sf-arabic-bold.woff2",
  "fonts/sf-arabic-heavy.woff2",
  "assets/portal.css",
  "assets/fonts.css",
  "assets/auth.js",
  "assets/cloud-bridge.js",
  "assets/reset.js",
  "assets/admin.js",
  "assets/css/auth.css",
  "assets/js/app-version.js",
  "assets/js/supabase-client.js",
  "assets/js/auth-service.js",
  "assets/js/auth-ui.js",
  "assets/js/auth-page.js",
  "assets/js/pwa-register.js",
  "assets/js/reset-compat.js"
].map(asset).concat(SUPABASE_CDN, SUPABASE_UMD);

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(
      SHELL.map(url => cache.add(new Request(url, { cache: "reload" })))
    );
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
  const relative = url.href.startsWith(SCOPE)
    ? url.href.slice(SCOPE.length).split(/[?#]/)[0]
    : "";

  if (!relative || relative === "index.html") return asset("index.html");
  if (relative.endsWith("login.html")) return asset("login.html");
  if (relative.endsWith("signup.html")) return asset("signup.html");
  if (relative.endsWith("forgot-password.html")) return asset("forgot-password.html");
  if (relative.endsWith("reset-password.html")) return asset("reset-password.html");
  if (relative.endsWith("reset.html")) return asset("reset.html");
  if (relative.endsWith("verify-email.html")) return asset("verify-email.html");
  if (relative.endsWith("account.html")) return asset("account.html");
  if (relative.endsWith("privacy.html")) return asset("privacy.html");
  if (relative.endsWith("admin.html")) return asset("admin.html");
  return asset("app.html");
}

function hasSensitiveAuthQuery(url) {
  const sensitiveKeys = [
    "code",
    "token",
    "token_hash",
    "access_token",
    "refresh_token",
    "provider_token"
  ];
  return sensitiveKeys.some(key => url.searchParams.has(key)) ||
    ["recovery", "signup", "email", "email_change"].includes(String(url.searchParams.get("type") || "").toLowerCase());
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(new Request(request, { cache: "no-store" }));
        if (response.ok && !hasSensitiveAuthQuery(url)) {
          const cacheKey = new Request(new URL(url.pathname, SCOPE).href, { method: "GET" });
          (await caches.open(CACHE)).put(cacheKey, response.clone());
        }
        return response;
      } catch {
        return (
          (await caches.match(new Request(new URL(url.pathname, SCOPE).href))) ||
          (await caches.match(navigationFallback(url))) ||
          Response.error()
        );
      }
    })());
    return;
  }

  const sameOriginInScope =
    url.origin === self.location.origin && url.href.startsWith(SCOPE);
  const allowedCrossOrigin =
    request.url === SUPABASE_CDN ||
    request.url === SUPABASE_UMD ||
    sameOriginInScope;

  if (!allowedCrossOrigin) return;

  if (
    sameOriginInScope &&
    url.pathname === new URL("config.js", SCOPE).pathname
  ) {
    event.respondWith((async () => {
      try {
        const response = await fetch(new Request(request, { cache: "no-store" }));
        if (response.ok) {
          (await caches.open(CACHE)).put(request, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(request)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    const network = fetch(request)
      .then(async response => {
        if (response && (response.ok || response.type === "opaque")) {
          (await caches.open(CACHE)).put(request, response.clone());
        }
        return response;
      })
      .catch(() => null);

    return cached || (await network) || Response.error();
  })());
});

self.addEventListener("push", event => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    payload = { body: event.data?.text() || "" };
  }

  const title = payload.title || "Pinky Daily Plan ♡";
  const options = {
    body: payload.body || "یک یادآوری برایت داری.",
    icon: asset(`icon-192.png?v=${APP_VERSION}`),
    badge: asset(`icon-192.png?v=${APP_VERSION}`),
    tag: payload.tag || `pinky-${Date.now()}`,
    data: {
      url: new URL(payload.url || "app.html#today", SCOPE).href
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target =
    event.notification.data?.url || asset("app.html#today");

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(list => {
        const existing = list.find(client => client.url.startsWith(SCOPE));
        if (existing) {
          existing.navigate(target);
          return existing.focus();
        }
        return clients.openWindow(target);
      })
  );
});
