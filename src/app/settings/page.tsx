import Link from "next/link";
import { Download, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Disclaimer } from "@/components/disclaimer";
import { buttonClass } from "@/components/ui/button";
import { Field, Input, RadioPills, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/submit-button";
import { deleteAccountAction, updateProfileAction } from "@/lib/actions/account";
import { logoutAction } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth/require-user";
import { getLatestAssessment, getLatestConsent, getProfile } from "@/lib/data";

export const metadata = { title: "设置" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await requireUser("/settings");
  const params = await searchParams;
  const [profile, consent, assessment] = await Promise.all([
    getProfile(user.id),
    getLatestConsent(user.id),
    getLatestAssessment(user.id),
  ]);

  return (
    <AppShell user={user} active="/settings">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">设置</h1>
          <p className="mt-1 text-sm text-muted">修改档案、导出数据，或删除账号。</p>
        </div>

        {params.saved ? (
          <div className="rounded-2xl border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-primary">
            已保存。
          </div>
        ) : null}
        {params.error === "confirm" ? (
          <div className="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
            请输入「删除」两个字以确认。
          </div>
        ) : null}

        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-sm font-semibold">账号</h2>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm">{user.email}</p>
              <p className="mt-0.5 text-xs text-muted">注册后可通过邮箱 + 密码登录</p>
            </div>
            <form action={logoutAction}>
              <button type="submit" className={buttonClass("outline", "sm")}>
                <LogOut className="h-3.5 w-3.5" />
                退出登录
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">健康档案</h2>
            <Link href="/onboarding" className="text-xs font-medium text-primary">
              重新做完整评估
            </Link>
          </div>
          <p className="mt-1 text-xs text-muted">
            修改基础信息不会删除历史记录；完整评估会重写档案并新增一份问卷记录。
          </p>

          <form action={updateProfileAction} className="mt-4 space-y-4">
            <Field label="生理性别">
              <RadioPills
                name="sex"
                defaultValue={profile?.sex ?? "female"}
                options={[
                  { value: "female", label: "女性" },
                  { value: "male", label: "男性" },
                  { value: "other", label: "其他" },
                ]}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="出生年份">
                <Input name="birth_year" type="number" min={1930} max={2015} defaultValue={profile?.birthYear ?? 1995} />
              </Field>
              <Field label="身高（cm）">
                <Input name="height_cm" type="number" step="0.5" min={120} max={230} defaultValue={profile?.heightCm ?? 165} />
              </Field>
              <Field label="体重（kg）">
                <Input name="weight_kg" type="number" step="0.1" min={30} max={250} defaultValue={profile?.weightKg ?? 60} />
              </Field>
              <Field label="腰围（cm）">
                <Input name="waist_cm" type="number" step="0.5" min={40} max={200} defaultValue={profile?.waistCm ?? ""} />
              </Field>
              <Field label="目标体重（kg）">
                <Input name="target_weight_kg" type="number" step="0.1" min={30} max={250} defaultValue={profile?.targetWeightKg ?? ""} />
              </Field>
              <Field label="主要目标">
                <Select name="goal" defaultValue={profile?.goal ?? "overall"}>
                  <option value="overall">整体健康</option>
                  <option value="lose_weight">体重管理</option>
                  <option value="sleep">改善睡眠</option>
                  <option value="energy">提升精力</option>
                  <option value="glucose">血糖友好</option>
                </Select>
              </Field>
              <Field label="活动水平">
                <Select name="activity_level" defaultValue={profile?.activityLevel ?? "light"}>
                  <option value="sedentary">久坐为主</option>
                  <option value="light">每周 1-2 次</option>
                  <option value="moderate">每周 3-4 次</option>
                  <option value="high">每周 5 次以上</option>
                </Select>
              </Field>
              <Field label="作息类型">
                <Select name="chronotype" defaultValue={profile?.chronotype ?? "neutral"}>
                  <option value="early">早睡早起</option>
                  <option value="neutral">中间型</option>
                  <option value="late">晚睡晚起</option>
                </Select>
              </Field>
            </div>
            {assessment ? (
              <p className="text-[11px] text-muted">
                上次评估：{assessment.createdAt.toLocaleDateString("zh-CN")}
                {assessment.baseline?.bmi ? ` · BMI ${assessment.baseline.bmi}（${assessment.baseline.bmiCategory}）` : ""}
              </p>
            ) : null}
            <SubmitButton size="md" pendingText="保存中…">
              保存档案
            </SubmitButton>
          </form>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">隐私与数据</h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
            <li>
              授权记录：
              {consent
                ? `版本 ${consent.version}，${consent.agreedAt.toLocaleString("zh-CN")} 同意`
                : "尚未记录（重新做评估时会生成）"}
            </li>
            <li>健康数据仅用于生成你本人的分析与建议，不用于广告，不出售给第三方。</li>
            <li>调用大模型时只发送去标识化的指标摘要与知识库片段，不包含邮箱与姓名。</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="/api/export" className={buttonClass("outline", "sm")}>
              <Download className="h-3.5 w-3.5" />
              导出全部数据（JSON）
            </a>
          </div>
        </section>

        <section className="rounded-2xl border border-danger/20 bg-danger-soft/40 p-5">
          <div className="flex items-center gap-2 text-danger">
            <Trash2 className="h-4 w-4" />
            <h2 className="text-sm font-semibold">删除账号</h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-danger/80">
            删除后，账号、档案、每日记录、报告与计划会立即从数据库移除，且无法恢复。建议先导出数据。
          </p>
          <form action={deleteAccountAction} className="mt-3 flex flex-wrap items-end gap-2">
            <Field label="输入「删除」以确认" className="w-48">
              <Input name="confirm" placeholder="删除" autoComplete="off" />
            </Field>
            <SubmitButton variant="danger" size="sm" pendingText="删除中…">
              永久删除
            </SubmitButton>
          </form>
        </section>

        <Disclaimer />
      </div>
    </AppShell>
  );
}
