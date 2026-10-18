import type {
  DimensionScore,
  Finding,
  ScorableLog,
  ScorableProfile,
  ScoreResult,
  SymptomCode,
} from "@/lib/types";
import { buildContext } from "./helpers";
import {
  scoreActivity,
  scoreBody,
  scoreDiet,
  scoreDigestion,
  scoreMood,
  scoreSleep,
  scoreSubstances,
} from "./dimensions";
import { detectRedFlags, type SymptomEventLike } from "./risk";

export interface ScoreInput {
  profile: ScorableProfile;
  logs: ScorableLog[];
  symptoms: SymptomEventLike[];
  today: string;
}

const WEIGHTS: Record<DimensionScore["key"], number> = {
  diet: 0.2,
  sleep: 0.25,
  activity: 0.15,
  body: 0.15,
  digestion: 0.1,
  mood: 0.1,
  substances: 0.05,
};

/**
 * 只要存在 alert 级问题，综合分封顶到 79：
 * 加权平均会被其它满分维度稀释（例如连续一周只睡 5 小时，睡眠 58 分时综合分仍有 90），
 * 而 levelFor 从 80 分起算「良好」，会让头部分数与最严重的问题自相矛盾。
 */
const ALERT_SEVERITY_CAP = 79;

export function scoreHealth(input: ScoreInput): ScoreResult {
  const symptomCodes = input.symptoms.map((event) => event.code as SymptomCode);
  const ctx = buildContext(input.logs, symptomCodes);

  const dimensions: DimensionScore[] = [
    scoreDiet(ctx),
    scoreSleep(ctx),
    scoreActivity(ctx),
    scoreBody(ctx, input.profile),
    scoreDigestion(ctx),
    scoreMood(ctx),
    scoreSubstances(ctx, input.profile),
  ];

  let weightSum = 0;
  let weighted = 0;
  for (const dimension of dimensions) {
    const hasData = !dimension.findings.some((finding) => finding.code === "insufficient-data");
    if (!hasData) continue;
    const weight = WEIGHTS[dimension.key];
    weightSum += weight;
    weighted += dimension.score * weight;
  }
  const weightedMean = weightSum > 0 ? Math.round(weighted / weightSum) : 60;

  const allFindings = dimensions
    .flatMap((dimension) => dimension.findings)
    .filter((finding) => finding.severity !== "info");

  const overall = allFindings.some((finding) => finding.severity === "alert")
    ? Math.min(weightedMean, ALERT_SEVERITY_CAP)
    : weightedMean;

  const severityRank: Record<Finding["severity"], number> = { alert: 0, warn: 1, info: 2 };
  const topIssues = allFindings
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
    .filter((finding, index, list) => list.findIndex((item) => item.code === finding.code) === index)
    .slice(0, 3);

  const redFlags = detectRedFlags({
    profile: input.profile,
    logs: input.logs,
    symptoms: input.symptoms,
    today: input.today,
  });

  const coverage = {
    logs: input.logs.length,
    sleepDays: ctx.sleepLogs.length,
    dietDays: ctx.dietLogs.length,
    activityDays: ctx.activityLogs.length,
  };

  return {
    overall,
    dimensions,
    topIssues,
    redFlags,
    dataDays: input.logs.length,
    coverage,
  };
}

export { detectRedFlags, type SymptomEventLike } from "./risk";
export { levelFor } from "./helpers";
export type { ScorableLog, ScorableProfile };
