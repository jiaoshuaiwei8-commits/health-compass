import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = { title: "注册" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/today");

  return (
    <AuthShell title="创建账号" subtitle="先建立基线，再开始每天 30 秒的记录。">
      <RegisterForm />
    </AuthShell>
  );
}
