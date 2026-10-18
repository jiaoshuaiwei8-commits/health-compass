"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { assessments, consents, profiles, symptomEvents } from "@/db/schema";
import type { FormState } from "@/lib/actions/state";
import { getAllStrings, getBool, getNumber, getString } from "@/lib/actions/parse";
import { requireUser } from "@/lib/auth/require-user";
import { CONSENT_VERSION, SCORING_VERSION } from "@/lib/constants";
import type {
  ActivityLevel,
  AssessmentAnswers,
  Baseline,
  Chronotype,
  Goal,
  Sex,
  SmokingStatus,
  SymptomCode,
} from "@/lib/types";
import { round, toDateKey } from "@/lib/utils";

function computeBaseline(answers: AssessmentAnswers, heightCm: number | null, weightKg: number | null): Baseline {
  const heightM = heightCm ? heightCm / 100 : null;
  const bmi = heightM && weightKg ? weightKg / (heightM * heightM) : null;
  const notes: string[] = [];

  let bmiCategory = "未知";
  if (bmi !== null) {
    const value = round(bmi, 1);
    bmiCategory =
      value < 18.5 ? "偏低" : value < 24 ? "正常" : value < 28 ? "超重" : "肥胖";
  }

  const sleepDebtHours = answers.sleepHours ? Math.max(0, round(7.5 - answers.sleepHours, 1)) : null;
  if (answers.sleepHours > 0 && answers.sleepHours < 6) notes.push("基线睡眠不足 6 小时");
  if (answers.sedentaryHours >= 10) notes.push("基线久坐超过 10 小时/天");
  if (answers.familyHistory.length > 0) notes.push(`家族史：${answers.familyHistory.join("、")}`);
  if (answers.conditions.length > 0) notes.push(`已知情况：${answers.conditions.join("、")}`);

  return {
    bmi: bmi === null ? null : round(bmi, 1),
    bmiCategory,
    sleepDebtHours,
    weeklyExerciseMinutes: answers.exerciseDays * answers.exerciseMinutesPerSession,
    notes,
  };
}

export async function saveOnboardingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/onboarding");
  if (!getBool(formData, "consent")) {
    return { error: "需要先同意健康数据处理说明，才能继续" };
  }

  const sex = (getString(formData, "sex") ?? "female") as Sex;
  const goal = (getString(formData, "goal") ?? "overall") as Goal;
  const activityLevel = (getString(formData, "activity_level") ?? "light") as ActivityLevel;
  const chronotype = (getString(formData, "chronotype") ?? "neutral") as Chronotype;
  const heightCm = getNumber(formData, "height_cm");
  const weightKg = getNumber(formData, "weight_kg");

  const answers: AssessmentAnswers = {
    workSchedule: (getString(formData, "work_schedule") ?? "regular") as AssessmentAnswers["workSchedule"],
    typicalWake: getString(formData, "typical_wake") ?? "07:30",
    typicalBed: getString(formData, "typical_bed") ?? "23:30",
    sleepHours: getNumber(formData, "sleep_hours") ?? 7,
    sleepLatencyMin: getNumber(formData, "sleep_latency_min") ?? 20,
    exerciseDays: getNumber(formData, "exercise_days") ?? 2,
    exerciseMinutesPerSession: getNumber(formData, "exercise_minutes_per_session") ?? 30,
    sedentaryHours: getNumber(formData, "sedentary_hours") ?? 8,
    vegetableServings: getNumber(formData, "vegetable_servings") ?? 2,
    fruitServings: getNumber(formData, "fruit_servings") ?? 1,
    breakfastFrequency: getNumber(formData, "breakfast_frequency") ?? 3,
    takeoutFrequency: getNumber(formData, "takeout_frequency") ?? 2,
    waterMl: getNumber(formData, "water_ml") ?? 1200,
    caffeineCups: getNumber(formData, "caffeine_cups") ?? 1,
    alcoholFrequency: getNumber(formData, "alcohol_frequency") ?? 0,
    smoking: (getString(formData, "smoking") ?? "never") as SmokingStatus,
    stressLevel: getNumber(formData, "stress_level") ?? 3,
    bowelFrequency: (getString(formData, "bowel_frequency") ?? "daily") as AssessmentAnswers["bowelFrequency"],
    conditions: getAllStrings(formData, "conditions"),
    familyHistory: getAllStrings(formData, "family_history"),
    symptoms: getAllStrings(formData, "symptoms") as SymptomCode[],
    mainGoal: goal,
  };

  const db = await getDb();
  await db
    .insert(profiles)
    .values({
      userId: user.id,
      sex,
      birthYear: getNumber(formData, "birth_year"),
      heightCm,
      weightKg,
      waistCm: getNumber(formData, "waist_cm"),
      targetWeightKg: getNumber(formData, "target_weight_kg"),
      goal,
      activityLevel,
      chronotype,
      conditions: answers.conditions,
      medications: getString(formData, "medications"),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        sex,
        birthYear: getNumber(formData, "birth_year"),
        heightCm,
        weightKg,
        waistCm: getNumber(formData, "waist_cm"),
        targetWeightKg: getNumber(formData, "target_weight_kg"),
        goal,
        activityLevel,
        chronotype,
        conditions: answers.conditions,
        medications: getString(formData, "medications"),
        updatedAt: new Date(),
      },
    });

  const baseline = computeBaseline(answers, heightCm, weightKg);
  await db.insert(assessments).values({ userId: user.id, answers, baseline });

  const existingConsent = await db
    .select({ id: consents.id })
    .from(consents)
    .where(eq(consents.userId, user.id))
    .limit(1);
  if (existingConsent.length === 0) {
    await db.insert(consents).values({
      userId: user.id,
      version: CONSENT_VERSION,
      scope: "health-data",
      userAgent: null,
      ip: null,
    });
  }

  const today = toDateKey();
  if (answers.symptoms.length > 0) {
    await db
      .insert(symptomEvents)
      .values(
        answers.symptoms.map((code) => ({
          userId: user.id,
          reportedOn: today,
          code,
          severity: 2,
          durationDays: null,
          note: `初始评估（${SCORING_VERSION}）`,
        })),
      );
  }

  redirect("/today?welcome=1");
}
