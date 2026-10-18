import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = { title: "登录" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/today");
  const params = await searchParams;

  return (
    <AuthShell title="欢迎回来" subtitle="继续记录，才能看见趋势。">
      <LoginForm next={params.next} />
    </AuthShell>
  );
}
