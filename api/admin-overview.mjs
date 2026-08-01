import { json, requireUser } from "../lib/server.mjs";

export default {
  async fetch(request) {
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, { Allow: "GET" });
    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const { supabase, user } = auth;
    const { data: requester, error: roleError } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (roleError) return json({ error: roleError.message }, 500);
    if (requester?.role !== "admin") return json({ error: "Admin access required" }, 403);

    const [{ data: authData, error: authError }, { data: profiles, error: profilesError }, { data: states, error: statesError }] = await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabase.from("profiles").select("id,display_name,role,created_at,updated_at"),
      supabase.from("user_data").select("user_id,updated_at,revision")
    ]);
    if (authError || profilesError || statesError) return json({ error: authError?.message || profilesError?.message || statesError?.message }, 500);

    const profileMap = new Map((profiles || []).map(row => [row.id, row]));
    const stateMap = new Map((states || []).map(row => [row.user_id, row]));
    const users = (authData.users || []).map(account => {
      const p = profileMap.get(account.id) || {};
      const s = stateMap.get(account.id) || {};
      return {
        id: account.id,
        email: account.email,
        displayName: p.display_name || account.user_metadata?.display_name || "",
        role: p.role || "user",
        createdAt: account.created_at,
        lastSignInAt: account.last_sign_in_at,
        lastSyncAt: s.updated_at || null,
        revision: s.revision || 0
      };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const cutoff = Date.now() - 30 * 86400000;
    return json({
      generatedAt: new Date().toISOString(),
      stats: {
        totalUsers: users.length,
        activeUsers30d: users.filter(item => Date.parse(item.lastSignInAt || "") >= cutoff).length,
        syncedUsers: states?.length || 0
      },
      users
    });
  }
};
