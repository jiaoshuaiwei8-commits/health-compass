import { describe, expect, it } from "vitest";
import { scoreHealth } from "./index";
import type { ScorableLog, ScorableProfile } from "@/lib/types";

const profile: ScorableProfile = {
  sex: "female",
  birthYear: 1992,
  heightCm: 165,
  weightKg: 58,
  waistCm: 72,
  activityLevel: "moderate",
  goal: "overall",
};

function log(overrides: Partial<ScorableLog> = {}): ScorableLog {
  return {
    logDate: "2026-10-01",
    sleepMinutes: 450,
    sleepLatencyMin: 15,
    nightWakes: 0,
    sleepQuality: 4,
    bedtimeDeviationMin: 20,
    steps: 9000,
    exerciseMinutes: 30,
    vigorousMinutes: 0,
    strengthTraining: true,
    sedentaryHours: 6,
    waterMl: 1800,
    caffeineCups: 1,
    caffeineAfter2pm: false,
    alcoholUnits: 0,
    smoked: false,
    mood: 4,
    stress: 2,
    energy: 4,
    bowelCount: 1,
    bristol: 4,
    bloating: false,
    meals: {
      breakfast: true,
      lunch: true,
      dinner: true,
      vegetables: true,
      fruit: true,
      wholeGrain: true,
      protein: true,
      dairy: true,
      fried: false,
      sugaryDrink: false,
      takeout: false,
      lateNight: false,
    },
    ...overrides,
  };
}

const today = "2026-10-07";

describe("scoreHealth", () => {
  it("健康记录应得到较高分数且没有红旗", () => {
    const logs = Array.from({ length: 7 }, () => log());
    const result = scoreHealth({ profile, logs, symptoms: [], today });

    expect(result.overall).toBeGreaterThanOrEqual(85);
    expect(result.redFlags).toHaveLength(0);
    expect(result.dimensions).toHaveLength(7);
    expect(result.topIssues).toHaveLength(0);
  });

  it("睡眠不足会拉低睡眠维度并进入主要问题", () => {
    const logs = Array.from({ length: 7 }, () => log({ sleepMinutes: 300, sleepLatencyMin: 70 }));
    const result = scoreHealth({ profile, logs, symptoms: [], today });
    const sleep = result.dimensions.find((dimension) => dimension.key === "sleep");

    expect(sleep?.score).toBeLessThan(70);
    expect(result.topIssues.some((issue) => issue.code.startsWith("sleep"))).toBe(true);
    // 睡眠维度只有 58 分，加权平均本可被其它满分维度拉到 90；
    // 存在 alert 级问题时综合分应封顶在 79。
    expect(result.overall).toBeLessThan(85);
  });

  it("只有 warn 级问题时综合分不被封顶", () => {
    const logs = Array.from({ length: 7 }, () => log({ sleepMinutes: 390 }));
    const result = scoreHealth({ profile, logs, symptoms: [], today });

    expect(result.topIssues.length).toBeGreaterThan(0);
    expect(result.topIssues.every((issue) => issue.severity === "warn")).toBe(true);
    expect(result.overall).toBeGreaterThanOrEqual(90);
  });

  it("吸烟会显著降低烟酒维度", () => {
    const logs = Array.from({ length: 7 }, () => log({ smoked: true }));
    const result = scoreHealth({ profile, logs, symptoms: [], today });
    const substances = result.dimensions.find((dimension) => dimension.key === "substances");

    expect(substances?.score).toBeLessThan(75);
    expect(substances?.findings.some((finding) => finding.severity === "alert")).toBe(true);
  });

  it("红旗症状会触发紧急就医建议", () => {
    const result = scoreHealth({
      profile,
      logs: [log()],
      symptoms: [
        { code: "chest_pain", reportedOn: today, severity: 3, durationDays: 1 },
        { code: "suicidal_thoughts", reportedOn: today, severity: 3, durationDays: 1 },
      ],
      today,
    });

    expect(result.redFlags.map((flag) => flag.code)).toEqual(
      expect.arrayContaining(["chest_pain", "suicidal_thoughts"]),
    );
    expect(result.redFlags.every((flag) => flag.urgent)).toBe(true);
    expect(result.redFlags[0].advice).toContain("急诊");
  });

  it("记录不足时给出中性分而不是极低分", () => {
    const result = scoreHealth({ profile, logs: [], symptoms: [], today });
    const diet = result.dimensions.find((dimension) => dimension.key === "diet");

    expect(diet?.score).toBe(60);
    expect(diet?.findings[0].code).toBe("insufficient-data");
  });

  it("BMI 与腰围超标会降低体重维度", () => {
    const heavy: ScorableProfile = { ...profile, weightKg: 82, waistCm: 92 };
    const result = scoreHealth({ profile: heavy, logs: [log()], symptoms: [], today });
    const body = result.dimensions.find((dimension) => dimension.key === "body");

    expect(body?.score).toBeLessThan(80);
    expect(body?.findings.some((finding) => finding.code === "body-waist")).toBe(true);
  });
});
