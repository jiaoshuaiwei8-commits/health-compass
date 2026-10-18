import type {
  DimensionScore,
  Finding,
  Meals,
  ScorableProfile,
} from "@/lib/types";
import type { ScoreContext } from "@/lib/scoring/helpers";
import {
  averageOrNull,
  countWith,
  insufficient,
  makeDimension,
  ratioWith,
} from "@/lib/scoring/helpers";
import { round } from "@/lib/utils";

function penalty(state: { score: number; findings: Finding[] }) {
  return (points: number, finding: Finding) => {
    state.score -= points;
    state.findings.push(finding);
  };
}

/* ---------------------------------- 饮食 --------------------------------- */

export function scoreDiet(ctx: ScoreContext): DimensionScore {
  if (ctx.dietLogs.length < 2) {
    return insufficient("diet", "饮食结构", `近 7 天只有 ${ctx.dietLogs.length} 天饮食记录`);
  }

  const state = { score: 100, findings: [] as Finding[] };
  const deduct = penalty(state);
  const days = ctx.dietLogs.length;
  const share = (key: keyof Meals) =>
    ratioWith(ctx.dietLogs, (log) => Boolean(log.meals?.[key]));

  const vegetableShare = share("vegetables");
  if (vegetableShare < 0.7) {
    deduct(Math.round((0.7 - vegetableShare) * 45), {
      code: "diet-vegetables",
      title: "蔬菜摄入不足",
      detail: `近 ${days} 天只有 ${countWith(ctx.dietLogs, (log) => Boolean(log.meals?.vegetables))} 天达到 300g 左右的蔬菜量。建议每餐有一半盘子是蔬菜，深色蔬菜占一半。`,
      severity: vegetableShare < 0.4 ? "alert" : "warn",
      metric: `达标率 ${Math.round(vegetableShare * 100)}%`,
      evidenceHint: "中国居民膳食指南：蔬菜 300-500g/天",
    });
  }

  const fruitShare = share("fruit");
  if (fruitShare < 0.6) {
    deduct(Math.round((0.6 - fruitShare) * 25), {
      code: "diet-fruit",
      title: "水果偏少",
      detail: `水果达标 ${Math.round(fruitShare * 100)}% 的天数。建议每天 200-350g 新鲜水果，不可以用果汁代替。`,
      severity: "warn",
      metric: `达标率 ${Math.round(fruitShare * 100)}%`,
      evidenceHint: "中国居民膳食指南：水果 200-350g/天",
    });
  }

  const wholeGrainShare = share("wholeGrain");
  if (wholeGrainShare < 0.5) {
    deduct(Math.round((0.5 - wholeGrainShare) * 24), {
      code: "diet-whole-grain",
      title: "全谷物和杂豆偏少",
      detail: "建议每天有 50-150g 全谷物或杂豆，例如用燕麦、糙米、玉米替换一部分白米白面。",
      severity: "warn",
      metric: `达标率 ${Math.round(wholeGrainShare * 100)}%`,
      evidenceHint: "中国居民膳食指南：全谷物和杂豆 50-150g/天",
    });
  }

  const proteinShare = share("protein");
  if (proteinShare < 0.7) {
    deduct(Math.round((0.7 - proteinShare) * 22), {
      code: "diet-protein",
      title: "优质蛋白不足",
      detail: "鱼、禽、蛋、瘦肉、豆制品出现频率偏低。建议每天 1 个鸡蛋、适量鱼禽肉，并搭配豆制品。",
      severity: "warn",
      metric: `达标率 ${Math.round(proteinShare * 100)}%`,
      evidenceHint: "中国居民膳食指南：适量吃鱼、禽、蛋、瘦肉",
    });
  }

  const breakfastShare = share("breakfast");
  if (breakfastShare < 0.7) {
    deduct(Math.round((0.7 - breakfastShare) * 18), {
      code: "diet-breakfast",
      title: "早餐不规律",
      detail: "规律吃早餐有助于稳定上午的血糖和食欲。可以提前准备燕麦、鸡蛋、牛奶等便捷组合。",
      severity: "warn",
      metric: `早餐天数 ${countWith(ctx.dietLogs, (log) => Boolean(log.meals?.breakfast))}/${days}`,
    });
  }

  const sugaryDays = countWith(ctx.dietLogs, (log) => Boolean(log.meals?.sugaryDrink));
  if (sugaryDays > 0) {
    deduct(Math.min(14, sugaryDays * 4), {
      code: "diet-sugar",
      title: "含糖饮料偏多",
      detail: `近 ${days} 天有 ${sugaryDays} 天喝了含糖饮料。建议换成白水、淡茶或无糖气泡水，添加糖每天最好控制在 25g 以内。`,
      severity: sugaryDays >= 4 ? "alert" : "warn",
      evidenceHint: "中国居民膳食指南：添加糖 <50g/天，最好 <25g/天",
    });
  }

  const friedDays = countWith(ctx.dietLogs, (log) => Boolean(log.meals?.fried));
  if (friedDays > 0) {
    deduct(Math.min(12, friedDays * 3), {
      code: "diet-fried",
      title: "油炸或高油菜品偏多",
      detail: `近 ${days} 天有 ${friedDays} 天吃了油炸食物。烹调油建议每天 25-30g，多用蒸煮炖、少用煎炸。`,
      severity: "warn",
      evidenceHint: "中国居民膳食指南：烹调油 25-30g/天",
    });
  }

  const takeoutDays = countWith(ctx.dietLogs, (log) => Boolean(log.meals?.takeout));
  if (takeoutDays >= 4) {
    deduct(8, {
      code: "diet-takeout",
      title: "外卖频率偏高",
      detail: `近 ${days} 天有 ${takeoutDays} 天吃外卖。外卖普遍油盐偏高，可以主动备注少油少盐，并额外加一份蔬菜。`,
      severity: "warn",
      metric: `外卖 ${takeoutDays}/${days} 天`,
    });
  }

  const lateNightDays = countWith(ctx.dietLogs, (log) => Boolean(log.meals?.lateNight));
  if (lateNightDays >= 2) {
    deduct(8, {
      code: "diet-late-night",
      title: "夜宵频率偏高",
      detail: `近 ${days} 天有 ${lateNightDays} 天在睡前 2 小时内进食。夜宵会影响睡眠质量和夜间血糖，建议把晚餐安排得更晚一些或减少夜宵。`,
      severity: "warn",
    });
  }

  const waterAvg = averageOrNull(ctx.logs.map((log) => log.waterMl));
  if (waterAvg !== null && waterAvg < 1500) {
    deduct(waterAvg < 1200 ? 10 : 6, {
      code: "diet-water",
      title: "饮水量不足",
      detail: `平均每天饮水约 ${Math.round(waterAvg)}ml，低于成人 1500-1700ml 的推荐量。可以准备一个 500ml 的水杯，上午、下午、傍晚各补一次。`,
      severity: "warn",
      metric: `平均 ${Math.round(waterAvg)}ml/天`,
      evidenceHint: "中国居民膳食指南：成年男性 1700ml，女性 1500ml",
    });
  }

  if (state.score >= 85) {
    state.findings.push({
      code: "diet-good",
      title: "饮食结构整体均衡",
      detail: "蔬菜、水果、优质蛋白和主食搭配比较稳定，继续保持，并注意食物多样性（每周 25 种以上食物）。",
      severity: "info",
    });
  }

  const summary =
    state.score >= 80
      ? "整体均衡，只需微调"
      : state.score >= 60
        ? "有几个明显的短板值得优先调整"
        : "饮食结构需要系统性调整";

  return makeDimension("diet", "饮食结构", state.score, summary, state.findings);
}

/* ---------------------------------- 睡眠 --------------------------------- */

export function scoreSleep(ctx: ScoreContext): DimensionScore {
  if (ctx.sleepLogs.length < 2) {
    return insufficient("sleep", "睡眠", `近 7 天只有 ${ctx.sleepLogs.length} 天睡眠记录`);
  }

  const state = { score: 100, findings: [] as Finding[] };
  const deduct = penalty(state);
  const durationAvg = averageOrNull(ctx.sleepLogs.map((log) => log.sleepMinutes));

  if (durationAvg !== null) {
    const hours = durationAvg / 60;
    if (hours < 6) {
      deduct(26, {
        code: "sleep-short",
        title: "睡眠时长明显不足",
        detail: `平均每晚仅 ${round(hours, 1)} 小时。长期少于 6 小时与代谢、免疫和情绪问题相关，建议先以 7 小时为目标逐步前移入睡时间。`,
        severity: "alert",
        metric: `平均 ${round(hours, 1)} 小时`,
        evidenceHint: "健康睡眠建议：成人 7-8 小时",
      });
    } else if (hours < 7) {
      deduct(14, {
        code: "sleep-slightly-short",
        title: "睡眠略短",
        detail: `平均每晚 ${round(hours, 1)} 小时，距离 7-8 小时的推荐范围还差一点。可以尝试每 3 天提前 15 分钟上床。`,
        severity: "warn",
        metric: `平均 ${round(hours, 1)} 小时`,
      });
    } else if (hours > 10) {
      deduct(12, {
        code: "sleep-long",
        title: "睡眠时间偏长",
        detail: `平均每晚 ${round(hours, 1)} 小时。长期嗜睡可能与睡眠质量差、情绪问题或甲状腺功能异常有关，必要时做一次体检。`,
        severity: "warn",
      });
    }
  }

  const latencyAvg = averageOrNull(ctx.sleepLogs.map((log) => log.sleepLatencyMin));
  if (latencyAvg !== null && latencyAvg > 30) {
    deduct(latencyAvg > 60 ? 16 : 10, {
      code: "sleep-latency",
      title: "入睡时间偏长",
      detail: `平均需要 ${Math.round(latencyAvg)} 分钟才能入睡。建议睡前一小时调暗灯光、离开手机屏幕，固定起床时间。`,
      severity: latencyAvg > 60 ? "alert" : "warn",
      metric: `入睡潜伏期 ${Math.round(latencyAvg)} 分钟`,
    });
  }

  const wakesAvg = averageOrNull(ctx.sleepLogs.map((log) => log.nightWakes));
  if (wakesAvg !== null && wakesAvg >= 2) {
    deduct(8, {
      code: "sleep-wakes",
      title: "夜间醒来次数偏多",
      detail: `平均每晚醒来 ${round(wakesAvg, 1)} 次。睡前减少饮水与酒精、保持卧室安静凉爽，通常有帮助。`,
      severity: "warn",
    });
  }

  const qualityAvg = averageOrNull(ctx.sleepLogs.map((log) => log.sleepQuality));
  if (qualityAvg !== null && qualityAvg < 3) {
    deduct(qualityAvg < 2 ? 14 : 8, {
      code: "sleep-quality",
      title: "主观睡眠质量偏低",
      detail: "睡眠质量自评偏低。对比一下是否与晚间咖啡因、酒精、加班或情绪压力同时出现。",
      severity: "warn",
      metric: `质量评分 ${round(qualityAvg, 1)}/5`,
    });
  }

  const deviationAvg = averageOrNull(ctx.sleepLogs.map((log) => log.bedtimeDeviationMin));
  if (deviationAvg !== null && deviationAvg > 60) {
    deduct(deviationAvg > 90 ? 12 : 7, {
      code: "sleep-regularity",
      title: "作息不规律",
      detail: `入睡时间平均波动 ${Math.round(deviationAvg)} 分钟。固定起床时间比固定入睡时间更容易做到，先用一周把起床时间稳定下来。`,
      severity: "warn",
      metric: `波动 ${Math.round(deviationAvg)} 分钟`,
    });
  }

  if (state.score >= 85) {
    state.findings.push({
      code: "sleep-good",
      title: "睡眠表现良好",
      detail: "时长和规律性都在推荐范围内，继续保持固定的作息节奏。",
      severity: "info",
    });
  }

  const summary =
    state.score >= 80
      ? "睡眠时长与质量较稳定"
      : state.score >= 60
        ? "睡眠有可改善的环节"
        : "睡眠需要优先干预";

  return makeDimension("sleep", "睡眠", state.score, summary, state.findings);
}

/* -------------------------------- 身体活动 -------------------------------- */

export function scoreActivity(ctx: ScoreContext): DimensionScore {
  if (ctx.activityLogs.length < 2) {
    return insufficient("activity", "身体活动", `近 7 天只有 ${ctx.activityLogs.length} 天活动记录`);
  }

  const state = { score: 100, findings: [] as Finding[] };
  const deduct = penalty(state);

  const weeklyMinutes = ctx.activityLogs.reduce(
    (sum, log) => sum + (log.exerciseMinutes ?? 0) + (log.vigorousMinutes ?? 0),
    0,
  );

  if (weeklyMinutes < 150) {
    const points = weeklyMinutes < 30 ? 30 : weeklyMinutes < 90 ? 20 : 12;
    deduct(points, {
      code: "activity-minutes",
      title: "中高强度活动不足",
      detail: `近 7 天累计约 ${weeklyMinutes} 分钟。建议每周 150-300 分钟中等强度活动，例如每天快走 30 分钟、每周 5 天。`,
      severity: weeklyMinutes < 60 ? "alert" : "warn",
      metric: `每周 ${weeklyMinutes} 分钟`,
      evidenceHint: "WHO 指南：每周 150-300 分钟中等强度活动",
    });
  }

  const strengthDays = countWith(ctx.activityLogs, (log) => log.strengthTraining);
  if (strengthDays < 2) {
    deduct(8, {
      code: "activity-strength",
      title: "缺少力量训练",
      detail: `近 7 天力量训练 ${strengthDays} 次。建议每周至少 2 次，从深蹲、俯卧撑、弹力带开始，每次 20 分钟即可。`,
      severity: "warn",
      evidenceHint: "WHO 指南：每周至少 2 天肌肉强化活动",
    });
  }

  const sedentaryAvg = averageOrNull(ctx.activityLogs.map((log) => log.sedentaryHours));
  if (sedentaryAvg !== null && sedentaryAvg > 8) {
    deduct(sedentaryAvg > 10 ? 16 : 10, {
      code: "activity-sedentary",
      title: "久坐时间过长",
      detail: `平均每天久坐 ${round(sedentaryAvg, 1)} 小时。每 45-60 分钟起身活动 3-5 分钟，比一次长时间运动更容易坚持。`,
      severity: sedentaryAvg > 10 ? "alert" : "warn",
      metric: `久坐 ${round(sedentaryAvg, 1)} 小时/天`,
    });
  }

  const stepsAvg = averageOrNull(ctx.activityLogs.map((log) => log.steps));
  if (stepsAvg !== null && stepsAvg < 6000) {
    deduct(stepsAvg < 4000 ? 12 : 8, {
      code: "activity-steps",
      title: "日均步数偏低",
      detail: `平均每天 ${Math.round(stepsAvg)} 步。可以先以 6000 步为阶段性目标，通勤或午休时多走一段。`,
      severity: "warn",
      metric: `平均 ${Math.round(stepsAvg)} 步/天`,
    });
  }

  if (weeklyMinutes >= 150 && sedentaryAvg !== null && sedentaryAvg <= 8) {
    state.findings.push({
      code: "activity-good",
      title: "活动量达标",
      detail: "每周活动时长达到推荐范围，注意保持并减少连续久坐。",
      severity: "info",
    });
  }

  const summary =
    state.score >= 80 ? "活动量基本达标" : state.score >= 60 ? "活动量偏少" : "明显缺乏运动";

  return makeDimension("activity", "身体活动", state.score, summary, state.findings);
}

/* ------------------------------- 体重与体态 ------------------------------- */

export function scoreBody(ctx: ScoreContext, profile: ScorableProfile): DimensionScore {
  const state = { score: 100, findings: [] as Finding[] };
  const deduct = penalty(state);
  const heightM = profile.heightCm ? profile.heightCm / 100 : null;
  const bmi = heightM && profile.weightKg ? profile.weightKg / (heightM * heightM) : null;

  if (bmi === null) {
    return makeDimension("body", "体重与体态", 60, "缺少身高体重数据", [
      {
        code: "body-missing",
        title: "补充身高和体重",
        detail: "完善身高、体重和腰围后，系统才能评估体重状态并给出可执行的目标。",
        severity: "info",
      },
    ]);
  }

  const bmiRounded = round(bmi, 1);
  if (bmi < 18.5) {
    deduct(16, {
      code: "body-underweight",
      title: "体重偏低",
      detail: `BMI ${bmiRounded}，低于 18.5。建议先排查是否有摄入不足、消化吸收或甲状腺等问题，再通过增加优质蛋白和力量训练稳步增重。`,
      severity: "warn",
      metric: `BMI ${bmiRounded}`,
      evidenceHint: "中国成人 BMI 标准：18.5-23.9 为正常",
    });
  } else if (bmi < 24) {
    // 正常范围
  } else if (bmi < 28) {
    deduct(10, {
      code: "body-overweight",
      title: "体重处于超重范围",
      detail: `BMI ${bmiRounded}（24-27.9 为超重）。以每周减 0.5-1 斤的速度调整饮食与活动，比快速节食更容易维持。`,
      severity: "warn",
      metric: `BMI ${bmiRounded}`,
      evidenceHint: "中国成人 BMI 标准：24-27.9 为超重",
    });
  } else {
    deduct(20, {
      code: "body-obese",
      title: "体重处于肥胖范围",
      detail: `BMI ${bmiRounded}（≥28 为肥胖）。建议在医生或营养师指导下制定减重计划，同时筛查血压、血糖和血脂。`,
      severity: "alert",
      metric: `BMI ${bmiRounded}`,
      evidenceHint: "中国成人 BMI 标准：≥28 为肥胖",
    });
  }

  if (profile.waistCm) {
    const threshold = profile.sex === "male" ? 90 : 85;
    if (profile.waistCm >= threshold) {
      deduct(15, {
        code: "body-waist",
        title: "腹型肥胖风险",
        detail: `腰围 ${profile.waistCm}cm，达到${profile.sex === "male" ? "男性 ≥90cm" : "女性 ≥85cm"}的中心性肥胖标准。内脏脂肪与代谢风险关系更密切，建议优先减少精制碳水和久坐。`,
        severity: "warn",
        metric: `腰围 ${profile.waistCm}cm`,
      });
    }
  } else {
    state.findings.push({
      code: "body-waist-missing",
      title: "补充腰围数据",
      detail: "腰围比体重更能反映内脏脂肪水平，建议在肚脐水平测量一次并记录。",
      severity: "info",
    });
  }

  if (profile.goal === "lose_weight" && bmi < 18.5) {
    state.findings.push({
      code: "body-goal-conflict",
      title: "减重目标与当前体重不匹配",
      detail: "当前 BMI 已低于正常下限，不建议继续减重。可以把目标改为增肌或稳定体重。",
      severity: "warn",
    });
  }

  const summary =
    state.score >= 80 ? "体重处于健康区间" : state.score >= 60 ? "体重需要温和调整" : "体重风险较高";

  return makeDimension("body", "体重与体态", state.score, summary, state.findings);
}

/* ------------------------------- 消化与排泄 ------------------------------- */

export function scoreDigestion(ctx: ScoreContext): DimensionScore {
  if (ctx.digestionLogs.length < 2) {
    return insufficient("digestion", "消化与排泄", `近 7 天只有 ${ctx.digestionLogs.length} 天排便记录`);
  }

  const state = { score: 100, findings: [] as Finding[] };
  const deduct = penalty(state);
  const days = ctx.digestionLogs.length;
  const totalBowel = ctx.digestionLogs.reduce((sum, log) => sum + (log.bowelCount ?? 0), 0);
  const weeklyBowel = (totalBowel / days) * 7;

  if (weeklyBowel < 3) {
    deduct(24, {
      code: "digestion-constipation",
      title: "排便频率偏低",
      detail: `按记录推算每周约 ${round(weeklyBowel, 1)} 次，低于每周 3 次的参考线。优先增加膳食纤维（25-30g/天）、饮水 1.5-2L 和规律活动。`,
      severity: weeklyBowel < 2 ? "alert" : "warn",
      metric: `每周约 ${round(weeklyBowel, 1)} 次`,
      evidenceHint: "慢性便秘共识：每周排便少于 3 次",
    });
  } else if (totalBowel / days > 2) {
    deduct(8, {
      code: "digestion-frequent",
      title: "排便次数偏多",
      detail: "排便次数明显偏多，注意是否与辛辣、乳制品、紧张情绪或肠道感染有关，持续超过一周建议就医。",
      severity: "warn",
    });
  }

  const hardStoolDays = countWith(ctx.digestionLogs, (log) => (log.bristol ?? 4) <= 2);
  if (hardStoolDays >= 2) {
    deduct(12, {
      code: "digestion-hard-stool",
      title: "大便偏干硬",
      detail: `近 ${days} 天有 ${hardStoolDays} 天为 Bristol 1-2 型（干硬）。增加可溶性纤维（燕麦、奇亚籽、火龙果）和饮水通常最有效。`,
      severity: "warn",
      evidenceHint: "Bristol 粪便分型：3-4 型为理想",
    });
  }

  const looseStoolDays = countWith(ctx.digestionLogs, (log) => (log.bristol ?? 4) >= 6);
  if (looseStoolDays >= 2) {
    deduct(8, {
      code: "digestion-loose-stool",
      title: "大便偏稀",
      detail: `近 ${days} 天有 ${looseStoolDays} 天为 Bristol 6-7 型。注意饮食卫生与乳糖不耐受，持续两周以上建议消化科就诊。`,
      severity: "warn",
    });
  }

  const bloatingDays = countWith(ctx.digestionLogs, (log) => log.bloating);
  if (bloatingDays >= 3) {
    deduct(8, {
      code: "digestion-bloating",
      title: "腹胀频繁",
      detail: `近 ${days} 天有 ${bloatingDays} 天腹胀。可以尝试减少碳酸饮料、细嚼慢咽、饭后散步 10 分钟。`,
      severity: "warn",
    });
  }

  if (state.score >= 85) {
    state.findings.push({
      code: "digestion-good",
      title: "消化与排便情况良好",
      detail: "排便频率与性状基本正常，继续保持足量饮水与膳食纤维。",
      severity: "info",
    });
  }

  const summary =
    state.score >= 80
      ? "消化状态平稳"
      : state.score >= 60
        ? "排便习惯需要调整"
        : "消化道症状值得关注";

  return makeDimension("digestion", "消化与排泄", state.score, summary, state.findings);
}

/* ------------------------------- 情绪与压力 ------------------------------- */

export function scoreMood(ctx: ScoreContext): DimensionScore {
  if (ctx.moodLogs.length < 2) {
    return insufficient("mood", "情绪与压力", `近 7 天只有 ${ctx.moodLogs.length} 天情绪记录`);
  }

  const state = { score: 100, findings: [] as Finding[] };
  const deduct = penalty(state);
  const stressAvg = averageOrNull(ctx.moodLogs.map((log) => log.stress));
  const moodAvg = averageOrNull(ctx.moodLogs.map((log) => log.mood));
  const energyAvg = averageOrNull(ctx.moodLogs.map((log) => log.energy));

  if (stressAvg !== null && stressAvg >= 3.5) {
    deduct(stressAvg >= 4.3 ? 22 : 13, {
      code: "mood-stress",
      title: "压力水平偏高",
      detail: `近 7 天压力自评平均 ${round(stressAvg, 1)}/5。建议每天留出 10 分钟低刺激时间（散步、呼吸练习、纸质阅读），并把最耗神的事情放在精力最好的时段。`,
      severity: stressAvg >= 4.3 ? "alert" : "warn",
      metric: `压力 ${round(stressAvg, 1)}/5`,
    });
  }

  if (moodAvg !== null && moodAvg <= 3) {
    deduct(moodAvg <= 2.4 ? 20 : 12, {
      code: "mood-low",
      title: "情绪状态偏低",
      detail: `近 7 天情绪自评平均 ${round(moodAvg, 1)}/5。先关注睡眠、日照和社交这三件小事；如果持续两周以上，建议做一次专业心理评估。`,
      severity: moodAvg <= 2.4 ? "alert" : "warn",
      metric: `情绪 ${round(moodAvg, 1)}/5`,
    });
  }

  if (energyAvg !== null && energyAvg <= 2.5) {
    deduct(10, {
      code: "mood-energy",
      title: "白天精力不足",
      detail: "精力持续偏低时，优先排查睡眠时长、缺铁性贫血、甲状腺功能和情绪状态。",
      severity: "warn",
      metric: `精力 ${round(energyAvg, 1)}/5`,
    });
  }

  if (ctx.symptomCodes.has("low_mood_2weeks")) {
    deduct(12, {
      code: "mood-persistent-low",
      title: "情绪低落已持续两周以上",
      detail: "持续两周以上的情绪低落或兴趣减退，建议到精神心理科做一次规范评估，早期干预效果更好。",
      severity: "alert",
      evidenceHint: "抑郁障碍诊疗指南：持续两周是重要评估节点",
    });
  }

  if (state.score >= 85) {
    state.findings.push({
      code: "mood-good",
      title: "情绪与压力状态稳定",
      detail: "近期情绪和精力自评较稳定，继续保持规律作息与适度社交。",
      severity: "info",
    });
  }

  const summary =
    state.score >= 80 ? "情绪状态稳定" : state.score >= 60 ? "压力需要日常疏解" : "情绪与压力值得优先关注";

  return makeDimension("mood", "情绪与压力", state.score, summary, state.findings);
}

/* ------------------------------ 烟酒与咖啡因 ------------------------------ */

export function scoreSubstances(ctx: ScoreContext, profile: ScorableProfile): DimensionScore {
  const state = { score: 100, findings: [] as Finding[] };
  const deduct = penalty(state);
  const smokedDays = countWith(ctx.logs, (log) => log.smoked);

  if (smokedDays > 0) {
    deduct(30, {
      code: "substance-smoking",
      title: "有吸烟行为",
      detail: `近 7 天有 ${smokedDays} 天吸烟。戒烟是性价比最高的健康投入，可咨询戒烟门诊，必要时使用规范戒烟药物。`,
      severity: "alert",
      metric: `吸烟 ${smokedDays} 天`,
    });
  }

  const alcoholAvg = averageOrNull(ctx.logs.map((log) => log.alcoholUnits));
  const alcoholWeekly = alcoholAvg !== null ? alcoholAvg * 7 : 0;
  const weeklyLimit = profile.sex === "male" ? 14 : 7;
  if (alcoholWeekly > weeklyLimit) {
    deduct(alcoholWeekly > weeklyLimit * 2 ? 20 : 12, {
      code: "substance-alcohol",
      title: "饮酒量超过建议上限",
      detail: `按记录推算每周约 ${round(alcoholWeekly, 1)} 个标准杯。建议男性每天酒精不超过 25g、女性不超过 15g，并尽量安排无酒日。`,
      severity: "warn",
      metric: `每周约 ${round(alcoholWeekly, 1)} 杯`,
      evidenceHint: "中国居民膳食指南：成年人应限量饮酒",
    });
  }

  const caffeineAvg = averageOrNull(ctx.logs.map((log) => log.caffeineCups));
  if (caffeineAvg !== null && caffeineAvg >= 3) {
    deduct(8, {
      code: "substance-caffeine",
      title: "咖啡因摄入偏多",
      detail: `平均每天 ${round(caffeineAvg, 1)} 杯含咖啡因饮品。建议每天不超过 3-4 杯，下午 2 点后尽量不喝。`,
      severity: "warn",
    });
  }

  const lateCaffeineDays = countWith(ctx.logs, (log) => log.caffeineAfter2pm);
  if (lateCaffeineDays >= 3) {
    deduct(8, {
      code: "substance-caffeine-late",
      title: "下午咖啡因影响睡眠",
      detail: `近 7 天有 ${lateCaffeineDays} 天在下午 2 点后摄入咖啡因。咖啡因半衰期约 5-6 小时，建议把最后一杯提前到中午前。`,
      severity: "warn",
    });
  }

  if (state.score >= 90) {
    state.findings.push({
      code: "substance-good",
      title: "烟酒与咖啡因控制良好",
      detail: "没有发现需要特别干预的烟酒或咖啡因问题。",
      severity: "info",
    });
  }

  const summary =
    state.score >= 85 ? "习惯风险较低" : state.score >= 60 ? "有需要控制的习惯" : "烟酒风险较高";

  return makeDimension("substances", "烟酒与咖啡因", state.score, summary, state.findings);
}
