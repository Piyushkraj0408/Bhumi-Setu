import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, XCircle, AlertTriangle, FileWarning, Copy, RotateCw } from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { ValidationIssueCard } from "../../components/validation/ValidationIssueCard";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { getValidationIssues, submitOfficerAction, rerunValidation } from "../../services/validation.service";
import type { ValidationIssue } from "../../types";
import { useToast } from "../../components/ui/Toast";
import { VALIDATION_ISSUES } from "../../data/mockData";

export function ValidationResultsPage() {
  const { id } = useParams();
  const [issues, setIssues] = useState<ValidationIssue[] | null>(null);
  const [rerunning, setRerunning] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    setIssues(null);
    getValidationIssues(id).then((res) => setIssues(res.length ? res : VALIDATION_ISSUES));
  }, [id]);

  async function handleAction(issueId: string, action: "accept" | "correct" | "reject") {
    await submitOfficerAction(issueId, action);
    setIssues((prev) => prev?.map((i) => (i.id === issueId ? { ...i, officerAction: action } : i)) ?? null);
    push("success", `Issue marked as "${action}".`);
  }

  async function handleRerun() {
    setRerunning(true);
    await rerunValidation(id ?? "");
    setRerunning(false);
    push("success", "Validation re-run completed.");
  }

  const failed = issues?.filter((i) => i.severity === "failed").length ?? 0;
  const warnings = issues?.filter((i) => i.severity === "warning").length ?? 0;
  const passed = 1243 - (issues?.length ?? 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-navy-900">Validation Results</h1>
          <p className="text-sm text-slate-500 mt-0.5">{id ? `Document: ${id}` : "Business-rule validation across recent documents."}</p>
        </div>
        <Button variant="outline" size="sm" loading={rerunning} icon={<RotateCw className="h-3.5 w-3.5" />} onClick={handleRerun}>
          Re-run Validation
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryTile icon={<CheckCircle2 className="h-4 w-4" />} label="Passed" value={passed} tone="success" />
        <SummaryTile icon={<XCircle className="h-4 w-4" />} label="Failed" value={failed} tone="danger" />
        <SummaryTile icon={<AlertTriangle className="h-4 w-4" />} label="Warnings" value={warnings} tone="warning" />
        <SummaryTile icon={<FileWarning className="h-4 w-4" />} label="Missing Fields" value={issues?.filter((i) => i.type === "Missing Field").length ?? 0} tone="neutral" />
        <SummaryTile icon={<Copy className="h-4 w-4" />} label="Conflicts" value={issues?.filter((i) => i.type.includes("Conflict")).length ?? 0} tone="brand" />
      </div>

      <Card>
        <CardHeader title="Validation Issues" subtitle="Review each issue and record an officer decision" />
        <CardBody className="space-y-3">
          {issues === null ? (
            <p className="text-sm text-slate-400 text-center py-8">Loading validation results…</p>
          ) : issues.length === 0 ? (
            <EmptyState title="No validation issues found" description="This document passed all business-rule and reference checks." />
          ) : (
            issues.map((issue) => (
              <ValidationIssueCard key={issue.id} issue={issue} onAction={(a) => handleAction(issue.id, a)} />
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function SummaryTile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "success" | "danger" | "warning" | "neutral" | "brand" }) {
  const toneClasses = {
    success: "bg-success-50 text-success-600",
    danger: "bg-danger-50 text-danger-500",
    warning: "bg-warning-50 text-warning-600",
    neutral: "bg-slate-100 text-slate-500",
    brand: "bg-brand-50 text-brand-700",
  }[tone];
  return (
    <div className="bg-white rounded-lg border border-slate-200/80 p-4 flex items-center gap-3">
      <span className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${toneClasses}`}>{icon}</span>
      <div>
        <p className="text-lg font-semibold text-navy-900 leading-tight">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}
