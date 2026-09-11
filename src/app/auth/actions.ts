"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  updatePasswordSchema,
} from "@/lib/validation/auth";
import type { AuthActionState } from "@/lib/auth/state";
import { getUiDictionary } from "@/lib/i18n/ui/dictionary";

// These flows run before a user is logged in (or before we know their menu
// language preference), so we fall back to the English dictionary directly
// rather than looking up a per-user setting.
const authDict = getUiDictionary("en").auth;

function firstZodMessage(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? authDict.invalidInput;
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: firstZodMessage(parsed.error), success: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return { error: translateAuthError(error.message), success: null };
  }

  return {
    error: null,
    success: authDict.accountCreatedCheckEmail,
  };
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: firstZodMessage(parsed.error), success: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: translateAuthError(error.message), success: null };
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export async function requestPasswordResetAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: firstZodMessage(parsed.error), success: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=/auth/update-password`,
  });

  if (error) {
    return { error: translateAuthError(error.message), success: null };
  }

  return {
    error: null,
    success: authDict.resetLinkSentIfExists,
  };
}

export async function updatePasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: firstZodMessage(parsed.error), success: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { error: translateAuthError(error.message), success: null };
  }

  redirect("/dashboard");
}

/** Keep Supabase's English error strings from leaking into the German UI untranslated. */
function translateAuthError(message: string): string {
  const known: Record<string, string> = {
    "Invalid login credentials": authDict.wrongCredentials,
    "User already registered": authDict.accountAlreadyExists,
    "Email not confirmed": authDict.emailNotConfirmed,
    "Password should be at least 6 characters": authDict.passwordTooShort,
  };
  return known[message] ?? message;
}
