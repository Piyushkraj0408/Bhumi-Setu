import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  success: "bg-success-50 text-success-600 border-green-200",
  warning: "bg-warning-50 text-warning-600 border-amber-200",
  danger: "bg-danger-50 text-danger-600 border-red-200",
  info: "bg-info-50 text-info-500 border-blue-200",
  brand: "bg-brand-50 text-brand-700 border-brand-200",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
