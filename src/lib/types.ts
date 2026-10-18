/* ------------------------------------------------------------------ *
 * 领域类型：前后端共享
 * ------------------------------------------------------------------ */

export type Sex = "female" | "male" | "other";
export type Goal = "lose_weight" | "sleep" | "energy" | "glucose" | "overall";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "high";
export type Chronotype = "early" | "neutral" | "late";
export type SmokingStatus = "never" | "sometimes" | "daily";

export const GOAL_LABELS: Record<Goal, string> = {
  lose_weight: "体重管理",
  sleep: "改善睡眠",
  energy: "提升精力",
  glucose: "血糖友好",
  overall: "整体健康",
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "久坐为主，几乎不运动",
  light: "轻度活动，每周 1-2 次",
  moderate: "中等活动，每周 3-4 次",
  high: "高强度活动，每周 5 次以上",
};

/* ---------------------------------- 饮食 --------------------------------- */

export interface Meals {
  breakfast?: boolean;
  lunch?: boolean;
  dinner?: boolean;
  vegetables?: boolean;
  fruit?: boolean;
  wholeGrain?: boolean;
  protein?: boolean;
  dairy?: boolean;
  fried?: boolean;
  sugaryDrink?: boolean;
  takeout?: boolean;
  lateNight?: boolean;
}

export type MealKey = keyof Meals;

export const MEAL_LABELS: Record<MealKey, string> = {
  breakfast: "吃了早餐",
  lunch: "吃了午餐",
  dinner: "吃了晚餐",
  vegetables: "蔬菜 ≥ 300g",
  fruit: "水果 200-350g",
  wholeGrain: "有全谷物/杂豆",
  protein: "有鱼禽蛋瘦肉/豆制品",
  dairy: "有奶或奶制品",
  fried: "油炸/高油食物",
  sugaryDrink: "含糖饮料",
  takeout: "外卖",
  lateNight: "夜宵（睡前 2 小时内进食）",
};

/* ---------------------------------- 症状 --------------------------------- */

export type SymptomCode =
  | "chest_pain"
  | "short_breath"
  | "blood_stool"
  | "black_stool"
  | "unexplained_weight_loss"
  | "persistent_fever"
  | "severe_abdominal_pain"
  | "persistent_vomiting"
  | "suicidal_thoughts"
  | "low_mood_2weeks"
  | "palpitations"
  | "dizziness"
  | "headache"
  | "bloating"
  | "insomnia"
  | "fatigue"
  | "constipation"
  | "diarrhea"
  | "reflux";

export interface SymptomDefinition {
  code: SymptomCode;
  label: string;
  urgent: boolean;
  group: "urgent" | "general";
}

export const SYMPTOM_CATALOG: SymptomDefinition[] = [
  { code: "chest_pain", label: "胸痛 / 胸闷", urgent: true, group: "urgent" },
  { code: "short_breath", label: "气短 / 呼吸困难", urgent: true, group: "urgent" },
  { code: "blood_stool", label: "便血", urgent: true, group: "urgent" },
  { code: "black_stool", label: "黑便", urgent: true, group: "urgent" },
  { code: "unexplained_weight_loss", label: "不明原因体重下降", urgent: true, group: "urgent" },
  { code: "persistent_fever", label: "持续发热", urgent: true, group: "urgent" },
  { code: "severe_abdominal_pain", label: "剧烈腹痛", urgent: true, group: "urgent" },
  { code: "persistent_vomiting", label: "反复呕吐", urgent: true, group: "urgent" },
  { code: "suicidal_thoughts", label: "出现自伤或轻生念头", urgent: true, group: "urgent" },
  { code: "low_mood_2weeks", label: "情绪低落持续两周以上", urgent: false, group: "general" },
  { code: "palpitations", label: "心悸", urgent: false, group: "general" },
  { code: "dizziness", label: "头晕", urgent: false, group: "general" },
  { code: "headache", label: "头痛", urgent: false, group: "general" },
  { code: "bloating", label: "腹胀", urgent: false, group: "general" },
  { code: "insomnia", label: "入睡困难", urgent: false, group: "general" },
  { code: "fatigue", label: "持续疲劳", urgent: false, group: "general" },
  { code: "constipation", label: "便秘", urgent: false, group: "general" },
  { code: "diarrhea", label: "腹泻", urgent: false, group: "general" },
  { code: "reflux", label: "反酸 / 烧心", urgent: false, group: "general" },
];

export const SYMPTOM_LABELS = Object.fromEntries(
  SYMPTOM_CATALOG.map((item) => [item.code, item.label]),
) as Record<SymptomCode, string>;

/* ---------------------------------- 问卷 --------------------------------- */

export interface AssessmentAnswers {
  workSchedule: "regular" | "shift" | "flexible";
  typicalWake: string;
  typicalBed: string;
  sleepHours: number;
  sleepLatencyMin: number;
  exerciseDays: number;
  exerciseMinutesPerSession: number;
  sedentaryHours: number;
  vegetableServings: number;
  fruitServings: number;
  breakfastFrequency: number;
  takeoutFrequency: number;
  waterMl: number;
  caffeineCups: number;
  alcoholFrequency: number;
  smoking: SmokingStatus;
  stressLevel: number;
  bowelFrequency: "lt3w" | "3-6w" | "daily" | "gt1d";
  conditions: string[];
  familyHistory: string[];
  symptoms: SymptomCode[];
  mainGoal: Goal;
}

export interface Baseline {
  bmi: number | null;
  bmiCategory: string;
  sleepDebtHours: number | null;
  weeklyExerciseMinutes: number | null;
  notes: string[];
}

/* ---------------------------------- 评分 --------------------------------- */

export type DimensionKey =
  | "diet"
  | "sleep"
  | "activity"
  | "body"
  | "digestion"
  | "mood"
  | "substances";

export const DIMENSIONS: { key: DimensionKey; label: string }[] = [
  { key: "diet", label: "饮食结构" },
  { key: "sleep", label: "睡眠" },
  { key: "activity", label: "身体活动" },
  { key: "body", label: "体重与体态" },
  { key: "digestion", label: "消化与排泄" },
  { key: "mood", label: "情绪与压力" },
  { key: "substances", label: "烟酒与咖啡因" },
];

export type ScoreLevel = "good" | "fair" | "poor";

export interface Finding {
  code: string;
  title: string;
  detail: string;
  severity: "info" | "warn" | "alert";
  metric?: string;
  evidenceHint?: string;
}

export interface DimensionScore {
  key: DimensionKey;
  label: string;
  score: number;
  level: ScoreLevel;
  summary: string;
  findings: Finding[];
}

export interface RedFlag {
  code: string;
  label: string;
  advice: string;
  urgent: boolean;
}

export interface ScoreResult {
  overall: number;
  dimensions: DimensionScore[];
  topIssues: Finding[];
  redFlags: RedFlag[];
  dataDays: number;
  coverage: {
    logs: number;
    sleepDays: number;
    dietDays: number;
    activityDays: number;
  };
}

export interface ScorableLog {
  logDate: string;
  sleepMinutes: number | null;
  sleepLatencyMin: number | null;
  nightWakes: number | null;
  sleepQuality: number | null;
  bedtimeDeviationMin: number | null;
  steps: number | null;
  exerciseMinutes: number | null;
  vigorousMinutes: number | null;
  strengthTraining: boolean;
  sedentaryHours: number | null;
  waterMl: number | null;
  caffeineCups: number | null;
  caffeineAfter2pm: boolean;
  alcoholUnits: number | null;
  smoked: boolean;
  mood: number | null;
  stress: number | null;
  energy: number | null;
  bowelCount: number | null;
  bristol: number | null;
  bloating: boolean;
  meals: Meals | null;
}

export interface ScorableProfile {
  sex: Sex;
  birthYear: number | null;
  heightCm: number | null;
  weightKg: number | null;
  waistCm: number | null;
  activityLevel: ActivityLevel;
  goal: Goal;
}

/* ---------------------------------- 报告 --------------------------------- */

export interface ReportConcern {
  title: string;
  explanation: string;
  actions: string[];
  evidenceRefs: number[];
}

export interface ReportContent {
  summary: string;
  highlights: string[];
  concerns: ReportConcern[];
  weeklyFocus: string[];
  medicalNote?: string;
}

export interface RetrievedChunk {
  chunkId: string;
  docTitle: string;
  sectionPath: string;
  content: string;
  score: number;
}

/* ---------------------------------- 计划 --------------------------------- */

export interface PlanTaskDraft {
  category: "diet" | "sleep" | "activity" | "habit";
  title: string;
  detail?: string;
  metricKey?: string;
  targetValue?: number;
  targetUnit?: string;
}

export interface PlanDayDraft {
  date: string;
  theme: string;
  tasks: PlanTaskDraft[];
}

export interface PlanDraft {
  focusAreas: string[];
  days: PlanDayDraft[];
}
