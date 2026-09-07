import { CheckCircle2 } from "lucide-react";
import type { ExtractedField } from "../../types";
import { ConfidenceBadge } from "../ui/Confidence";
import { cn } from "../../lib/cn";

export function FieldCard({
  field,
  active,
  onClick,
}: {
  field: ExtractedField;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-md border px-3.5 py-3 transition-colors",
        active ? "survey-mark border-brand-400 bg-brand-50" : "border-slate-200 bg-white hover:bg-slate-50",
        field.confidence < 70 && "border-l-4 border-l-danger-500"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">{field.label}</span>
        <ConfidenceBadge value={field.confidence} kind="Field Confidence" />
      </div>
      <p className={cn("text-sm font-semibold text-navy-900 mt-1", /number/i.test(field.label) && "font-ids")}>{field.value}</p>
      <div className="flex items-center gap-1.5 mt-1.5">
        {field.validationStatus === "passed" ? (
          <span className="flex items-center gap-1 text-[11px] text-success-600 font-medium">
            <CheckCircle2 className="h-3 w-3" /> Validated
          </span>
        ) : field.validationStatus === "warning" ? (
          <span className="text-[11px] text-warning-600 font-medium">Needs review</span>
        ) : (
          <span className="text-[11px] text-danger-500 font-medium">Validation failed</span>
        )}
        <span className="text-[11px] text-slate-300">·</span>
        <span className="text-[11px] text-slate-400">Source: {field.source}</span>
      </div>
    </button>
  );
}
