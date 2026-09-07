import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { ProcessingTimeline } from "../../components/documents/ProcessingTimeline";
import { DocumentViewer } from "../../components/documents/DocumentViewer";
import { Button } from "../../components/ui/Button";
import { getDocumentById } from "../../services/document.service";
import type { LandDocument } from "../../types";
import { CheckCircle2, Loader2, XCircle, Circle, ScanText } from "lucide-react";
import { cn } from "../../lib/cn";
import { formatDateTime } from "../../utils/format";

export function ProcessingStatusPage() {
  const { id = "DOC-2024-1004" } = useParams();
  const [doc, setDoc] = useState<LandDocument | null | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    setDoc(undefined);
    getDocumentById(id).then((d) => setDoc(d ?? null));
  }, [id]);

  if (doc === undefined) return <div className="text-sm text-slate-400 p-10 text-center">Loading processing pipeline…</div>;
  if (!doc) return <div className="text-sm text-slate-400 p-10 text-center">Document not found.</div>;

  const activeStage = doc.stages.find((s) => s.status === "active");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-navy-900">Document Processing Pipeline</h1>
          <p className="text-sm text-slate-500 mt-0.5">Document ID: {doc.id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/documents/${doc.id}/ocr`)} icon={<ScanText className="h-3.5 w-3.5" />}>
            View OCR Output
          </Button>
        </div>
      </div>

      <Card>
        <CardBody>
          <ProcessingTimeline stages={doc.stages} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="h-[480px] flex flex-col">
          <CardHeader title="Document Preview" subtitle={doc.fileName} />
          <div className="flex-1 p-4">
            <DocumentViewer pages={doc.pages} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Processing Details"
            subtitle={activeStage ? `Current stage: ${activeStage.label}` : "All stages complete"}
          />
          <CardBody>
            <ProcessingTimeline stages={doc.stages} orientation="vertical" />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Stage Log" />
        <div className="divide-y divide-slate-50">
          {doc.stages.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <StageIcon status={s.status} />
              <span className={cn("flex-1", s.status === "pending" ? "text-slate-400" : "text-navy-800 font-medium")}>{s.label}</span>
              <span className="text-xs text-slate-400 w-40">{s.startedAt ? formatDateTime(s.startedAt) : "—"}</span>
              <span className="text-xs text-slate-400 w-24">{s.durationSeconds ? `${s.durationSeconds}s` : "—"}</span>
              {s.error && <span className="text-xs text-danger-500">{s.error}</span>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StageIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-success-500 shrink-0" />;
  if (status === "active") return <Loader2 className="h-4 w-4 text-brand-500 animate-spin shrink-0" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-danger-500 shrink-0" />;
  return <Circle className="h-4 w-4 text-slate-300 shrink-0" />;
}
