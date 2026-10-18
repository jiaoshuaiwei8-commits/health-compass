"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";
import type { FormState } from "./state";

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("请输入有效的邮箱地址"),
  password: z.string().min(8, "密码至少 8 位"),
  name: z.string().trim().max(30).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("请输入有效的邮箱地址"),
  password: z.string().min(1, "请输入密码"),
});

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  return "/today";
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "请检查输入" };
  }

  const db = await getDb();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  if (existing) return { error: "这个邮箱已经注册过了，直接登录即可" };

  const [created] = await db
    .insert(users)
    .values({
      email: parsed.data.email,
      name: parsed.data.name?.trim() || null,
      passwordHash: hashPassword(parsed.data.password),
    })
    .returning({ id: users.id });

  await setSessionCookie(created.id);
  redirect("/onboarding");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "请检查输入" };
  }

  const db = await getDb();
  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return { error: "邮箱或密码不正确" };
  }

  await setSessionCookie(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}
