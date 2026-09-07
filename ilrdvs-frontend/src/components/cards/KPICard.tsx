import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "../../lib/cn";
import { formatNumber } from "../../utils/format";

export function KPICard({
  label,
  value,
  changePct,
  trend,
  context,
  icon,
  tone = "brand",
}: {
  label: string;
  value: number;
  changePct: number;
  trend: "up" | "down";
  context: string;
  icon: ReactNode;
  tone?: "brand" | "success" | "warning" | "danger";
}) {
  const toneClasses = {
    brand: "bg-brand-50 text-brand-700",
    success: "bg-success-50 text-success-600",
    warning: "bg-warning-50 text-warning-600",
    danger: "bg-danger-50 text-danger-600",
  }[tone];

  const trendGood = (trend === "up" && tone !== "danger") || (trend === "down" && tone === "danger");

  return (
    <div className="bg-white rounded-lg border border-slate-200/80 p-4 flex flex-col gap-3 min-w-0">
      <div className="flex items-start justify-between">
        <span className={cn("h-8 w-8 rounded-md flex items-center justify-center", toneClasses)}>{icon}</span>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-xs font-medium",
            trendGood ? "text-success-600" : "text-danger-500"
          )}
        >
          {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {changePct}%
        </span>
      </div>
      <div>
        <p className="text-2xl font-semibold text-navy-900 tabular-nums">{formatNumber(value)}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
      <p className="text-[11px] text-slate-400 border-t border-slate-100 pt-2">{context}</p>
    </div>
  );
}
