import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip } from "recharts";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Select } from "../../components/ui/Select";
import { getAnalyticsSummary, getDistrictProgress } from "../../services/analytics.service";
import type { AnalyticsSummary } from "../../services/analytics.service";
import type { DistrictProgress } from "../../types";
import { STATES } from "../../data/mockData";
import { formatNumber } from "../../utils/format";
import { Skeleton } from "../../components/ui/Skeleton";

const MONTHLY = [
  { month: "May", uploaded: 14200, processed: 12800, validated: 11400 },
  { month: "Jun", uploaded: 15800, processed: 14100, validated: 12600 },
  { month: "Jul", uploaded: 17300, processed: 15900, validated: 14000 },
  { month: "Aug", uploaded: 16600, processed: 16200, validated: 14800 },
  { month: "Sep", uploaded: 18900, processed: 17100, validated: 15600 },
  { month: "Oct", uploaded: 19700, processed: 18400, validated: 16900 },
];

const RECORD_TYPES = [
  { name: "Khasra", value: 42 },
  { name: "Jamabandi", value: 28 },
  { name: "Mutation", value: 15 },
  { name: "Registration", value: 10 },
  { name: "Others", value: 5 },
];

export function AnalyticsPage() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [districts, setDistricts] = useState<DistrictProgress[] | null>(null);

  const SUMMARY_LABELS: Array<{ key: keyof AnalyticsSummary; label: string; suffix?: string }> = [
    { key: "totalDigitized", label: t("analytics.totalDigitized", "Total Digitized Records") },
    { key: "processingSuccessRate", label: t("analytics.processingSuccessRate", "Processing Success Rate"), suffix: "%" },
    { key: "ocrConfidence", label: t("analytics.ocrConfidence", "OCR Confidence"), suffix: "%" },
    { key: "extractionConfidence", label: t("analytics.extractionConfidence", "Extraction Confidence"), suffix: "%" },
    { key: "validationPassRate", label: t("analytics.validationPassRate", "Validation Pass Rate"), suffix: "%" },
    { key: "humanVerificationRate", label: t("analytics.humanVerificationRate", "Human Verification Rate"), suffix: "%" },
    { key: "avgProcessingTimeMin", label: t("analytics.avgProcessingTime", "Avg. Processing Time"), suffix: " min" },
    { key: "avgVerificationTimeMin", label: t("analytics.avgVerificationTime", "Avg. Verification Time"), suffix: " min" },
    { key: "errorRate", label: t("analytics.errorRate", "Error Rate"), suffix: "%" },
  ];

  useEffect(() => {
    getAnalyticsSummary().then(setSummary);
    getDistrictProgress().then(setDistricts);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-navy-900">{t("nav.analytics", "Analytics & Reports")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t("analytics.subtitle", "Pipeline performance across processing, validation and verification.")}</p>
        </div>
        <div className="flex gap-2">
          <Select className="w-40"><option>{t("analytics.last6Months", "Last 6 Months")}</option><option>{t("analytics.last12Months", "Last 12 Months")}</option></Select>
          <Select className="w-40"><option>{t("documents.allStates", "All States")}</option>{STATES.map((s) => <option key={s}>{s}</option>)}</Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {SUMMARY_LABELS.slice(0, 5).map((s) => (
          <div key={s.key} className="bg-white rounded-lg border border-slate-200/80 p-4">
            {summary ? (
              <p className="text-xl font-semibold text-navy-900">
                {s.key === "totalDigitized" ? formatNumber(summary[s.key]) : summary[s.key]}
                {s.suffix ?? ""}
              </p>
            ) : (
              <Skeleton className="h-6 w-16" />
            )}
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {SUMMARY_LABELS.slice(5).map((s) => (
          <div key={s.key} className="bg-white rounded-lg border border-slate-200/80 p-4">
            {summary ? (
              <p className="text-xl font-semibold text-navy-900">{summary[s.key]}{s.suffix ?? ""}</p>
            ) : (
              <Skeleton className="h-6 w-16" />
            )}
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title={t("analytics.monthlyProgress", "Monthly Digitization Progress")} subtitle={t("analytics.monthlyProgressSub", "Uploaded vs. processed vs. validated")} />
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={MONTHLY} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9e4d5" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7a72" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7a72" }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7dcc0" }} />
                <Bar dataKey="uploaded" name={t("dashboard.uploaded", "Uploaded")} fill="#cfe6df" radius={[3, 3, 0, 0]} />
                <Bar dataKey="processed" name={t("dashboard.processed", "Processed")} fill="#3f9280" radius={[3, 3, 0, 0]} />
                <Bar dataKey="validated" name={t("dashboard.validated", "Validated")} fill="#175a50" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("analytics.docTypeDist", "Document Type Distribution")} subtitle={`${t("dashboard.totalDocuments", "Total")} ${summary ? formatNumber(summary.totalDigitized) : "—"}`} />
          <CardBody>
            <div className="space-y-3">
              {RECORD_TYPES.map((typeItem) => (
                <div key={typeItem.name}>
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span>{typeItem.name}</span>
                    <span className="font-medium text-navy-800">{typeItem.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${typeItem.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title={t("analytics.districtProgress", "District-wise Progress")} subtitle={t("analytics.districtProgressSub", "Document counts, processing status and error rates")} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="px-5 py-3 font-medium">{t("records.district", "District")}</th>
                <th className="px-5 py-3 font-medium">{t("records.district", "State")}</th>
                <th className="px-5 py-3 font-medium">{t("nav.documents", "Documents")}</th>
                <th className="px-5 py-3 font-medium">{t("dashboard.processed", "Processed")}</th>
                <th className="px-5 py-3 font-medium">{t("dashboard.pending", "Pending")}</th>
                <th className="px-5 py-3 font-medium">{t("common.error", "Errors")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {districts?.map((d) => (
                <tr key={`${d.state}-${d.district}`}>
                  <td className="px-5 py-3 font-medium text-navy-900">{d.district}</td>
                  <td className="px-5 py-3 text-slate-600">{d.state}</td>
                  <td className="px-5 py-3 text-slate-600">{formatNumber(d.documents)}</td>
                  <td className="px-5 py-3 text-slate-600">{formatNumber(d.processed)}</td>
                  <td className="px-5 py-3 text-slate-600">{formatNumber(d.pending)}</td>
                  <td className={`px-5 py-3 font-medium ${d.errors > 30 ? "text-danger-500" : "text-slate-600"}`}>{d.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
