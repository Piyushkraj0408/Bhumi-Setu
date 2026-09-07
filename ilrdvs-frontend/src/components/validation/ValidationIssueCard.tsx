import { useState } from "react";
import { AlertTriangle, XCircle, Check, Edit3, X } from "lucide-react";
import type { ValidationIssue } from "../../types";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

export function ValidationIssueCard({
  issue,
  onAction,
}: {
  issue: ValidationIssue;
  onAction: (action: "accept" | "correct" | "reject") => void;
}) {
  const [selected, setSelected] = useState(issue.officerAction ?? null);
  const isFailed = issue.severity === "failed";

  function act(action: "accept" | "correct" | "reject") {
    setSelected(action);
    onAction(action);
  }

  return (
    <div className={`rounded-lg border p-4 ${isFailed ? "border-red-200 bg-danger-50/40" : "border-amber-200 bg-warning-50/40"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {isFailed ? <XCircle className="h-4 w-4 text-danger-500" /> : <AlertTriangle className="h-4 w-4 text-warning-600" />}
          <span className="text-sm font-semibold text-navy-900">{issue.type}</span>
          <Badge tone={isFailed ? "danger" : "warning"}>{isFailed ? "Failed" : "Warning"}</Badge>
        </div>
        <span className="text-xs text-slate-400">{issue.documentId}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-sm">
        <div>
          <p className="text-xs text-slate-500">Field</p>
          <p className="text-navy-800 font-medium">{issue.field}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Reason</p>
          <p className="text-navy-800">{issue.reason}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Extracted</p>
          <p className="text-navy-800 font-medium">{issue.extractedValue}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Database / Reference</p>
          <p className="text-navy-800 font-medium">{issue.referenceValue}</p>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-3 italic">Recommended: {issue.recommendedAction}</p>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-black/5">
        <span className="text-xs text-slate-500 mr-1">Officer Action:</span>
        <Button
          size="sm"
          variant={selected === "accept" ? "success" : "outline"}
          icon={<Check className="h-3.5 w-3.5" />}
          onClick={() => act("accept")}
        >
          Accept
        </Button>
        <Button
          size="sm"
          variant={selected === "correct" ? "primary" : "outline"}
          icon={<Edit3 className="h-3.5 w-3.5" />}
          onClick={() => act("correct")}
        >
          Correct
        </Button>
        <Button
          size="sm"
          variant={selected === "reject" ? "danger" : "outline"}
          icon={<X className="h-3.5 w-3.5" />}
          onClick={() => act("reject")}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
