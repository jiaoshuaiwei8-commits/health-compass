import { getActivePlan, getLatestReport, getPreviousReport, getRecentLogs } from "@/lib/data";
import { pct, average, round } from "@/lib/utils";

export interface WeeklyReview {
  hasData: boolean;
  avgSleepHours: number | null;
  avgSteps: number | null;
  exerciseMinutes: number;
  avgStress: number | null;
  avgMood: number | null;
  avgWater: number | null;
  overallScore: number | null;
  scoreDelta: number | null;
  completionRate: number;
  completedTasks: number;
  totalTasks: number;
  suggestions: string[];
}

export async function getWeeklyReview(userId: string, today: string): Promise<WeeklyReview> {
  const [logs, latest, previous, activePlan] = await Promise.all([
    getRecentLogs(userId, today, 7),
    getLatestReport(userId),
    getPreviousReport(userId),
    getActivePlan(userId),
  ]);

  const avgSleepHours = average(logs.map((log) => (log.sleepMinutes ? log.sleepMinutes / 60 : null)));
  const avgSteps = average(logs.map((log) => log.steps));
  const exerciseMinutes = logs.reduce(
    (sum, log) => sum + (log.exerciseMinutes ?? 0) + (log.vigorousMinutes ?? 0),
    0,
  );
  const avgStress = average(logs.map((log) => log.stress));
  const avgMood = average(logs.map((log) => log.mood));
  const avgWater = average(logs.map((log) => log.waterMl));

  const tasks = activePlan?.days.flatMap((day) => day.tasks) ?? [];
  const completedTasks = tasks.filter((row) => row.checkinId).length;
  const totalTasks = tasks.length;

  const suggestions: string[] = [];
  if (avgSleepHours !== null && avgSleepHours < 7) {
    suggestions.push("睡眠仍是短板：先把起床时间固定，再逐步前移入睡时间。");
  }
  if (exerciseMinutes < 150) {
    suggestions.push(`本周活动 ${exerciseMinutes} 分钟，距离 150 分钟目标还差 ${Math.max(0, 150 - exerciseMinutes)} 分钟，可以拆成每天 20 分钟。`);
  }
  if (avgWater !== null && avgWater < 1500) {
    suggestions.push("饮水量偏低，把水杯放在视线内，上午和下午各补 500ml。");
  }
  if (avgStress !== null && avgStress >= 4) {
    suggestions.push("压力持续偏高，本周安排两次 20 分钟户外散步，并减少睡前信息摄入。");
  }
  if (logs.length < 4) {
    suggestions.push(`本周只记录了 ${logs.length} 天，数据不足会削弱建议的针对性，尽量每天花 30 秒记录。`);
  }
  if (suggestions.length === 0) {
    suggestions.push("各项指标较稳定，保持当前节奏，下周可以把注意力放在力量训练上。");
  }

  return {
    hasData: logs.length > 0 || latest !== null,
    avgSleepHours: avgSleepHours === null ? null : round(avgSleepHours, 1),
    avgSteps: avgSteps === null ? null : Math.round(avgSteps),
    exerciseMinutes,
    avgStress: avgStress === null ? null : round(avgStress, 1),
    avgMood: avgMood === null ? null : round(avgMood, 1),
    avgWater: avgWater === null ? null : Math.round(avgWater),
    overallScore: latest?.report.overall ?? null,
    scoreDelta:
      latest && previous ? latest.report.overall - previous.overall : null,
    completionRate: pct(completedTasks, totalTasks),
    completedTasks,
    totalTasks,
    suggestions: suggestions.slice(0, 4),
  };
}
