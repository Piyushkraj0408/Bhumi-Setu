import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "../../lib/cn";
import { confidenceLevel } from "../../utils/format";
import { Tooltip } from "./Tooltip";

const LEVEL_STYLES = {
  high: { text: "text-success-600", bg: "bg-success-500", chipBg: "bg-success-50", border: "border-green-200", label: "High Confidence", icon: CheckCircle2 },
  medium: { text: "text-warning-600", bg: "bg-warning-500", chipBg: "bg-warning-50", border: "border-amber-200", label: "Medium Confidence", icon: AlertTriangle },
  low: { text: "text-danger-600", bg: "bg-danger-500", chipBg: "bg-danger-50", border: "border-red-200", label: "Low Confidence", icon: XCircle },
} as const;

const TOOLTIP_COPY: Record<keyof typeof LEVEL_STYLES, string> = {
  high: "90–100%. The model is highly confident this value was read and extracted correctly.",
  medium: "70–89%. Reasonably confident, but worth a quick visual check against the original.",
  low: "Below 70%. Confidence is low — verify this value against the original document before approval.",
};

/** Compact pill: icon + label + percentage. Use in tables and field lists. */
export function ConfidenceBadge({ value, kind }: { value: number; kind?: string }) {
  const level = confidenceLevel(value);
  const s = LEVEL_STYLES[level];
  const Icon = s.icon;
  return (
    <Tooltip content={`${kind ? kind + " — " : ""}${TOOLTIP_COPY[level]}`}>
      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", s.chipBg, s.text, s.border)}>
        <Icon className="h-3 w-3" />
        {value}%
      </span>
    </Tooltip>
  );
}

/** Full bar with label, percentage, and progress track. Use in field cards / detail panels. */
export function ConfidenceBar({ value, label, kind }: { value: number; label?: string; kind?: string }) {
  const level = confidenceLevel(value);
  const s = LEVEL_STYLES[level];
  const Icon = s.icon;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        {label && <span className="text-xs text-slate-500">{label}</span>}
        <Tooltip content={`${kind ? kind + " — " : ""}${TOOLTIP_COPY[level]}`}>
          <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", s.text)}>
            <Icon className="h-3.5 w-3.5" />
            {value}% · {s.label}
          </span>
        </Tooltip>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", s.bg)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/** Radial/ring confidence display for a document or record's overall score. */
export function ConfidenceRing({ value, size = 96, label = "Overall" }: { value: number; size?: number; label?: string }) {
  const level = confidenceLevel(value);
  const s = LEVEL_STYLES[level];
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const colorVar =
    level === "high" ? "var(--color-success-500)" : level === "medium" ? "var(--color-warning-500)" : "var(--color-danger-500)";

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e9e4d5" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colorVar}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
        <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="rotate-90 origin-center" fill="#1b342c" fontSize="20" fontWeight="700">
          {value}%
        </text>
      </svg>
      <span className={cn("text-xs font-medium mt-1", s.text)}>{label}</span>
    </div>
  );
}
