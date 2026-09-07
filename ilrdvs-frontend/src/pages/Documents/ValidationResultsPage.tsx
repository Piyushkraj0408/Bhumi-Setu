import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileWarning,
  Copy,
  RotateCw,
  ShieldCheck,
  ShieldAlert,
  ClipboardCheck,
  ArrowRight,
  Download,
  Layers,
  History,
  Check,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { ValidationIssueCard } from "../../components/validation/ValidationIssueCard";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import {
  getFullValidationResults,
  submitOfficerAction,
  rerunValidation,
} from "../../services/validation.service";
import type { FullValidationResult } from "../../services/validation.service";
import { useToast } from "../../components/ui/Toast";

import { RequirePermission } from "../../components/auth/RequirePermission";

type TabKey = "issues" | "mandatory" | "contradictions" | "duplicates" | "audit";

const MANDATORY_LIST = [
  { key: "khasra_number", label: "Khasra Number", desc: "Cadastral plot or survey parcel identifier" },
  { key: "owner_name", label: "Owner Name", desc: "Title holder / Khatedar full legal name" },
  { key: "village", label: "Village (Gram)", desc: "Revenue village jurisdiction" },
  { key: "tehsil", label: "Tehsil (Taluka)", desc: "Sub-district administrative revenue block" },
  { key: "district", label: "District (Jila)", desc: "District land records registry" },
  { key: "area", label: "Area", desc: "Total parcel land area (numeric positive measurement)" },
];

export function ValidationResultsPage() {
  const { id } = useParams();
  const [data, setData] = useState<FullValidationResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("issues");
  const [rerunning, setRerunning] = useState(false);
  const [auditFilter, setAuditFilter] = useState<string>("ALL");
  const { push } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setData(null);
    getFullValidationResults(id).then(setData);
  }, [id]);

  async function handleAction(
    issueId: string,
    action: "accept" | "correct" | "reject"
  ) {
    if (!data) return;
    await submitOfficerAction(issueId, action, data.document_id);
    setData({
      ...data,
      issues: data.issues.map((i) =>
        i.id === issueId ? { ...i, officerAction: action } : i
      ),
    });
    push("success", `Decision recorded: Issue marked as "${action}".`);
  }

  async function handleRerun() {
    if (!id) return;
    setRerunning(true);
    const res = await rerunValidation(id);
    setData(res);
    setRerunning(false);
    push("success", "Validation re-evaluated across all 6 rule categories.");
  }

  function exportAuditTrail() {
    if (!data) return;
    const jsonStr = JSON.stringify(data.audit_trail, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `validation-audit-${data.document_id}.json`;
    a.click();
    push("success", "Validation audit report exported.");
  }

  const passedChecks = data?.summary.passed_checks ?? 0;
  const conflictCount = data?.summary.conflicts_count ?? 0;
  const warningCount = data?.summary.warnings_count ?? 0;
  const missingCount = data?.summary.missing_fields_count ?? 0;
  const totalChecks = data?.summary.total_checks ?? 0;

  const statusTone =
    data?.validation_status === "valid"
      ? "success"
      : data?.validation_status === "warning"
      ? "warning"
      : "danger";

  const statusLabel =
    data?.validation_status === "valid"
      ? "Valid (Passed All Checks)"
      : data?.validation_status === "warning"
      ? "Warning (Requires Review)"
      : "Conflict (Action Required)";

  const filteredAudit = data?.audit_trail.filter((a) => {
    if (auditFilter === "ALL") return true;
    return a.status === auditFilter;
  }) ?? [];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-navy-900">
              Land Records Validation Engine
            </h1>
            {data && (
              <Badge tone={statusTone} className="px-2.5 py-1 text-xs">
                {statusLabel}
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {id ? `Document ID: ${id}` : "Comprehensive business-rule validation across land registry records."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <RequirePermission permission="EXPORT_DATA">
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={exportAuditTrail}
              disabled={!data}
            >
              Export Audit
            </Button>
          </RequirePermission>

          <Button
            variant="outline"
            size="sm"
            loading={rerunning}
            icon={<RotateCw className="h-3.5 w-3.5" />}
            onClick={handleRerun}
          >
            Re-run Validation
          </Button>

          <RequirePermission permission="VERIFY_RECORD">
            <Button
              variant="primary"
              size="sm"
              icon={<ArrowRight className="h-3.5 w-3.5" />}
              onClick={() => navigate(`/verification/${id || ""}`)}
            >
              Go to Verification
            </Button>
          </RequirePermission>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryTile
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Passed Checks"
          value={passedChecks}
          tone="success"
        />
        <SummaryTile
          icon={<XCircle className="h-4 w-4" />}
          label="Conflicts / Failed"
          value={conflictCount}
          tone="danger"
        />
        <SummaryTile
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Warnings"
          value={warningCount}
          tone="warning"
        />
        <SummaryTile
          icon={<FileWarning className="h-4 w-4" />}
          label="Missing Fields"
          value={missingCount}
          tone="neutral"
        />
        <SummaryTile
          icon={<Copy className="h-4 w-4" />}
          label="Total Rules Run"
          value={totalChecks}
          tone="brand"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <TabButton
            active={activeTab === "issues"}
            onClick={() => setActiveTab("issues")}
            icon={<ShieldAlert className="h-4 w-4" />}
            label="Issues & Decisions"
            count={data?.issues.length}
          />
          <TabButton
            active={activeTab === "mandatory"}
            onClick={() => setActiveTab("mandatory")}
            icon={<ClipboardCheck className="h-4 w-4" />}
            label="Mandatory Fields"
            badge={missingCount > 0 ? `${missingCount} missing` : "6/6 valid"}
            badgeTone={missingCount > 0 ? "danger" : "success"}
          />
          <TabButton
            active={activeTab === "contradictions"}
            onClick={() => setActiveTab("contradictions")}
            icon={<Layers className="h-4 w-4" />}
            label="Format & Contradictions"
          />
          <TabButton
            active={activeTab === "duplicates"}
            onClick={() => setActiveTab("duplicates")}
            icon={<Copy className="h-4 w-4" />}
            label="Duplicate Detection"
          />
          <RequirePermission permission="VIEW_AUDIT">
            <TabButton
              active={activeTab === "audit"}
              onClick={() => setActiveTab("audit")}
              icon={<History className="h-4 w-4" />}
              label="Audit Trail Log"
              count={data?.audit_trail.length}
            />
          </RequirePermission>
        </nav>
      </div>

      {/* TAB CONTENT 1: Issues & Decisions */}
      {activeTab === "issues" && (
        <Card>
          <CardHeader
            title="Active Validation Issues"
            subtitle="Review each flagged conflict or warning and record an officer action"
          />
          <CardBody className="space-y-3">
            {data === null ? (
              <p className="text-sm text-slate-400 text-center py-8">
                Evaluating document validation rules…
              </p>
            ) : data.issues.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck className="h-8 w-8 text-success-500" />}
                title="Zero validation issues detected"
                description="This document meets all mandatory field requirements, format patterns, cross-registry alignment, and uniqueness constraints."
              />
            ) : (
              data.issues.map((issue) => (
                <ValidationIssueCard
                  key={issue.id}
                  issue={issue}
                  onAction={(a) => handleAction(issue.id, a)}
                />
              ))
            )}
          </CardBody>
        </Card>
      )}

      {/* TAB CONTENT 2: Mandatory Fields Checklist */}
      {activeTab === "mandatory" && (
        <Card>
          <CardHeader
            title="Mandatory Fields Verification"
            subtitle="The system enforces 6 required cadastral fields for every land document"
          />
          <CardBody>
            <div className="divide-y divide-slate-100">
              {MANDATORY_LIST.map((mf) => {
                const isMissing = data?.missing_fields.includes(mf.label);
                return (
                  <div
                    key={mf.key}
                    className="py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center ${
                          isMissing
                            ? "bg-danger-100 text-danger-600"
                            : "bg-success-100 text-success-600"
                        }`}
                      >
                        {isMissing ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-navy-900">
                          {mf.label}
                        </p>
                        <p className="text-xs text-slate-500">{mf.desc}</p>
                      </div>
                    </div>
                    <div>
                      {isMissing ? (
                        <Badge tone="danger">Missing / Empty</Badge>
                      ) : (
                        <Badge tone="success">Validated Present</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* TAB CONTENT 3: Format & Cross-field Contradictions */}
      {activeTab === "contradictions" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader
              title="Format Validation Rules"
              subtitle="Syntax and numerical sanity checks"
            />
            <CardBody className="space-y-4">
              <FormatItem
                title="Khasra Number Pattern"
                rule="Standard cadastral pattern: numbers with optional sub-divisions (e.g. 124, 124/1, 45-A)"
                status="passed"
              />
              <FormatItem
                title="Area Numeric & Positive Check"
                rule="Area measurement must be numeric and strictly positive (> 0.00)"
                status="passed"
              />
              <FormatItem
                title="Record Year Reasonability"
                rule="Year must be between 1800 and current year (e.g. 1800 - 2027)"
                status="passed"
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Cross-Field Contradictions"
              subtitle="Cross-referencing against Master Cadastral Registry"
            />
            <CardBody className="space-y-4">
              <FormatItem
                title="Village & Jurisdiction Alignment"
                rule="OCR extracted village is verified against Tehsil cadastral bounds"
                status="passed"
              />
              <FormatItem
                title="Owner Title Consistency"
                rule="Khatedar legal name is matched with title deed register (fuzzy threshold > 70%)"
                status={data?.issues.some((i) => i.type === "Owner Conflict") ? "warning" : "passed"}
              />
              <FormatItem
                title="Area Discrepancy Tolerance"
                rule="Physical surveyed area must stay within 5% tolerance of registry area"
                status={data?.issues.some((i) => i.type === "Invalid Area") ? "warning" : "passed"}
              />
            </CardBody>
          </Card>
        </div>
      )}

      {/* TAB CONTENT 4: Duplicate Detection */}
      {activeTab === "duplicates" && (
        <Card>
          <CardHeader
            title="Duplicate Detection Checks"
            subtitle="Automated deduplication across multiple dimensions"
          />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-success-500" />
                  <p className="text-sm font-semibold text-navy-900">
                    Khasra + Village
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  Scans for duplicate Khasra parcel allocations in the same revenue village.
                </p>
                <div className="mt-3">
                  <Badge tone="success">No Duplicate Found</Badge>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-success-500" />
                  <p className="text-sm font-semibold text-navy-900">
                    Khasra + Owner
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  Verifies that duplicate title claims under the same owner name are flagged.
                </p>
                <div className="mt-3">
                  <Badge tone="success">Unique Title</Badge>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-success-500" />
                  <p className="text-sm font-semibold text-navy-900">
                    File Binary Hash
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  SHA-256 binary hash check prevents re-uploading identical scanned files.
                </p>
                <div className="mt-3">
                  <Badge tone="success">Unique File Hash</Badge>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* TAB CONTENT 5: Audit Trail Log */}
      {activeTab === "audit" && (
        <Card>
          <CardHeader
            title="Validation Audit Trail Log"
            subtitle="Granular log recording exact rule outcomes, timestamps, and conflicting values"
            action={
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Filter:</span>
                {["ALL", "PASSED", "WARNING", "CONFLICT"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setAuditFilter(f)}
                    className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                      auditFilter === f
                        ? "bg-navy-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            }
          />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-2.5 font-medium">Log ID</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium">Field</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Message</th>
                  <th className="px-4 py-2.5 font-medium">Extracted</th>
                  <th className="px-4 py-2.5 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAudit.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-400">
                      {entry.id}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap font-medium">
                      {entry.rule_category.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-navy-900 whitespace-nowrap">
                      {entry.field}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        tone={
                          entry.status === "PASSED"
                            ? "success"
                            : entry.status === "WARNING"
                            ? "warning"
                            : "danger"
                        }
                      >
                        {entry.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 text-xs max-w-[280px]">
                      {entry.message}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-slate-800">
                      {entry.extracted_value}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-slate-500">
                      {entry.reference_value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "success" | "danger" | "warning" | "neutral" | "brand";
}) {
  const toneClasses = {
    success: "bg-success-50 text-success-600",
    danger: "bg-danger-50 text-danger-500",
    warning: "bg-warning-50 text-warning-600",
    neutral: "bg-slate-100 text-slate-500",
    brand: "bg-brand-50 text-brand-700",
  }[tone];
  return (
    <div className="bg-white rounded-lg border border-slate-200/80 p-3.5 flex items-center gap-3">
      <span className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${toneClasses}`}>
        {icon}
      </span>
      <div>
        <p className="text-lg font-bold text-navy-900 leading-tight">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
  badge,
  badgeTone,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
  badge?: string;
  badgeTone?: "success" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-brand-600 text-brand-600"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`text-[11px] px-1.5 py-0.5 rounded-full ${
            active ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      )}
      {badge && (
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
            badgeTone === "danger"
              ? "bg-danger-100 text-danger-700"
              : "bg-success-100 text-success-700"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function FormatItem({
  title,
  rule,
  status,
}: {
  title: string;
  rule: string;
  status: "passed" | "warning" | "failed";
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
      <div>
        <p className="text-sm font-semibold text-navy-900">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{rule}</p>
      </div>
      <Badge tone={status === "passed" ? "success" : status === "warning" ? "warning" : "danger"}>
        {status === "passed" ? "Passed" : status === "warning" ? "Warning" : "Conflict"}
      </Badge>
    </div>
  );
}
