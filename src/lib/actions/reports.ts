"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getLatestReport, getProfile, getRecentLogs, getReportCountToday, getSymptomEvents } from "@/lib/data";
import { generateReport } from "@/lib/reports/generate";
import { generatePlan } from "@/lib/plans/generate";
import type { ActivityLevel, Goal, ScoreResult, Sex } from "@/lib/types";
import { toDateKey } from "@/lib/utils";

export async function generateReportAction() {
  const user = await requireUser("/report");
  const profile = await getProfile(user.id);
  if (!profile) redirect("/onboarding");

  const limit = Number(process.env.REPORTS_PER_DAY ?? 2);
  const used = await getReportCountToday(user.id);
  if (used >= limit) {
    redirect("/report?error=quota");
  }

  const today = toDateKey();
  const [logs, symptoms] = await Promise.all([
    getRecentLogs(user.id, today, 7),
    getSymptomEvents(user.id, today, 60),
  ]);

  if (logs.length === 0) {
    redirect("/today?need=log");
  }

  const result = await generateReport({
    userId: user.id,
    profile: {
      sex: profile.sex as Sex,
      birthYear: profile.birthYear,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      waistCm: profile.waistCm,
      activityLevel: profile.activityLevel as ActivityLevel,
      goal: profile.goal as Goal,
    },
    logs: logs.map((log) => ({
      logDate: log.logDate,
      sleepMinutes: log.sleepMinutes,
      sleepLatencyMin: log.sleepLatencyMin,
      nightWakes: log.nightWakes,
      sleepQuality: log.sleepQuality,
      bedtimeDeviationMin: log.bedtimeDeviationMin,
      steps: log.steps,
      exerciseMinutes: log.exerciseMinutes,
      vigorousMinutes: log.vigorousMinutes,
      strengthTraining: log.strengthTraining,
      sedentaryHours: log.sedentaryHours,
      waterMl: log.waterMl,
      caffeineCups: log.caffeineCups,
      caffeineAfter2pm: log.caffeineAfter2pm,
      alcoholUnits: log.alcoholUnits,
      smoked: log.smoked,
      mood: log.mood,
      stress: log.stress,
      energy: log.energy,
      bowelCount: log.bowelCount,
      bristol: log.bristol,
      bloating: log.bloating,
      meals: log.meals,
    })),
    symptoms: symptoms.map((event) => ({
      code: event.code,
      reportedOn: event.reportedOn,
      severity: event.severity,
      durationDays: event.durationDays,
    })),
    today,
    periodStart: logs[0]?.logDate ?? today,
  });

  revalidatePath("/report");
  revalidatePath("/review");
  redirect(`/report?generated=${result.engine}`);
}

export async function generatePlanAction() {
  const user = await requireUser("/plan");
  const latest = await getLatestReport(user.id);
  if (!latest) redirect("/report");

  const score: ScoreResult = {
    overall: latest.report.overall,
    dimensions: latest.report.scores,
    topIssues: latest.report.topIssues,
    redFlags: latest.report.redFlags,
    dataDays: 7,
    coverage: { logs: 7, sleepDays: 7, dietDays: 7, activityDays: 7 },
  };

  await generatePlan({
    userId: user.id,
    reportId: latest.report.id,
    score,
    today: toDateKey(),
  });

  revalidatePath("/plan");
  revalidatePath("/review");
  redirect("/plan?generated=1");
}
