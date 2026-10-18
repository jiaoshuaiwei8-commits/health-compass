import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, Gauge, RefreshCw, ShieldAlert, Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Disclaimer } from "@/components/disclaimer";
import { RadarChart } from "@/components/radar-chart";
import { ScoreBar, ScoreRing } from "@/components/score";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass } from "@/components/ui/button";
import { Badge, Progress } from "@/components/ui/form";
import { generateReportAction } from "@/lib/actions/reports";
import { requireUser } from "@/lib/auth/require-user";
import { getActivePlan, getLatestReport, getProfile, getRecentLogs, getReportCountToday } from "@/lib/data";
import { DISCLAIMER } from "@/lib/constants";
import { formatDate, toDateKey } from "@/lib/utils";

export const metadata = { title: "健康报告" };

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ generated?: string; error?: string }>;
}) {
  const user = await requireUser("/report");
  const params = await searchParams;
  const today = toDateKey();

  const [profile, latest, recent, activePlan, used] = await Promise.all([
    getProfile(user.id),
    getLatestReport(user.id),
    getRecentLogs(user.id, today, 7),
    getActivePlan(user.id),
    getReportCountToday(user.id),
  ]);

  if (!profile) {
    return (
      <AppShell user={user} active="/report">
        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <h1 className="text-lg font-semibold">先完成健康档案</h1>
          <p className="mt-2 text-sm text-muted">有了基础信息，报告才有参照系。</p>
          <Link href="/onboarding" className={buttonClass("primary", "md", "mt-5")}>
            去填写
          </Link>
        </div>
      </AppShell>
    );
  }

  const limit = Number(process.env.REPORTS_PER_DAY ?? 2);
  const remaining = Math.max(0, limit - used);

  if (!latest) {
    return (
      <AppShell user={user} active="/report">
        <div className="mx-auto max-w-xl">
          <h1 className="text-2xl font-semibold">生成第一份健康报告</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            系统会先用规则引擎给 7 个维度打分，再从权威指南中检索依据，最后由 AI 组织成可执行的建议。
            建议先记录 3 天以上，结论会更稳定。
          </p>

          <div className="mt-5 rounded-2xl border border-line bg-white p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">近 7 天记录</span>
              <span className="font-semibold">{recent.length} 天</span>
            </div>
            <div className="mt-2">
              <Progress value={Math.min(100, (recent.length / 3) * 100)} />
            </div>
            <p className="mt-2 text-xs text-muted">
              {recent.length >= 3 ? "数据量足够，可以生成。" : "还差几天，先记录再生成也可以，但深度会打折。"}
            </p>
          </div>

          <form action={generateReportAction} className="mt-4">
            <SubmitButton size="lg" className="w-full" pendingText="正在分析并检索依据…">
              生成我的健康报告
              <ArrowRight className="h-4 w-4" />
            </SubmitButton>
          </form>
          <p className="mt-3 text-center text-xs text-muted">今日剩余生成次数：{remaining} 次</p>
          <div className="mt-6">
            <Disclaimer />
          </div>
        </div>
      </AppShell>
    );
  }

  const { report, citations } = latest;
  const content = report.content;
  const redFlags = report.redFlags;
  const citationMap = new Map(citations.map((citation) => [citation.refIndex, citation]));
  const refsFor = (refs: number[]) => refs.map((ref) => citationMap.get(ref)).filter(Boolean);
  const planMatchesReport = activePlan?.plan.reportId === report.id;

  return (
    <AppShell user={user} active="/report">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted">
              {formatDate(report.periodStart)} — {formatDate(report.periodEnd)} · 分析 {report.createdAt.toLocaleDateString("zh-CN")}
            </p>
            <h1 className="mt-1 text-2xl font-semibold">健康分析报告</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="primary">综合 {report.overall} 分</Badge>
              <Badge tone="neutral">{report.engine === "deepseek" ? `AI · ${report.model ?? "deepseek"}` : "规则引擎"}</Badge>
              <Badge tone="neutral">{report.promptVersion ?? "report-v1"}</Badge>
            </div>
          </div>
          <form action={generateReportAction}>
            <SubmitButton variant="outline" size="sm" pendingText="分析中…">
              <RefreshCw className="h-3.5 w-3.5" />
              重新生成
            </SubmitButton>
          </form>
        </div>

        {params.generated ? (
          <div className="rounded-2xl border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-primary">
            报告已生成{params.generated === "rules" ? "（使用规则引擎，未调用大模型）" : ""}。
          </div>
        ) : null}
        {params.error === "quota" ? (
          <div className="rounded-2xl border border-warn/20 bg-warn-soft px-4 py-3 text-sm text-warn">
            今天已经生成 {limit} 次报告，明天再来，或先在「今日记录」补充数据。
          </div>
        ) : null}

        {redFlags.length > 0 ? (
          <div className="rounded-2xl border border-danger/25 bg-danger-soft p-5">
            <div className="flex items-center gap-2 text-danger">
              <ShieldAlert className="h-5 w-5" />
              <h2 className="text-sm font-semibold">需要优先处理的情况</h2>
            </div>
            <ul className="mt-3 space-y-3">
              {redFlags.map((flag) => (
                <li key={flag.code} className="text-sm leading-relaxed text-ink">
                  <span className="font-medium">{flag.label}</span>
                  <p className="mt-1 text-danger/90">{flag.advice}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-line bg-white p-5">
            <div className="flex items-center gap-5">
              <ScoreRing score={report.overall} />
              <div>
                <p className="text-xs text-muted">综合健康分</p>
                <p className="mt-1 text-sm leading-relaxed text-ink">{content.summary}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
              {report.scores.map((dimension) => (
                <ScoreBar key={dimension.key} dimension={dimension} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">七个维度</h2>
            </div>
            <RadarChart dimensions={report.scores} />
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">本周重点</h2>
          </div>
          <ol className="mt-3 space-y-2">
            {content.weeklyFocus.map((item, index) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">
                  {index + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
          {content.highlights.length > 0 ? (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-xs font-medium text-muted">做得不错的地方</p>
              <ul className="mt-2 space-y-1.5 text-sm text-ink">
                {content.highlights.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold">主要问题与建议</h2>
          {content.concerns.map((concern, index) => {
            const refs = refsFor(concern.evidenceRefs);
            return (
              <article key={`${concern.title}-${index}`} className="rounded-2xl border border-line bg-white p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warn-soft text-[11px] font-semibold text-warn">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold">{concern.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{concern.explanation}</p>
                    <ul className="mt-3 space-y-1.5">
                      {concern.actions.map((action) => (
                        <li key={action} className="flex gap-2 text-sm text-ink">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                          {action}
                        </li>
                      ))}
                    </ul>

                    {refs.length > 0 ? (
                      <details className="mt-3 rounded-xl bg-canvas/80 p-3">
                        <summary className="flex items-center gap-1.5 text-xs font-medium text-primary">
                          <BookOpen className="h-3.5 w-3.5" />
                          查看依据（{refs.length} 条）
                        </summary>
                        <div className="mt-2 space-y-3">
                          {refs.map((citation) => (
                            <div key={citation!.id} className="border-t border-line pt-2 first:border-0 first:pt-0">
                              <p className="text-[11px] font-medium text-ink">
                                [{citation!.refIndex}] 《{citation!.docTitle}》· {citation!.sectionPath}
                              </p>
                              <p className="mt-1 line-clamp-6 whitespace-pre-line text-[11px] leading-relaxed text-muted">
                                {citation!.excerpt}
                              </p>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : (
                      <p className="mt-3 text-[11px] text-muted">本条暂无知识库出处，建议结合医生或营养师意见。</p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-sm font-semibold">维度详情</h2>
            <div className="mt-3 space-y-4">
              {report.scores.map((dimension) => (
                <div key={dimension.key}>
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium">{dimension.label}</p>
                    <span className="text-xs text-muted">{dimension.score} 分 · {dimension.summary}</span>
                  </div>
                  {dimension.findings.slice(0, 2).map((finding) => (
                    <p key={finding.code} className="mt-1 text-xs leading-relaxed text-muted">
                      · {finding.title}
                      {finding.metric ? `（${finding.metric}）` : ""}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-line bg-white p-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-semibold">下一步</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {planMatchesReport
                  ? "按计划每天完成 2-3 个小任务，一周后回来看复盘。"
                  : "把报告里的建议拆成 7 天计划，每天只做 2-3 件小事。"}
              </p>
              <Link
                href="/plan"
                className={buttonClass(planMatchesReport ? "outline" : "primary", "md", "mt-4 w-full")}
              >
                {planMatchesReport ? "查看我的 7 天计划" : "生成 7 天改善计划"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-2xl border border-line bg-white p-5">
              <h2 className="text-sm font-semibold">引用说明</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                本报告共引用 {citations.length} 条知识库片段。摘编自公开指南，可能省略上下文，
                具体建议请以原文和医生意见为准。
              </p>
              {content.medicalNote ? (
                <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-xs leading-relaxed text-danger">
                  {content.medicalNote}
                </p>
              ) : null}
              <p className="mt-3 text-[11px] leading-relaxed text-muted">{DISCLAIMER}</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
