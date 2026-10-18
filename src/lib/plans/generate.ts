import { z } from "zod";
import { ensureDatabase } from "@/db/client";
import { planTasks, plans } from "@/db/schema";
import { chatJson, llmEnabled, LlmError } from "@/lib/ai/client";
import type { DimensionKey, PlanDraft, PlanTaskDraft, ScoreResult } from "@/lib/types";
import { DIMENSIONS } from "@/lib/types";
import { addDays, formatDate } from "@/lib/utils";

const planSchema = z.object({
  focusAreas: z.array(z.string().min(2).max(30)).min(2).max(3),
  days: z
    .array(
      z.object({
        date: z.string(),
        theme: z.string().min(2).max(40),
        tasks: z
          .array(
            z.object({
              category: z.enum(["diet", "sleep", "activity", "habit"]),
              title: z.string().min(2).max(60),
              detail: z.string().max(200).optional(),
              metricKey: z.string().max(40).optional(),
              targetValue: z.number().optional(),
              targetUnit: z.string().max(20).optional(),
            }),
          )
          .min(2)
          .max(4),
      }),
    )
    .min(7)
    .max(7),
});

const TEMPLATES: Record<DimensionKey, PlanTaskDraft[]> = {
  diet: [
    { category: "diet", title: "每餐先吃一拳头蔬菜", detail: "深色蔬菜占一半，外卖额外加一份绿叶菜。", metricKey: "vegetable_servings", targetValue: 3, targetUnit: "份" },
    { category: "diet", title: "含糖饮料换白水或淡茶", detail: "把家里的含糖饮料收起来，准备一个随手可拿的水杯。", metricKey: "sugary_drinks", targetValue: 0, targetUnit: "杯" },
    { category: "diet", title: "早餐加入一份优质蛋白", detail: "鸡蛋、牛奶、无糖酸奶或豆浆任选其一。", metricKey: "breakfast", targetValue: 1, targetUnit: "次" },
    { category: "diet", title: "主食一半换成全谷物", detail: "燕麦、糙米、玉米、杂豆都可以，先从一餐开始。", metricKey: "whole_grain", targetValue: 1, targetUnit: "餐" },
    { category: "diet", title: "吃到 300-500g 蔬菜", detail: "用拳头估算：大约 3-5 个拳头。", metricKey: "vegetables_grams", targetValue: 300, targetUnit: "g" },
    { category: "diet", title: "晚餐与睡觉间隔 3 小时", detail: "如果晚上会饿，准备无糖酸奶或一小把坚果。", metricKey: "late_night", targetValue: 0, targetUnit: "次" },
    { category: "diet", title: "复盘本周饮食并采购下周食材", detail: "把最容易做到的 2 个改变固定下来。", metricKey: "meal_prep", targetValue: 1, targetUnit: "次" },
  ],
  sleep: [
    { category: "sleep", title: "固定起床时间", detail: "本周起床时间误差控制在 30 分钟内，周末也一样。", metricKey: "wake_time", targetValue: 1, targetUnit: "次" },
    { category: "sleep", title: "睡前 1 小时离开屏幕", detail: "改成纸质阅读、拉伸或听播客。", metricKey: "screen_free", targetValue: 60, targetUnit: "分钟" },
    { category: "sleep", title: "下午 2 点后不摄入咖啡因", detail: "咖啡、浓茶、可乐都算。", metricKey: "caffeine_after_2pm", targetValue: 0, targetUnit: "次" },
    { category: "sleep", title: "把入睡时间提前 15 分钟", detail: "每 3 天再提前 15 分钟，逐步靠近 23:00。", metricKey: "bed_time", targetValue: 23, targetUnit: "点" },
    { category: "sleep", title: "卧室调暗、降温、静音", detail: "目标温度 18-22℃，必要时使用耳塞和遮光帘。", metricKey: "sleep_env", targetValue: 1, targetUnit: "次" },
    { category: "sleep", title: "睡前做 5 分钟呼吸练习", detail: "吸气 4 秒、呼气 6 秒，重复 10 轮。", metricKey: "breathing", targetValue: 5, targetUnit: "分钟" },
    { category: "sleep", title: "记录一周睡眠并找出最晚的一天", detail: "看看那天发生了什么，提前规避。", metricKey: "sleep_review", targetValue: 1, targetUnit: "次" },
  ],
  activity: [
    { category: "activity", title: "快走 30 分钟", detail: "可以拆成三段 10 分钟，午休或通勤时完成。", metricKey: "walk_minutes", targetValue: 30, targetUnit: "分钟" },
    { category: "activity", title: "每 45-60 分钟起身活动 3 分钟", detail: "接水、爬一层楼梯或做几个深蹲。", metricKey: "movement_breaks", targetValue: 6, targetUnit: "次" },
    { category: "activity", title: "力量训练 20 分钟", detail: "深蹲 3 组、俯卧撑 3 组、弹力带划船 3 组。", metricKey: "strength_sessions", targetValue: 1, targetUnit: "次" },
    { category: "activity", title: "走到 6000 步", detail: "通勤提前一站下车，或晚饭后散步 15 分钟。", metricKey: "steps", targetValue: 6000, targetUnit: "步" },
    { category: "activity", title: "安排一次户外活动", detail: "骑行、爬楼、球类都可以，重点是有阳光和心率提升。", metricKey: "outdoor", targetValue: 1, targetUnit: "次" },
    { category: "activity", title: "久坐不超过 8 小时", detail: "站坐交替，电话会议改成边走边开。", metricKey: "sedentary_hours", targetValue: 8, targetUnit: "小时" },
    { category: "activity", title: "复盘本周活动量", detail: "目标每周 150 分钟中等强度活动，看看还差多少。", metricKey: "weekly_minutes", targetValue: 150, targetUnit: "分钟" },
  ],
  body: [
    { category: "habit", title: "固定时间称重并记录", detail: "每周同一时间、同一状态测量一次即可。", metricKey: "weight", targetValue: 1, targetUnit: "次" },
  ],
  digestion: [
    { category: "habit", title: "饮水 1.5-2L", detail: "分次喝，不要一次灌。", metricKey: "water_ml", targetValue: 1600, targetUnit: "ml" },
    { category: "diet", title: "增加一份高纤维食物", detail: "燕麦、火龙果、奇亚籽、绿叶菜任选。", metricKey: "fiber", targetValue: 1, targetUnit: "份" },
    { category: "activity", title: "饭后散步 10 分钟", detail: "帮助肠道蠕动，也有助于餐后血糖。", metricKey: "post_meal_walk", targetValue: 10, targetUnit: "分钟" },
  ],
  mood: [
    { category: "habit", title: "户外日照 20 分钟", detail: "上午效果更好，阴天也有效。", metricKey: "daylight", targetValue: 20, targetUnit: "分钟" },
    { category: "habit", title: "5 分钟呼吸或冥想", detail: "用手机计时，专注呼吸即可。", metricKey: "mindfulness", targetValue: 5, targetUnit: "分钟" },
    { category: "habit", title: "给一位朋友发消息或见面", detail: "社交连接是情绪最稳定的保护因素之一。", metricKey: "social", targetValue: 1, targetUnit: "次" },
  ],
  substances: [
    { category: "habit", title: "设置一个无酒日", detail: "用无酒精饮品替代，记录当天感受。", metricKey: "alcohol_free", targetValue: 1, targetUnit: "天" },
    { category: "habit", title: "记录吸烟或咖啡因的触发场景", detail: "找出最容易复发的时刻，提前准备替代方案。", metricKey: "trigger_log", targetValue: 1, targetUnit: "次" },
  ],
};

function focusDimensions(score: ScoreResult): DimensionKey[] {
  return [...score.dimensions]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((dimension) => dimension.key);
}

function buildFallbackPlan(score: ScoreResult, today: string, focusAreas: string[]): PlanDraft {
  const keys = focusDimensions(score);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index + 1);
    const tasks: PlanTaskDraft[] = [];
    const primary = keys[index % keys.length];
    const secondary = keys[(index + 1) % keys.length];
    const tertiary = keys[(index + 2) % keys.length];

    const primaryTask = TEMPLATES[primary][index % TEMPLATES[primary].length];
    const secondaryTask = TEMPLATES[secondary][index % TEMPLATES[secondary].length];
    tasks.push(primaryTask, secondaryTask);

    if (tertiary !== primary && tertiary !== secondary) {
      tasks.push(TEMPLATES[tertiary][index % TEMPLATES[tertiary].length]);
    }

    if (index === 0) {
      tasks.push({
        category: "habit",
        title: "记录今天的三餐、睡眠和情绪",
        detail: "在「今日记录」里花 30 秒完成，数据越完整，下周建议越准确。",
        metricKey: "daily_log",
        targetValue: 1,
        targetUnit: "次",
      });
    }
    if (index === 6) {
      tasks.push({
        category: "habit",
        title: "完成本周复盘并生成新报告",
        detail: "对比七天前的评分，找出唯一需要继续坚持的习惯。",
        metricKey: "weekly_review",
        targetValue: 1,
        targetUnit: "次",
      });
    }

    return {
      date,
      theme: index === 0 ? "从最小的改变开始" : index === 6 ? "复盘与下周计划" : `第 ${index + 1} 天 · 保持节奏`,
      tasks: tasks.slice(0, 4),
    };
  });

  return { focusAreas, days };
}

export interface GeneratePlanInput {
  userId: string;
  reportId: string | null;
  score: ScoreResult;
  today: string;
}

export async function generatePlan(input: GeneratePlanInput) {
  const keys = focusDimensions(input.score);
  const focusAreas = keys.map((key) => DIMENSIONS.find((dimension) => dimension.key === key)?.label ?? key);
  let draft = buildFallbackPlan(input.score, input.today, focusAreas);
  let engine: "deepseek" | "rules" = "rules";

  if (llmEnabled()) {
    try {
      const result = await chatJson({
        system:
          '你是生活方式健康管理教练。请生成 7 天可执行计划，每天 2-4 个小任务。任务必须具体、可量化、10-30 分钟内能完成。只输出 JSON：{"focusAreas":["..."],"days":[{"date":"YYYY-MM-DD","theme":"...","tasks":[{"category":"diet|sleep|activity|habit","title":"...","detail":"...","metricKey":"...","targetValue":1,"targetUnit":"次"}]}]}',
        user: `今天：${input.today}。请从明天开始排 7 天。用户各维度评分：${input.score.dimensions
          .map((dimension) => `${dimension.label}=${dimension.score}`)
          .join("，")}。优先改善：${focusAreas.join("、")}。主要问题：${input.score.topIssues
          .map((issue) => issue.title)
          .join("；")}。不要涉及药物和诊断。`,
        schema: planSchema,
        maxTokens: 1800,
        temperature: 0.4,
      });
      draft = result as PlanDraft;
      engine = "deepseek";
    } catch (error) {
      console.warn("[plan] LLM 失败，使用规则计划", error instanceof LlmError ? error.message : error);
    }
  }

  const startDate = draft.days[0]?.date ?? addDays(input.today, 1);
  const endDate = draft.days[draft.days.length - 1]?.date ?? addDays(input.today, 7);
  const db = (await ensureDatabase()).db;
  const [plan] = await db
    .insert(plans)
    .values({
      userId: input.userId,
      reportId: input.reportId,
      startDate,
      endDate,
      focusAreas: draft.focusAreas,
      engine,
    })
    .returning({ id: plans.id });

  for (const day of draft.days) {
    for (const task of day.tasks) {
      await db.insert(planTasks).values({
        planId: plan.id,
        taskDate: day.date,
        category: task.category,
        title: task.title,
        detail: task.detail ?? null,
        metricKey: task.metricKey ?? null,
        targetValue: task.targetValue ?? null,
        targetUnit: task.targetUnit ?? null,
      });
    }
  }

  return { planId: plan.id, engine, days: draft.days.map((day) => ({ ...day, date: formatDate(day.date) })) };
}
