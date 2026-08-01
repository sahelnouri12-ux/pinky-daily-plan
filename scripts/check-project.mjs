import { access, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const files = [
  "vercel.json", "package.json", "public/index.html", "public/app.html", "public/sw.js",
  "api/health.mjs", "api/save-subscription.mjs", "api/sync-reminders.mjs",
  "api/test-push.mjs", "api/send-due-reminders.mjs", "api/delete-account.mjs",
  "api/admin-overview.mjs", "lib/server.mjs", "supabase/schema.sql",
  "supabase/setup_vercel_notification_cron.sql"
];
for (const file of files) await access(new URL(`../${file}`, import.meta.url));
for (const file of files.filter(file => file.endsWith(".mjs"))) {
  execFileSync(process.execPath, ["--check", new URL(`../${file}`, import.meta.url).pathname], { stdio: "inherit" });
}
const app = await readFile(new URL("../public/app.html", import.meta.url), "utf8");
if (app.includes("/.netlify/functions/")) throw new Error("Old Netlify endpoint remains in app.html");
const sw = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
if (!sw.includes('/api/')) throw new Error("Service worker does not exclude Vercel API routes");
console.log("Pinky Daily Plan Vercel project check passed.");
