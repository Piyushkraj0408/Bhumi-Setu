import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Landmark, Download, Printer } from "lucide-react";
import { Card, CardBody } from "../../components/ui/Card";
import { Tabs } from "../../components/ui/Tabs";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ConfidenceBar } from "../../components/ui/Confidence";
import { DocumentViewer } from "../../components/documents/DocumentViewer";
import { getRecordById } from "../../services/record.service";
import { listAuditLog } from "../../services/audit.service";
import type { LandRecord, AuditEntry } from "../../types";
import { formatDateTime } from "../../utils/format";

export function RecordDetailsPage() {
  const { id = "LR-2024-1" } = useParams();
  const [record, setRecord] = useState<LandRecord | null | undefined>(undefined);
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  useEffect(() => {
    setRecord(undefined);
    getRecordById(id).then((r) => setRecord(r ?? null));
    listAuditLog().then((a) => setAudit(a.slice(0, 8)));
  }, [id]);

  if (record === undefined) return <div className="text-sm text-slate-400 p-10 text-center">Loading record…</div>;
  if (!record) return <div className="text-sm text-slate-400 p-10 text-center">Record not found.</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">
            <Landmark className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-navy-900">Digital Land Record</h1>
              <Badge tone={record.status === "Verified" ? "success" : record.status === "Rejected" ? "danger" : "warning"}>{record.status}</Badge>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Record ID: <span className="font-ids">{record.id}</span> · Linked Document: <span className="font-ids">{record.documentId}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={<Printer className="h-3.5 w-3.5" />}>Print</Button>
          <Button size="sm" icon={<Download className="h-3.5 w-3.5" />}>Download Certificate</Button>
        </div>
      </div>

      <Card>
        <CardBody>
          <Tabs
            items={[
              {
                id: "overview",
                label: "Overview",
                content: (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <Field label="Owner" value={record.owner} />
                    <Field label="Survey Number" value={record.surveyNumber} />
                    <Field label="Village" value={record.location.village} />
                    <Field label="District" value={record.location.district} />
                    <Field label="Area" value={`${record.area} ${record.areaUnit}`} />
                    <Field label="Land Type" value={record.landType} />
                    <Field label="State" value={record.location.state} />
                    <Field label="Status" value={record.status} />
                  </div>
                ),
              },
              {
                id: "ownership",
                label: "Ownership",
                content: (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                    <Field label="Owner" value={record.owner} />
                    <Field label="Father / Husband Name" value={record.fatherOrHusbandName} />
                    <Field label="Co-owners" value={record.coOwners.length ? record.coOwners.join(", ") : "None recorded"} />
                  </div>
                ),
              },
              {
                id: "land",
                label: "Land Details",
                content: (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                    <Field label="Survey Number" value={record.surveyNumber} />
                    <Field label="Khasra Number" value={record.khasraNumber} />
                    <Field label="Khata Number" value={record.khataNumber} />
                    <Field label="Area" value={`${record.area} ${record.areaUnit}`} />
                    <Field label="Land Type" value={record.landType} />
                    <Field label="Village" value={record.location.village} />
                    <Field label="Tehsil" value={record.location.tehsil} />
                    <Field label="District" value={record.location.district} />
                    <Field label="State" value={record.location.state} />
                  </div>
                ),
              },
              {
                id: "document",
                label: "Original Document",
                content: (
                  <div className="h-[420px]">
                    <DocumentViewer pages={2} />
                  </div>
                ),
              },
              {
                id: "validation",
                label: "Validation",
                content: (
                  <div className="max-w-md space-y-4">
                    <ConfidenceBar value={record.ocrConfidence} label="OCR Confidence" kind="OCR" />
                    <ConfidenceBar value={record.extractionConfidence} label="Extraction Confidence" kind="Extraction" />
                    <ConfidenceBar value={record.gisConfidence} label="GIS Confidence" kind="GIS" />
                  </div>
                ),
              },
              {
                id: "gis",
                label: "GIS",
                content: <p className="text-sm text-slate-500">Cadastral parcel view available on the GIS / Cadastral Map page for survey no. {record.surveyNumber}.</p>,
              },
              {
                id: "audit",
                label: "Audit History",
                content: (
                  <div className="divide-y divide-slate-50">
                    {audit.map((a) => (
                      <div key={a.id} className="py-2.5 flex items-center gap-3 text-sm">
                        <span className="text-xs text-slate-400 w-36 shrink-0">{formatDateTime(a.timestamp)}</span>
                        <span className="text-navy-800 flex-1">{a.action}</span>
                        <span className="text-xs text-slate-400">{a.user}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        </CardBody>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const isId = /number|record id|document/i.test(label);
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm font-medium text-navy-900 mt-0.5 ${isId ? "font-ids" : ""}`}>{value}</p>
    </div>
  );
}
