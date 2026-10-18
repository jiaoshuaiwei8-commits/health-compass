import { OnboardingForm } from "@/components/onboarding-form";
import { requireUser } from "@/lib/auth/require-user";
import { getLatestAssessment, getProfile } from "@/lib/data";

export const metadata = { title: "建立健康档案" };

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  const [profile, assessment] = await Promise.all([getProfile(user.id), getLatestAssessment(user.id)]);

  // 问卷答案是 jsonb 结构，表单只需按键名读取，因此放宽成普通对象。
  const answers = (assessment?.answers ?? null) as unknown as Record<string, unknown> | null;

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Onboarding</p>
          <h1 className="mt-2 text-2xl font-semibold">先花 3 分钟，建立你的健康基线</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            这些信息决定报告的起点。填得越接近真实情况，建议越有针对性；所有字段都可以之后在设置里修改。
          </p>
        </div>

        <OnboardingForm
          defaults={{
            sex: profile?.sex,
            birthYear: profile?.birthYear,
            heightCm: profile?.heightCm,
            weightKg: profile?.weightKg,
            waistCm: profile?.waistCm,
            targetWeightKg: profile?.targetWeightKg,
            goal: profile?.goal,
            activityLevel: profile?.activityLevel,
            chronotype: profile?.chronotype ?? undefined,
            conditions: profile?.conditions ?? [],
            medications: profile?.medications,
            answers,
            symptoms: assessment?.answers.symptoms ?? [],
          }}
        />
      </div>
    </div>
  );
}
