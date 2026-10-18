"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckPill, Field, Input, RadioPills, Select, Textarea } from "@/components/ui/form";
import { saveOnboardingAction } from "@/lib/actions/profile";
import { EMPTY_FORM_STATE } from "@/lib/actions/state";
import { CONSENT_TEXT } from "@/lib/constants";
import { SYMPTOM_CATALOG } from "@/lib/types";

function Section({
  index,
  title,
  hint,
  children,
}: {
  index: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-4 flex items-baseline gap-2">
        <span className="text-xs font-semibold text-primary">{String(index).padStart(2, "0")}</span>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function OnboardingForm({
  defaults,
}: {
  defaults: {
    sex?: string;
    birthYear?: number | null;
    heightCm?: number | null;
    weightKg?: number | null;
    waistCm?: number | null;
    targetWeightKg?: number | null;
    goal?: string;
    activityLevel?: string;
    chronotype?: string;
    conditions?: string[];
    medications?: string | null;
    answers?: Record<string, unknown> | null;
    symptoms?: string[];
  };
}) {
  const [state, formAction, pending] = useActionState(saveOnboardingAction, EMPTY_FORM_STATE);
  const answers = (defaults.answers ?? {}) as Record<string, string | number | string[] | undefined>;
  const numberValue = (key: string, fallback: number) =>
    typeof answers[key] === "number" ? (answers[key] as number) : fallback;
  const stringValue = (key: string, fallback: string) =>
    typeof answers[key] === "string" ? (answers[key] as string) : fallback;

  const urgentSymptoms = SYMPTOM_CATALOG.filter((item) => item.group === "urgent");
  const generalSymptoms = SYMPTOM_CATALOG.filter((item) => item.group === "general");

  return (
    <form action={formAction} className="space-y-4">
      <Section index={1} title="基本信息" hint="用于计算 BMI 与能量需求，只有你能看到">
        <div className="space-y-4">
          <Field label="生理性别">
            <RadioPills
              name="sex"
              defaultValue={defaults.sex ?? "female"}
              options={[
                { value: "female", label: "女性" },
                { value: "male", label: "男性" },
                { value: "other", label: "其他 / 不愿透露" },
              ]}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="出生年份">
              <Input name="birth_year" type="number" min={1930} max={2015} defaultValue={defaults.birthYear ?? 1995} />
            </Field>
            <Field label="身高（cm）">
              <Input name="height_cm" type="number" step="0.5" min={120} max={230} defaultValue={defaults.heightCm ?? 165} />
            </Field>
            <Field label="体重（kg）">
              <Input name="weight_kg" type="number" step="0.1" min={30} max={250} defaultValue={defaults.weightKg ?? 60} />
            </Field>
            <Field label="腰围（cm）" hint="肚脐水平，可选">
              <Input name="waist_cm" type="number" step="0.5" min={40} max={200} defaultValue={defaults.waistCm ?? ""} />
            </Field>
          </div>
        </div>
      </Section>

      <Section index={2} title="目标与日常状态" hint="决定建议的优先级">
        <div className="space-y-4">
          <Field label="最主要的目标">
            <Select name="goal" defaultValue={defaults.goal ?? "overall"}>
              <option value="overall">整体健康</option>
              <option value="lose_weight">体重管理</option>
              <option value="sleep">改善睡眠</option>
              <option value="energy">提升精力</option>
              <option value="glucose">血糖友好</option>
            </Select>
          </Field>
          <Field label="期望体重（kg）" hint="不填也可以">
            <Input name="target_weight_kg" type="number" step="0.1" min={30} max={250} defaultValue={defaults.targetWeightKg ?? ""} />
          </Field>
          <Field label="平时的活动水平">
            <RadioPills
              name="activity_level"
              defaultValue={defaults.activityLevel ?? "light"}
              options={[
                { value: "sedentary", label: "久坐为主" },
                { value: "light", label: "每周 1-2 次" },
                { value: "moderate", label: "每周 3-4 次" },
                { value: "high", label: "每周 5 次以上" },
              ]}
            />
          </Field>
          <Field label="作息类型">
            <RadioPills
              name="chronotype"
              defaultValue={defaults.chronotype ?? "neutral"}
              options={[
                { value: "early", label: "早睡早起" },
                { value: "neutral", label: "中间型" },
                { value: "late", label: "晚睡晚起" },
              ]}
            />
          </Field>
          <Field label="已知的健康情况" hint="可多选，仅用于调整建议">
            <div className="flex flex-wrap gap-2">
              {["高血压", "糖尿病", "高血脂", "脂肪肝", "甲状腺疾病", "多囊卵巢", "慢性胃炎/反流"].map((item) => (
                <CheckPill key={item} name="conditions" value={item} label={item} defaultChecked={defaults.conditions?.includes(item)} />
              ))}
            </div>
          </Field>
          <Field label="正在服用的药物" hint="可选，不会给出用药建议">
            <Textarea name="medications" rows={2} defaultValue={defaults.medications ?? ""} placeholder="例如：二甲双胍 500mg，每日两次（仅作记录）" />
          </Field>
        </div>
      </Section>

      <Section index={3} title="睡眠与饮食基线" hint="按最近一个月的典型情况填写">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="通常起床时间">
            <Input name="typical_wake" type="time" defaultValue={stringValue("typicalWake", "07:30")} />
          </Field>
          <Field label="通常入睡时间">
            <Input name="typical_bed" type="time" defaultValue={stringValue("typicalBed", "23:30")} />
          </Field>
          <Field label="平均睡眠时长（小时）">
            <Input name="sleep_hours" type="number" step="0.5" min={3} max={14} defaultValue={numberValue("sleepHours", 7)} />
          </Field>
          <Field label="入睡需要多久（分钟）">
            <Input name="sleep_latency_min" type="number" min={0} max={180} defaultValue={numberValue("sleepLatencyMin", 20)} />
          </Field>
          <Field label="每周运动天数">
            <Input name="exercise_days" type="number" min={0} max={7} defaultValue={numberValue("exerciseDays", 2)} />
          </Field>
          <Field label="每次运动时长（分钟）">
            <Input name="exercise_minutes_per_session" type="number" min={0} max={240} defaultValue={numberValue("exerciseMinutesPerSession", 30)} />
          </Field>
          <Field label="每天久坐时长（小时）">
            <Input name="sedentary_hours" type="number" step="0.5" min={0} max={24} defaultValue={numberValue("sedentaryHours", 8)} />
          </Field>
          <Field label="每天蔬菜份数" hint="一份约一拳头">
            <Input name="vegetable_servings" type="number" min={0} max={10} defaultValue={numberValue("vegetableServings", 2)} />
          </Field>
          <Field label="每天水果份数" hint="一份约一拳头">
            <Input name="fruit_servings" type="number" min={0} max={8} defaultValue={numberValue("fruitServings", 1)} />
          </Field>
          <Field label="每周早餐天数">
            <Input name="breakfast_frequency" type="number" min={0} max={7} defaultValue={numberValue("breakfastFrequency", 3)} />
          </Field>
          <Field label="每周外卖次数">
            <Input name="takeout_frequency" type="number" min={0} max={21} defaultValue={numberValue("takeoutFrequency", 4)} />
          </Field>
          <Field label="每天饮水量（ml）">
            <Input name="water_ml" type="number" step="100" min={0} max={6000} defaultValue={numberValue("waterMl", 1200)} />
          </Field>
          <Field label="每天含咖啡因饮品（杯）">
            <Input name="caffeine_cups" type="number" min={0} max={12} defaultValue={numberValue("caffeineCups", 1)} />
          </Field>
          <Field label="每周饮酒次数">
            <Input name="alcohol_frequency" type="number" min={0} max={21} defaultValue={numberValue("alcoholFrequency", 0)} />
          </Field>
          <Field label="吸烟情况">
            <Select name="smoking" defaultValue={stringValue("smoking", "never")}>
              <option value="never">不吸烟</option>
              <option value="sometimes">偶尔</option>
              <option value="daily">每天</option>
            </Select>
          </Field>
        </div>
      </Section>

      <Section index={4} title="压力与排便" hint="这部分与睡眠、情绪互相影响">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="最近一个月的压力水平" hint="1 很低，5 很高">
            <Select name="stress_level" defaultValue={String(numberValue("stressLevel", 3))}>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="排便频率">
            <Select name="bowel_frequency" defaultValue={stringValue("bowelFrequency", "daily")}>
              <option value="lt3w">每周少于 3 次</option>
              <option value="3-6w">每周 3-6 次</option>
              <option value="daily">每天 1 次左右</option>
              <option value="gt1d">每天多于 2 次</option>
            </Select>
          </Field>
        </div>
      </Section>

      <Section index={5} title="家族史与当前症状" hint="症状只用于提示是否需要就医，不做诊断">
        <div className="space-y-4">
          <Field label="家族史">
            <div className="flex flex-wrap gap-2">
              {["高血压", "糖尿病", "冠心病", "肥胖", "肿瘤", "无"].map((item) => (
                <CheckPill key={item} name="family_history" value={item} label={item} />
              ))}
            </div>
          </Field>

          <div>
            <p className="mb-2 text-sm font-medium">需要尽快就医评估的症状</p>
            <div className="flex flex-wrap gap-2">
              {urgentSymptoms.map((item) => (
                <CheckPill
                  key={item.code}
                  name="symptoms"
                  value={item.code}
                  label={item.label}
                  defaultChecked={defaults.symptoms?.includes(item.code)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">其他近期不适</p>
            <div className="flex flex-wrap gap-2">
              {generalSymptoms.map((item) => (
                <CheckPill
                  key={item.code}
                  name="symptoms"
                  value={item.code}
                  label={item.label}
                  defaultChecked={defaults.symptoms?.includes(item.code)}
                />
              ))}
            </div>
          </div>
          <p className="rounded-xl bg-canvas px-3 py-2 text-[11px] leading-relaxed text-muted">
            勾选不会自动给出诊断。若勾选胸痛、便血、轻生念头等，报告会优先建议你就医或联系心理援助热线。
          </p>
        </div>
      </Section>

      <section className="rounded-2xl border border-primary/20 bg-primary-soft/50 p-5">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">隐私与数据说明</h2>
        </div>
        <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-muted">{CONSENT_TEXT}</p>
        <label className="mt-4 flex cursor-pointer items-start gap-2.5">
          <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 rounded border-line text-primary" />
          <span className="text-sm leading-relaxed">
            我已阅读并同意上述说明，同意系统处理我填写的健康信息。
          </span>
        </label>
      </section>

      {state.error ? (
        <p className="flex items-center gap-1.5 rounded-xl bg-danger-soft px-3 py-2 text-xs text-danger">
          <AlertCircle className="h-3.5 w-3.5" />
          {state.error}
        </p>
      ) : null}

      <div className="sticky bottom-20 z-10 md:bottom-4">
        <Button type="submit" size="lg" disabled={pending} className="w-full shadow-lg">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          保存并开始记录
        </Button>
      </div>
    </form>
  );
}
