import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Send,
  Hash,
  Copy,
  Check,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Card, CardHeader } from "../../components/ui/Card";
import { DocumentViewer } from "../../components/documents/DocumentViewer";
import { FieldCard } from "../../components/documents/FieldCard";
import { Button } from "../../components/ui/Button";
import { Tabs } from "../../components/ui/Tabs";
import { ConfidenceRing } from "../../components/ui/Confidence";
import {
  getExtractedFields,
  approveExtraction,
  isConflictDocument,
} from "../../services/extraction.service";
import { getDocumentById } from "../../services/document.service";
import type { ExtractedField, LandDocument } from "../../types";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";

export function ExtractionViewerPage() {
  const { id } = useParams();
  const [doc, setDoc] = useState<LandDocument | null>(null);
  const [fields, setFields] = useState<ExtractedField[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [recordNumber, setRecordNumber] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { push } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    setFields(null);
    setRecordNumber(null);
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

  const isConflict = isConflictDocument(doc ?? undefined);
  const flaggedFields = fields?.filter((f) => f.confidence < 70) ?? [];
  const overall = fields?.length
    ? Math.min(...fields.map((f) => f.confidence))
    : (doc?.confidence ?? 0);

  async function handleApprove() {
    if (isConflict) {
      // Route to Tehsil Officer review page
      navigate(`/documents/${id}/tehsil-review`);
      return;
    }

    setApproving(true);
    const result = await approveExtraction(id || "");
    setApproving(false);
    setRecordNumber(result.recordNumber);
    push("success", `✅ Record anchored to blockchain! Record No: ${result.recordNumber}`);
  }

  function handleCopy() {
    if (!recordNumber) return;
    navigator.clipboard.writeText(recordNumber).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-navy-900">AI Extraction Viewer</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Document: {id} {doc?.fileName ? `(${doc.fileName})` : ""} — review structured
            fields extracted by NLP.
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
          {!recordNumber && (
            <Button
              size="sm"
              variant={isConflict ? "danger" : "success"}
              loading={approving}
              icon={
                isConflict ? (
                  <AlertTriangle className="h-3.5 w-3.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )
              }
              onClick={handleApprove}
            >
              {isConflict ? "Send to Tehsil Officer" : "Approve & Anchor to Blockchain"}
            </Button>
          )}
        </div>
      </div>

      {/* ── CONFLICT BANNER ── */}
      {isConflict && fields && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              ⚠️ Conflict Detected — Tehsil Officer Review Required
            </p>
            <p className="text-xs text-amber-700 mt-1">
              {flaggedFields.length} field(s) have low AI confidence and cannot be
              auto-approved:{" "}
              <strong>{flaggedFields.map((f) => f.label).join(", ")}</strong>. The Tehsil
              Officer must review and correct these fields before the record can be stored on
              the blockchain.
            </p>
          </div>
        </div>
      )}

      {/* ── AUTO-PASS BANNER ── */}
      {!isConflict && fields && !recordNumber && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-300 rounded-xl p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              ✅ High Confidence — Ready for Automatic Approval
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              All fields extracted with ≥ 90% confidence. No manual review needed. Click
              "Approve &amp; Anchor to Blockchain" to generate a public record number.
            </p>
          </div>
        </div>
      )}

      {/* ── BLOCKCHAIN RECORD NUMBER BANNER ── */}
      {recordNumber && (
        <div className="flex items-center gap-4 bg-gradient-to-r from-brand-600 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
          <ShieldCheck className="h-9 w-9 shrink-0 opacity-90" />
          <div className="flex-1">
            <p className="text-xs font-medium opacity-80 uppercase tracking-widest mb-1">
              Blockchain Record Number
            </p>
            <p className="text-2xl font-bold tracking-wider">{recordNumber}</p>
            <p className="text-xs opacity-75 mt-1">
              This record is permanently anchored on the blockchain. Share this number with
              the land owner for public verification.
            </p>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors px-3 py-2 rounded-lg text-sm font-medium"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={() => navigate("/public/search")}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors px-3 py-2 rounded-lg text-sm font-medium"
          >
            <Hash className="h-4 w-4" />
            Public Lookup
          </button>
        </div>
      )}

      {/* ── 3-COLUMN VIEWER ── */}
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
          <CardHeader title="Document Preview" subtitle="Extracted text with entity highlights" />
          <div className="flex-1 overflow-y-auto p-4 text-sm leading-7 text-navy-800">
            {fields?.map((f) => (
              <span
                key={f.id}
                onClick={() => setActive(f.id)}
                className={`inline-block px-1.5 py-0.5 mr-1 mb-1 rounded cursor-pointer transition-colors ${
                  active === f.id
                    ? "bg-brand-200 text-brand-900 font-semibold"
                    : f.confidence < 70
                    ? "bg-amber-100 text-amber-800 underline decoration-amber-400 decoration-dashed ring-1 ring-amber-300"
                    : "bg-success-50 text-success-800"
                }`}
              >
                {f.label}: {f.value}
                {f.confidence < 70 && (
                  <span className="ml-1 text-xs text-amber-600">({f.confidence}%)</span>
                )}
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

      {/* ── STRUCTURED / RAW TABS ── */}
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
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        {f.label}
                        {f.confidence < 70 && (
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                        )}
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          f.confidence < 70 ? "text-amber-700" : "text-navy-900"
                        }`}
                      >
                        {f.value}
                      </p>
                      <p className="text-xs text-slate-400">{f.confidence}% confidence</p>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              id: "raw",
              label: "Raw Extraction Text",
              content: (
                <pre className="p-4 text-xs font-mono text-slate-600 whitespace-pre-wrap leading-6">
                  {fields?.map((f) => `${f.label}: ${f.value}  [confidence: ${f.confidence}%]`).join("\n")}
                </pre>
              ),
            },
          ]}
        />
      </Card>

      {/* Loading state */}
      {approving && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4">
            <Loader2 className="h-10 w-10 text-brand-600 animate-spin" />
            <p className="text-navy-900 font-semibold text-lg">Anchoring to Blockchain…</p>
            <p className="text-sm text-slate-500 text-center">
              Generating SHA-256 hash, creating block, and assigning record number…
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
