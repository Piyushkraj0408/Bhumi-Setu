import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ConfidenceBadge } from "../../components/ui/Confidence";
import { Pagination } from "../../components/ui/Pagination";
import { EmptyState } from "../../components/ui/EmptyState";
import {
  getCompletedRecords,
  clearCompletedRecords,
  type CompletedRecord,
} from "../../services/completedRecords.store";
import { CheckCircle2, Trash2, ExternalLink, Copy, Check, Search } from "lucide-react";


const DECISION_TONE = {
  Approved: "success",
  Rejected: "danger",
  "Review Requested": "warning",
} as const;

const SOURCE_LABEL: Record<CompletedRecord["source"], string> = {
  extraction: "AI Extraction",
  verification: "Human Verification",
};

export function CompletedVerificationsPage() {
  const [records, setRecords] = useState<CompletedRecord[]>([]);
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const navigate = useNavigate();
  const pageSize = 8;

  const load = () => setRecords(getCompletedRecords());

  useEffect(() => {
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);

  const paged = records.slice((page - 1) * pageSize, page * pageSize);

  const handleClearAll = () => {
    if (window.confirm("Clear all completed verifications history?")) {
      clearCompletedRecords();
      setRecords([]);
      setPage(1);
    }
  };

  function copyRecordNumber(num: string) {
    navigator.clipboard.writeText(num).catch(() => {});
    setCopiedId(num);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-navy-900">Completed Verifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            History of all approved, rejected, and reviewed documents — updated in real time.
          </p>
        </div>
        {records.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            icon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={handleClearAll}
          >
            Clear History
          </Button>
        )}
      </div>

      <Card>
        {records.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="No completed verifications yet"
            description='Approve or reject a document from "AI Extraction" or "Verification Queue" — it will appear here immediately.'
            action={
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate("/ai/extraction")}>
                  Go to Extraction
                </Button>
                <Button size="sm" onClick={() => navigate("/verification")}>
                  Go to Queue
                </Button>
              </div>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                    <th className="px-4 py-3 font-medium">Document ID</th>
                    <th className="px-4 py-3 font-medium">File Name</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Confidence</th>
                    <th className="px-4 py-3 font-medium">Decision</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    {/* ── NEW: Record Number column ── */}
                    <th className="px-4 py-3 font-medium text-brand-700">Record No.</th>
                    <th className="px-4 py-3 font-medium">Completed At</th>
                    <th className="px-4 py-3 font-medium">Officer</th>
                    <th className="px-4 py-3 font-medium text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paged.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-brand-700 whitespace-nowrap max-w-[160px] truncate">
                        {r.documentId}
                      </td>
                      <td className="px-4 py-3 text-navy-800 max-w-[180px] truncate" title={r.fileName}>
                        {r.fileName}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.documentType}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {r.location.village || r.location.district
                          ? `${r.location.village || "—"}, ${r.location.district || "—"}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ConfidenceBadge value={r.confidence} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={DECISION_TONE[r.decision]}>{r.decision}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                        {SOURCE_LABEL[r.source]}
                      </td>
                      {/* ── Record Number cell ── */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.recordNumber ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                              {r.recordNumber}
                            </span>
                            <button
                              title="Copy record number"
                              onClick={() => copyRecordNumber(r.recordNumber!)}
                              className="text-slate-400 hover:text-brand-600 transition-colors"
                            >
                              {copiedId === r.recordNumber
                                ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                                : <Copy className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              title="Public lookup"
                              onClick={() => navigate("/public/search")}
                              className="text-slate-400 hover:text-brand-600 transition-colors"
                            >
                              <Search className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                        {new Date(r.completedAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">{r.officer}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          title="Open extraction view"
                          onClick={() => navigate(`/documents/${r.documentId}/extraction`)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 rounded transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={pageSize} total={records.length} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
