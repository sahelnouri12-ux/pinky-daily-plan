import { json, requireUser } from "../lib/server.mjs";

export default {
  async fetch(request) {
    if (request.method !== "DELETE") return json({ error: "Method not allowed" }, 405, { Allow: "DELETE" });
    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const { error } = await auth.supabase.auth.admin.deleteUser(auth.user.id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }
};
