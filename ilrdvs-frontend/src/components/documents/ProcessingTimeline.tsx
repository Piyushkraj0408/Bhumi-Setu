import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import type { ProcessingStage } from "../../types";
import { cn } from "../../lib/cn";

export function ProcessingTimeline({ stages, orientation = "horizontal" }: { stages: ProcessingStage[]; orientation?: "horizontal" | "vertical" }) {
  if (orientation === "vertical") {
    return (
      <div className="flex flex-col">
        {stages.map((stage, i) => (
          <div key={stage.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <StageIcon status={stage.status} />
              {i < stages.length - 1 && (
                <span className={cn("w-px flex-1 my-1", stage.status === "completed" ? "bg-success-500" : "bg-slate-200")} />
              )}
            </div>
            <div className="pb-6 -mt-0.5">
              <p className={cn("text-sm font-medium", stage.status === "pending" ? "text-slate-400" : "text-navy-900")}>{stage.label}</p>
              {stage.status === "completed" && (
                <p className="text-xs text-slate-400 mt-0.5">Completed in {stage.durationSeconds}s</p>
              )}
              {stage.status === "active" && <p className="text-xs text-brand-600 mt-0.5">In progress…</p>}
              {stage.status === "failed" && <p className="text-xs text-danger-500 mt-0.5">{stage.error}</p>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-start overflow-x-auto pb-2">
      {stages.map((stage, i) => (
        <div key={stage.id} className="flex items-center shrink-0">
          <div className="flex flex-col items-center w-24 text-center">
            <StageIcon status={stage.status} />
            <p className={cn("text-[11px] mt-1.5 leading-tight", stage.status === "pending" ? "text-slate-400" : "text-navy-800 font-medium")}>
              {stage.label}
            </p>
          </div>
          {i < stages.length - 1 && (
            <span className={cn("h-px w-8 -mt-4", stage.status === "completed" ? "bg-success-500" : "bg-slate-200")} />
          )}
        </div>
      ))}
    </div>
  );
}

function StageIcon({ status }: { status: ProcessingStage["status"] }) {
  if (status === "completed") return <CheckCircle2 className="h-6 w-6 text-success-500" />;
  if (status === "active") return <Loader2 className="h-6 w-6 text-brand-500 animate-spin" />;
  if (status === "failed") return <XCircle className="h-6 w-6 text-danger-500" />;
  return <Circle className="h-6 w-6 text-slate-300" />;
}
