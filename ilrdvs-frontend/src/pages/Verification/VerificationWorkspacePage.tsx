import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Save,
  RotateCw,
  Check,
  X,
  MessageSquarePlus,
  RefreshCcw,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Card, CardHeader } from "../../components/ui/Card";
import { DocumentViewer } from "../../components/documents/DocumentViewer";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ConfidenceRing, ConfidenceBar } from "../../components/ui/Confidence";
import { Badge } from "../../components/ui/Badge";
import { getVerificationTask, submitVerificationDecision } from "../../services/verification.service";
import { getExtractedFields } from "../../services/extraction.service";
import { getValidationIssues } from "../../services/validation.service";
import type { VerificationTask, ExtractedField, ValidationIssue } from "../../types";
import { useToast } from "../../components/ui/Toast";
import { VALIDATION_ISSUES } from "../../data/mockData";
import { Modal } from "../../components/ui/Modal";

export function VerificationWorkspacePage() {
  const { id = "VT-500" } = useParams();
  const [task, setTask] = useState<VerificationTask | null>(null);
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [commentModal, setCommentModal] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const { push } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    getVerificationTask(id).then((t) => setTask(t ?? null));
    getExtractedFields(id).then((f) => {
      setFields(f);
      setEditValues(Object.fromEntries(f.map((x) => [x.id, x.value])));
    });
    getValidationIssues(id).then((v) => setIssues(v.length ? v : VALIDATION_ISSUES.slice(0, 3)));
  }, [id]);

  const overall = fields.length ? Math.round(fields.reduce((s, f) => s + f.confidence, 0) / fields.length) : 0;

  async function decide(decision: "approve" | "reject" | "request_review") {
    setSubmitting(decision);
    await submitVerificationDecision(id, decision, comment || undefined);
    setSubmitting(null);
    const messages = {
      approve: "Record approved and sent for digital certification.",
      reject: "Record rejected and returned to the processing queue.",
      request_review: "Re-verification requested — flagged for supervisor review.",
    };
    push(decision === "reject" ? "error" : decision === "approve" ? "success" : "warning", messages[decision]);
    navigate("/verification");
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-navy-900">Human Verification Workspace</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {task ? `${task.documentId} — ${task.owner}, ${task.location.village}, ${task.location.district}` : `Task ${id}`}
          </p>
        </div>
        {task && <Badge tone={task.priority === "High" ? "danger" : task.priority === "Medium" ? "warning" : "neutral"}>{task.priority} Priority</Badge>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_320px] gap-4">
        {/* LEFT: Original document */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader title="Original Document" subtitle="Click a field on the right to locate it here" />
          <div className="flex-1 p-4">
            <DocumentViewer pages={3} highlightRegion={activeField ? { x: 18, y: 30, w: 55, h: 9 } : null} />
          </div>
        </Card>

        {/* CENTER: Edit & verify */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader title="Edit &amp; Verify Information" subtitle="Correct any low-confidence or conflicting fields" />
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {fields.map((f) => (
              <div
                key={f.id}
                onClick={() => setActiveField(f.id)}
                className={`rounded-md border p-3 cursor-pointer transition-colors ${
                  activeField === f.id ? "border-brand-400 bg-brand-50" : "border-slate-200"
                } ${f.confidence < 70 ? "border-l-4 border-l-danger-500" : ""}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-slate-500">{f.label}</label>
                  <span className="text-xs font-semibold text-navy-600">{f.confidence}%</span>
                </div>
                <input
                  value={editValues[f.id] ?? f.value}
                  onChange={(e) => setEditValues((v) => ({ ...v, [f.id]: e.target.value }))}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-sm font-medium text-navy-900 border border-transparent hover:border-slate-200 focus:border-brand-500 rounded px-2 py-1 -mx-2 outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            ))}
            <Input label="Remarks" placeholder="Add remarks about your review…" />
          </div>
        </Card>

        {/* RIGHT: Validation */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader title="Validation" />
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Format Validation", ok: true },
                { label: "Duplicate Check", ok: true },
                { label: "Area Consistency", ok: false, warn: true },
                { label: "Owner Name Match", ok: false },
                { label: "GIS Spatial Check", ok: false, warn: true },
                { label: "Cross DB Verification", ok: true },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-1.5 text-xs bg-slate-50 rounded-md px-2.5 py-2">
                  {c.ok ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success-500 shrink-0" />
                  ) : c.warn ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-warning-500 shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-danger-500 shrink-0" />
                  )}
                  <span className="text-slate-600 truncate">{c.label}</span>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-semibold text-navy-800 mb-2 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-warning-500" /> Conflicts &amp; Issues
              </p>
              <div className="space-y-2">
                {issues.slice(0, 3).map((issue) => (
                  <div key={issue.id} className="rounded-md border border-amber-200 bg-warning-50/50 p-2.5">
                    <p className="text-xs font-medium text-navy-800">{issue.type}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      AI: <span className="font-medium text-navy-700">{issue.extractedValue}</span> · Reference:{" "}
                      <span className="font-medium text-navy-700">{issue.referenceValue}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center pt-2 border-t border-slate-100">
              <ConfidenceRing value={overall} label="Overall" />
              <div className="w-full space-y-2 mt-3">
                <ConfidenceBar value={72} label="Khasra" />
                <ConfidenceBar value={41} label="Jamabandi" />
                <ConfidenceBar value={15} label="Mutation" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-slate-200 px-6 py-3 flex flex-wrap items-center justify-end gap-2 z-20 shadow-[0_-2px_8px_rgba(15,42,74,0.06)]">
        <Button variant="outline" size="sm" icon={<Save className="h-3.5 w-3.5" />} onClick={() => push("success", "Changes saved.")}>
          Save Changes
        </Button>
        <Button variant="outline" size="sm" icon={<RotateCw className="h-3.5 w-3.5" />} onClick={() => push("info", "Validation re-run started.")}>
          Re-run Validation
        </Button>
        <Button variant="outline" size="sm" icon={<MessageSquarePlus className="h-3.5 w-3.5" />} onClick={() => setCommentModal(true)}>
          Add Comment
        </Button>
        <Button variant="outline" size="sm" icon={<RefreshCcw className="h-3.5 w-3.5" />} loading={submitting === "request_review"} onClick={() => decide("request_review")}>
          Request Review
        </Button>
        <Button variant="danger" size="sm" icon={<X className="h-3.5 w-3.5" />} loading={submitting === "reject"} onClick={() => decide("reject")}>
          Reject
        </Button>
        <Button variant="success" size="sm" icon={<Check className="h-3.5 w-3.5" />} loading={submitting === "approve"} onClick={() => decide("approve")}>
          Approve
        </Button>
      </div>

      <Modal open={commentModal} onClose={() => setCommentModal(false)} title="Add Comment" footer={
        <>
          <Button variant="outline" size="sm" onClick={() => setCommentModal(false)}>Cancel</Button>
          <Button size="sm" onClick={() => { setCommentModal(false); push("success", "Comment added to record history."); }}>Save Comment</Button>
        </>
      }>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="Describe the correction or concern for this record…"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
        />
      </Modal>
    </div>
  );
}
