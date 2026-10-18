import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Disclaimer } from "@/components/disclaimer";
import { buttonClass } from "@/components/ui/button";
import { Badge, Progress } from "@/components/ui/form";
import { requireUser } from "@/lib/auth/require-user";
import { getWeeklyReview } from "@/lib/review";
import { toDateKey } from "@/lib/utils";

export const metadata = { title: "周复盘" };

function Stat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">
        {value}
        {unit ? <span className="ml-1 text-sm font-normal text-muted">{unit}</span> : null}
      </p>
    </div>
  );
}

export default async function ReviewPage() {
  const user = await requireUser("/review");
  const review = await getWeeklyReview(user.id, toDateKey());
  const delta = review.scoreDelta;

  return (
    <AppShell user={user} active="/review">
      <div className="space-y-5">
        <div>
          <p className="text-xs text-muted">最近 7 天</p>
          <h1 className="mt-1 text-2xl font-semibold">周复盘</h1>
          <p className="mt-1 text-sm text-muted">看趋势，不看单日。连续两周的变化才是信号。</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="综合分" value={review.overallScore ?? "—"} unit="/ 100" />
          <Stat label="平均睡眠" value={review.avgSleepHours ?? "—"} unit="小时" />
          <Stat label="本周活动" value={review.exerciseMinutes} unit="分钟" />
          <Stat label="平均步数" value={review.avgSteps ?? "—"} unit="步" />
        </div>

        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-line bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">计划完成率</h2>
              <span className="text-sm font-semibold text-primary">{review.completionRate}%</span>
            </div>
            <div className="mt-3">
              <Progress value={review.completionRate} />
            </div>
            <p className="mt-2 text-xs text-muted">
              已完成 {review.completedTasks} / {review.totalTasks} 项任务
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
              <div>
                <p className="text-[11px] text-muted">压力</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{review.avgStress ?? "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted">情绪</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{review.avgMood ?? "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted">饮水</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {review.avgWater ?? "—"}
                  <span className="ml-0.5 text-xs font-normal text-muted">ml</span>
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-sm font-semibold">评分变化</h2>
            {delta === null ? (
              <p className="mt-3 text-sm leading-relaxed text-muted">
                还只有一份报告。下周再生成一次，就能看到分数变化。
              </p>
            ) : (
              <div className="mt-3 flex items-center gap-3">
                <span
                  className={
                    delta >= 0
                      ? "flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary"
                      : "flex h-12 w-12 items-center justify-center rounded-2xl bg-warn-soft text-warn"
                  }
                >
                  {delta >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                </span>
                <div>
                  <p className="text-2xl font-semibold tabular-nums">
                    {delta > 0 ? "+" : ""}
                    {delta}
                    <span className="ml-1 text-sm font-normal text-muted">分</span>
                  </p>
                  <p className="text-xs text-muted">与上一份报告相比</p>
                </div>
              </div>
            )}
            <p className="mt-4 text-xs leading-relaxed text-muted">
              单次分数受记录完整度影响，建议同时看睡眠、活动量和完成率三个指标。
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center gap-2">
            <Badge tone="accent">下周建议</Badge>
          </div>
          <ul className="mt-3 space-y-2">
            {review.suggestions.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed text-ink">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/report" className={buttonClass("primary", "sm")}>
              生成新报告
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/plan" className={buttonClass("outline", "sm")}>
              调整下一周计划
            </Link>
          </div>
        </div>

        <Disclaimer />
      </div>
    </AppShell>
  );
}
