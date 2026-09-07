import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { listDocuments } from "../../services/document.service";
import type { LandDocument } from "../../types";
import { Cpu, CheckCircle2, Loader2, XCircle, AlertCircle, UploadCloud } from "lucide-react";

const STATUS_META: Record<
  LandDocument["processingStatus"],
  { label: string; tone: "neutral" | "info" | "success" | "danger" | "warning" }
> = {
  uploaded:   { label: "Uploaded",   tone: "info" },
  processing: { label: "Processing", tone: "warning" },
  completed:  { label: "Completed",  tone: "success" },
  failed:     { label: "Failed",     tone: "danger" },
};

const StatusIcon = ({ status }: { status: LandDocument["processingStatus"] }) => {
  if (status === "completed")  return <CheckCircle2 className="h-4 w-4 text-success-500" />;
  if (status === "processing") return <Loader2 className="h-4 w-4 text-warning-500 animate-spin" />;
  if (status === "failed")     return <XCircle className="h-4 w-4 text-danger-500" />;
  return <AlertCircle className="h-4 w-4 text-brand-400" />;
};

export function ProcessingLandingPage() {
  const [items, setItems] = useState<LandDocument[] | null>(null);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const navigate = useNavigate();
  const pageSize = 8;

  useEffect(() => {
    setItems(null);
    listDocuments({ page, pageSize }).then((res) => {
      setItems(res.items);
      setTotal(res.total);
    });
  }, [page]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-navy-900">Document Processing</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Select a document below to view its processing pipeline status.
          </p>
        </div>
        <Button
          icon={<UploadCloud className="h-3.5 w-3.5" />}
          onClick={() => navigate("/documents/upload")}
        >
          Upload Document
        </Button>
      </div>

      <Card>
        {items === null ? (
          <TableSkeleton rows={8} cols={6} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Cpu className="h-5 w-5" />}
            title="No documents uploaded yet"
            description="Upload a document to begin processing."
            action={<Button size="sm" onClick={() => navigate("/documents/upload")}>Upload Now</Button>}
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
                    <th className="px-4 py-3 font-medium">Upload Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((doc) => {
                    const m = STATUS_META[doc.processingStatus];
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-medium text-brand-700 whitespace-nowrap font-mono text-xs">
                          {doc.id}
                        </td>
                        <td className="px-4 py-3 text-navy-800 max-w-[220px] truncate">
                          {doc.fileName}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{doc.documentType}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(doc.uploadDate).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5">
                            <StatusIcon status={doc.processingStatus} />
                            <Badge tone={m.tone}>{m.label}</Badge>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/documents/processing/${doc.id}`)}
                          >
                            View Pipeline
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
