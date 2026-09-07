import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Cpu, ScanText, Sparkles, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { DocumentViewer } from "../../components/documents/DocumentViewer";
import { Button } from "../../components/ui/Button";
import { ProcessingStatusBadge, ValidationStatusBadge, VerificationStatusBadge } from "../../components/ui/StatusBadge";
import { ConfidenceRing } from "../../components/ui/Confidence";
import { getDocumentById } from "../../services/document.service";
import { listAuditLog } from "../../services/audit.service";
import type { LandDocument, AuditEntry } from "../../types";
import { formatDate, formatFileSize, formatDateTime } from "../../utils/format";

export function DocumentDetailsPage() {
  const { id = "DOC-2024-1004" } = useParams();
  const [doc, setDoc] = useState<LandDocument | null | undefined>(undefined);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setDoc(undefined);
    getDocumentById(id).then((d) => setDoc(d ?? null));
    listAuditLog(id).then((a) => setAudit(a.length ? a : []));
  }, [id]);

  if (doc === undefined) return <div className="text-sm text-slate-400 p-10 text-center">Loading document…</div>;
  if (!doc) return <div className="text-sm text-slate-400 p-10 text-center">Document not found.</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-navy-900 font-ids">{doc.id}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{doc.fileName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={<ScanText className="h-3.5 w-3.5" />} onClick={() => navigate(`/documents/${doc.id}/ocr`)}>OCR Viewer</Button>
          <Button variant="outline" size="sm" icon={<Sparkles className="h-3.5 w-3.5" />} onClick={() => navigate(`/documents/${doc.id}/extraction`)}>Extraction</Button>
          <Button variant="outline" size="sm" icon={<ShieldCheck className="h-3.5 w-3.5" />} onClick={() => navigate(`/documents/${doc.id}/validation`)}>Validation</Button>
          <Button size="sm" icon={<Cpu className="h-3.5 w-3.5" />} onClick={() => navigate(`/documents/processing/${doc.id}`)}>Processing</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 h-[480px] flex flex-col">
          <CardHeader title="Document Preview" />
          <div className="flex-1 p-4">
            <DocumentViewer pages={doc.pages} />
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Metadata" />
            <CardBody className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Document ID" value={doc.id} />
              <Field label="Pages" value={String(doc.pages)} />
              <Field label="File Size" value={formatFileSize(doc.fileSizeKb)} />
              <Field label="File Type" value={doc.fileType} />
              <Field label="Uploaded" value={formatDate(doc.uploadDate)} />
              <Field label="Uploaded By" value={doc.uploadedBy} />
              <Field label="Record Type" value={doc.documentType} />
              <Field label="Language" value={doc.language} />
              <Field label="Village" value={doc.location.village} />
              <Field label="District" value={doc.location.district} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Status" />
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Processing</span>
                <ProcessingStatusBadge status={doc.processingStatus} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Validation</span>
                <ValidationStatusBadge status={doc.validationStatus} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Verification</span>
                <VerificationStatusBadge status={doc.verificationStatus} />
              </div>
              <div className="flex justify-center pt-2 border-t border-slate-100">
                <ConfidenceRing value={doc.confidence} size={84} />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Audit History" />
        <CardBody>
          {audit.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No audit entries recorded for this document yet.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {audit.map((a) => (
                <div key={a.id} className="py-2.5 flex items-center gap-3 text-sm">
                  <span className="text-xs text-slate-400 w-40 shrink-0">{formatDateTime(a.timestamp)}</span>
                  <span className="text-navy-800 flex-1">{a.action}</span>
                  <span className="text-xs text-slate-400">{a.user}</span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const isId = /id|number/i.test(label);
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-medium text-navy-900 mt-0.5 ${isId ? "font-ids" : ""}`}>{value}</p>
    </div>
  );
}
