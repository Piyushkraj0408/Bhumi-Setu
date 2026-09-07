import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader } from "../../components/ui/Card";
import { DocumentViewer } from "../../components/documents/DocumentViewer";
import { FieldCard } from "../../components/documents/FieldCard";
import { Button } from "../../components/ui/Button";
import { Tabs } from "../../components/ui/Tabs";
import { ConfidenceRing } from "../../components/ui/Confidence";
import { getExtractedFields, approveExtraction } from "../../services/extraction.service";
import { getDocumentById } from "../../services/document.service";
import type { ExtractedField, LandDocument } from "../../types";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { Send, Sparkles } from "lucide-react";

export function ExtractionViewerPage() {
  const { id } = useParams();
  const [doc, setDoc] = useState<LandDocument | null>(null);
  const [fields, setFields] = useState<ExtractedField[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const { push } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    setFields(null);
    getDocumentById(id).then((d) => {
      setDoc(d || null);
      getExtractedFields(id, d).then(setFields);
    });
  }, [id]);

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center h-60 text-slate-400 gap-2">
        <p className="text-sm">No document selected. Please upload a document first.</p>
      </div>
    );
  }

  const overall = fields ? Math.round(fields.reduce((s, f) => s + f.confidence, 0) / fields.length) : 0;

  async function handleApprove() {
    setApproving(true);
    await approveExtraction(id || "");
    setApproving(false);
    push("success", "Extraction approved and sent for validation.");
    navigate(`/documents/${id}/validation`);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-navy-900">AI Extraction Viewer</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Document: {id} {doc?.fileName ? `(${doc.fileName})` : ""} — review structured fields extracted by NLP.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Send className="h-3.5 w-3.5" />}
            onClick={() => push("info", "Document sent for manual re-extraction.")}
          >
            Send for Manual Extraction
          </Button>
          <Button
            size="sm"
            variant="success"
            loading={approving}
            icon={<Sparkles className="h-3.5 w-3.5" />}
            onClick={handleApprove}
          >
            Approve &amp; Continue
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_320px] gap-5">
        <Card className="h-[620px] flex flex-col">
          <CardHeader title="Original Document" subtitle={doc?.fileName || "Uploaded File Preview"} />
          <div className="flex-1 p-4">
            <DocumentViewer
              documentId={id}
              fileUrl={doc?.previewUrl || doc?.fileUrl}
              docTitle={doc?.fileName}
              pages={doc?.pages || 1}
              highlightRegion={active ? { x: 15, y: 20, w: 60, h: 10 } : null}
            />
          </div>
        </Card>

        <Card className="h-[620px] flex flex-col">
          <CardHeader title="Document Preview" subtitle="OCR text with highlighted entities" />
          <div className="flex-1 overflow-y-auto p-4 text-sm leading-7 text-navy-800">
            {fields?.map((f) => (
              <span
                key={f.id}
                onClick={() => setActive(f.id)}
                className={`inline-block px-1.5 py-0.5 mr-1 mb-1 rounded cursor-pointer transition-colors ${
                  active === f.id
                    ? "bg-brand-200 text-brand-900 font-semibold"
                    : f.confidence < 70
                    ? "bg-danger-50 text-danger-700 underline decoration-danger-400 decoration-dashed"
                    : "bg-success-50 text-success-800"
                }`}
              >
                {f.label}: {f.value}
              </span>
            ))}
          </div>
        </Card>

        <Card className="h-[620px] flex flex-col">
          <CardHeader
            title="Land Record Information"
            action={fields && <ConfidenceRing value={overall} size={56} label="" />}
          />
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {fields === null ? (
              <TableSkeleton rows={8} cols={1} />
            ) : (
              fields.map((f) => (
                <FieldCard
                  key={f.id}
                  field={f}
                  active={active === f.id}
                  onClick={() => setActive(f.id)}
                />
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <Tabs
          items={[
            {
              id: "structured",
              label: "Structured View",
              content: (
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {fields?.map((f) => (
                    <div key={f.id}>
                      <p className="text-xs text-slate-500">{f.label}</p>
                      <p className="text-sm font-medium text-navy-900">{f.value}</p>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              id: "raw",
              label: "Raw OCR Text",
              content: (
                <pre className="p-4 text-xs font-mono text-slate-600 whitespace-pre-wrap leading-6">
                  {fields?.map((f) => `${f.label}: ${f.value}`).join("\n")}
                </pre>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
