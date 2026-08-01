(() => {
  "use strict";

  const STORAGE_KEY = "pinky-day-planner-v1";
  const META_PREFIX = "pinky-day-cloud-meta:";
  const CONFLICT_BACKUP_KEY = "pinky-day-cloud-conflict-backup";
  const config = window.PINKY_PORTAL_CONFIG || {};
  const isConfigured = Boolean(
    config.supabaseUrl && config.supabaseAnonKey &&
    !String(config.supabaseUrl).includes("YOUR_") &&
    !String(config.supabaseAnonKey).includes("YOUR_")
  );


  const storage = {
    get(key) { try { return window.localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { window.localStorage.setItem(key, value); return true; } catch { return false; } },
    remove(key) { try { window.localStorage.removeItem(key); return true; } catch { return false; } }
  };

  let client = null;
  let session = null;
  let user = null;
  let profile = null;
  let currentRevision = 0;
  let currentRemoteUpdatedAt = null;
  let lastSerialized = "";
  let pendingSerialized = "";
  let syncTimer = null;
  let syncing = false;
  let bootstrapped = false;
  let realtimeChannel = null;
  let statusState = "syncing";
  let statusDetail = "";

  const deviceId = (() => {
    try {
      let value = storage.get("pinkyDeviceId");
      if (!value) {
        value = `dev-${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
        storage.set("pinkyDeviceId", value);
      }
      return value;
    } catch {
      return `dev-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  })();

  const tr = (fa, en) => document.documentElement.lang === "en" ? en : fa;
  const metaKey = () => user ? `${META_PREFIX}${user.id}` : `${META_PREFIX}anonymous`;
  const readMeta = () => {
    try { return JSON.parse(storage.get(metaKey()) || "null") || {}; }
    catch { return {}; }
  };
  const writeMeta = patch => {
    try {
      const next = { ...readMeta(), ...patch, userId: user?.id || null };
      storage.set(metaKey(), JSON.stringify(next));
    } catch {}
  };
  const parseState = raw => {
    if (!raw) return null;
    try {
      const value = typeof raw === "string" ? JSON.parse(raw) : raw;
      return value && typeof value === "object" ? value : null;
    } catch { return null; }
  };

  function setStatus(state, detail = "") {
    statusState = state;
    statusDetail = detail;
    const dot = document.getElementById("portalSyncDot");
    const text = document.getElementById("portalSyncText");
    if (dot) dot.dataset.state = state;
    if (text) {
      const labels = {
        synced: tr("همگام‌سازی شد", "Synced"),
        syncing: tr("در حال همگام‌سازی…", "Syncing…"),
        offline: tr("آفلاین؛ تغییرات در دستگاه محفوظ است", "Offline; changes are saved on this device"),
        error: tr("خطای همگام‌سازی", "Sync error"),
        local: tr("ذخیره محلی", "Saved locally")
      };
      text.textContent = detail || labels[state] || labels.local;
      text.title = text.textContent;
    }
  }

  async function fetchRemoteState() {
    const { data, error } = await client
      .from("user_data")
      .select("data,schema_version,revision,device_id,updated_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  function placeRemoteState(remote) {
    const remoteState = parseState(remote?.data);
    if (!remoteState) return false;
    const previous = storage.get(STORAGE_KEY);
    if (previous && previous !== JSON.stringify(remoteState)) {
      try { storage.set(`${STORAGE_KEY}-before-cloud-load`, previous); } catch {}
    }
    const serialized = JSON.stringify(remoteState);
    const stored = storage.set(STORAGE_KEY, serialized);
    if (!stored) window.__PINKY_BOOT_STATE__ = remoteState;
    currentRevision = Number(remote.revision) || 0;
    currentRemoteUpdatedAt = remote.updated_at || null;
    lastSerialized = serialized;
    writeMeta({
      dirty: false,
      localUpdatedAt: remote.updated_at || new Date().toISOString(),
      remoteUpdatedAt: remote.updated_at || null,
      revision: currentRevision
    });
    return true;
  }

  async function saveSerialized(serialized, { force = false } = {}) {
    const state = parseState(serialized);
    if (!state) throw new Error("Invalid local state");
    const expectedRevision = force ? null : (currentRevision || null);
    const { data, error } = await client.rpc("save_pinky_state", {
      p_data: state,
      p_schema_version: Number(state.schemaVersion) || 15,
      p_device_id: deviceId,
      p_expected_revision: expectedRevision
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    currentRevision = Number(row?.revision) || Math.max(1, currentRevision + 1);
    currentRemoteUpdatedAt = row?.updated_at || new Date().toISOString();
    lastSerialized = serialized;
    pendingSerialized = "";
    writeMeta({
      dirty: false,
      localUpdatedAt: currentRemoteUpdatedAt,
      remoteUpdatedAt: currentRemoteUpdatedAt,
      revision: currentRevision
    });
    setStatus("synced");
  }

  async function bootstrapData() {
    const localRaw = storage.get(STORAGE_KEY) || "";
    const localState = parseState(localRaw);
    const meta = readMeta();
    let remote = null;

    try {
      remote = await fetchRemoteState();
    } catch (error) {
      console.warn("Pinky Daily Plan cloud bootstrap failed; local mode continues.", error);
      lastSerialized = localState ? JSON.stringify(localState) : "";
      setStatus(navigator.onLine ? "error" : "offline");
      return;
    }

    if (!remote) {
      if (localState) {
        const serialized = JSON.stringify(localState);
        await saveSerialized(serialized, { force: true });
      } else {
        currentRevision = 0;
        currentRemoteUpdatedAt = null;
        lastSerialized = "";
        writeMeta({ dirty: false, revision: 0, remoteUpdatedAt: null });
        setStatus("synced");
      }
      return;
    }

    const remoteTime = Date.parse(remote.updated_at || "") || 0;
    const localTime = Date.parse(meta.localUpdatedAt || "") || 0;
    const belongsToUser = meta.userId === user.id;
    const hasUnsyncedLocal = Boolean(belongsToUser && meta.dirty && localState);

    if (hasUnsyncedLocal && localTime > remoteTime) {
      try {
        await saveSerialized(JSON.stringify(localState), { force: false });
        return;
      } catch (error) {
        if (!isRevisionConflict(error)) throw error;
        try { storage.set(CONFLICT_BACKUP_KEY, JSON.stringify(localState)); } catch {}
      }
    }

    placeRemoteState(remote);
    setStatus("synced");
  }

  function isRevisionConflict(error) {
    const message = String(error?.message || error?.details || "").toLowerCase();
    return error?.code === "40001" || message.includes("revision_conflict") || message.includes("serialization");
  }

  async function flushSync() {
    if (!bootstrapped || syncing || !pendingSerialized || !user) return;
    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }
    syncing = true;
    const serialized = pendingSerialized;
    try {
      setStatus("syncing");
      await saveSerialized(serialized);
    } catch (error) {
      console.warn("Pinky Daily Plan cloud sync failed.", error);
      if (isRevisionConflict(error)) {
        const remote = await fetchRemoteState().catch(() => null);
        showConflict(remote, serialized);
      } else {
        setStatus(navigator.onLine ? "error" : "offline");
      }
    } finally {
      syncing = false;
      if (pendingSerialized && pendingSerialized !== serialized) scheduleFlush(250);
    }
  }

  function scheduleFlush(delay = 1200) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(flushSync, delay);
  }

  function scheduleSync(state) {
    if (!bootstrapped || !user || !state || typeof state !== "object") return;
    const serialized = JSON.stringify(state);
    if (serialized === lastSerialized && !pendingSerialized) return;
    pendingSerialized = serialized;
    writeMeta({ dirty: true, localUpdatedAt: new Date().toISOString(), revision: currentRevision });
    setStatus(navigator.onLine ? "syncing" : "offline");
    scheduleFlush();
  }

  function authHeaders(extra = {}) {
    return session?.access_token ? { ...extra, Authorization: `Bearer ${session.access_token}` } : { ...extra };
  }

  function showConflict(remote, localSerialized) {
    try { storage.set(CONFLICT_BACKUP_KEY, localSerialized); } catch {}
    let banner = document.getElementById("portalConflictBanner");
    if (!banner) {
      banner = document.createElement("section");
      banner.id = "portalConflictBanner";
      banner.className = "portal-conflict-banner";
      document.body.appendChild(banner);
    }
    banner.innerHTML = `
      <strong>${tr("تغییر هم‌زمان در دو دستگاه", "Changes from two devices")}</strong>
      <p>${tr("نسخه ابری و نسخه این دستگاه هر دو تغییر کرده‌اند. نسخه موردنظر را انتخاب کن؛ یک پشتیبان محلی نیز نگه داشته شده است.", "Both the cloud copy and this device changed. Choose which one to keep; a local conflict backup has also been saved.")}</p>
      <div class="portal-conflict-actions">
        <button class="portal-soft-button" id="portalUseCloud" type="button">${tr("استفاده از نسخه ابری", "Use cloud copy")}</button>
        <button class="portal-primary-button" id="portalKeepDevice" type="button">${tr("نگه‌داشتن این دستگاه", "Keep this device")}</button>
      </div>`;
    document.getElementById("portalUseCloud")?.addEventListener("click", () => {
      if (remote && placeRemoteState(remote)) location.reload();
      else banner.remove();
    }, { once: true });
    document.getElementById("portalKeepDevice")?.addEventListener("click", async () => {
      try {
        setStatus("syncing");
        await saveSerialized(localSerialized, { force: true });
        banner.remove();
      } catch (error) {
        setStatus("error", tr("حل تعارض ناموفق بود", "Could not resolve conflict"));
        console.error(error);
      }
    }, { once: true });
  }

  function showRemoteUpdate(remote) {
    if (!remote || Number(remote.revision) <= currentRevision || remote.device_id === deviceId) return;
    const meta = readMeta();
    if (meta.dirty || pendingSerialized) {
      showConflict(remote, storage.get(STORAGE_KEY) || "{}");
      return;
    }
    let banner = document.getElementById("portalConflictBanner");
    if (!banner) {
      banner = document.createElement("section");
      banner.id = "portalConflictBanner";
      banner.className = "portal-conflict-banner";
      document.body.appendChild(banner);
    }
    banner.innerHTML = `
      <strong>${tr("نسخه تازه از دستگاه دیگر رسید", "New data arrived from another device")}</strong>
      <p>${tr("برای دیدن آخرین تغییرات، نسخه ابری را بارگذاری کن.", "Load the cloud copy to see the latest changes.")}</p>
      <div class="portal-conflict-actions">
        <button class="portal-soft-button" id="portalDismissRemote" type="button">${tr("فعلاً نه", "Not now")}</button>
        <button class="portal-primary-button" id="portalLoadRemote" type="button">${tr("بارگذاری نسخه تازه", "Load new copy")}</button>
      </div>`;
    document.getElementById("portalDismissRemote")?.addEventListener("click", () => banner.remove(), { once: true });
    document.getElementById("portalLoadRemote")?.addEventListener("click", () => {
      if (placeRemoteState(remote)) location.reload();
    }, { once: true });
  }

  async function loadProfile() {
    const { data, error } = await client.from("profiles").select("display_name,preferred_language,role,created_at").eq("id", user.id).maybeSingle();
    if (error) console.warn("Profile could not be loaded", error);
    profile = data || { display_name: user.user_metadata?.display_name || "", preferred_language: "fa", role: "user" };
  }

  async function saveProfile(displayName) {
    const cleanName = String(displayName || "").trim().slice(0, 80);
    const { data, error } = await client.from("profiles").update({ display_name: cleanName, preferred_language: document.documentElement.lang === "en" ? "en" : "fa" }).eq("id", user.id).select("display_name,preferred_language,role").single();
    if (error) throw error;
    profile = data;
    renderPortalUI();
  }

  async function logout() {
    try { await flushSync(); } catch {}
    await client.auth.signOut();
    location.replace("/index.html");
  }

  async function deleteAccount() {
    const response = await fetch("/api/delete-account", {
      method: "DELETE",
      headers: authHeaders({ "Content-Type": "application/json" })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Account deletion failed");
    try {
      storage.remove(STORAGE_KEY);
      storage.remove(metaKey());
    } catch {}
    await client.auth.signOut();
    location.replace("/index.html?deleted=1");
  }

  function renderPortalUI() {
    const email = document.getElementById("portalUserEmail");
    const accountEmail = document.getElementById("portalAccountEmail");
    const nameInput = document.getElementById("portalDisplayName");
    const adminLink = document.getElementById("portalAdminLink");
    if (email) email.textContent = user?.email || "";
    if (accountEmail) accountEmail.textContent = user?.email || "";
    if (nameInput && document.activeElement !== nameInput) nameInput.value = profile?.display_name || "";
    if (adminLink) adminLink.hidden = profile?.role !== "admin";

    document.querySelectorAll("[data-portal-i18n]").forEach(node => {
      const key = node.dataset.portalI18n;
      const copy = {
        account: ["حساب", "Account"], logout: ["خروج", "Log out"], admin: ["مدیریت", "Admin"],
        accountTitle: ["حساب Pinky Daily Plan", "Pinky Daily Plan account"], displayName: ["نام نمایشی", "Display name"],
        saveProfile: ["ذخیره حساب", "Save account"], deleteAccount: ["حذف کامل حساب", "Delete account"],
        close: ["بستن", "Close"]
      }[key];
      if (copy) node.textContent = document.documentElement.lang === "en" ? copy[1] : copy[0];
    });
    setStatus(statusState, statusDetail);
  }

  function bindPortalUI() {
    const dialog = document.getElementById("portalAccountDialog");
    document.getElementById("portalAccountButton")?.addEventListener("click", () => dialog?.showModal());
    document.getElementById("portalAccountClose")?.addEventListener("click", () => dialog?.close());
    document.getElementById("portalLogoutButton")?.addEventListener("click", logout);
    document.getElementById("portalAccountLogout")?.addEventListener("click", logout);
    document.getElementById("portalProfileForm")?.addEventListener("submit", async event => {
      event.preventDefault();
      const button = event.submitter;
      try {
        if (button) button.disabled = true;
        await saveProfile(document.getElementById("portalDisplayName")?.value);
        document.getElementById("portalAccountMessage").textContent = tr("اطلاعات حساب ذخیره شد.", "Account details saved.");
      } catch (error) {
        document.getElementById("portalAccountMessage").textContent = error.message || tr("ذخیره حساب ناموفق بود.", "Could not save account.");
      } finally { if (button) button.disabled = false; }
    });
    document.getElementById("portalDeleteAccount")?.addEventListener("click", async () => {
      const confirmed = confirm(tr("حساب و تمام داده‌های ابری برای همیشه حذف شوند؟ این کار قابل بازگشت نیست.", "Permanently delete the account and all cloud data? This cannot be undone."));
      if (!confirmed) return;
      const second = prompt(tr("برای تأیید عبارت حذف را بنویس:", "Type DELETE to confirm:"));
      if (second !== tr("حذف", "DELETE")) return;
      try { await deleteAccount(); }
      catch (error) { alert(error.message || tr("حذف حساب ناموفق بود.", "Could not delete account.")); }
    });

    const observer = new MutationObserver(renderPortalUI);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] });
    window.addEventListener("online", () => { setStatus("syncing"); flushSync(); });
    window.addEventListener("offline", () => setStatus("offline"));
    renderPortalUI();
  }

  function startRealtime() {
    try {
      realtimeChannel = client
        .channel(`pinky-user-data-${user.id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "user_data", filter: `user_id=eq.${user.id}` }, payload => showRemoteUpdate(payload.new))
        .subscribe();
    } catch (error) {
      console.warn("Realtime subscription unavailable", error);
    }
  }

  async function initialize() {
    if (!isConfigured || !window.supabase?.createClient) {
      location.replace("/index.html?setup=1");
      throw new Error("Portal is not configured");
    }
    client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { headers: { "X-Client-Info": "pinky-daily-plan-vercel/1.4.0" } }
    });
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    session = data.session;
    if (!session) {
      const next = encodeURIComponent(location.pathname + location.search + location.hash);
      location.replace(`/index.html?next=${next}`);
      throw new Error("Authentication required");
    }
    user = session.user;

    client.auth.onAuthStateChange((event, nextSession) => {
      session = nextSession;
      user = nextSession?.user || user;
      if (event === "SIGNED_OUT") location.replace("/index.html");
    });

    await Promise.all([bootstrapData(), loadProfile()]);
    bootstrapped = true;
    startRealtime();
    if (document.readyState === "loading") {
      await new Promise(resolve => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
    }
    bindPortalUI();
    document.body.classList.remove("portal-booting");
    document.getElementById("portalLoadingScreen")?.remove();
    return { client, session, user, profile };
  }

  const ready = initialize().catch(error => {
    console.error("Pinky Daily Plan portal initialization failed", error);
    if (document.body) document.body.classList.remove("portal-booting");
    throw error;
  });

  window.PinkyPortal = {
    ready,
    scheduleSync,
    flushSync,
    authHeaders,
    getClient: () => client,
    getSession: () => session,
    getUser: () => user,
    getProfile: () => profile,
    deviceId,
    logout
  };
})();
