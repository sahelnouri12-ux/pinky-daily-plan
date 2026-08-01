import {
  appUrl,
  currentLanguage,
  functionUrl,
  getSupabaseClient,
  withTimeout
} from "./supabase-client.js";

const GENERIC_RECOVERY_MESSAGE = {
  fa: "اگر این ایمیل در سیستم قابل بازیابی باشد، راهنمای ادامه ارسال می‌شود.",
  en: "If this email can be recovered, instructions will be sent."
};

export function friendlyError(error, context = "general") {
  const lang = currentLanguage();
  const text = String(error?.message || "").toLowerCase();
  const status = Number(error?.status || 0);
  if (text.includes("invalid login credentials")) return lang === "en" ? "Email or password is incorrect." : "ایمیل یا رمز عبور درست نیست.";
  if (text.includes("email not confirmed")) return lang === "en" ? "Confirm your email before signing in." : "پیش از ورود، ایمیل خود را تأیید کن.";
  if (text.includes("rate limit") || status === 429) return lang === "en" ? "Too many requests. Please wait and try again." : "درخواست‌ها بیش از حد مجاز بوده‌اند؛ کمی بعد دوباره تلاش کن.";
  if (text.includes("password") && text.includes("weak")) return lang === "en" ? "Choose a stronger password." : "یک رمز عبور قوی‌تر انتخاب کن.";
  if (text.includes("network") || text.includes("fetch") || text.includes("timeout")) return lang === "en" ? "The service is unavailable. Check your connection and try again." : "سرویس در دسترس نیست؛ اتصال اینترنت را بررسی و دوباره تلاش کن.";
  if (context === "signup") return lang === "en" ? "Account creation could not be completed." : "ساخت حساب کامل نشد.";
  if (context === "reset") return lang === "en" ? "The password could not be updated." : "تغییر رمز عبور انجام نشد.";
  return lang === "en" ? "The request could not be completed." : "انجام درخواست ممکن نشد.";
}

export async function getSession() {
  const client = await getSupabaseClient();
  const { data, error } = await withTimeout(client.auth.getSession(), 10000);
  if (error) throw error;
  return data.session;
}

export async function getVerifiedUser() {
  const client = await getSupabaseClient();
  const { data, error } = await withTimeout(client.auth.getUser(), 10000);
  if (error) throw error;
  return data.user;
}

export async function signIn(email, password) {
  const client = await getSupabaseClient();
  const { data, error } = await withTimeout(client.auth.signInWithPassword({ email, password }));
  if (error) throw error;
  return data;
}

export async function signUp({ email, password, displayName }) {
  const client = await getSupabaseClient();
  const { data, error } = await withTimeout(client.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        preferred_language: currentLanguage()
      },
      emailRedirectTo: appUrl("verify-email.html")
    }
  }));
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email) {
  const client = await getSupabaseClient();
  try {
    const { error } = await withTimeout(client.auth.resetPasswordForEmail(email, {
      redirectTo: appUrl("reset-password.html")
    }));
    if (error) throw error;
  } catch (error) {
    const text = String(error?.message || "").toLowerCase();
    if (text.includes("rate limit") || Number(error?.status) === 429) throw error;
  }
  return GENERIC_RECOVERY_MESSAGE[currentLanguage()];
}

export async function updatePassword(password) {
  const client = await getSupabaseClient();
  const { data, error } = await withTimeout(client.auth.updateUser({ password }));
  if (error) throw error;
  return data;
}

export async function resendConfirmation(email) {
  const client = await getSupabaseClient();
  const { error } = await withTimeout(client.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: appUrl("verify-email.html") }
  }));
  if (error) throw error;
}

export async function signOut() {
  const client = await getSupabaseClient();
  const { error } = await withTimeout(client.auth.signOut(), 10000);
  if (error) throw error;
}

export async function loadProfile(userId) {
  const client = await getSupabaseClient();
  const { data, error } = await withTimeout(
    client.from("profiles")
      .select("display_name,preferred_language,role,created_at")
      .eq("id", userId)
      .maybeSingle()
  );
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, displayName) {
  const client = await getSupabaseClient();
  const { data, error } = await withTimeout(
    client.from("profiles")
      .update({
        display_name: String(displayName).trim().slice(0, 80),
        preferred_language: currentLanguage()
      })
      .eq("id", userId)
      .select("display_name,preferred_language,role")
      .single()
  );
  if (error) throw error;
  return data;
}

export async function reauthenticate(email, password) {
  return signIn(email, password);
}

export async function deleteAccount(session) {
  const response = await withTimeout(fetch(functionUrl("delete-account"), {
    method: "DELETE",
    headers: {
      apikey: window.PINKY_PORTAL_CONFIG?.supabaseAnonKey || "",
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    cache: "no-store"
  }), 15000);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "delete-account-failed");
  return payload;
}
