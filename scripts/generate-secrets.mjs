import crypto from "node:crypto";
import webpush from "web-push";
const vapid = webpush.generateVAPIDKeys();
console.log("VAPID_PUBLIC_KEY=" + vapid.publicKey);
console.log("VAPID_PRIVATE_KEY=" + vapid.privateKey);
console.log("CRON_SECRET=" + crypto.randomBytes(32).toString("hex"));
console.log("VAPID_SUBJECT=mailto:YOUR_EMAIL@example.com");
