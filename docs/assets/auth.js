(() => {
  "use strict";
  const config = window.PINKY_PORTAL_CONFIG || {};
  const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey && !String(config.supabaseUrl).includes("YOUR_") && !String(config.supabaseAnonKey).includes("YOUR_"));
  const root = document.documentElement;
  const qs = new URLSearchParams(location.search);
  const appUrl = path => window.PinkyAppUrl ? window.PinkyAppUrl(path) : new URL(String(path).replace(/^\/+/, ""), location.href).href;
  const requestedNext = qs.get("next") || "";
  const safeNext = /^[a-zA-Z0-9._\-/?#=&%]+$/.test(requestedNext) && !requestedNext.includes("..") ? requestedNext.replace(/^\/+/, "") : "app.html";
  const nextPath = appUrl(safeNext);
  const setupAlert = document.getElementById("portalSetupAlert");
  const message = document.getElementById("authMessage");
  const title = document.getElementById("authTitle");
  const subtitle = document.getElementById("authSubtitle");
  const forms = {
    signin: document.getElementById("signinForm"),
    signup: document.getElementById("signupForm"),
    reset: document.getElementById("resetForm")
  };
  const tabs = [...document.querySelectorAll("[data-auth-tab]")];
  let client = null;
  let activeTab = "signin";

  const dict = {
    fa: {
      signin: "ورود", signup: "ثبت‌نام", reset: "بازیابی",
      signinTitle: "به Pinky Daily Plan برگرد", signinSub: "با حساب خود وارد شو تا برنامه و اطلاعاتت بین دستگاه‌ها همگام بماند.",
      signupTitle: "حساب واقعی بساز", signupSub: "پس از ثبت‌نام، یک ایمیل تأیید برایت ارسال می‌شود.",
      resetTitle: "بازیابی رمز عبور", resetSub: "لینک تعیین رمز جدید به ایمیلت فرستاده می‌شود.",
      setup: "پورتال هنوز به Supabase متصل نشده است. مقادیر عمومی Supabase و VAPID را در فایل config.js وارد کن.",
      deleted: "حساب و داده‌های ابری با موفقیت حذف شدند.",
      emailConfirm: "ثبت‌نام انجام شد. ایمیل تأیید را باز کن و سپس وارد شو.",
      resetSent: "لینک بازیابی رمز عبور ارسال شد.",
      signing: "در حال ورود…", creating: "در حال ساخت حساب…", sending: "در حال ارسال…",
      genericError: "عملیات انجام نشد. اطلاعات و اتصال اینترنت را بررسی کن.",
      wrongPassword: "ایمیل یا رمز عبور درست نیست.",
      account: "حساب", enter: "ورود", create: "ساخت حساب", send: "ارسال لینک"
    },
    en: {
      signin: "Sign in", signup: "Sign up", reset: "Reset",
      signinTitle: "Welcome back to Pinky Daily Plan", signinSub: "Sign in to keep your planner and data synced across devices.",
      signupTitle: "Create a real account", signupSub: "We will send a confirmation email after registration.",
      resetTitle: "Reset your password", resetSub: "A password reset link will be sent to your email.",
      setup: "The portal is not connected to Supabase yet. Add the public Supabase and VAPID values to config.js.",
      deleted: "Your account and cloud data were deleted.",
      emailConfirm: "Registration completed. Confirm your email, then sign in.",
      resetSent: "A password reset link was sent.",
      signing: "Signing in…", creating: "Creating account…", sending: "Sending…",
      genericError: "The operation failed. Check your details and internet connection.",
      wrongPassword: "The email or password is incorrect.",
      account: "Account", enter: "Sign in", create: "Create account", send: "Send link"
    }
  };

  const language = () => root.lang === "en" ? "en" : "fa";
  const t = key => dict[language()][key] || key;
  const setMessage = (text = "", type = "info") => {
    message.textContent = text;
    message.className = `portal-message ${type}`;
  };

  function applyLanguage(lang) {
    root.lang = lang;
    root.dir = lang === "en" ? "ltr" : "rtl";
    document.body.dir = root.dir;
    localStorage.setItem("pinky-day-language", lang);
    document.getElementById("portalLanguageToggle").textContent = lang === "en" ? "فا" : "EN";
    document.querySelectorAll("[data-i18n-fa]").forEach(node => {
      node.textContent = lang === "en" ? node.dataset.i18nEn : node.dataset.i18nFa;
    });
    tabs.forEach(tab => tab.textContent = t(tab.dataset.authTab));
    activateTab(activeTab, false);
    if (setupAlert && !configured) setupAlert.textContent = t("setup");
  }

  function activateTab(name, focus = true) {
    activeTab = forms[name] ? name : "signin";
    tabs.forEach(tab => {
      const active = tab.dataset.authTab === activeTab;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    Object.entries(forms).forEach(([key, form]) => { form.hidden = key !== activeTab; });
    const headings = {
      signin: ["signinTitle", "signinSub"],
      signup: ["signupTitle", "signupSub"],
      reset: ["resetTitle", "resetSub"]
    }[activeTab];
    title.textContent = t(headings[0]);
    subtitle.textContent = t(headings[1]);
    setMessage();
    if (focus) forms[activeTab]?.querySelector("input")?.focus();
  }

  function friendlyError(error) {
    const raw = String(error?.message || "");
    if (/invalid login|invalid credentials/i.test(raw)) return t("wrongPassword");
    if (/email not confirmed/i.test(raw)) return language() === "en" ? "Confirm your email before signing in." : "ابتدا ایمیل خود را تأیید کن.";
    if (/already registered|already been registered/i.test(raw)) return language() === "en" ? "This email is already registered." : "این ایمیل قبلاً ثبت شده است.";
    if (/password/i.test(raw) && /characters|least/i.test(raw)) return language() === "en" ? "Use a password with at least 8 characters." : "رمز عبور باید حداقل ۸ نویسه داشته باشد.";
    return raw || t("genericError");
  }

  async function start() {
    const savedLang = localStorage.getItem("pinky-day-language") === "en" ? "en" : "fa";
    applyLanguage(savedLang);
    if (!configured || !window.supabase?.createClient) {
      if (setupAlert) { setupAlert.hidden = false; setupAlert.textContent = t("setup"); }
      document.querySelectorAll("form button[type=submit]").forEach(button => button.disabled = true);
      return;
    }
    client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data } = await client.auth.getSession();
    if (data.session) {
      location.replace(nextPath);
      return;
    }
    if (qs.get("deleted") === "1") setMessage(t("deleted"), "success");
  }

  tabs.forEach(tab => tab.addEventListener("click", () => activateTab(tab.dataset.authTab)));
  document.getElementById("portalLanguageToggle")?.addEventListener("click", () => applyLanguage(language() === "en" ? "fa" : "en"));

  forms.signin.addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    const form = new FormData(event.currentTarget);
    try {
      button.disabled = true; button.textContent = t("signing"); setMessage();
      const { error } = await client.auth.signInWithPassword({ email: String(form.get("email")).trim(), password: String(form.get("password")) });
      if (error) throw error;
      location.replace(nextPath);
    } catch (error) { setMessage(friendlyError(error), "error"); }
    finally { button.disabled = false; button.textContent = t("enter"); }
  });

  forms.signup.addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirmPassword = String(form.get("confirmPassword"));
    if (password !== confirmPassword) {
      setMessage(language() === "en" ? "Passwords do not match." : "رمز عبور و تکرار آن یکسان نیستند.", "error");
      return;
    }
    try {
      button.disabled = true; button.textContent = t("creating"); setMessage();
      const { data, error } = await client.auth.signUp({
        email: String(form.get("email")).trim(),
        password,
        options: {
          data: { display_name: String(form.get("displayName") || "").trim() },
          emailRedirectTo: appUrl("app.html")
        }
      });
      if (error) throw error;
      if (data.session) location.replace(appUrl("app.html"));
      else { setMessage(t("emailConfirm"), "success"); event.currentTarget.reset(); }
    } catch (error) { setMessage(friendlyError(error), "error"); }
    finally { button.disabled = false; button.textContent = t("create"); }
  });

  forms.reset.addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    const form = new FormData(event.currentTarget);
    try {
      button.disabled = true; button.textContent = t("sending"); setMessage();
      const { error } = await client.auth.resetPasswordForEmail(String(form.get("email")).trim(), { redirectTo: appUrl("reset.html") });
      if (error) throw error;
      setMessage(t("resetSent"), "success");
    } catch (error) { setMessage(friendlyError(error), "error"); }
    finally { button.disabled = false; button.textContent = t("send"); }
  });

  start().catch(error => setMessage(friendlyError(error), "error"));
})();
