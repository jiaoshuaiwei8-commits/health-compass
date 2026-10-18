import type { RedFlag, ScorableLog, ScorableProfile, SymptomCode } from "@/lib/types";
import { SYMPTOM_LABELS } from "@/lib/types";

export interface SymptomEventLike {
  code: string;
  reportedOn: string;
  severity: number;
  durationDays: number | null;
}

export interface RiskInput {
  profile: ScorableProfile;
  logs: ScorableLog[];
  symptoms: SymptomEventLike[];
  today: string;
}

const URGENT_ADVICE: Record<string, string> = {
  chest_pain: "胸痛或胸闷可能与心脏、肺部问题有关，请立即到急诊就诊；若持续不缓解请拨打 120。",
  short_breath: "出现气短或呼吸困难请尽快到急诊评估，不要自行用药观察。",
  blood_stool: "便血需要消化科评估，若出血量大或伴头晕心悸请立即急诊。",
  black_stool: "黑便可能提示上消化道出血，请尽快到急诊或消化科就诊。",
  unexplained_weight_loss: "6 个月内体重下降超过 5% 且非主动减重，建议尽快做内科与肿瘤筛查相关评估。",
  persistent_fever: "发热持续超过 3 天或伴寒战、皮疹，请到发热门诊就诊。",
  severe_abdominal_pain: "剧烈腹痛请立即急诊，暂不要进食或自行服用止痛药。",
  persistent_vomiting: "反复呕吐可能导致脱水与电解质紊乱，请尽快就诊。",
  suicidal_thoughts:
    "如果出现自伤或轻生念头，请立即联系信任的人陪伴，并拨打全国心理援助热线 12356，或前往就近医院急诊/精神心理科。你不需要独自承受。",
  low_mood_2weeks:
    "情绪低落或兴趣减退持续两周以上，建议到精神心理科做一次规范评估；心理治疗与药物治疗都有明确证据支持。",
};

const URGENT_CODES = new Set([
  "chest_pain",
  "short_breath",
  "blood_stool",
  "black_stool",
  "unexplained_weight_loss",
  "persistent_fever",
  "severe_abdominal_pain",
  "persistent_vomiting",
  "suicidal_thoughts",
]);

function withinDays(dateKey: string, today: string, days: number): boolean {
  const diff = (new Date(`${today}T00:00:00Z`).getTime() - new Date(`${dateKey}T00:00:00Z`).getTime()) / 86400000;
  return diff >= 0 && diff <= days;
}

export function detectRedFlags(input: RiskInput): RedFlag[] {
  const flags: RedFlag[] = [];
  const seen = new Set<string>();

  for (const event of input.symptoms) {
    if (!withinDays(event.reportedOn, input.today, 30)) continue;
    if (event.code === "low_mood_2weeks" && !withinDays(event.reportedOn, input.today, 30)) continue;
    const isUrgent = URGENT_CODES.has(event.code);
    const isSevereRecent = event.severity >= 3 && withinDays(event.reportedOn, input.today, 7);
    if (!isUrgent && !isSevereRecent && event.code !== "low_mood_2weeks") continue;
    if (seen.has(event.code)) continue;
    seen.add(event.code);

    flags.push({
      code: event.code,
      label: SYMPTOM_LABELS[event.code as SymptomCode] ?? event.code,
      advice: URGENT_ADVICE[event.code] ?? "该症状持续存在，建议到相应专科就诊评估。",
      urgent: isUrgent,
    });
  }

  const bmi =
    input.profile.heightCm && input.profile.weightKg
      ? input.profile.weightKg / (input.profile.heightCm / 100) ** 2
      : null;

  if (bmi !== null && bmi >= 35) {
    flags.push({
      code: "bmi-high",
      label: `BMI ${bmi.toFixed(1)}，达到重度肥胖范围`,
      advice: "建议到内分泌科或体重管理门诊做一次系统评估，包括血压、血糖、血脂、脂肪肝和睡眠呼吸暂停筛查。",
      urgent: false,
    });
  }

  if (bmi !== null && bmi < 16) {
    flags.push({
      code: "bmi-low",
      label: `BMI ${bmi.toFixed(1)}，明显偏低`,
      advice: "建议排查营养摄入、消化吸收和甲状腺功能，必要时由营养科制定增重方案。",
      urgent: false,
    });
  }

  const recentSleep = input.logs
    .map((log) => log.sleepMinutes)
    .filter((value): value is number => typeof value === "number")
    .slice(-4);
  const recentStress = input.logs
    .map((log) => log.stress)
    .filter((value): value is number => typeof value === "number")
    .slice(-4);

  if (
    recentSleep.length >= 3 &&
    recentSleep.every((minutes) => minutes < 5 * 60) &&
    recentStress.some((stress) => stress >= 4)
  ) {
    flags.push({
      code: "sleep-deprivation",
      label: "连续多天睡眠不足 5 小时且压力偏高",
      advice: "持续睡眠剥夺会显著影响注意力和心血管健康。建议尽快调整工作节奏，必要时就医评估失眠或焦虑。",
      urgent: false,
    });
  }

  return flags;
}
