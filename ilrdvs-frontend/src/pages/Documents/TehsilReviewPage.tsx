/**
 * TehsilReviewPage.tsx
 *
 * Tehsil Officer conflict resolution workspace.
 * Shows flagged low-confidence fields with edit inputs,
 * original document preview, and an "Approve & Anchor to Blockchain" action.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Check,
  Hash,
  Loader2,
  ArrowLeft,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { DocumentViewer } from "../../components/documents/DocumentViewer";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { ConfidenceBar } from "../../components/ui/Confidence";
import {
  getExtractedFields,
  approveTehsilReview,
} from "../../services/extraction.service";
import { getDocumentById } from "../../services/document.service";
import type { ExtractedField, LandDocument } from "../../types";
import { useToast } from "../../components/ui/Toast";
import { TableSkeleton } from "../../components/ui/Skeleton";

export function TehsilReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();

  const [doc, setDoc] = useState<LandDocument | null>(null);
  const [fields, setFields] = useState<ExtractedField[] | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recordNumber, setRecordNumber] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setFields(null);
    getDocumentById(id).then((d) => {
      setDoc(d || null);
      getExtractedFields(id, d).then((f) => {
        setFields(f);
        // Pre-populate edit values with AI-extracted values
        setEdits(Object.fromEntries(f.map((x) => [x.id, x.value])));
      });
    });
  }, [id]);

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center h-60 text-slate-400 gap-2">
        <AlertTriangle className="h-8 w-8" />
        <p className="text-sm">No document selected.</p>
      </div>
    );
  }

  const flaggedFields  = fields?.filter((f) => f.confidence < 85) ?? [];
  const passedFields   = fields?.filter((f) => f.confidence >= 85) ?? [];

  async function handleApprove() {
    const corrections: Record<string, string> = {};
    flaggedFields.forEach((f) => {
      if (edits[f.id] && edits[f.id] !== f.value) {
        corrections[f.label] = edits[f.id];
      }
    });

    setSubmitting(true);
    const result = await approveTehsilReview(id || "", corrections);
    setSubmitting(false);
    setRecordNumber(result.recordNumber);
    push(
      "success",
      `✅ Record approved by Tehsil Officer and anchored to blockchain! Record No: ${result.recordNumber}`,
    );
  }

  function handleCopy() {
    if (!recordNumber) return;
    navigator.clipboard.writeText(recordNumber).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5 pb-24">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => navigate(`/documents/${id}/extraction`)}
              className="text-slate-400 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-xl font-semibold text-navy-900">
              Tehsil Officer Review
            </h1>
            <Badge tone="warning">Conflict Resolution</Badge>
          </div>
          <p className="text-sm text-slate-500 ml-6">
            {doc?.fileName} — review and correct flagged fields before blockchain anchoring.
          </p>
        </div>
        {!recordNumber && (
          <Button
            variant="success"
            loading={submitting}
            icon={<ShieldCheck className="h-4 w-4" />}
            onClick={handleApprove}
            disabled={flaggedFields.some((f) => !edits[f.id]?.trim())}
          >
            Approve &amp; Anchor to Blockchain
          </Button>
        )}
      </div>

      {/* ── Conflict Summary Banner ── */}
      {!recordNumber && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {flaggedFields.length} field(s) require your review (below 85% confidence)
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Fields with confidence 65–84% need verification; fields below 65% are critically low and require correction:{" "}
              <strong>{flaggedFields.map((f) => f.label).join(", ")}</strong>. Please verify
              against the original document and correct any errors before approving.
            </p>
          </div>
        </div>
      )}

      {/* ── Record Number Banner (post-approval) ── */}
      {recordNumber && (
        <div className="flex items-center gap-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-5 text-white shadow-lg">
          <ShieldCheck className="h-9 w-9 shrink-0 opacity-90" />
          <div className="flex-1">
            <p className="text-xs font-medium opacity-80 uppercase tracking-widest mb-1">
              Blockchain Record Number
            </p>
            <p className="text-2xl font-bold tracking-wider">{recordNumber}</p>
            <p className="text-xs opacity-75 mt-1">
              Record approved by Tehsil Officer and permanently anchored on the blockchain.
              Share this number with the land owner for public verification.
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

      {/* ── Main Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-5">
        {/* Document Preview */}
        <Card className="h-[680px] flex flex-col">
          <CardHeader
            title="Original Document"
            subtitle={doc?.fileName || "Document Preview"}
          />
          <div className="flex-1 p-4">
            <DocumentViewer
              documentId={id}
              fileUrl={doc?.previewUrl || doc?.fileUrl}
              docTitle={doc?.fileName}
              pages={doc?.pages || 1}
              highlightRegion={activeField ? { x: 10, y: 25, w: 65, h: 8 } : null}
            />
          </div>
        </Card>

        {/* Field Review Panel */}
        <div className="space-y-4">
          {/* ── Flagged Fields ── */}
          <Card>
            <CardHeader
              title="⚠️ Flagged Fields — Correction Required"
              subtitle="Review each field against the original document"
            />
            <CardBody className="space-y-4">
              {fields === null ? (
                <TableSkeleton rows={3} cols={1} />
              ) : (
                flaggedFields.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => setActiveField(f.id)}
                    className={`rounded-lg border-2 p-3 transition-all cursor-pointer ${
                      activeField === f.id
                        ? f.confidence < 65
                          ? "border-red-500 bg-red-50"
                          : "border-amber-400 bg-amber-50"
                        : f.confidence < 65
                          ? "border-red-300 bg-red-50/50 hover:border-red-400"
                          : "border-amber-200 bg-amber-50/50 hover:border-amber-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${f.confidence < 65 ? "text-red-700" : "text-amber-700"}`}>
                        {f.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${f.confidence < 65 ? "text-red-600" : "text-amber-600"}`}>
                          AI confidence: {f.confidence}%
                        </span>
                        <AlertTriangle className={`h-3.5 w-3.5 ${f.confidence < 65 ? "text-red-500" : "text-amber-500"}`} />
                      </div>
                    </div>
                    <ConfidenceBar value={f.confidence} />
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-slate-500">AI extracted:</span>
                      <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        {f.value}
                      </span>
                    </div>
                    <Input
                      label=""
                      placeholder={`Correct value for ${f.label}`}
                      value={edits[f.id] ?? f.value}
                      onChange={(e) =>
                        setEdits((prev) => ({ ...prev, [f.id]: e.target.value }))
                      }
                      className="text-sm"
                    />
                    {edits[f.id] && edits[f.id] !== f.value && (
                      <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Corrected to: <strong>{edits[f.id]}</strong>
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          {/* ── Passed Fields (read-only) ── */}
          <Card>
            <CardHeader
              title="✅ Auto-Verified Fields"
              subtitle="High confidence — no correction needed"
            />
            <div className="divide-y divide-slate-100">
              {passedFields.map((f) => (
                <div key={f.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-xs text-slate-500">{f.label}</p>
                    <p className="text-sm font-medium text-navy-900">{f.value}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-600">{f.confidence}%</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Info note */}
          {!recordNumber && (
            <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-200">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
              <span>
                After you approve, a SHA-256 hash of this record will be created and
                anchored to the Bhumi Setu blockchain. A unique record number (
                <strong>BHU-YYYY-NNNNN</strong>) will be issued for public verification.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Blockchain anchoring overlay */}
      {submitting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4 text-center">
            <div className="relative">
              <Loader2 className="h-12 w-12 text-emerald-600 animate-spin" />
              <ShieldCheck className="h-5 w-5 text-emerald-600 absolute inset-0 m-auto" />
            </div>
            <p className="text-navy-900 font-semibold text-lg">Anchoring to Blockchain…</p>
            <div className="text-sm text-slate-500 space-y-1">
              <p>✓ Applying Tehsil Officer corrections</p>
              <p>✓ Computing SHA-256 record hash</p>
              <p className="text-slate-400">⏳ Creating blockchain block…</p>
              <p className="text-slate-400">⏳ Assigning public record number…</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
