import { json, environmentStatus } from "../lib/server.mjs";

export default {
  async fetch(request) {
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, { Allow: "GET" });
    return json({ ok: true, app: "Pinky Daily Plan", version: "1.4.0", configured: environmentStatus() });
  }
};
