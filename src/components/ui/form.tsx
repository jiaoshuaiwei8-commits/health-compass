import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-ink">{label}</span>
        {hint ? <span className="text-[11px] text-muted">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

const controlClass =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClass, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClass, "appearance-none pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function CheckPill({
  name,
  value,
  label,
  defaultChecked,
  className,
}: {
  name: string;
  value?: string;
  label: string;
  defaultChecked?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("group cursor-pointer select-none", className)}>
      <input
        type="checkbox"
        name={name}
        value={value ?? "on"}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="inline-flex min-h-9 items-center rounded-full border border-line bg-white px-3.5 py-1.5 text-sm text-muted transition peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:font-medium peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30">
        {label}
      </span>
    </label>
  );
}

export function RadioPills({
  name,
  options,
  defaultValue,
  required,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <label key={option.value} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={option.value}
            defaultChecked={defaultValue === option.value}
            required={required}
            className="peer sr-only"
          />
          <span className="inline-flex min-h-10 items-center rounded-xl border border-line bg-white px-3.5 py-1.5 text-sm text-muted transition peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:font-medium peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export function Rating({
  name,
  labels,
  defaultValue,
}: {
  name: string;
  labels: [string, string, string, string, string];
  defaultValue?: number | null;
}) {
  return (
    <div>
      <div className="flex gap-1.5">
        {labels.map((label, index) => {
          const value = index + 1;
          return (
            <label key={value} className="flex-1 cursor-pointer">
              <input
                type="radio"
                name={name}
                value={value}
                defaultChecked={defaultValue === value}
                className="peer sr-only"
              />
              <span className="flex h-10 items-center justify-center rounded-xl border border-line bg-white text-sm text-muted transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30">
                {value}
              </span>
            </label>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{labels[0]}</span>
        <span>{labels[2]}</span>
        <span>{labels[4]}</span>
      </div>
    </div>
  );
}

export function Progress({ value, tone = "primary" }: { value: number; tone?: "primary" | "accent" | "danger" }) {
  const colors = {
    primary: "bg-primary",
    accent: "bg-accent",
    danger: "bg-danger",
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-line/70">
      <div
        className={cn("h-full rounded-full transition-all", colors[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "accent" | "warn" | "danger";
  className?: string;
}) {
  const tones = {
    neutral: "bg-canvas text-muted",
    primary: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-accent",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
