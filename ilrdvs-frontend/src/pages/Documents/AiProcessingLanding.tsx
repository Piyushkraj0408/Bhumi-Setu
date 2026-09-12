import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ConfidenceBadge } from "../../components/ui/Confidence";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { listDocuments } from "../../services/document.service";
import type { LandDocument } from "../../types";
import { ScanText, Sparkles, ShieldCheck, ArrowRight, UploadCloud } from "lucide-react";

type Step = "ocr" | "extraction" | "validation";

interface StepConfig {
  label: string;
  description: string;
  icon: React.ReactNode;
  actionLabel: string;
  route: (id: string) => string;
  filterStatus?: LandDocument["processingStatus"];
}

const STEP_CONFIG: Record<Step, StepConfig> = {
  ocr: {
    label: "OCR / HTR Viewer",
    description: "Select a document to view and edit the handwriting and OCR recognition results.",
    icon: <ScanText className="h-5 w-5" />,
    actionLabel: "Open OCR View",
    route: (id) => `/documents/${id}/ocr`,
  },
  extraction: {
    label: "AI Extraction Viewer",
    description: "Select a document to review structured fields extracted by NLP from the scanned record.",
    icon: <Sparkles className="h-5 w-5" />,
    actionLabel: "Open Extraction",
    route: (id) => `/documents/${id}/extraction`,
  },
  validation: {
    label: "Validation Results",
    description: "Select a document to inspect automated validation checks and resolve conflicts.",
    icon: <ShieldCheck className="h-5 w-5" />,
    actionLabel: "Open Validation",
    route: (id) => `/documents/${id}/validation`,
  },
};

interface AiProcessingLandingProps {
  step: Step;
}

export function AiProcessingLanding({ step }: AiProcessingLandingProps) {
  const cfg = STEP_CONFIG[step];
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
          <h1 className="text-xl font-semibold text-navy-900">{cfg.label}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{cfg.description}</p>
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
            icon={cfg.icon}
            title="No documents uploaded yet"
            description="Upload a land record document first to use this feature."
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
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Confidence</th>
                    <th className="px-4 py-3 font-medium">Processing</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-medium text-brand-700 whitespace-nowrap font-mono text-xs">
                        {doc.id}
                      </td>
                      <td className="px-4 py-3 text-navy-800 max-w-[200px] truncate">
                        {doc.fileName}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {doc.documentType}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {doc.location.village || "—"}, {doc.location.district || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ConfidenceBadge value={doc.confidence} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={
                            doc.processingStatus === "completed"
                              ? "success"
                              : doc.processingStatus === "failed"
                              ? "danger"
                              : doc.processingStatus === "processing"
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {doc.processingStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<ArrowRight className="h-3.5 w-3.5" />}
                          onClick={() => navigate(cfg.route(doc.id))}
                        >
                          {cfg.actionLabel}
                        </Button>
                      </td>
                    </tr>
                  ))}
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
