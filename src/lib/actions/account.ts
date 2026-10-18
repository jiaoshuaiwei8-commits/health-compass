"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { profiles, users } from "@/db/schema";
import { getNumber, getString } from "@/lib/actions/parse";
import { requireUser } from "@/lib/auth/require-user";
import { clearSessionCookie } from "@/lib/auth/session";
import type { ActivityLevel, Chronotype, Goal, Sex } from "@/lib/types";

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser("/settings");
  const db = await getDb();

  await db
    .insert(profiles)
    .values({
      userId: user.id,
      sex: (getString(formData, "sex") ?? "female") as Sex,
      birthYear: getNumber(formData, "birth_year"),
      heightCm: getNumber(formData, "height_cm"),
      weightKg: getNumber(formData, "weight_kg"),
      waistCm: getNumber(formData, "waist_cm"),
      targetWeightKg: getNumber(formData, "target_weight_kg"),
      goal: (getString(formData, "goal") ?? "overall") as Goal,
      activityLevel: (getString(formData, "activity_level") ?? "light") as ActivityLevel,
      chronotype: (getString(formData, "chronotype") ?? "neutral") as Chronotype,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        sex: (getString(formData, "sex") ?? "female") as Sex,
        birthYear: getNumber(formData, "birth_year"),
        heightCm: getNumber(formData, "height_cm"),
        weightKg: getNumber(formData, "weight_kg"),
        waistCm: getNumber(formData, "waist_cm"),
        targetWeightKg: getNumber(formData, "target_weight_kg"),
        goal: (getString(formData, "goal") ?? "overall") as Goal,
        activityLevel: (getString(formData, "activity_level") ?? "light") as ActivityLevel,
        chronotype: (getString(formData, "chronotype") ?? "neutral") as Chronotype,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/settings");
  revalidatePath("/today");
  redirect("/settings?saved=1");
}

export async function deleteAccountAction(formData: FormData) {
  const user = await requireUser("/settings");
  if (getString(formData, "confirm") !== "删除") {
    redirect("/settings?error=confirm");
  }

  const db = await getDb();
  await db.delete(users).where(eq(users.id, user.id));
  await clearSessionCookie();
  redirect("/");
}
