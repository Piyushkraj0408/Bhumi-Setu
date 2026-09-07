import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardHeader } from "../../components/ui/Card";
import { DocumentViewer } from "../../components/documents/DocumentViewer";
import { ConfidenceBadge } from "../../components/ui/Confidence";
import { getExtractedFields } from "../../services/extraction.service";
import type { ExtractedField } from "../../types";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { AlertTriangle } from "lucide-react";

export function OcrViewerPage() {
  const { id = "DOC-2024-1004" } = useParams();
  const [fields, setFields] = useState<ExtractedField[] | null>(null);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    setFields(null);
    getExtractedFields(id).then(setFields);
  }, [id]);

  const lowConfidenceCount = fields?.filter((f) => f.confidence < 70).length ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-navy-900">OCR / HTR Viewer</h1>
        <p className="text-sm text-slate-500 mt-0.5">Document: {id} — verify recognized text against the original scan.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="h-[600px] flex flex-col">
          <CardHeader title="Original Document" subtitle="Zoom, rotate, or navigate pages" />
          <div className="flex-1 p-4">
            <DocumentViewer
              pages={2}
              highlightRegion={active ? { x: 20, y: 25, w: 55, h: 8 } : null}
            />
          </div>
        </Card>

        <Card className="h-[600px] flex flex-col">
          <CardHeader
            title="OCR Output"
            subtitle={lowConfidenceCount > 0 ? `${lowConfidenceCount} low-confidence region(s) detected` : "All regions read with strong confidence"}
            action={
              lowConfidenceCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-warning-600 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" /> Review needed
                </span>
              )
            }
          />
          <div className="flex-1 overflow-y-auto p-2">
            {fields === null ? (
              <TableSkeleton rows={8} cols={2} />
            ) : (
              <div className="divide-y divide-slate-50">
                {fields.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActive(f.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${active === f.id ? "bg-brand-50" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{f.label}</span>
                      <ConfidenceBadge value={f.confidence} kind="OCR Confidence" />
                    </div>
                    <p className="text-sm font-medium text-navy-900 mt-0.5">{f.value}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
