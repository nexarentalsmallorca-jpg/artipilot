"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  PRIVATE_SESSION_COOKIE,
  PRIVATE_SESSION_VALUE,
} from "@/lib/auth/private-session";

export type LoginState = {
  error?: string;
};

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

/** Server action (used if form posts via action). Prefer POST /login route for reliability. */
export async function loginAction(
  _prevState: LoginState | null,
  formData: FormData
): Promise<LoginState> {
  const password = String(formData.get("password") || "");
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected) {
    return { error: "Dashboard password is not configured." };
  }

  if (!password || password !== expected) {
    return { error: "Incorrect password." };
  }

  const cookieStore = await cookies();
  cookieStore.set(
    PRIVATE_SESSION_COOKIE,
    PRIVATE_SESSION_VALUE,
    sessionCookieOptions()
  );

  redirect("/dashboard/inbox");
}
