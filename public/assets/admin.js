(() => {
  "use strict";
  const config = window.PINKY_PORTAL_CONFIG || {};
  const status = document.getElementById("adminStatus");
  const tbody = document.getElementById("adminUsersBody");
  const setStatus = text => { status.textContent = text; };
  const formatDate = value => value ? new Intl.DateTimeFormat(document.documentElement.lang === "en" ? "en-US" : "fa-IR", { dateStyle:"medium", timeStyle:"short" }).format(new Date(value)) : "—";

  async function run() {
    if (!window.supabase?.createClient || !config.supabaseUrl || String(config.supabaseUrl).includes("YOUR_")) throw new Error("Portal configuration is missing.");
    const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, { auth:{persistSession:true,autoRefreshToken:true} });
    const { data } = await client.auth.getSession();
    if (!data.session) { location.replace("/index.html?next=/admin.html"); return; }
    const response = await fetch("/api/admin-overview", { headers:{ Authorization:`Bearer ${data.session.access_token}` } });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 403) { location.replace("/app.html"); return; }
    if (!response.ok) throw new Error(payload.error || "Could not load admin data.");
    document.getElementById("statUsers").textContent = payload.stats.totalUsers;
    document.getElementById("statActive").textContent = payload.stats.activeUsers30d;
    document.getElementById("statStates").textContent = payload.stats.syncedUsers;
    tbody.innerHTML = payload.users.map(item => `
      <tr>
        <td>${escapeHtml(item.email || "—")}</td>
        <td>${escapeHtml(item.displayName || "—")}</td>
        <td><span class="portal-role-badge">${escapeHtml(item.role || "user")}</span></td>
        <td>${formatDate(item.createdAt)}</td>
        <td>${formatDate(item.lastSignInAt)}</td>
        <td>${formatDate(item.lastSyncAt)}</td>
      </tr>`).join("");
    setStatus(document.documentElement.lang === "en" ? `Updated ${formatDate(payload.generatedAt)}` : `به‌روزرسانی: ${formatDate(payload.generatedAt)}`);
  }
  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char])); }
  document.getElementById("adminRefresh")?.addEventListener("click", () => { setStatus("…"); run().catch(error => setStatus(error.message)); });
  document.getElementById("adminLogout")?.addEventListener("click", async () => {
    const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    await client.auth.signOut(); location.replace("/index.html");
  });
  run().catch(error => setStatus(error.message || "Error"));
})();
