import { ShieldCheck } from "lucide-react";
import { DISCLAIMER } from "@/lib/constants";

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return <p className="text-[11px] leading-relaxed text-muted">{DISCLAIMER}</p>;
  }
  return (
    <div className="flex gap-2.5 rounded-2xl border border-line bg-white/60 p-4 text-xs leading-relaxed text-muted">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p>{DISCLAIMER}</p>
    </div>
  );
}
