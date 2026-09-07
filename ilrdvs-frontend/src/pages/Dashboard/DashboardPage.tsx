import { useEffect, useState } from "react";
import {
  FileStack,
  CheckCircle2,
  Loader2,
  XCircle,
  ClipboardList,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  UploadCloud,
  ScanText,
  Sparkles,
  UserCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { KPICard } from "../../components/cards/KPICard";
import { ChartCard } from "../../components/cards/ChartCard";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { getStateProgress } from "../../services/analytics.service";
import { listVerificationTasks } from "../../services/verification.service";
import type { StateProgress, VerificationTask } from "../../types";
import { CURRENT_USER } from "../../data/mockData";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "../../components/ui/Skeleton";

const TREND_DATA = [
  { day: "Oct 21", uploaded: 1180, processed: 980, validated: 860 },
  { day: "Oct 22", uploaded: 1340, processed: 1120, validated: 990 },
  { day: "Oct 23", uploaded: 1010, processed: 1230, validated: 1080 },
  { day: "Oct 24", uploaded: 1560, processed: 1340, validated: 1160 },
  { day: "Oct 25", uploaded: 1420, processed: 1580, validated: 1390 },
  { day: "Oct 26", uploaded: 1780, processed: 1500, validated: 1310 },
  { day: "Oct 27", uploaded: 1690, processed: 1720, validated: 1540 },
];

const VALIDATION_DONUT = [
  { name: "Validated", value: 88.2, color: "#2e7d4f" },
  { name: "Pending", value: 7.4, color: "#b8860b" },
  { name: "Failed", value: 3.1, color: "#c0392b" },
  { name: "Duplicate", value: 1.3, color: "#a99f86" },
];

const ACTIVITY = [
  { icon: UploadCloud, text: "New document uploaded — DOC-2024-1042", time: "2 mins ago", tone: "brand" as const },
  { icon: ScanText, text: "OCR / HTR completed for DOC-2024-1038", time: "9 mins ago", tone: "info" as const },
  { icon: Sparkles, text: "AI extraction completed for DOC-2024-1038", time: "11 mins ago", tone: "brand" as const },
  { icon: AlertTriangle, text: "Validation failed — Owner conflict on DOC-2024-1004", time: "18 mins ago", tone: "danger" as const },
  { icon: UserCheck, text: "Record assigned to Officer A. Sharma", time: "24 mins ago", tone: "warning" as const },
  { icon: CheckCircle2, text: "Record approved — LR-2024-0892", time: "36 mins ago", tone: "success" as const },
];

const toneDot: Record<string, string> = {
  brand: "bg-brand-100 text-brand-700",
  info: "bg-info-50 text-info-500",
  danger: "bg-danger-50 text-danger-500",
  warning: "bg-warning-50 text-warning-600",
  success: "bg-success-50 text-success-600",
};

export function DashboardPage() {
  const [states, setStates] = useState<StateProgress[] | null>(null);
  const [tasks, setTasks] = useState<VerificationTask[] | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getStateProgress().then(setStates);
    listVerificationTasks().then(setTasks);
  }, []);

  const firstName = CURRENT_USER.name.split(" ")[1] ?? CURRENT_USER.name;
  const pending = tasks?.filter((t) => t.status === "pending").length ?? 0;
  const overdue = tasks?.filter((t) => t.flags.includes("overdue")).length ?? 0;
  const highPriority = tasks?.filter((t) => t.priority === "High").length ?? 0;
  const assignedToMe = tasks?.filter((t) => t.assignedTo === "A. Sharma").length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-navy-900">Good morning, Officer {firstName}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Here's today's land record digitization overview — monitor processing, AI extraction, validation
            and verification activity.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Last 30 Days
          </Button>
          <Button size="sm" icon={<UploadCloud className="h-3.5 w-3.5" />} onClick={() => navigate("/documents/upload")}>
            Upload Document
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Total Documents" value={124560} changePct={12} trend="up" context="Across 5 states, 30 days" icon={<FileStack className="h-4 w-4" />} />
        <KPICard label="Processed" value={109824} changePct={8} trend="up" context="88.2% of total uploads" icon={<Loader2 className="h-4 w-4" />} />
        <KPICard label="Pending Verification" value={342} changePct={5} trend="up" tone="warning" context={`${highPriority || 58} high priority`} icon={<ClipboardList className="h-4 w-4" />} />
        <KPICard label="Validation Errors" value={3862} changePct={2} trend="down" tone="danger" context="3.1% of processed documents" icon={<XCircle className="h-4 w-4" />} />
        <KPICard label="Processing" value={10982} changePct={4} trend="up" tone="brand" context="Currently in the AI pipeline" icon={<Loader2 className="h-4 w-4" />} />
        <KPICard label="Failed" value={614} changePct={3} trend="down" tone="danger" context="Requires manual re-scan" icon={<XCircle className="h-4 w-4" />} />
        <KPICard label="Approved" value={98213} changePct={9} trend="up" tone="success" context="Digitally certified records" icon={<ThumbsUp className="h-4 w-4" />} />
        <KPICard label="Rejected" value={1122} changePct={1} trend="down" tone="danger" context="Sent back for re-verification" icon={<ThumbsDown className="h-4 w-4" />} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartCard title="Processing Trend" subtitle="Documents uploaded, processed and validated over the last 7 days">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={TREND_DATA} margin={{ left: -20, right: 10 }}>
                <defs>
                  <linearGradient id="upl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3f9280" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3f9280" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="proc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2e7d4f" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2e7d4f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9e4d5" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7a72" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7a72" }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7dcc0" }} />
                <Area type="monotone" dataKey="uploaded" name="Uploaded" stroke="#175a50" fill="url(#upl)" strokeWidth={2} />
                <Area type="monotone" dataKey="processed" name="Processed" stroke="#2e7d4f" fill="url(#proc)" strokeWidth={2} />
                <Area type="monotone" dataKey="validated" name="Validated" stroke="#b8860b" fill="transparent" strokeWidth={2} strokeDasharray="4 3" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="Validation Status" subtitle="Share of processed documents">
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={VALIDATION_DONUT} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {VALIDATION_DONUT.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7dcc0" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {VALIDATION_DONUT.map((v) => (
              <div key={v.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ background: v.color }} />
                {v.name} <span className="ml-auto font-medium text-navy-800">{v.value}%</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartCard
            title="State-wise Progress"
            subtitle="Total records digitized and approved per state"
            action={
              <button className="text-xs text-brand-600 font-medium hover:underline" onClick={() => navigate("/analytics")}>
                View All
              </button>
            }
          >
            {!states ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={states} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e9e4d5" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7a72" }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="state" type="category" width={110} tick={{ fontSize: 11, fill: "#1b342c" }} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7dcc0" }} />
                  <Bar dataKey="totalRecords" name="Total Records" fill="#cfe6df" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="approved" name="Approved" fill="#175a50" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <Card>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-navy-900">Verification Workload</h3>
            <button className="text-xs text-brand-600 font-medium hover:underline" onClick={() => navigate("/verification")}>
              Open Queue
            </button>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-semibold text-navy-900">{pending || 128}</p>
              <p className="text-xs text-slate-500">Pending</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-navy-900">{assignedToMe || 14}</p>
              <p className="text-xs text-slate-500">Assigned to me</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-warning-600">{highPriority || 58}</p>
              <p className="text-xs text-slate-500">High priority</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-danger-500">{overdue || 9}</p>
              <p className="text-xs text-slate-500">Overdue</p>
            </div>
          </div>
        </Card>
      </div>

      <ChartCard title="Recent Activity" subtitle="Latest processing, extraction and verification events">
        <div className="flex flex-col">
          {ACTIVITY.map((a, i) => (
            <div key={i} className="flex items-start gap-3 py-2.5 border-b last:border-0 border-slate-50">
              <span className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${toneDot[a.tone]}`}>
                <a.icon className="h-3.5 w-3.5" />
              </span>
              <p className="text-sm text-navy-800 flex-1">{a.text}</p>
              <span className="text-xs text-slate-400 shrink-0">{a.time}</span>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
}
