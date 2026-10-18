import { z } from "zod";
import { ensureDatabase } from "@/db/client";
import { aiCalls, reportCitations, reports } from "@/db/schema";
import { chatJson, llmEnabled, llmModel, LlmError } from "@/lib/ai/client";
import { retrieveChunks } from "@/lib/knowledge/retrieve";
import { scoreHealth } from "@/lib/scoring";
import type { SymptomEventLike } from "@/lib/scoring/risk";
import type {
  Finding,
  RetrievedChunk,
  ReportConcern,
  ReportContent,
  ScorableLog,
  ScorableProfile,
  ScoreResult,
} from "@/lib/types";
import { GOAL_LABELS } from "@/lib/types";
import { round } from "@/lib/utils";

export const PROMPT_VERSION = "report-v1";

const reportSchema = z.object({
  summary: z.string().min(10).max(600),
  highlights: z.array(z.string().min(1)).min(1).max(5),
  concerns: z
    .array(
      z.object({
        title: z.string().min(2).max(60),
        explanation: z.string().min(10).max(800),
        actions: z.array(z.string().min(2).max(200)).min(1).max(4),
        evidenceRefs: z.array(z.number().int().min(1).max(6)).max(3),
      }),
    )
    .min(1)
    .max(4),
  weeklyFocus: z.array(z.string().min(2).max(120)).min(2).max(4),
  medicalNote: z.string().max(400).optional(),
});

type ReportDraft = z.infer<typeof reportSchema>;

export interface GenerateReportInput {
  userId: string;
  profile: ScorableProfile;
  logs: ScorableLog[];
  symptoms: SymptomEventLike[];
  today: string;
  periodStart: string;
}

export interface GenerateReportResult {
  reportId: string;
  engine: "deepseek" | "rules";
  score: ScoreResult;
  warnings: string[];
}

const ACTION_MAP: Record<string, string[]> = {
  "diet-vegetables": ["每餐先吃一拳头蔬菜，深色蔬菜占一半", "点外卖时额外加一份绿叶菜"],
  "diet-fruit": ["把水果放在触手可及的位置，每天 200-350g", "用完整水果替代果汁和果干"],
  "diet-whole-grain": ["每天有一餐用燕麦、糙米或杂豆替换一半白米白面", "早餐主食换成全麦面包或燕麦"],
  "diet-protein": ["每天 1 个鸡蛋，午餐或晚餐安排一份鱼禽瘦肉", "每周至少两次豆制品"],
  "diet-breakfast": ["前一晚准备好第二天的早餐组合", "起床后 1 小时内进食，哪怕是一杯牛奶加鸡蛋"],
  "diet-sugar": ["把含糖饮料换成白水、淡茶或无糖气泡水", "家里不囤含糖饮料"],
  "diet-fried": ["本周把油炸菜换成蒸、煮、炖的做法", "外食时优先选清蒸或白灼"],
  "diet-takeout": ["本周至少 3 天自己做饭，或用便利店组合替代外卖", "点外卖备注少油少盐，主食减半"],
  "diet-late-night": ["晚餐增加优质蛋白和蔬菜，减少睡前饥饿", "把夜宵换成无糖酸奶或一小把坚果"],
  "diet-water": ["准备 500ml 水杯，上午、下午、傍晚各喝一杯", "把水杯放在工作台视线内"],
  "sleep-short": ["本周把入睡时间提前 30 分钟，分两次调整到位", "睡前一小时调暗灯光并离开手机屏幕"],
  "sleep-slightly-short": ["每 3 天把上床时间提前 15 分钟", "固定起床时间，周末误差不超过 1 小时"],
  "sleep-long": ["固定起床时间，白天增加 20 分钟户外活动", "如果持续嗜睡，安排一次甲状腺功能检查"],
  "sleep-latency": ["睡不着超过 20 分钟就起床做安静的事，困了再回床", "下午 2 点后不摄入咖啡因"],
  "sleep-wakes": ["睡前 2 小时减少饮水与酒精", "保持卧室安静、黑暗、凉爽"],
  "sleep-quality": ["睡前 30 分钟做纸质阅读或拉伸", "把卧室温度调到 18-22℃"],
  "sleep-regularity": ["先固定起床时间，一周后再固定入睡时间", "把闹钟放在离床远一点的位置"],
  "activity-minutes": ["每天快走 30 分钟，每周 5 天", "把一次 30 分钟拆成三段 10 分钟也可以"],
  "activity-strength": ["每周 2 次力量训练，从深蹲、俯卧撑、弹力带划船开始", "每次 20 分钟，安排在不容易被取消的时段"],
  "activity-sedentary": ["每 45-60 分钟起身活动 3-5 分钟", "把电话会议改成边走边开"],
  "activity-steps": ["通勤提前一站下车步行", "午休后散步 10 分钟"],
  "body-overweight": ["把主食减少约 1/4，用蔬菜和蛋白质补足饱腹感", "每周称重一次，目标每周下降 0.5-1 斤"],
  "body-obese": ["先设定 6 个月减重 5%-10% 的目标", "安排一次血压、血糖、血脂和肝脏超声检查"],
  "body-underweight": ["每天增加一次加餐（坚果、酸奶、鸡蛋）", "每周 2-3 次力量训练，配合充足蛋白质"],
  "body-waist": ["减少精制碳水和含糖饮料", "每天增加 20 分钟快走，优先减少腹部脂肪"],
  "digestion-constipation": ["每天保证 25-30g 膳食纤维和 1.5-2L 饮水", "早餐后固定时间如厕，建立排便反射"],
  "digestion-hard-stool": ["增加燕麦、火龙果、奇亚籽等可溶性纤维", "每天饮水不少于 1.5L"],
  "digestion-frequent": ["记录排便与饮食的对应关系，找出触发食物", "持续超过一周建议消化科就诊"],
  "digestion-loose-stool": ["暂时减少乳制品和辛辣食物", "持续两周以上建议消化科就诊"],
  "digestion-bloating": ["细嚼慢咽，减少碳酸饮料", "饭后散步 10 分钟"],
  "mood-stress": ["每天安排 10 分钟低刺激休息：散步、呼吸练习或纸质阅读", "把最耗神的工作放在精力最好的时段"],
  "mood-low": ["保证 7 小时睡眠，并每天晒太阳 20 分钟", "主动约一次面对面社交"],
  "mood-energy": ["排查睡眠时长与缺铁可能，必要时做血常规", "上午安排 10 分钟户外光照"],
  "mood-persistent-low": ["预约精神心理科或心理援助热线 12356 做一次评估", "把感受告诉一位信任的人"],
  "substance-smoking": ["设定一个戒烟日开始日，并清理家中烟具", "咨询戒烟门诊，必要时使用规范戒烟药物"],
  "substance-alcohol": ["本周安排至少 3 个无酒日", "用无酒精饮品替代社交场合的酒精"],
  "substance-caffeine": ["每天咖啡因不超过 3 杯", "下午 2 点后改喝无咖啡因饮品"],
  "substance-caffeine-late": ["把最后一杯咖啡提前到中午前", "下午用散步或冷水洗脸提神"],
};

const GENERIC_ACTION = "把这一项写进本周计划，连续记录 7 天再评估";

function summarizeLogs(logs: ScorableLog[], score: ScoreResult) {
  const avg = (values: (number | null)[]) => {
    const nums = values.filter((value): value is number => typeof value === "number");
    return nums.length ? round(nums.reduce((sum, value) => sum + value, 0) / nums.length, 1) : null;
  };

  return {
    记录天数: score.dataDays,
    平均睡眠小时: avg(logs.map((log) => (log.sleepMinutes === null ? null : log.sleepMinutes / 60))),
    平均入睡潜伏期分钟: avg(logs.map((log) => log.sleepLatencyMin)),
    平均压力自评: avg(logs.map((log) => log.stress)),
    平均情绪自评: avg(logs.map((log) => log.mood)),
    平均久坐小时: avg(logs.map((log) => log.sedentaryHours)),
    平均步数: avg(logs.map((log) => log.steps)),
    每周活动分钟: logs.reduce((sum, log) => sum + (log.exerciseMinutes ?? 0) + (log.vigorousMinutes ?? 0), 0),
    平均饮水毫升: avg(logs.map((log) => log.waterMl)),
  };
}

function buildRetrievalQuery(profile: ScorableProfile, score: ScoreResult) {
  const labels = score.topIssues.map((issue) => issue.title);
  const dimensions = score.dimensions
    .filter((dimension) => dimension.score < 80)
    .map((dimension) => dimension.label);
  return {
    query: [
      `目标：${GOAL_LABELS[profile.goal]}`,
      ...dimensions,
      ...labels,
      ...score.topIssues.map((issue) => issue.evidenceHint ?? ""),
    ]
      .filter(Boolean)
      .join("；"),
    keywords: [
      ...labels,
      ...score.topIssues.map((issue) => issue.evidenceHint?.split("：")[0] ?? ""),
      ...dimensions,
    ].filter((keyword) => keyword.length >= 2),
  };
}

function hanBigrams(text: string): Set<string> {
  const chars = Array.from(text).filter((char) => /\p{Script=Han}/u.test(char));
  const grams = new Set<string>();
  for (let i = 0; i < chars.length - 1; i += 1) grams.add(`${chars[i]}${chars[i + 1]}`);
  return grams;
}

function overlapScore(a: string, b: string): number {
  const setA = hanBigrams(a);
  if (setA.size === 0) return 0;
  const setB = hanBigrams(b);
  let hits = 0;
  for (const gram of setA) if (setB.has(gram)) hits += 1;
  return hits / Math.sqrt(setA.size * Math.max(1, setB.size));
}

function bestRefs(finding: Finding, chunks: RetrievedChunk[], count = 2): number[] {
  return chunks
    .map((chunk, index) => ({
      ref: index + 1,
      score: overlapScore(`${finding.title} ${finding.detail} ${finding.evidenceHint ?? ""}`, `${chunk.sectionPath} ${chunk.content}`),
    }))
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0.05)
    .slice(0, count)
    .map((item) => item.ref);
}

function composeFallback(score: ScoreResult, chunks: RetrievedChunk[], profile: ScorableProfile): ReportContent {
  const weakest = [...score.dimensions].sort((a, b) => a.score - b.score);
  const strongest = [...score.dimensions].sort((a, b) => b.score - a.score);
  const concerns: ReportConcern[] = score.topIssues.slice(0, 3).map((issue) => ({
    title: issue.title,
    explanation: `${issue.detail}${issue.metric ? `（${issue.metric}）` : ""}`,
    actions: ACTION_MAP[issue.code] ?? [GENERIC_ACTION],
    evidenceRefs: bestRefs(issue, chunks),
  }));

  if (concerns.length === 0) {
    const fallbackDimension = weakest[0];
    const finding = fallbackDimension.findings[0];
    concerns.push({
      title: finding?.title ?? "继续保持当前节奏",
      explanation: finding?.detail ?? "本周没有发现明显问题，继续保持规律记录有助于看清趋势。",
      actions: finding ? (ACTION_MAP[finding.code] ?? [GENERIC_ACTION]) : ["保持每周至少 4 天记录"],
      evidenceRefs: finding ? bestRefs(finding, chunks) : [1].filter(() => chunks.length > 0),
    });
  }

  const redFlagNote = score.redFlags.length
    ? `你记录到的${score.redFlags.map((flag) => flag.label).join("、")}需要优先处理。${score.redFlags[0].advice}`
    : undefined;

  const summaryParts = [
    `近 ${score.dataDays} 天综合评分 ${score.overall} 分。`,
    score.topIssues[0]
      ? `最需要优先调整的是「${score.topIssues[0].title}」。`
      : "整体表现平稳，继续保持。",
    weakest.length ? `当前相对薄弱的维度是${weakest
      .slice(0, 2)
      .map((dimension) => dimension.label)
      .join("和")}。` : "",
    `你的目标是${GOAL_LABELS[profile.goal]}，下面的建议已按这个目标排序。`,
  ];

  return {
    summary: summaryParts.join(""),
    highlights: strongest
      .slice(0, 2)
      .map((dimension) => `${dimension.label}：${dimension.summary}（${dimension.score} 分）`),
    concerns,
    weeklyFocus: concerns.flatMap((concern) => concern.actions.slice(0, 1)).slice(0, 3),
    medicalNote: redFlagNote,
  };
}

function sanitizeDraft(draft: ReportDraft, chunks: RetrievedChunk[]): ReportContent {
  const maxRef = chunks.length;
  return {
    summary: draft.summary,
    highlights: draft.highlights,
    concerns: draft.concerns.map((concern) => ({
      title: concern.title,
      explanation: concern.explanation,
      actions: concern.actions,
      evidenceRefs: concern.evidenceRefs.filter((ref) => ref >= 1 && ref <= maxRef),
    })),
    weeklyFocus: draft.weeklyFocus,
    medicalNote: draft.medicalNote,
  };
}

function buildPrompt(input: GenerateReportInput, score: ScoreResult, chunks: RetrievedChunk[]) {
  const sources = chunks
    .map(
      (chunk, index) =>
        `[${index + 1}] 《${chunk.docTitle}》· ${chunk.sectionPath}\n${chunk.content.slice(0, 700)}`,
    )
    .join("\n\n");

  const findings = score.dimensions
    .map(
      (dimension) =>
        `${dimension.label}（${dimension.score} 分，${dimension.summary}）：\n` +
        dimension.findings.map((finding) => `- ${finding.title}：${finding.detail}`).join("\n"),
    )
    .join("\n");

  const system = `你是「健康罗盘」的生活方式健康管理助理。请基于用户记录和给定的权威资料片段，写一份温和、具体、可执行的分析报告。

硬性要求：
1. 不做医学诊断，不推荐处方药、剂量或保健品品牌。
2. 结论必须能在给定资料中找到依据，并在 explanation 末尾用 [1] 这样的编号标注；编号只能来自 <资料> 列表。
3. 资料不足时直接写"现有资料不足"，不要编造数字或书名。
4. 每条行动建议要具体到行为、频率或数量。
5. 如果有红旗症状，summary 必须首先建议就医。
6. 只输出 JSON，不要输出解释文字。JSON 结构：
{"summary":"2-4 句话","highlights":["1-3 条做得好的地方"],"concerns":[{"title":"问题标题","explanation":"解释并用 [1] 标注依据","actions":["具体行动"],"evidenceRefs":[1]}],"weeklyFocus":["2-4 条本周重点"],"medicalNote":"如有红旗症状则写就医建议"}`;

  const user = `用户档案：${input.profile.sex === "male" ? "男性" : input.profile.sex === "female" ? "女性" : "其他"}，${
    input.profile.birthYear ? `${new Date().getFullYear() - input.profile.birthYear} 岁` : "年龄未填"
  }，身高 ${input.profile.heightCm ?? "未填"}cm，体重 ${input.profile.weightKg ?? "未填"}kg，腰围 ${
    input.profile.waistCm ?? "未填"
  }cm，目标 ${GOAL_LABELS[input.profile.goal]}。

近 7 天指标摘要：${JSON.stringify(summarizeLogs(input.logs, score), null, 0)}

维度评分与发现：
${findings}

红旗症状：${score.redFlags.length ? score.redFlags.map((flag) => flag.label).join("、") : "无"}

<资料>
${sources || "（知识库为空，只能给出通用生活方式建议，不得标注引用）"}
</资料>

请输出 JSON。concerns 控制在 3 条以内，按优先级排序。`;

  return { system, user };
}

export async function generateReport(input: GenerateReportInput): Promise<GenerateReportResult> {
  const warnings: string[] = [];
  const score = scoreHealth({
    profile: input.profile,
    logs: input.logs,
    symptoms: input.symptoms,
    today: input.today,
  });

  const { query, keywords } = buildRetrievalQuery(input.profile, score);
  let chunks: RetrievedChunk[] = [];
  try {
    chunks = await retrieveChunks({ query, keywords, k: 6 });
  } catch (error) {
    warnings.push("知识库检索失败，本次报告未附带出处。");
    console.warn("[report] 检索失败", error);
  }
  if (chunks.length === 0) {
    warnings.push("知识库为空，先执行 npm run kb:ingest 以获得带出处的建议。");
  }

  let engine: GenerateReportResult["engine"] = "rules";
  let content = composeFallback(score, chunks, input.profile);
  let model: string | null = null;

  if (llmEnabled()) {
    const startedAt = Date.now();
    try {
      const prompt = buildPrompt(input, score, chunks);
      const draft = await chatJson({
        system: prompt.system,
        user: prompt.user,
        schema: reportSchema,
        maxTokens: 2200,
        temperature: 0.3,
      });
      content = sanitizeDraft(draft, chunks);
      engine = "deepseek";
      model = llmModel();
    } catch (error) {
      warnings.push(
        error instanceof LlmError
          ? "大模型输出未通过校验，已自动降级为规则报告。"
          : "大模型调用失败，已自动降级为规则报告。",
      );
      console.warn("[report] LLM 失败", error);
    }

    const db = (await ensureDatabase()).db;
    await db.insert(aiCalls).values({
      userId: input.userId,
      kind: "report",
      model: llmModel(),
      ok: engine === "deepseek",
      latencyMs: Date.now() - startedAt,
      error: engine === "deepseek" ? null : warnings[warnings.length - 1] ?? null,
    });
  }

  const usedRefs = new Set<number>();
  for (const concern of content.concerns) {
    for (const ref of concern.evidenceRefs) usedRefs.add(ref);
  }

  const db = (await ensureDatabase()).db;
  const [inserted] = await db
    .insert(reports)
    .values({
      userId: input.userId,
      periodStart: input.periodStart,
      periodEnd: input.today,
      overall: score.overall,
      scores: score.dimensions,
      topIssues: score.topIssues,
      redFlags: score.redFlags,
      content,
      engine,
      model,
      promptVersion: PROMPT_VERSION,
    })
    .returning({ id: reports.id });

  for (const ref of usedRefs) {
    const chunk = chunks[ref - 1];
    if (!chunk) continue;
    await db.insert(reportCitations).values({
      reportId: inserted.id,
      chunkId: chunk.chunkId,
      refIndex: ref,
      docTitle: chunk.docTitle,
      sectionPath: chunk.sectionPath,
      excerpt: chunk.content.slice(0, 600),
    });
  }

  return { reportId: inserted.id, engine, score, warnings };
}
