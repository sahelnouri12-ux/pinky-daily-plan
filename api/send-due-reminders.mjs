import webpush from "web-push";
import { json, serviceClient, cronAuthorized } from "../lib/server.mjs";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 100;

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("VAPID keys are missing.");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", publicKey, privateKey);
}

async function processReminder(supabase, reminder, runNow) {
  const { data: claimed, error: claimError } = await supabase.from("push_reminders")
    .update({
      processing_at: runNow,
      delivery_status: "processing",
      attempt_count: (reminder.attempt_count || 0) + 1,
      last_error: null
    })
    .eq("id", reminder.id)
    .is("sent_at", null)
    .is("processing_at", null)
    .select("id,user_id,device_id,task_id,title,language,reminder_at,attempt_count")
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return "skipped";

  const { data: subscription, error: subscriptionError } = await supabase.from("push_subscriptions")
    .select("subscription")
    .eq("user_id", claimed.user_id)
    .eq("device_id", claimed.device_id)
    .maybeSingle();
  if (subscriptionError) throw subscriptionError;
  if (!subscription?.subscription) {
    await supabase.from("push_reminders").update({
      sent_at: runNow,
      processing_at: null,
      delivery_status: "missing_subscription",
      last_error: "No subscription exists for this device"
    }).eq("id", claimed.id);
    return "missing";
  }

  try {
    await webpush.sendNotification(subscription.subscription, JSON.stringify({
      title: "Pinky Daily Plan 🔔",
      body: claimed.title,
      tag: `pinky-${claimed.task_id}`,
      url: "/app.html#today"
    }), { TTL: 86400, urgency: "high" });
    await supabase.from("push_reminders").update({
      sent_at: runNow,
      processing_at: null,
      delivery_status: "sent",
      last_error: null
    }).eq("id", claimed.id);
    return "sent";
  } catch (pushError) {
    const expired = [404, 410].includes(pushError.statusCode);
    await supabase.from("push_reminders").update({
      sent_at: expired ? runNow : null,
      processing_at: null,
      delivery_status: expired ? "expired_subscription" : "failed",
      last_error: String(pushError.message || "Push delivery failed").slice(0, 500)
    }).eq("id", claimed.id);
    if (expired) {
      await supabase.from("push_subscriptions").delete().eq("user_id", claimed.user_id).eq("device_id", claimed.device_id);
    }
    return expired ? "expired" : "failed";
  }
}

export default {
  async fetch(request) {
    if (request.method !== "POST" && request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405, { Allow: "GET, POST" });
    }
    if (!cronAuthorized(request)) return json({ error: "Cron authorization failed" }, 401);

    try { configureWebPush(); }
    catch (error) { return json({ error: error.message }, 503); }
    const supabase = serviceClient();
    const runNow = new Date().toISOString();
    const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    await supabase.from("push_reminders")
      .update({ processing_at: null, delivery_status: "retry_stale" })
      .is("sent_at", null)
      .lt("processing_at", staleBefore);

    const { data: reminders, error } = await supabase.from("push_reminders")
      .select("id,user_id,device_id,task_id,title,language,reminder_at,attempt_count,processing_at")
      .is("sent_at", null)
      .is("processing_at", null)
      .lt("attempt_count", MAX_ATTEMPTS)
      .lte("reminder_at", runNow)
      .order("reminder_at", { ascending: true })
      .limit(BATCH_SIZE);
    if (error) return json({ error: error.message }, 500);

    const stats = { selected: reminders?.length || 0, sent: 0, failed: 0, expired: 0, missing: 0, skipped: 0 };
    for (const reminder of reminders || []) {
      try {
        const result = await processReminder(supabase, reminder, runNow);
        stats[result] = (stats[result] || 0) + 1;
      } catch (error) {
        stats.failed += 1;
        await supabase.from("push_reminders").update({
          processing_at: null,
          delivery_status: "failed",
          last_error: String(error.message || error).slice(0, 500)
        }).eq("id", reminder.id);
      }
    }
    return json({ ok: true, ranAt: runNow, stats });
  }
};
