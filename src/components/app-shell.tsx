import Link from "next/link";
import {
  Activity,
  CalendarCheck2,
  ClipboardList,
  Compass,
  LogOut,
  Settings,
  TrendingUp,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import type { SessionUser } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/today", label: "今日记录", icon: ClipboardList },
  { href: "/report", label: "健康报告", icon: Activity },
  { href: "/plan", label: "改善计划", icon: CalendarCheck2 },
  { href: "/review", label: "周复盘", icon: TrendingUp },
  { href: "/settings", label: "设置", icon: Settings },
];

export function AppShell({
  user,
  active,
  children,
}: {
  user: SessionUser;
  active: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/today" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white">
              <Compass className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive ? "bg-primary-soft font-medium text-primary" : "text-muted hover:text-ink",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden max-w-32 truncate text-xs text-muted sm:block">{user.email}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-black/5 hover:text-ink"
                title="退出登录"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 md:py-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px]",
                  isActive ? "text-primary" : "text-muted",
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "stroke-[2.2]")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
