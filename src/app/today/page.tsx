import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Flame, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DailyLogForm } from "@/components/daily-log-form";
import { Badge } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/require-user";
import { getActivePlan, getLatestReport, getLog, getProfile, getRecentLogs } from "@/lib/data";
import { addDays, formatDate, toDateKey } from "@/lib/utils";

export const metadata = { title: "今日记录" };

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; saved?: string; welcome?: string; need?: string }>;
}) {
  const user = await requireUser("/today");
  const params = await searchParams;
  const today = toDateKey();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : today;

  const profile = await getProfile(user.id);
  if (!profile) {
    return (
      <AppShell user={user} active="/today">
        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <h1 className="text-lg font-semibold">先完成健康档案</h1>
          <p className="mt-2 text-sm text-muted">填写基础信息后，才能计算评分和生成建议。</p>
          <Link href="/onboarding" className={buttonClass("primary", "md", "mt-5")}>
            去填写
          </Link>
        </div>
      </AppShell>
    );
  }

  const [log, recent, latestReport, activePlan] = await Promise.all([
    getLog(user.id, date),
    getRecentLogs(user.id, today, 7),
    getLatestReport(user.id),
    getActivePlan(user.id),
  ]);

  const loggedDates = new Set(recent.map((item) => item.logDate));
  let streak = 0;
  let cursor = today;
  while (loggedDates.has(cursor) && streak < 30) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  const todayTasks = activePlan?.days.find((day) => day.date === today)?.tasks ?? [];
  const doneTasks = todayTasks.filter((row) => row.checkinId).length;

  return (
    <AppShell user={user} active="/today">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted">{formatDate(date, true)}</p>
            <h1 className="mt-1 text-2xl font-semibold">
              {params.welcome ? "档案已建立，从今天开始记录" : date === today ? "今天感觉怎么样？" : "补记这一天"}
            </h1>
            <p className="mt-1 text-sm text-muted">30 秒填完关键项，睡觉前记录最准确。</p>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-line bg-white p-1">
            <Link
              href={`/today?date=${addDays(date, -1)}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-canvas"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href="/today"
              className="px-2 text-xs text-muted hover:text-ink"
            >
              今天
            </Link>
            <Link
              href={`/today?date=${addDays(date, 1)}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-canvas"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {params.saved ? (
          <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-primary">
            <CheckCircle2 className="h-4 w-4" />
            已保存 {formatDate(date)} 的记录。
          </div>
        ) : null}
        {params.need ? (
          <div className="rounded-2xl border border-warn/20 bg-warn-soft px-4 py-3 text-sm text-warn">
            生成报告至少需要 1 天的记录，先填今天的吧。
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-muted">
              <Flame className="h-3.5 w-3.5" /> 连续记录
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {streak}
              <span className="ml-1 text-sm font-normal text-muted">天</span>
            </p>
            <p className="mt-1 text-[11px] text-muted">近 7 天已记录 {recent.length} 天</p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-muted">
              <CalendarDays className="h-3.5 w-3.5" /> 今日计划
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {doneTasks}
              <span className="ml-1 text-sm font-normal text-muted">/ {todayTasks.length}</span>
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {todayTasks.length === 0 ? "生成报告后会得到 7 天计划" : "去「改善计划」打卡"}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-muted">
              <Sparkles className="h-3.5 w-3.5" /> 最近综合分
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {latestReport ? latestReport.report.overall : "—"}
              {latestReport ? <span className="ml-1 text-sm font-normal text-muted">/ 100</span> : null}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {latestReport ? `生成于 ${formatDate(latestReport.report.periodEnd)}` : "还没有报告"}
            </p>
          </div>
        </div>

        {recent.length >= 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
            <div>
              <p className="text-sm font-medium">
                {latestReport ? "数据有更新，可以生成新报告" : "数据够了，可以生成第一份报告"}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                报告会引用膳食指南、睡眠与活动指南，并给出 7 天计划。
              </p>
            </div>
            <div className="flex items-center gap-2">
              {latestReport ? <Badge tone="primary">已有报告</Badge> : <Badge tone="accent">建议生成</Badge>}
              <Link href="/report" className={buttonClass("secondary", "sm")}>
                去报告页
              </Link>
            </div>
          </div>
        ) : null}

        <DailyLogForm date={date} log={log} />

        <p className="pb-2 text-center text-[11px] text-muted">
          记录仅用于生成你自己的健康建议，不会公开展示。
        </p>
      </div>
    </AppShell>
  );
}
