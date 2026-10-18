import "./load-env";
import { eq } from "drizzle-orm";
import { closeDatabase, ensureDatabase } from "../src/db/client";
import { assessments, consents, dailyLogs, profiles, symptomEvents, users } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth/password";
import { generateReport } from "../src/lib/reports/generate";
import { generatePlan } from "../src/lib/plans/generate";
import { CONSENT_VERSION, SCORING_VERSION } from "../src/lib/constants";
import type {
  ActivityLevel,
  AssessmentAnswers,
  Goal,
  Meals,
  Sex,
  SymptomCode,
} from "../src/lib/types";
import { addDays, toDateKey } from "../src/lib/utils";

const DEMO_EMAIL = "demo@health-compass.local";
const DEMO_PASSWORD = "demo1234";

function makeRandom(seedValue: number) {
  let seed = seedValue;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function buildMeals(rand: () => number, index: number): Meals {
  const weekend = index % 7 === 5 || index % 7 === 6;
  return {
    breakfast: rand() > 0.3,
    lunch: true,
    dinner: true,
    vegetables: rand() > 0.45,
    fruit: rand() > 0.55,
    wholeGrain: rand() > 0.7,
    protein: rand() > 0.35,
    dairy: rand() > 0.6,
    fried: rand() > 0.8,
    sugaryDrink: rand() > 0.75,
    takeout: weekend ? rand() > 0.4 : rand() > 0.55,
    lateNight: weekend && rand() > 0.7,
  };
}

async function main() {
  process.env.AI_PROVIDER = "mock";
  const bundle = await ensureDatabase();
  const db = bundle.db;

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
  if (existing[0]) {
    await db.delete(users).where(eq(users.id, existing[0].id));
    console.log("已清理旧的演示账号。");
  }

  const [user] = await db
    .insert(users)
    .values({
      email: DEMO_EMAIL,
      name: "演示用户",
      passwordHash: hashPassword(DEMO_PASSWORD),
    })
    .returning({ id: users.id });

  const profile = {
    userId: user.id,
    sex: "male" as Sex,
    birthYear: 1994,
    heightCm: 175,
    weightKg: 78.5,
    waistCm: 92,
    targetWeightKg: 72,
    goal: "lose_weight" as Goal,
    activityLevel: "sedentary" as ActivityLevel,
    chronotype: "late",
    conditions: [] as string[],
    medications: null,
    updatedAt: new Date(),
  };
  await db.insert(profiles).values(profile);

  const answers: AssessmentAnswers = {
    workSchedule: "regular",
    typicalWake: "07:20",
    typicalBed: "00:30",
    sleepHours: 6.5,
    sleepLatencyMin: 35,
    exerciseDays: 1,
    exerciseMinutesPerSession: 30,
    sedentaryHours: 10,
    vegetableServings: 2,
    fruitServings: 1,
    breakfastFrequency: 3,
    takeoutFrequency: 6,
    waterMl: 1200,
    caffeineCups: 2,
    alcoholFrequency: 2,
    smoking: "never",
    stressLevel: 4,
    bowelFrequency: "3-6w",
    conditions: [],
    familyHistory: ["高血压"],
    symptoms: [],
    mainGoal: "lose_weight",
  };

  await db.insert(assessments).values({
    userId: user.id,
    answers,
    baseline: {
      bmi: 25.6,
      bmiCategory: "超重",
      sleepDebtHours: 1,
      weeklyExerciseMinutes: 30,
      notes: ["基线睡眠不足 7 小时", "基线久坐超过 10 小时/天", "家族史：高血压"],
    },
  });

  await db.insert(consents).values({
    userId: user.id,
    version: CONSENT_VERSION,
    scope: "health-data",
  });

  const rand = makeRandom(20261018);
  const today = toDateKey();
  const logs = [];

  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const lateNight = weekday === 5 || weekday === 6;
    const sleepMinutes = 350 + Math.round(rand() * 90);
    const bedtime = lateNight ? "01:10" : "23:55";
    const wake = lateNight ? "08:30" : "07:10";

    logs.push({
      userId: user.id,
      logDate: date,
      sleepStart: bedtime,
      sleepEnd: wake,
      sleepMinutes,
      sleepLatencyMin: 20 + Math.round(rand() * 35),
      nightWakes: rand() > 0.6 ? 1 : rand() > 0.85 ? 2 : 0,
      sleepQuality: rand() > 0.5 ? 3 : 2,
      bedtimeDeviationMin: 20 + Math.round(rand() * 60),
      steps: 4200 + Math.round(rand() * 3800),
      exerciseMinutes: rand() > 0.75 ? 30 : 0,
      vigorousMinutes: 0,
      strengthTraining: rand() > 0.9,
      sedentaryHours: 8 + Math.round(rand() * 3),
      waterMl: 900 + Math.round(rand() * 700),
      caffeineCups: 2 + Math.round(rand() * 2),
      caffeineAfter2pm: rand() > 0.5,
      alcoholUnits: weekday === 5 ? 2 : 0,
      smoked: false,
      mood: rand() > 0.5 ? 3 : 2,
      stress: 3 + Math.round(rand() * 2),
      energy: rand() > 0.5 ? 3 : 2,
      bowelCount: rand() > 0.4 ? 1 : 0,
      bristol: rand() > 0.5 ? 3 : 2,
      bloating: rand() > 0.75,
      meals: buildMeals(rand, offset),
      symptoms: [] as SymptomCode[],
      note: null,
    });
  }

  await db.insert(dailyLogs).values(logs).onConflictDoNothing();

  await db.insert(symptomEvents).values([
    {
      userId: user.id,
      reportedOn: addDays(today, -3),
      code: "bloating",
      severity: 2,
      durationDays: 5,
      note: "每日记录",
    },
    {
      userId: user.id,
      reportedOn: addDays(today, -6),
      code: "fatigue",
      severity: 2,
      durationDays: 10,
      note: "每日记录",
    },
  ]);

  console.log(`演示账号已创建：${DEMO_EMAIL} / ${DEMO_PASSWORD}`);

  const result = await generateReport({
    userId: user.id,
    profile: {
      sex: profile.sex,
      birthYear: profile.birthYear,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      waistCm: profile.waistCm,
      activityLevel: profile.activityLevel,
      goal: profile.goal,
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
    symptoms: [
      { code: "bloating", reportedOn: addDays(today, -3), severity: 2, durationDays: 5 },
      { code: "fatigue", reportedOn: addDays(today, -6), severity: 2, durationDays: 10 },
    ],
    today,
    periodStart: logs[0].logDate,
  });

  await generatePlan({
    userId: user.id,
    reportId: result.reportId,
    score: result.score,
    today,
  });

  console.log(
    `已生成演示报告（综合 ${result.score.overall} 分，引擎 ${result.engine}）与 7 天计划。` +
      `当前评分规则版本 ${SCORING_VERSION}。`,
  );
}

main()
  .then(() => closeDatabase())
  .catch(async (error) => {
    console.error("种子数据写入失败：", error);
    await closeDatabase().catch(() => {});
    process.exit(1);
  });
