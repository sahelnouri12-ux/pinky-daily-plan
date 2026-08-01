import { writeFile } from "node:fs/promises";

const config = {
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "",
  appName: "Pinky Daily Plan",
  portalVersion: process.env.npm_package_version || "1.4.0",
  hosting: "vercel"
};
await writeFile(new URL("../public/config.js", import.meta.url), `window.PINKY_PORTAL_CONFIG = ${JSON.stringify(config, null, 2)};
`, "utf8");
const missing = ["SUPABASE_URL", "SUPABASE_ANON_KEY"].filter(name => !process.env[name]);
if (missing.length) console.warn(`Build completed, but login stays disabled until these Vercel variables are added: ${missing.join(", ")}`);
else console.log("Generated public/config.js for Vercel.");
