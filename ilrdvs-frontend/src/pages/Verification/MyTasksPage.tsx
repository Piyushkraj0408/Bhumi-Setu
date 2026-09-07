import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ConfidenceBadge } from "../../components/ui/Confidence";
import { Pagination } from "../../components/ui/Pagination";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { listVerificationTasks } from "../../services/verification.service";
import type { VerificationTask } from "../../types";
import { cn } from "../../lib/cn";
import { ClipboardCheck } from "lucide-react";
import { useAuth } from "../../lib/AuthContext";

const PRIORITY_TONE = { High: "danger", Medium: "warning", Low: "neutral" } as const;

export function MyTasksPage() {
  const [tasks, setTasks] = useState<VerificationTask[] | null>(null);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const pageSize = 8;

  useEffect(() => {
    setTasks(null);
    // Fetch all tasks then filter to those assigned to current user
    listVerificationTasks({ assignedToMe: true }).then((all) => {
      // If no tasks have assignedTo matching current user, show the ones
      // that are assigned (not unassigned) as "my tasks"
      const mine = all.filter(
        (t) =>
          t.assignedTo !== null ||
          (currentUser && t.assignedTo === currentUser.name)
      );
      setTasks(mine);
    });
  }, [currentUser]);

  const paged = tasks?.slice((page - 1) * pageSize, page * pageSize) ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-navy-900">My Tasks</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Verification tasks currently assigned to you for review.
        </p>
      </div>

      <Card>
        {tasks === null ? (
          <TableSkeleton rows={8} cols={9} />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="h-5 w-5" />}
            title="No tasks assigned to you"
            description="You have no pending verification tasks. Check the queue for new assignments."
            action={<Button size="sm" onClick={() => navigate("/verification")}>View Queue</Button>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Document ID</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Confidence</th>
                    <th className="px-4 py-3 font-medium">Issues</th>
                    <th className="px-4 py-3 font-medium">Age</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paged.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3"><Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge></td>
                      <td className="px-4 py-3 font-medium text-brand-700 whitespace-nowrap font-ids">{t.documentId}</td>
                      <td className="px-4 py-3 text-navy-800 whitespace-nowrap">{t.owner}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{t.location.village}, {t.location.district}</td>
                      <td className="px-4 py-3"><ConfidenceBadge value={t.confidence} /></td>
                      <td className="px-4 py-3 text-slate-600">{t.validationIssueCount || "—"}</td>
                      <td className={cn("px-4 py-3 whitespace-nowrap", t.flags.includes("overdue") ? "text-danger-500 font-medium" : "text-slate-500")}>
                        {t.ageHours}h {t.flags.includes("overdue") && "· Overdue"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={t.status === "in_review" ? "info" : t.status === "assigned" ? "brand" : "neutral"}>
                          {t.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/verification/${t.id}`)}>
                          Open
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
