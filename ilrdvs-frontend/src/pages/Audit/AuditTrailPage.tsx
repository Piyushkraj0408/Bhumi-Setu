import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { listAuditLog } from "../../services/audit.service";
import type { AuditEntry } from "../../types";
import { formatDateTime } from "../../utils/format";
import { TableSkeleton } from "../../components/ui/Skeleton";

export function AuditTrailPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listAuditLog().then(setEntries);
  }, []);

  const filtered = entries?.filter(
    (e) =>
      !search ||
      e.action.toLowerCase().includes(search.toLowerCase()) ||
      e.user.toLowerCase().includes(search.toLowerCase()) ||
      e.documentId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-navy-900">Audit Trail</h1>
        <p className="text-sm text-slate-500 mt-0.5">A complete, timestamped record of every processing, validation and verification action.</p>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100">
          <Input icon={<Search className="h-3.5 w-3.5" />} placeholder="Search by user, action, or document ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {filtered === undefined || entries === null ? (
          <TableSkeleton rows={10} cols={5} />
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered!.map((e) => (
              <div key={e.id} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 px-5 py-3.5">
                <span className="text-xs text-slate-400 font-ids sm:w-40 shrink-0">{formatDateTime(e.timestamp)}</span>
                <span className="text-sm text-navy-800 flex-1">{e.action}</span>
                {e.previousValue && (
                  <span className="text-xs text-slate-500">
                    <span className="line-through text-slate-400">{e.previousValue}</span> → <span className="text-navy-800 font-medium">{e.newValue}</span>
                  </span>
                )}
                {e.documentId && <span className="text-xs text-brand-700 font-ids sm:w-32 shrink-0">{e.documentId}</span>}
                <span className="text-xs text-slate-500 sm:w-32 shrink-0 text-right">{e.user}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
