(() => {
  "use strict";
  const config = window.PINKY_PORTAL_CONFIG || {};
  const form = document.getElementById("passwordForm");
  const message = document.getElementById("resetMessage");
  const lang = () => document.documentElement.lang === "en" ? "en" : "fa";
  const setMessage = (text, type="info") => { message.textContent = text; message.className = `portal-message ${type}`; };
  const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey && !String(config.supabaseUrl).includes("YOUR_"));
  if (!configured || !window.supabase?.createClient) {
    setMessage("Portal configuration is missing.", "error");
    form.querySelector("button").disabled = true;
    return;
  }
  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { detectSessionInUrl:true, persistSession:true } });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    const data = new FormData(form);
    const password = String(data.get("password"));
    if (password !== String(data.get("confirmPassword"))) {
      setMessage(lang()==="en" ? "Passwords do not match." : "رمزها یکسان نیستند.", "error"); return;
    }
    if (password.length < 8) {
      setMessage(lang()==="en" ? "Use at least 8 characters." : "حداقل ۸ نویسه وارد کن.", "error"); return;
    }
    try {
      button.disabled = true;
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      setMessage(lang()==="en" ? "Password updated. Redirecting…" : "رمز عبور تغییر کرد؛ در حال انتقال…", "success");
      setTimeout(() => location.replace("/app.html"), 900);
    } catch (error) { setMessage(error.message || "Could not update password.", "error"); }
    finally { button.disabled = false; }
  });
})();
