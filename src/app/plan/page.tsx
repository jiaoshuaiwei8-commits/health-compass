import Link from "next/link";
import { ArrowRight, CalendarCheck2, Check, Circle, RefreshCw, Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass } from "@/components/ui/button";
import { Badge, Progress } from "@/components/ui/form";
import { generatePlanAction } from "@/lib/actions/reports";
import { toggleCheckinAction } from "@/lib/actions/plans";
import { requireUser } from "@/lib/auth/require-user";
import { getActivePlan, getLatestReport } from "@/lib/data";
import { pct, formatDate, toDateKey } from "@/lib/utils";

export const metadata = { title: "改善计划" };

const CATEGORY_LABEL: Record<string, string> = {
  diet: "饮食",
  sleep: "睡眠",
  activity: "活动",
  habit: "习惯",
};

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ generated?: string }>;
}) {
  const user = await requireUser("/plan");
  const params = await searchParams;
  const [latest, activePlan] = await Promise.all([getLatestReport(user.id), getActivePlan(user.id)]);
  const today = toDateKey();

  const isCurrent = activePlan && latest && activePlan.plan.reportId === latest.report.id;

  if (!latest) {
    return (
      <AppShell user={user} active="/plan">
        <div className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-8 text-center">
          <CalendarCheck2 className="mx-auto h-6 w-6 text-primary" />
          <h1 className="mt-3 text-lg font-semibold">先有报告，再排计划</h1>
          <p className="mt-2 text-sm text-muted">计划里的每个任务都对应报告里的一个具体问题。</p>
          <Link href="/report" className={buttonClass("primary", "md", "mt-5")}>
            去生成报告
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!isCurrent) {
    return (
      <AppShell user={user} active="/plan">
        <div className="mx-auto max-w-xl">
          <h1 className="text-2xl font-semibold">制定 7 天改善计划</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            根据最新报告（{formatDate(latest.report.periodStart)} — {formatDate(latest.report.periodEnd)}，
            综合 {latest.report.overall} 分），系统会把建议拆成每天 2-4 个可完成的小任务。
          </p>

          <div className="mt-5 rounded-2xl border border-line bg-white p-5">
            <p className="text-xs font-medium text-muted">计划重点</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {latest.report.topIssues.map((issue) => (
                <Badge key={issue.code} tone="accent">
                  {issue.title}
                </Badge>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              每个任务都设计成 10-30 分钟内可完成。完成率比强度更重要，先做满 7 天。
            </p>
          </div>

          <form action={generatePlanAction} className="mt-4 space-y-2">
            <SubmitButton size="lg" className="w-full" pendingText="正在排计划…">
              生成我的 7 天计划
              <ArrowRight className="h-4 w-4" />
            </SubmitButton>
            {activePlan ? (
              <p className="text-center text-xs text-muted">
                当前有一份基于旧报告的计划，生成新计划不会删除历史记录。
              </p>
            ) : null}
          </form>
        </div>
      </AppShell>
    );
  }

  const allTasks = activePlan.days.flatMap((day) => day.tasks);
  const done = allTasks.filter((row) => row.checkinId).length;
  const progress = pct(done, allTasks.length);

  return (
    <AppShell user={user} active="/plan">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted">
              {formatDate(activePlan.plan.startDate)} — {formatDate(activePlan.plan.endDate)} · 基于报告 {latest.report.overall} 分
            </p>
            <h1 className="mt-1 text-2xl font-semibold">7 天改善计划</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {activePlan.plan.focusAreas.map((area) => (
                <Badge key={area} tone="primary">
                  {area}
                </Badge>
              ))}
              <Badge tone="neutral">{activePlan.plan.engine === "deepseek" ? "AI 计划" : "规则计划"}</Badge>
            </div>
          </div>
          <form action={generatePlanAction}>
            <SubmitButton variant="outline" size="sm" pendingText="重排中…">
              <RefreshCw className="h-3.5 w-3.5" />
              重新制定
            </SubmitButton>
          </form>
        </div>

        {params.generated ? (
          <div className="rounded-2xl border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-primary">
            新计划已生成，今天就可以开始。
          </div>
        ) : null}

        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted">完成进度</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {done}
                <span className="ml-1 text-sm font-normal text-muted">/ {allTasks.length} 项</span>
              </p>
            </div>
            <span className="text-sm font-semibold text-primary">{progress}%</span>
          </div>
          <div className="mt-3">
            <Progress value={progress} />
          </div>
          <p className="mt-3 text-xs text-muted">
            {progress === 100
              ? "本周任务全部完成，去周复盘看看指标变化。"
              : "完成率优先于完美执行：哪怕只做一版简化任务也算完成。"}
          </p>
        </div>

        <div className="space-y-4">
          {activePlan.days.map((day) => {
            const isToday = day.date === today;
            const isPast = day.date < today;
            const dayDone = day.tasks.filter((row) => row.checkinId).length;
            return (
              <section
                key={day.date}
                className={
                  isToday
                    ? "rounded-2xl border border-primary/30 bg-white p-5 shadow-sm"
                    : "rounded-2xl border border-line bg-white p-5"
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">{formatDate(day.date, true)}</h2>
                    {isToday ? <Badge tone="primary">今天</Badge> : null}
                    {isPast && dayDone < day.tasks.length ? <Badge tone="neutral">未完成</Badge> : null}
                  </div>
                  <span className="text-xs text-muted">
                    {dayDone}/{day.tasks.length}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {day.tasks.map((row) => {
                    const checked = Boolean(row.checkinId);
                    return (
                      <form key={row.task.id} action={toggleCheckinAction} className="block">
                        <input type="hidden" name="task_id" value={row.task.id} />
                        <input type="hidden" name="done" value={checked ? "false" : "true"} />
                        <button
                          type="submit"
                          className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-canvas/70"
                        >
                          <span
                            className={
                              checked
                                ? "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white"
                                : "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-muted"
                            }
                          >
                            {checked ? <Check className="h-3 w-3" /> : <Circle className="h-2.5 w-2.5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className={checked ? "text-sm text-muted line-through" : "text-sm font-medium"}>
                                {row.task.title}
                              </span>
                              <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] text-muted">
                                {CATEGORY_LABEL[row.task.category] ?? row.task.category}
                              </span>
                              {row.task.targetValue ? (
                                <span className="text-[10px] text-muted">
                                  目标 {row.task.targetValue}
                                  {row.task.targetUnit ?? ""}
                                </span>
                              ) : null}
                            </span>
                            {row.task.detail ? (
                              <span className="mt-1 block text-xs leading-relaxed text-muted">{row.task.detail}</span>
                            ) : null}
                          </span>
                        </button>
                      </form>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Target className="h-4 w-4 text-primary" />
            一周后回来看完成率与评分变化
          </div>
          <Link href="/review" className={buttonClass("secondary", "sm")}>
            打开周复盘
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
