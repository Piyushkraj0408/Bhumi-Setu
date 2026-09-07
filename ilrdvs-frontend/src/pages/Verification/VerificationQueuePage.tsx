import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ConfidenceBadge } from "../../components/ui/Confidence";
import { Pagination } from "../../components/ui/Pagination";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { listVerificationTasks } from "../../services/verification.service";
import type { VerificationFilters } from "../../services/verification.service";
import type { VerificationTask } from "../../types";
import { cn } from "../../lib/cn";
import { ClipboardList } from "lucide-react";

const FILTER_CHIPS: Array<{ key: keyof VerificationFilters; label: string; tKey: string }> = [
  { key: "onlyLowConfidence", label: "Low Confidence", tKey: "verification.lowConfidence" },
  { key: "onlyValidationFailed", label: "Validation Failed", tKey: "verification.validationFailed" },
  { key: "onlyDuplicate", label: "Duplicate", tKey: "common.duplicate" },
  { key: "onlyGisMismatch", label: "GIS Mismatch", tKey: "verification.gisMismatch" },
  { key: "assignedToMe", label: "Assigned to Me", tKey: "dashboard.assignedToMe" },
  { key: "onlyHighPriority", label: "High Priority", tKey: "dashboard.highPriority" },
  { key: "onlyOverdue", label: "Overdue", tKey: "dashboard.overdue" },
];

const PRIORITY_TONE = { High: "danger", Medium: "warning", Low: "neutral" } as const;

export function VerificationQueuePage() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<VerificationTask[] | null>(null);
  const [filters, setFilters] = useState<VerificationFilters>({});
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const pageSize = 8;

  useEffect(() => {
    setTasks(null);
    listVerificationTasks(filters).then(setTasks);
  }, [filters]);

  function toggleFilter(key: keyof VerificationFilters) {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: !f[key] }));
  }

  const paged = tasks?.slice((page - 1) * pageSize, page * pageSize) ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-navy-900">{t("verification.title", "Human Verification Queue")}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {t("verification.subtitle", "Prioritized queue of documents requiring officer review — low-confidence and conflicting records surface first.")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.key}
            onClick={() => toggleFilter(chip.key)}
            className={cn(
              "text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
              filters[chip.key] ? "bg-brand-600 border-brand-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            {t(chip.tKey, chip.label)}
          </button>
        ))}
      </div>

      <Card>
        {tasks === null ? (
          <TableSkeleton rows={8} cols={9} />
        ) : tasks.length === 0 ? (
          <EmptyState icon={<ClipboardList className="h-5 w-5" />} title={t("verification.noTasks", "No records require verification")} description={t("verification.allReviewed", "Every document matching these filters has been reviewed.")} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                    <th className="px-4 py-3 font-medium">{t("table.priority", "Priority")}</th>
                    <th className="px-4 py-3 font-medium">{t("table.documentId", "Document ID")}</th>
                    <th className="px-4 py-3 font-medium">{t("table.owner", "Owner")}</th>
                    <th className="px-4 py-3 font-medium">{t("table.location", "Location")}</th>
                    <th className="px-4 py-3 font-medium">{t("table.confidence", "Confidence")}</th>
                    <th className="px-4 py-3 font-medium">{t("table.validationIssues", "Validation Issues")}</th>
                    <th className="px-4 py-3 font-medium">{t("table.assignedTo", "Assigned To")}</th>
                    <th className="px-4 py-3 font-medium">{t("table.age", "Age")}</th>
                    <th className="px-4 py-3 font-medium">{t("table.status", "Status")}</th>
                    <th className="px-4 py-3 font-medium text-right">{t("table.action", "Action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paged.map((tItem) => (
                    <tr key={tItem.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3"><Badge tone={PRIORITY_TONE[tItem.priority]}>{t(`priority.${tItem.priority.toLowerCase()}`, tItem.priority)}</Badge></td>
                      <td className="px-4 py-3 font-medium text-brand-700 whitespace-nowrap font-ids">{tItem.documentId}</td>
                      <td className="px-4 py-3 text-navy-800 whitespace-nowrap">{tItem.owner}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{tItem.location.village}, {tItem.location.district}</td>
                      <td className="px-4 py-3"><ConfidenceBadge value={tItem.confidence} /></td>
                      <td className="px-4 py-3 text-slate-600">{tItem.validationIssueCount || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{tItem.assignedTo ?? <span className="text-slate-400">{t("verification.unassigned", "Unassigned")}</span>}</td>
                      <td className={cn("px-4 py-3 whitespace-nowrap", tItem.flags.includes("overdue") ? "text-danger-500 font-medium" : "text-slate-500")}>
                        {tItem.ageHours}h {tItem.flags.includes("overdue") && `· ${t("dashboard.overdue", "Overdue")}`}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={tItem.status === "in_review" ? "info" : tItem.status === "assigned" ? "brand" : "neutral"}>
                          {t(`status.${tItem.status}`, tItem.status.replace("_", " "))}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/verification/${tItem.id}`)}>
                          {t("common.open", "Open")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={pageSize} total={tasks.length} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
