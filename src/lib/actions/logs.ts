"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { dailyLogs, symptomEvents } from "@/db/schema";
import { getBool, getNumber, getString, getAllStrings } from "@/lib/actions/parse";
import { requireUser } from "@/lib/auth/require-user";
import { getRecentLogs } from "@/lib/data";
import type { Meals, SymptomCode } from "@/lib/types";
import { SYMPTOM_CATALOG } from "@/lib/types";
import {
  addDays,
  normalizeTime,
  sleepMinutesBetween,
  timeToMinutes,
  toDateKey,
} from "@/lib/utils";

function circularMean(values: number[]): number | null {
  if (values.length === 0) return null;
  const adjusted = values.map((value) => (value < 12 * 60 ? value + 24 * 60 : value));
  const mean = adjusted.reduce((sum, value) => sum + value, 0) / adjusted.length;
  return mean % (24 * 60);
}

function circularDiff(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 1440 - diff);
}

export async function saveDailyLogAction(formData: FormData) {
  const user = await requireUser("/today");
  const date = getString(formData, "log_date") ?? toDateKey();

  const sleepStart = normalizeTime(getString(formData, "sleep_start"));
  const sleepEnd = normalizeTime(getString(formData, "sleep_end"));
  const computedMinutes = sleepMinutesBetween(sleepStart, sleepEnd);
  const manualHours = getNumber(formData, "sleep_hours");
  const sleepMinutes = computedMinutes ?? (manualHours ? Math.round(manualHours * 60) : null);

  const db = await getDb();
  const recent = await getRecentLogs(user.id, addDays(date, -1), 7);
  const bedtimes = recent
    .map((log) => timeToMinutes(log.sleepStart))
    .filter((value): value is number => value !== null);
  const averageBedtime = circularMean(bedtimes);
  const currentBedtime = timeToMinutes(sleepStart);
  const bedtimeDeviationMin =
    averageBedtime !== null && currentBedtime !== null
      ? Math.round(circularDiff(averageBedtime, currentBedtime))
      : null;

  const meals: Meals = {
    breakfast: getBool(formData, "meal_breakfast"),
    lunch: getBool(formData, "meal_lunch"),
    dinner: getBool(formData, "meal_dinner"),
    vegetables: getBool(formData, "meal_vegetables"),
    fruit: getBool(formData, "meal_fruit"),
    wholeGrain: getBool(formData, "meal_whole_grain"),
    protein: getBool(formData, "meal_protein"),
    dairy: getBool(formData, "meal_dairy"),
    fried: getBool(formData, "meal_fried"),
    sugaryDrink: getBool(formData, "meal_sugary_drink"),
    takeout: getBool(formData, "meal_takeout"),
    lateNight: getBool(formData, "meal_late_night"),
  };

  const validCodes = new Set(SYMPTOM_CATALOG.map((item) => item.code));
  const symptoms = getAllStrings(formData, "symptoms").filter((code): code is SymptomCode =>
    validCodes.has(code as SymptomCode),
  );

  const values = {
    userId: user.id,
    logDate: date,
    sleepStart,
    sleepEnd,
    sleepMinutes,
    sleepLatencyMin: getNumber(formData, "sleep_latency_min"),
    nightWakes: getNumber(formData, "night_wakes"),
    sleepQuality: getNumber(formData, "sleep_quality"),
    bedtimeDeviationMin,
    steps: getNumber(formData, "steps"),
    exerciseMinutes: getNumber(formData, "exercise_minutes"),
    vigorousMinutes: getNumber(formData, "vigorous_minutes"),
    strengthTraining: getBool(formData, "strength_training"),
    sedentaryHours: getNumber(formData, "sedentary_hours"),
    waterMl: getNumber(formData, "water_ml"),
    caffeineCups: getNumber(formData, "caffeine_cups"),
    caffeineAfter2pm: getBool(formData, "caffeine_after_2pm"),
    alcoholUnits: getNumber(formData, "alcohol_units"),
    smoked: getBool(formData, "smoked"),
    mood: getNumber(formData, "mood"),
    stress: getNumber(formData, "stress"),
    energy: getNumber(formData, "energy"),
    bowelCount: getNumber(formData, "bowel_count"),
    bristol: getNumber(formData, "bristol"),
    bloating: getBool(formData, "bloating"),
    meals,
    symptoms,
    note: getString(formData, "note"),
    updatedAt: new Date(),
  };

  await db
    .insert(dailyLogs)
    .values(values)
    .onConflictDoUpdate({
      target: [dailyLogs.userId, dailyLogs.logDate],
      set: values,
    });

  await db
    .delete(symptomEvents)
    .where(
      and(
        eq(symptomEvents.userId, user.id),
        eq(symptomEvents.reportedOn, date),
        eq(symptomEvents.note, "每日记录"),
      ),
    );

  if (symptoms.length > 0) {
    await db.insert(symptomEvents).values(
      symptoms.map((code) => ({
        userId: user.id,
        reportedOn: date,
        code,
        severity: 2,
        durationDays: null,
        note: "每日记录",
      })),
    );
  }

  revalidatePath("/today");
  revalidatePath("/report");
  revalidatePath("/review");
  redirect(`/today?date=${date}&saved=1`);
}
