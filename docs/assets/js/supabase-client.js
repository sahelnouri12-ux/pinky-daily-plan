const CONFIG = window.PINKY_PORTAL_CONFIG || {};
const listeners = new Set();
let client = null;
let authSubscription = null;

export const appUrl = (path = "") =>
  window.PinkyAppUrl
    ? window.PinkyAppUrl(path)
    : new URL(String(path).replace(/^\/+/, ""), location.href).href;

export function isConfigured() {
  return Boolean(
    CONFIG.supabaseUrl &&
    CONFIG.supabaseAnonKey &&
    !String(CONFIG.supabaseUrl).includes("YOUR_") &&
    !String(CONFIG.supabaseAnonKey).includes("YOUR_")
  );
}

export async function waitForSupabase(timeoutMs = 8000) {
  const started = Date.now();
  while (!window.supabase?.createClient) {
    if (Date.now() - started > timeoutMs) throw new Error("supabase-library-unavailable");
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

export async function getSupabaseClient() {
  if (client) return client;
  if (!isConfigured()) throw new Error("portal-not-configured");
  await waitForSupabase();
  client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: { headers: { "X-Client-Info": `pinky-auth-portal/${window.PINKY_APP_VERSION || "2.4.6"}` } }
  });
  const { data } = client.auth.onAuthStateChange((event, session) => {
    for (const listener of listeners) {
      try { listener(event, session); } catch (error) { console.error("Auth listener failed", error); }
    }
  });
  authSubscription = data.subscription;
  return client;
}

export function subscribeAuth(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function destroyAuthClient() {
  authSubscription?.unsubscribe?.();
  authSubscription = null;
  listeners.clear();
}

export function withTimeout(promise, timeoutMs = 12000, code = "request-timeout") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(code)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function safeNextPath(rawValue) {
  if (!rawValue) return appUrl("app.html");
  try {
    const decoded = decodeURIComponent(rawValue);
    const candidate = new URL(decoded, location.href);
    const base = new URL(appUrl("./"));
    if (candidate.origin !== base.origin) return appUrl("app.html");
    if (!candidate.pathname.startsWith(base.pathname)) return appUrl("app.html");
    const relative = candidate.pathname.slice(base.pathname.length);
    const denied = /^(?:login|signup|forgot-password|reset-password|reset|verify-email|index)\.html$/i;
    if (denied.test(relative)) return appUrl("app.html");
    return candidate.href;
  } catch {
    return appUrl("app.html");
  }
}

export function currentLanguage() {
  return document.documentElement.lang === "en" ? "en" : "fa";
}

export function functionUrl(name) {
  return `${String(CONFIG.supabaseUrl || "").replace(/\/$/, "")}/functions/v1/${encodeURIComponent(name)}`;
}

export function publicConfig() {
  return { ...CONFIG };
}
