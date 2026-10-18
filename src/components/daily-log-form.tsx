import { CheckPill, Field, Input, Rating, Select, Textarea } from "@/components/ui/form";
import type { dailyLogs } from "@/db/schema";
import type { Meals, SymptomCode } from "@/lib/types";
import { SYMPTOM_CATALOG } from "@/lib/types";
import { saveDailyLogAction } from "@/lib/actions/logs";

type LogRow = typeof dailyLogs.$inferSelect;

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-2xl border border-line bg-white" open>
      <summary className="flex items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
        </div>
        <span className="text-xs text-muted transition group-open:rotate-180">▾</span>
      </summary>
      <div className="border-t border-line px-5 py-4">{children}</div>
    </details>
  );
}

const MEAL_FIELDS: { key: keyof Meals; name: string; label: string; negative?: boolean }[] = [
  { key: "breakfast", name: "meal_breakfast", label: "早餐" },
  { key: "lunch", name: "meal_lunch", label: "午餐" },
  { key: "dinner", name: "meal_dinner", label: "晚餐" },
  { key: "vegetables", name: "meal_vegetables", label: "蔬菜 ≥ 300g" },
  { key: "fruit", name: "meal_fruit", label: "水果 200-350g" },
  { key: "wholeGrain", name: "meal_whole_grain", label: "全谷物/杂豆" },
  { key: "protein", name: "meal_protein", label: "鱼禽蛋瘦肉/豆制品" },
  { key: "dairy", name: "meal_dairy", label: "奶或奶制品" },
  { key: "fried", name: "meal_fried", label: "油炸/高油", negative: true },
  { key: "sugaryDrink", name: "meal_sugary_drink", label: "含糖饮料", negative: true },
  { key: "takeout", name: "meal_takeout", label: "外卖", negative: true },
  { key: "lateNight", name: "meal_late_night", label: "睡前 2 小时内进食", negative: true },
];

export function DailyLogForm({ date, log }: { date: string; log: LogRow | null }) {
  const meals = (log?.meals ?? {}) as Meals;
  const symptoms = (log?.symptoms ?? []) as SymptomCode[];

  return (
    <form action={saveDailyLogAction} className="space-y-3">
      <input type="hidden" name="log_date" value={date} />

      <Section title="睡眠" hint="按昨晚实际入睡和起床时间填写">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="入睡时间">
            <Input name="sleep_start" type="time" defaultValue={log?.sleepStart ?? "23:30"} />
          </Field>
          <Field label="起床时间">
            <Input name="sleep_end" type="time" defaultValue={log?.sleepEnd ?? "07:00"} />
          </Field>
          <Field label="入睡用了多久（分钟）">
            <Input name="sleep_latency_min" type="number" min={0} max={240} defaultValue={log?.sleepLatencyMin ?? 20} />
          </Field>
          <Field label="夜间醒来次数">
            <Input name="night_wakes" type="number" min={0} max={10} defaultValue={log?.nightWakes ?? 0} />
          </Field>
          <Field label="睡眠质量" className="sm:col-span-2">
            <Rating
              name="sleep_quality"
              defaultValue={log?.sleepQuality ?? 3}
              labels={["很差", "较差", "一般", "较好", "很好"]}
            />
          </Field>
        </div>
      </Section>

      <Section title="饮食" hint="点选今天吃到的类别，不用精确计算热量">
        <div className="flex flex-wrap gap-2">
          {MEAL_FIELDS.map((item) => (
            <CheckPill
              key={item.name}
              name={item.name}
              label={item.label}
              defaultChecked={Boolean(meals[item.key])}
            />
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="饮水量（ml）">
            <Input name="water_ml" type="number" step="100" min={0} max={8000} defaultValue={log?.waterMl ?? 1500} />
          </Field>
        </div>
      </Section>

      <Section title="身体活动" hint="没有运动也可以只填步数和久坐时长">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="步数">
            <Input name="steps" type="number" min={0} max={80000} defaultValue={log?.steps ?? ""} placeholder="例如 6500" />
          </Field>
          <Field label="中等强度活动（分钟）">
            <Input name="exercise_minutes" type="number" min={0} max={600} defaultValue={log?.exerciseMinutes ?? ""} placeholder="快走、骑车、游泳" />
          </Field>
          <Field label="高强度活动（分钟）">
            <Input name="vigorous_minutes" type="number" min={0} max={600} defaultValue={log?.vigorousMinutes ?? ""} placeholder="跑步、球类、HIIT" />
          </Field>
          <Field label="久坐时长（小时）">
            <Input name="sedentary_hours" type="number" step="0.5" min={0} max={24} defaultValue={log?.sedentaryHours ?? ""} />
          </Field>
        </div>
        <div className="mt-4">
          <CheckPill name="strength_training" label="今天做了力量训练" defaultChecked={log?.strengthTraining} />
        </div>
      </Section>

      <Section title="情绪与精力" hint="1 分最低，5 分最高">
        <div className="space-y-5">
          <Field label="整体情绪">
            <Rating name="mood" defaultValue={log?.mood ?? 3} labels={["很低落", "偏低", "一般", "不错", "很好"]} />
          </Field>
          <Field label="压力水平">
            <Rating name="stress" defaultValue={log?.stress ?? 3} labels={["很放松", "较低", "一般", "较高", "很高"]} />
          </Field>
          <Field label="白天精力">
            <Rating name="energy" defaultValue={log?.energy ?? 3} labels={["很差", "较差", "一般", "较好", "充沛"]} />
          </Field>
        </div>
      </Section>

      <Section title="消化与排泄" hint="没有排便可以把次数填 0">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="排便次数">
            <Input name="bowel_count" type="number" min={0} max={10} defaultValue={log?.bowelCount ?? 1} />
          </Field>
          <Field label="大便性状（Bristol）">
            <Select name="bristol" defaultValue={String(log?.bristol ?? 4)}>
              <option value="1">1 型：硬球状，难排出</option>
              <option value="2">2 型：香肠状但干硬</option>
              <option value="3">3 型：香肠状，表面有裂纹</option>
              <option value="4">4 型：光滑柔软（理想）</option>
              <option value="5">5 型：软块状，边缘清楚</option>
              <option value="6">6 型：糊状，边缘不清</option>
              <option value="7">7 型：水样</option>
            </Select>
          </Field>
        </div>
        <div className="mt-4">
          <CheckPill name="bloating" label="今天有腹胀" defaultChecked={log?.bloating} />
        </div>
      </Section>

      <Section title="烟酒与咖啡因" hint="用于判断睡眠和代谢风险">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="含咖啡因饮品（杯）">
            <Input name="caffeine_cups" type="number" min={0} max={12} defaultValue={log?.caffeineCups ?? 1} />
          </Field>
          <Field label="酒精（标准杯）" hint="一听啤酒约 1 杯">
            <Input name="alcohol_units" type="number" step="0.5" min={0} max={20} defaultValue={log?.alcoholUnits ?? 0} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <CheckPill name="caffeine_after_2pm" label="下午 2 点后喝过咖啡因" defaultChecked={log?.caffeineAfter2pm} />
          <CheckPill name="smoked" label="今天吸烟" defaultChecked={log?.smoked} />
        </div>
      </Section>

      <Section title="不适症状" hint="只记录今天出现的情况；红旗症状会触发就医提示">
        <div className="flex flex-wrap gap-2">
          {SYMPTOM_CATALOG.map((item) => (
            <CheckPill
              key={item.code}
              name="symptoms"
              value={item.code}
              label={item.label}
              defaultChecked={symptoms.includes(item.code)}
            />
          ))}
        </div>
      </Section>

      <Section title="备注" hint="可选">
        <Textarea name="note" rows={3} defaultValue={log?.note ?? ""} placeholder="今天有什么特别的情况？例如加班、聚餐、感冒、出差。" />
      </Section>

      <div className="sticky bottom-20 z-10 md:bottom-4">
        <button
          type="submit"
          className="h-12 w-full rounded-xl bg-primary text-base font-medium text-white shadow-lg transition hover:bg-primary-dark"
        >
          保存今天的记录
        </button>
      </div>
    </form>
  );
}
