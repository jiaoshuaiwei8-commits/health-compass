import type {
  DimensionKey,
  DimensionScore,
  Finding,
  ScorableLog,
  ScoreLevel,
  SymptomCode,
} from "@/lib/types";
import { average, round } from "@/lib/utils";

export function levelFor(score: number): ScoreLevel {
  if (score >= 80) return "good";
  if (score >= 60) return "fair";
  return "poor";
}

export function averageOrNull(values: (number | null | undefined)[]): number | null {
  const value = average(values);
  return value === null ? null : value;
}

export function countWith(logs: ScorableLog[], predicate: (log: ScorableLog) => boolean): number {
  return logs.filter(predicate).length;
}

export function ratioWith(logs: ScorableLog[], predicate: (log: ScorableLog) => boolean): number {
  if (logs.length === 0) return 0;
  return countWith(logs, predicate) / logs.length;
}

export interface ScoreContext {
  logs: ScorableLog[];
  sleepLogs: ScorableLog[];
  dietLogs: ScorableLog[];
  activityLogs: ScorableLog[];
  moodLogs: ScorableLog[];
  digestionLogs: ScorableLog[];
  symptomCodes: Set<string>;
}

export function buildContext(logs: ScorableLog[], symptomCodes: SymptomCode[]): ScoreContext {
  return {
    logs,
    sleepLogs: logs.filter((log) => log.sleepMinutes !== null || log.sleepQuality !== null),
    dietLogs: logs.filter((log) => log.meals && Object.keys(log.meals).length > 0),
    activityLogs: logs.filter(
      (log) =>
        log.exerciseMinutes !== null ||
        log.steps !== null ||
        log.sedentaryHours !== null ||
        log.vigorousMinutes !== null,
    ),
    moodLogs: logs.filter((log) => log.mood !== null || log.stress !== null || log.energy !== null),
    digestionLogs: logs.filter((log) => log.bowelCount !== null || log.bristol !== null),
    symptomCodes: new Set<string>(symptomCodes),
  };
}

export function makeDimension(
  key: DimensionKey,
  label: string,
  score: number,
  summary: string,
  findings: Finding[],
): DimensionScore {
  const bounded = Math.round(Math.min(100, Math.max(0, score)));
  return { key, label, score: bounded, level: levelFor(bounded), summary, findings };
}

/** 数据不足时给出中性分，避免把"没记录"误判为"不健康" */
export function insufficient(
  key: DimensionKey,
  label: string,
  coverageText: string,
): DimensionScore {
  return makeDimension(key, label, 60, "记录不足，暂不评分", [
    {
      code: "insufficient-data",
      title: `${label}数据不足`,
      detail: `${coverageText}。连续记录 4 天以上，评分才具备参考价值。`,
      severity: "info",
    },
  ]);
}

export function formatHours(minutes: number | null): string {
  if (minutes === null) return "—";
  return `${round(minutes / 60, 1)} 小时`;
}

export function formatPercent(value: number, digits = 0): string {
  return `${round(value * 100, digits)}%`;
}

export function pickSeverity(score: number): Finding["severity"] {
  if (score < 60) return "alert";
  if (score < 80) return "warn";
  return "info";
}
