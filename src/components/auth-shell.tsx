import Link from "next/link";
import { Compass } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { Disclaimer } from "@/components/disclaimer";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
          <Compass className="h-5 w-5" />
        </span>
        <span className="text-base font-semibold">{APP_NAME}</span>
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
      <div className="mt-6 w-full max-w-sm">
        <Disclaimer compact />
      </div>
    </div>
  );
}
