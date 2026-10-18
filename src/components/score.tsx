import type { DimensionScore } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONES = {
  good: "#1f6f5c",
  fair: "#c0863c",
  poor: "#b42318",
} as const;

export function ScoreRing({ score, size = 112 }: { score: number; size?: number }) {
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const tone = score >= 80 ? TONES.good : score >= 60 ? TONES.fair : TONES.poor;
  const offset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(29,42,36,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums" style={{ color: tone }}>
          {score}
        </span>
        <span className="text-[11px] text-muted">综合分</span>
      </div>
    </div>
  );
}

export function ScoreBar({ dimension }: { dimension: DimensionScore }) {
  const tone = dimension.level === "good" ? "bg-primary" : dimension.level === "fair" ? "bg-accent" : "bg-danger";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-ink">{dimension.label}</span>
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            dimension.level === "good" ? "text-primary" : dimension.level === "fair" ? "text-accent" : "text-danger",
          )}
        >
          {dimension.score}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line/70">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${dimension.score}%` }} />
      </div>
    </div>
  );
}
