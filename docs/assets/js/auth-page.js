import {
  appUrl,
  getSupabaseClient,
  safeNextPath,
  subscribeAuth,
  withTimeout
} from "./supabase-client.js";
import {
  deleteAccount,
  friendlyError,
  getSession,
  getVerifiedUser,
  loadProfile,
  reauthenticate,
  requestPasswordReset,
  resendConfirmation,
  signIn,
  signOut,
  signUp,
  updatePassword,
  updateProfile
} from "./auth-service.js";
import {
  applyLanguage,
  bindDialogAccessibility,
  bindLanguageToggle,
  bindPasswordToggles,
  clearFieldErrors,
  focusFirstInvalid,
  initializeLanguage,
  initializeTheme,
  setBusy,
  setFieldError,
  setStatus,
  t
} from "./auth-ui.js";

const page = document.body.dataset.authPage || "landing";
const query = new URLSearchParams(location.search);
let activeSubmission = false;
let currentSession = null;
let currentUser = null;
let redirectStarted = false;
let loginInitialized = false;

const MIN_SPLASH_MS = 800;
const MAX_BOOT_MS = 6800;
const SPLASH_EXIT_MS = 380;

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function updateAppVersion() {
  const version = window.PINKY_APP_VERSION || window.PINKY_PORTAL_CONFIG?.portalVersion || "1.8.0";
  document.querySelectorAll("[data-app-version]").forEach(node => {
    node.textContent = version;
  });
}

function setSplashStatus(key) {
  const region = document.getElementById("splashStatus");
  if (region) region.textContent = t(key);
}

function authIntentTarget() {
  if (page !== "login") return "";
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const type = String(query.get("type") || hash.get("type") || "").toLowerCase();
  if (type === "recovery") return "reset-password.html";
  if (["signup", "email", "email_change"].includes(type)) return "verify-email.html";
  return "";
}

function navigateOnce(target) {
  if (redirectStarted) return false;
  redirectStarted = true;
  document.body.classList.remove("auth-ready", "auth-error");
  document.body.classList.add("auth-redirecting");
  location.replace(target);
  return true;
}

function redirectPreservingAuthUrl(targetPath) {
  const target = new URL(appUrl(targetPath));
  target.search = location.search;
  target.hash = location.hash;
  return navigateOnce(target.href);
}

function revealAuthShell() {
  const shell = document.getElementById("authShell");
  shell?.removeAttribute("inert");
  shell?.removeAttribute("aria-hidden");
  document.body.classList.remove("auth-booting", "auth-redirecting");
  document.body.classList.add("auth-ready");
}

async function hideSplashScreen({ focus = true } = {}) {
  const splash = document.getElementById("authSplash");
  revealAuthShell();
  if (!splash) return;
  splash.classList.add("is-leaving");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  await delay(reducedMotion ? 1 : SPLASH_EXIT_MS);
  splash.hidden = true;
  splash.setAttribute("aria-hidden", "true");
  splash.style.pointerEvents = "none";
  if (focus) document.getElementById("loginEmail")?.focus({ preventScroll: true });
}

function emailValid(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateEmail(input) {
  const value = input.value.trim();
  if (!value) { setFieldError(input, t("required")); return false; }
  if (!emailValid(value)) { setFieldError(input, t("invalidEmail")); return false; }
  return true;
}

function validatePassword(input) {
  if (!input.value) { setFieldError(input, t("required")); return false; }
  if (input.value.length < 8) { setFieldError(input, t("shortPassword")); return false; }
  return true;
}

function setSubmitLabel(form, key) {
  const label = form?.querySelector("[data-submit-label]");
  if (label) label.textContent = t(key);
}

async function runSubmission(form, busyKey, normalKey, action) {
  if (activeSubmission) return;
  activeSubmission = true;
  setStatus();
  setBusy(form, true, busyKey);
  try {
    await action();
  } finally {
    activeSubmission = false;
    setBusy(form, false);
    setSubmitLabel(form, normalKey);
  }
}

function setupNetworkStatus() {
  const update = () => {
    if (!navigator.onLine) setStatus(t("offline"), "error", false);
    else if (document.getElementById("landingStatus")) setStatus(t("online"), "success", false);
  };
  addEventListener("online", update);
  addEventListener("offline", update);
  update();
}

function setupPasswordRules() {
  const password = document.getElementById("signupPassword");
  const confirm = document.getElementById("signupConfirm");
  if (!password || !confirm) return;
  const update = () => {
    document.querySelector('[data-password-rule="length"]')?.setAttribute("data-valid", String(password.value.length >= 8));
    document.querySelector('[data-password-rule="match"]')?.setAttribute("data-valid", String(Boolean(confirm.value) && password.value === confirm.value));
  };
  password.addEventListener("input", update);
  confirm.addEventListener("input", update);
  update();
}

async function redirectAuthenticated(session) {
  if (!session || !["landing", "login", "signup", "forgot"].includes(page)) return false;
  setStatus(t("alreadySignedIn"), "success");
  if (page === "login") setSplashStatus("splashRedirecting");
  const target = page === "login" ? safeNextPath(query.get("next")) : appUrl("app.html");
  navigateOnce(target);
  return true;
}

function bindAuthEvents() {
  return subscribeAuth((event, session) => {
    currentSession = session;
    currentUser = session?.user || null;
    if (event === "SIGNED_OUT" && page === "account") navigateOnce(appUrl("login.html"));
    if (event === "PASSWORD_RECOVERY" && page === "reset") showResetForm();
    if (event === "SIGNED_IN" && ["login", "signup"].includes(page)) {
      if (page === "login") setSplashStatus("splashRedirecting");
      navigateOnce(safeNextPath(query.get("next")));
    }
  });
}

async function initLanding() {
  const next = query.get("next");
  if (next) {
    const url = new URL(appUrl("login.html"));
    url.searchParams.set("next", next);
    location.replace(url.href);
    return;
  }
  const session = await getSession().catch(() => null);
  if (session) redirectAuthenticated(session);
}

function initLogin() {
  if (loginInitialized) return;
  const form = document.getElementById("loginForm");
  if (!form) return;
  loginInitialized = true;
  form.addEventListener("submit", event => {
    event.preventDefault();
    clearFieldErrors(form);
    const email = form.elements.email;
    const password = form.elements.password;
    const emailOk = validateEmail(email);
    const passwordOk = validatePassword(password);
    if (!emailOk || !passwordOk) { focusFirstInvalid(form); return; }
    runSubmission(form, "signingIn", "signIn", async () => {
      try {
        await signIn(email.value.trim(), password.value);
        setStatus(t("loginSuccess"), "success");
        navigateOnce(safeNextPath(query.get("next")));
      } catch (error) {
        setStatus(friendlyError(error, "login"), "error", true);
      }
    });
  });
}

function initSignup() {
  const form = document.getElementById("signupForm");
  setupPasswordRules();
  form.addEventListener("submit", event => {
    event.preventDefault();
    clearFieldErrors(form);
    const name = form.elements.displayName;
    const email = form.elements.email;
    const password = form.elements.password;
    const confirmPassword = form.elements.confirmPassword;
    let valid = true;
    if (!name.value.trim()) { setFieldError(name, t("nameRequired")); valid = false; }
    if (!validateEmail(email)) valid = false;
    if (!validatePassword(password)) valid = false;
    if (password.value !== confirmPassword.value) { setFieldError(confirmPassword, t("passwordsDiffer")); valid = false; }
    if (!valid) { focusFirstInvalid(form); return; }
    runSubmission(form, "creatingAccount", "createAccount", async () => {
      try {
        const data = await signUp({
          email: email.value.trim(),
          password: password.value,
          displayName: name.value.trim()
        });
        if (data.session) {
          navigateOnce(appUrl("app.html"));
          return;
        }
        const verifyUrl = new URL(appUrl("verify-email.html"));
        verifyUrl.searchParams.set("email", email.value.trim());
        setStatus(t("signupCheckEmail"), "success");
        setTimeout(() => location.replace(verifyUrl.href), 700);
      } catch (error) {
        setStatus(friendlyError(error, "signup"), "error", true);
      }
    });
  });
}

function initForgot() {
  const form = document.getElementById("forgotForm");
  form.addEventListener("submit", event => {
    event.preventDefault();
    clearFieldErrors(form);
    const email = form.elements.email;
    if (!validateEmail(email)) { focusFirstInvalid(form); return; }
    runSubmission(form, "sending", "sendRecovery", async () => {
      try {
        await requestPasswordReset(email.value.trim());
        setStatus(t("recoverySent"), "success");
        form.reset();
      } catch (error) {
        setStatus(friendlyError(error, "recovery"), "error", true);
      }
    });
  });
}

function showResetForm() {
  document.getElementById("recoveryCheck")?.setAttribute("hidden", "");
  document.getElementById("invalidRecovery")?.setAttribute("hidden", "");
  document.getElementById("resetForm")?.removeAttribute("hidden");
  document.getElementById("resetPassword")?.focus();
}

function showInvalidRecovery() {
  document.getElementById("recoveryCheck")?.setAttribute("hidden", "");
  document.getElementById("resetForm")?.setAttribute("hidden", "");
  document.getElementById("invalidRecovery")?.removeAttribute("hidden");
}

async function initReset() {
  const form = document.getElementById("resetForm");
  const waitForRecovery = new Promise(resolve => {
    let settled = false;
    let timer = 0;
    const finish = session => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stop();
      resolve(session);
    };
    const stop = subscribeAuth((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) finish(session);
    });
    timer = setTimeout(() => finish(null), 5000);
  });
  const session = await getSession().catch(() => null);
  if (session) showResetForm();
  else {
    const recovered = await waitForRecovery;
    if (recovered) showResetForm();
    else showInvalidRecovery();
  }
  form.addEventListener("submit", event => {
    event.preventDefault();
    clearFieldErrors(form);
    const password = form.elements.password;
    const confirmPassword = form.elements.confirmPassword;
    let valid = validatePassword(password);
    if (password.value !== confirmPassword.value) {
      setFieldError(confirmPassword, t("passwordsDiffer"));
      valid = false;
    }
    if (!valid) { focusFirstInvalid(form); return; }
    runSubmission(form, "saving", "saveNewPassword", async () => {
      try {
        await updatePassword(password.value);
        setStatus(t("passwordUpdated"), "success");
        setTimeout(() => location.replace(appUrl("app.html")), 900);
      } catch (error) {
        setStatus(friendlyError(error, "reset"), "error", true);
      }
    });
  });
}

function maskEmail(email) {
  const [name, domain] = String(email || "").split("@");
  if (!domain) return "";
  return `${name.slice(0, 2)}${"•".repeat(Math.max(2, name.length - 2))}@${domain}`;
}

async function initVerify() {
  const session = await getSession().catch(() => null);
  const email = query.get("email") || session?.user?.email || "";
  const display = document.getElementById("verifyEmailDisplay");
  if (display) display.textContent = maskEmail(email);
  if (session?.user?.email_confirmed_at) {
    setStatus(t("emailVerified"), "success");
    document.querySelector('#verifyPanel .button')?.setAttribute("href", "./app.html");
  } else {
    setStatus(t("verificationPending"), "info");
  }
  const form = document.getElementById("resendForm");
  if (email) form.elements.email.value = email;
  form.addEventListener("submit", event => {
    event.preventDefault();
    clearFieldErrors(form);
    const input = form.elements.email;
    if (!validateEmail(input)) { focusFirstInvalid(form); return; }
    runSubmission(form, "sending", "resendEmail", async () => {
      try {
        await resendConfirmation(input.value.trim());
        setStatus(t("resendSuccess"), "success");
      } catch (error) {
        setStatus(friendlyError(error, "resend"), "error", true);
      }
    });
  });
}

async function initAccount() {
  currentSession = await getSession();
  if (!currentSession) {
    location.replace(appUrl("login.html?next=account.html"));
    return;
  }
  currentUser = await getVerifiedUser().catch(() => currentSession.user);
  document.getElementById("accountEmail").textContent = currentUser.email || "";
  const profile = await loadProfile(currentUser.id).catch(() => null);
  document.getElementById("accountName").value = profile?.display_name || currentUser.user_metadata?.display_name || "";

  const profileForm = document.getElementById("profileForm");
  profileForm.addEventListener("submit", event => {
    event.preventDefault();
    clearFieldErrors(profileForm);
    const name = profileForm.elements.displayName;
    if (!name.value.trim()) { setFieldError(name, t("nameRequired")); focusFirstInvalid(profileForm); return; }
    runSubmission(profileForm, "saving", "saveAccount", async () => {
      try {
        await updateProfile(currentUser.id, name.value);
        setStatus(t("profileSaved"), "success");
      } catch (error) {
        setStatus(friendlyError(error, "profile"), "error", true);
      }
    });
  });

  document.getElementById("logoutButton").addEventListener("click", async event => {
    event.currentTarget.disabled = true;
    try {
      await signOut();
      navigateOnce(appUrl("login.html"));
    } catch {
      event.currentTarget.disabled = false;
      setStatus(t("logoutFailed"), "error", true);
    }
  });

  const dialog = document.getElementById("deleteDialog");
  const dialogController = bindDialogAccessibility(dialog);
  document.getElementById("openDeleteDialog").addEventListener("click", event => {
    document.getElementById("deleteEmail").value = currentUser.email || "";
    document.getElementById("deletePassword").value = "";
    dialogController.open(event.currentTarget);
  });
  document.getElementById("confirmDeleteButton").addEventListener("click", async event => {
    const email = document.getElementById("deleteEmail").value.trim();
    const password = document.getElementById("deletePassword").value;
    if (email.toLowerCase() !== String(currentUser.email || "").toLowerCase()) {
      setStatus(t("deleteMismatch"), "error", true);
      return;
    }
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = t("deleting");
    try {
      await reauthenticate(email, password);
      currentSession = await getSession();
      await deleteAccount(currentSession);
      try {
        localStorage.removeItem("pinky-day-planner-v1");
        localStorage.removeItem("pinky-day-cloud-conflict-backup");
      } catch {}
      setStatus(t("deleteSuccess"), "success");
      location.replace(appUrl("index.html?deleted=1"));
    } catch (error) {
      setStatus(friendlyError(error, "delete"), "error", true);
      event.currentTarget.disabled = false;
      event.currentTarget.textContent = t("deletePermanently");
    }
  });
}

async function boot() {
  initializeLanguage();
  initializeTheme();
  bindLanguageToggle();
  bindPasswordToggles();
  setupNetworkStatus();
  updateAppVersion();
  document.getElementById("retryButton")?.addEventListener("click", () => location.reload());

  const unsubscribe = bindAuthEvents();
  addEventListener("pagehide", unsubscribe, { once: true });

  const minimumSplash = page === "login" ? delay(MIN_SPLASH_MS) : Promise.resolve();
  const intentTarget = authIntentTarget();
  if (intentTarget) {
    setSplashStatus(intentTarget.startsWith("reset") ? "splashChecking" : "splashRedirecting");
    await minimumSplash;
    redirectPreservingAuthUrl(intentTarget);
    return;
  }

  try {
    if (page === "login") setSplashStatus("splashChecking");
    await withTimeout((async () => {
      await getSupabaseClient();
      currentSession = await getSession();
      currentUser = currentSession?.user || null;
    })(), MAX_BOOT_MS, "auth-boot-timeout");

    if (currentSession && ["landing", "login", "signup", "forgot"].includes(page)) {
      await minimumSplash;
      await redirectAuthenticated(currentSession);
      return;
    }

    if (page === "landing") await initLanding();
    else if (page === "login") {
      initLogin();
      setSplashStatus("splashReady");
      await minimumSplash;
      await hideSplashScreen();
    } else if (page === "signup") initSignup();
    else if (page === "forgot") initForgot();
    else if (page === "reset") await initReset();
    else if (page === "verify") await initVerify();
    else if (page === "account") await initAccount();
  } catch (error) {
    console.error("Pinky auth portal boot failed", {
      name: String(error?.name || "Error"),
      code: String(error?.code || error?.message || "auth-boot-failed")
    });
    document.getElementById("authFallback")?.removeAttribute("hidden");
    setStatus(friendlyError(error, "boot"), "error", true);
    if (page === "login") {
      initLogin();
      document.body.classList.add("auth-error");
      await minimumSplash;
      await hideSplashScreen({ focus: false });
      document.body.classList.add("auth-error");
      document.getElementById("retryButton")?.focus({ preventScroll: true });
    }
  }
}

boot().catch(error => {
  console.error("Pinky auth portal initialization failed", String(error?.message || "initialization-failed"));
  revealAuthShell();
  document.getElementById("authFallback")?.removeAttribute("hidden");
});
