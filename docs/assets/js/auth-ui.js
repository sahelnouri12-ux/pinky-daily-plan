import { currentLanguage } from "./supabase-client.js";

const dictionary = {
  fa: {
    skip: "رفتن به محتوای اصلی",
    pageSettings: "تنظیمات صفحه",
    themeToggle: "تغییر حالت روشن و تیره",
    privacy: "حریم خصوصی",
    landingEyebrow: "برنامه‌ریز شخصی و آرام",
    landingTitle: "روزت را ساده‌تر و منظم‌تر پیش ببر",
    landingLead: "کارها، روتین‌ها و یادآوری‌هایت را در حساب شخصی نگه دار و بین دستگاه‌ها همگام کن.",
    signIn: "ورود به حساب",
    createAccount: "ساخت حساب رایگان",
    previewLabel: "نمونه امکانات برنامه",
    todayPlan: "برنامه امروز",
    gentleProgress: "قدم‌های کوچک، پیشرفت واقعی",
    featurePlan: "برنامه‌ریزی کارها و روتین‌ها",
    featureSync: "همگام‌سازی حساب بین دستگاه‌ها",
    featureReminder: "یادآوری زمان‌دار و اعلان گوشی",
    featurePrivate: "داده‌های هر کاربر در حساب خودش",
    whyPinky: "Pinky چه کمکی می‌کند؟",
    dailyPlanning: "برنامه‌ریزی روزانه",
    dailyPlanningText: "کارها و اولویت‌های هر روز را روشن و قابل پیگیری نگه دار.",
    accountSync: "همگام‌سازی حساب",
    accountSyncText: "بعد از ورود، آخرین نسخه داده‌هایت را در دستگاه‌های مختلف دریافت کن.",
    smartReminder: "یادآوری کارها",
    smartReminderText: "اعلان‌ها فقط با اجازه و اقدام مستقیم خودت فعال می‌شوند.",
    authAsideTitle: "برنامه‌ریزی آرام، در حساب شخصی تو",
    authAsideText: "کارها، روتین‌ها و یادآوری‌هایت را در دستگاه‌های مختلف همراه داشته باش.",
    recoveryAsideTitle: "بازیابی امن و روشن",
    recoveryAsideText: "برای حفاظت از حساب، پیام بازیابی وجود یا نبودن ایمیل را افشا نمی‌کند.",
    verifyAsideTitle: "یک مرحله تا شروع",
    verifyAsideText: "پس از تأیید ایمیل، حساب تو برای ورود و همگام‌سازی آماده می‌شود.",
    accountAsideTitle: "حساب و اطلاعات شخصی",
    accountAsideText: "نام نمایشی، خروج و حذف حساب را در یک بخش مشخص مدیریت کن.",
    asidePointOne: "ذخیره اطلاعات در حساب شخصی",
    asidePointTwo: "هماهنگی با نسخه موبایل و لپ‌تاپ",
    asidePointThree: "فعال‌سازی اختیاری اعلان‌ها",
    loginTitle: "خوش آمدی",
    loginSubtitle: "برای دیدن برنامه و داده‌های همگام‌شده وارد حساب شو.",
    signupTitle: "ساخت حساب",
    signupSubtitle: "پس از ثبت‌نام، ممکن است لازم باشد ایمیل خود را تأیید کنی.",
    forgotTitle: "بازیابی رمز عبور",
    forgotSubtitle: "ایمیل حسابت را وارد کن تا راهنمای ادامه ارسال شود.",
    resetTitle: "تعیین رمز جدید",
    resetSubtitle: "یک رمز تازه برای حساب خود انتخاب کن.",
    verifyTitle: "تأیید ایمیل",
    verifySubtitle: "وضعیت تأیید حساب را در این صفحه دنبال کن.",
    accountTitle: "مدیریت حساب",
    accountSubtitle: "اطلاعات حساب، خروج و حذف حساب را مدیریت کن.",
    email: "ایمیل",
    accountEmail: "ایمیل حساب",
    password: "رمز عبور",
    newPassword: "رمز عبور جدید",
    confirmPassword: "تکرار رمز عبور",
    displayName: "نام نمایشی",
    forgotPassword: "رمز را فراموش کرده‌ام",
    noAccount: "حساب نداری؟",
    haveAccount: "قبلاً حساب ساخته‌ای؟",
    backToLogin: "بازگشت به ورود",
    sendRecovery: "ارسال راهنمای بازیابی",
    forgotHelp: "در صورت امکان، راهنمای بازیابی برای این نشانی ارسال می‌شود.",
    passwordMin: "حداقل ۸ نویسه",
    passwordMatch: "یکسان با تکرار رمز",
    showPassword: "نمایش رمز عبور",
    hidePassword: "پنهان‌کردن رمز عبور",
    saveNewPassword: "ذخیره رمز جدید",
    checkingRecovery: "در حال بررسی لینک بازیابی…",
    invalidRecovery: "این لینک بازیابی معتبر نیست یا منقضی شده است.",
    requestNewLink: "دریافت لینک جدید",
    verifyInstructions: "لینک تأیید را در ایمیل خود باز کن. پس از تأیید، می‌توانی وارد برنامه شوی.",
    goToLogin: "رفتن به صفحه ورود",
    resendTitle: "ایمیل تأیید نرسیده؟",
    resendEmail: "ارسال دوباره ایمیل",
    signedInAs: "واردشده با",
    saveAccount: "ذخیره اطلاعات حساب",
    backToApp: "بازگشت به برنامه",
    logout: "خروج از حساب",
    dangerZone: "بخش خطر",
    dangerText: "حذف حساب، داده‌های ابری حساب را برای همیشه حذف می‌کند. داده‌های محلی فقط پس از موفقیت عملیات پاک می‌شوند.",
    deleteAccount: "حذف کامل حساب",
    confirmDeleteTitle: "تأیید حذف حساب",
    confirmDeleteText: "برای ادامه، رمز عبور و ایمیل حساب را دوباره وارد کن.",
    cancel: "انصراف",
    deletePermanently: "حذف برای همیشه",
    loadFailed: "بارگذاری سرویس ورود کامل نشد.",
    tryAgain: "تلاش دوباره",
    required: "این فیلد الزامی است.",
    invalidEmail: "یک ایمیل معتبر وارد کن.",
    shortPassword: "رمز عبور باید حداقل ۸ نویسه باشد.",
    passwordsDiffer: "رمزها یکسان نیستند.",
    nameRequired: "نام نمایشی را وارد کن.",
    signingIn: "در حال ورود…",
    creatingAccount: "در حال ساخت حساب…",
    sending: "در حال ارسال…",
    saving: "در حال ذخیره…",
    deleting: "در حال حذف…",
    loading: "در حال بارگذاری…",
    loginSuccess: "ورود موفق بود؛ در حال انتقال…",
    signupCheckEmail: "ثبت‌نام انجام شد. برای ادامه، ایمیل خود را بررسی کن.",
    recoverySent: "اگر این ایمیل در سیستم قابل بازیابی باشد، راهنمای ادامه ارسال می‌شود.",
    passwordUpdated: "رمز عبور تغییر کرد؛ در حال انتقال…",
    emailVerified: "ایمیل تأیید شده است. می‌توانی وارد برنامه شوی.",
    verificationPending: "برای تکمیل ثبت‌نام، ایمیل خود را بررسی کن.",
    resendSuccess: "در صورت امکان، ایمیل تأیید دوباره ارسال شد.",
    profileSaved: "اطلاعات حساب ذخیره شد.",
    logoutFailed: "خروج کامل نشد؛ دوباره تلاش کن.",
    deleteMismatch: "ایمیل واردشده با ایمیل حساب یکسان نیست.",
    deleteSuccess: "حساب با موفقیت حذف شد.",
    offline: "آفلاین هستی؛ برای ورود یا بازیابی به اینترنت نیاز است.",
    online: "اتصال اینترنت برقرار است.",
    alreadySignedIn: "قبلاً وارد شده‌ای؛ در حال انتقال به برنامه…"
  },
  en: {
    skip: "Skip to main content",
    pageSettings: "Page settings",
    themeToggle: "Toggle light and dark mode",
    privacy: "Privacy",
    landingEyebrow: "A calm personal planner",
    landingTitle: "Make each day simpler and more organized",
    landingLead: "Keep tasks, routines, and reminders in your personal account and sync them across devices.",
    signIn: "Sign in",
    createAccount: "Create free account",
    previewLabel: "Planner feature preview",
    todayPlan: "Today's plan",
    gentleProgress: "Small steps, real progress",
    featurePlan: "Plan tasks and routines",
    featureSync: "Sync your account across devices",
    featureReminder: "Timed reminders and phone notifications",
    featurePrivate: "Each user's data stays in their own account",
    whyPinky: "How does Pinky help?",
    dailyPlanning: "Daily planning",
    dailyPlanningText: "Keep each day's tasks and priorities clear and trackable.",
    accountSync: "Account sync",
    accountSyncText: "After signing in, receive your latest data on different devices.",
    smartReminder: "Task reminders",
    smartReminderText: "Notifications are enabled only with your permission and direct action.",
    authAsideTitle: "Calm planning in your personal account",
    authAsideText: "Keep tasks, routines, and reminders available across your devices.",
    recoveryAsideTitle: "Clear, private recovery",
    recoveryAsideText: "For account protection, recovery messages do not reveal whether an email exists.",
    verifyAsideTitle: "One step before you begin",
    verifyAsideText: "After email confirmation, your account is ready for sign-in and sync.",
    accountAsideTitle: "Your account and personal data",
    accountAsideText: "Manage your display name, sign-out, and account deletion in one place.",
    asidePointOne: "Data stored in your personal account",
    asidePointTwo: "Works across phone and laptop",
    asidePointThree: "Optional notification activation",
    loginTitle: "Welcome back",
    loginSubtitle: "Sign in to open your planner and synced data.",
    signupTitle: "Create an account",
    signupSubtitle: "After registration, you may need to confirm your email.",
    forgotTitle: "Reset your password",
    forgotSubtitle: "Enter your account email to receive recovery instructions.",
    resetTitle: "Set a new password",
    resetSubtitle: "Choose a fresh password for your account.",
    verifyTitle: "Confirm your email",
    verifySubtitle: "Follow your account verification status on this page.",
    accountTitle: "Manage account",
    accountSubtitle: "Manage account details, sign-out, and account deletion.",
    email: "Email",
    accountEmail: "Account email",
    password: "Password",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    displayName: "Display name",
    forgotPassword: "Forgot password?",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    backToLogin: "Back to sign in",
    sendRecovery: "Send recovery instructions",
    forgotHelp: "If possible, recovery instructions will be sent to this address.",
    passwordMin: "At least 8 characters",
    passwordMatch: "Matches the confirmation",
    showPassword: "Show password",
    hidePassword: "Hide password",
    saveNewPassword: "Save new password",
    checkingRecovery: "Checking the recovery link…",
    invalidRecovery: "This recovery link is invalid or has expired.",
    requestNewLink: "Request a new link",
    verifyInstructions: "Open the confirmation link in your email. After confirmation, you can sign in.",
    goToLogin: "Go to sign in",
    resendTitle: "Didn't receive the confirmation email?",
    resendEmail: "Resend email",
    signedInAs: "Signed in as",
    saveAccount: "Save account details",
    backToApp: "Back to planner",
    logout: "Sign out",
    dangerZone: "Danger zone",
    dangerText: "Deleting the account permanently removes its cloud data. Local data is cleared only after the operation succeeds.",
    deleteAccount: "Delete account",
    confirmDeleteTitle: "Confirm account deletion",
    confirmDeleteText: "Enter your account email and password again to continue.",
    cancel: "Cancel",
    deletePermanently: "Delete permanently",
    loadFailed: "The sign-in service did not finish loading.",
    tryAgain: "Try again",
    required: "This field is required.",
    invalidEmail: "Enter a valid email address.",
    shortPassword: "Password must contain at least 8 characters.",
    passwordsDiffer: "Passwords do not match.",
    nameRequired: "Enter a display name.",
    signingIn: "Signing in…",
    creatingAccount: "Creating account…",
    sending: "Sending…",
    saving: "Saving…",
    deleting: "Deleting…",
    loading: "Loading…",
    loginSuccess: "Signed in. Redirecting…",
    signupCheckEmail: "Registration completed. Check your email to continue.",
    recoverySent: "If this email can be recovered, instructions will be sent.",
    passwordUpdated: "Password updated. Redirecting…",
    emailVerified: "Email confirmed. You can now open the planner.",
    verificationPending: "Check your email to finish registration.",
    resendSuccess: "If possible, the confirmation email was sent again.",
    profileSaved: "Account details saved.",
    logoutFailed: "Sign-out did not complete. Try again.",
    deleteMismatch: "The entered email does not match the account email.",
    deleteSuccess: "Account deleted successfully.",
    offline: "You are offline. Internet access is required for sign-in or recovery.",
    online: "Internet connection is available.",
    alreadySignedIn: "You are already signed in. Opening the planner…"
  }
};

export function t(key) {
  const lang = currentLanguage();
  return dictionary[lang]?.[key] || dictionary.fa[key] || key;
}

export function applyLanguage(lang) {
  const selected = lang === "en" ? "en" : "fa";
  document.documentElement.lang = selected;
  document.documentElement.dir = selected === "en" ? "ltr" : "rtl";
  try { localStorage.setItem("pinky-day-language", selected); } catch {}
  document.querySelectorAll("[data-i18n]").forEach(node => {
    node.textContent = dictionary[selected][node.dataset.i18n] || node.textContent;
  });
  document.querySelectorAll("[data-i18n-aria]").forEach(node => {
    const value = dictionary[selected][node.dataset.i18nAria];
    if (value) node.setAttribute("aria-label", value);
  });
  const languageButton = document.getElementById("languageToggle");
  if (languageButton) {
    languageButton.textContent = selected === "en" ? "فا" : "EN";
    languageButton.setAttribute("aria-label", selected === "en" ? "فارسی" : "English");
  }
  return selected;
}

export function initializeLanguage() {
  let stored = "fa";
  try { stored = localStorage.getItem("pinky-day-language") || "fa"; } catch {}
  return applyLanguage(stored);
}

export function initializeTheme() {
  const root = document.documentElement;
  let preference = "system";
  try { preference = localStorage.getItem("pinky-portal-theme") || "system"; } catch {}
  const systemDark = matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = preference === "dark" || (preference === "system" && systemDark);
  root.dataset.theme = dark ? "dark" : "light";
  const button = document.getElementById("themeToggle");
  button?.setAttribute("aria-pressed", String(dark));
  button?.addEventListener("click", () => {
    const nextDark = root.dataset.theme !== "dark";
    root.dataset.theme = nextDark ? "dark" : "light";
    button.setAttribute("aria-pressed", String(nextDark));
    try { localStorage.setItem("pinky-portal-theme", nextDark ? "dark" : "light"); } catch {}
  });
}

export function bindLanguageToggle() {
  document.getElementById("languageToggle")?.addEventListener("click", () => {
    applyLanguage(currentLanguage() === "en" ? "fa" : "en");
  });
}

export function setStatus(message = "", type = "info", alert = false) {
  const region = document.getElementById("pageStatus") || document.getElementById("landingStatus");
  if (!region) return;
  region.textContent = message;
  region.dataset.type = type;
  region.setAttribute("role", alert ? "alert" : "status");
}

export function setBusy(form, busy, labelKey) {
  if (!form) return;
  form.setAttribute("aria-busy", String(busy));
  const button = form.querySelector('button[type="submit"]');
  if (button) {
    button.disabled = busy;
    const label = button.querySelector("[data-submit-label]");
    if (label && labelKey) label.textContent = t(labelKey);
  }
}

export function clearFieldErrors(form) {
  form?.querySelectorAll("[aria-invalid='true']").forEach(input => input.setAttribute("aria-invalid", "false"));
  form?.querySelectorAll(".field-error").forEach(node => { node.textContent = ""; });
}

export function setFieldError(input, message) {
  if (!input) return;
  input.setAttribute("aria-invalid", "true");
  const ids = String(input.getAttribute("aria-describedby") || "").split(/\s+/);
  const target = ids.map(id => document.getElementById(id)).find(node => node?.classList.contains("field-error"));
  if (target) target.textContent = message;
}

export function focusFirstInvalid(form) {
  form?.querySelector('[aria-invalid="true"]')?.focus();
}

export function bindPasswordToggles() {
  document.querySelectorAll("[data-password-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if (!input) return;
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      button.setAttribute("aria-pressed", String(!showing));
      button.setAttribute("aria-label", t(showing ? "showPassword" : "hidePassword"));
      input.focus({ preventScroll: true });
    });
  });
}

export function bindDialogAccessibility(dialog) {
  if (!dialog) return;
  let opener = null;
  dialog.addEventListener("close", () => opener?.focus?.());
  return {
    open(source) {
      opener = source || document.activeElement;
      dialog.showModal();
      queueMicrotask(() => dialog.querySelector("input,button")?.focus());
    },
    close() { dialog.close(); }
  };
}
