import webpush from "web-push";
import { json, requireUser, safeString } from "../lib/server.mjs";

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("VAPID keys are missing.");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", publicKey, privateKey);
}

export default {
  async fetch(request) {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const deviceId = safeString(body.deviceId, 180);
    if (!deviceId) return json({ error: "Device ID is required" }, 400);
    try { configureWebPush(); }
    catch (error) { return json({ error: error.message }, 503); }

    const { data: row, error } = await auth.supabase.from("push_subscriptions")
      .select("subscription,language")
      .eq("user_id", auth.user.id)
      .eq("device_id", deviceId)
      .maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!row) return json({ error: "No push subscription for this device" }, 404);
    const language = body.language === "en" || row.language === "en" ? "en" : "fa";
    try {
      await webpush.sendNotification(row.subscription, JSON.stringify({
        title: "Pinky Daily Plan ♡",
        body: language === "en" ? "Phone notifications are working." : "اعلان گوشی با موفقیت فعال است.",
        tag: "pinky-test",
        url: "/app.html#today"
      }), { TTL: 60, urgency: "high" });
      return json({ ok: true });
    } catch (pushError) {
      if ([404, 410].includes(pushError.statusCode)) {
        await auth.supabase.from("push_subscriptions").delete().eq("user_id", auth.user.id).eq("device_id", deviceId);
      }
      return json({ error: pushError.message || "Push delivery failed" }, 502);
    }
  }
};
