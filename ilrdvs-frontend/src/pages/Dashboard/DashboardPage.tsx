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
  Search,
  Landmark,
  FileText,
  ArrowRight,
  ShieldCheck,
  Map,
  DownloadCloud,
  BadgeCheck,
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
import { useTranslation } from "react-i18next";
import { KPICard } from "../../components/cards/KPICard";
import { ChartCard } from "../../components/cards/ChartCard";
import { Card, CardBody } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { getStateProgress } from "../../services/analytics.service";
import { listVerificationTasks } from "../../services/verification.service";
import type { StateProgress, VerificationTask } from "../../types";
import { CURRENT_USER } from "../../data/mockData";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAuth } from "../../lib/AuthContext";

import {
  getDashboardStats,
  type DashboardResponse,
} from "../../services/dashboard.service";

const toneDot: Record<string, string> = {
  brand: "bg-brand-100 text-brand-700",
  info: "bg-info-50 text-info-500",
  danger: "bg-danger-50 text-danger-500",
  warning: "bg-warning-50 text-warning-600",
  success: "bg-success-50 text-success-600",
};

function CitizenDashboard({ userName }: { userName: string }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      localStorage.setItem("bhoomi_last_search_query", query.trim());
      navigate(`/records?owner=${encodeURIComponent(query.trim())}`);
    } else {
      navigate("/records");
    }
  };

  const sampleParcels = [
    {
      id: "LR-2024-1",
      khasra: "42/1",
      khata: "108",
      village: "Haveli",
      tehsil: "Haveli",
      district: "Pune",
      area: "2.45 Acres",
      landType: "Agricultural (Jarayat)",
      status: "Verified & Digitally Signed",
      owners: "Shri Anand Rao, Smt. Sunita Rao",
    },
    {
      id: "LR-2024-2",
      khasra: "108/B",
      khata: "214",
      village: "Wagholi",
      tehsil: "Haveli",
      district: "Pune",
      area: "1.80 Acres",
      landType: "Agricultural (Bagayat)",
      status: "Verified & Digitally Signed",
      owners: "Shri Rajesh Kumar",
    },
    {
      id: "LR-2024-3",
      khasra: "77/3",
      khata: "92",
      village: "Hinjewadi",
      tehsil: "Mulshi",
      district: "Pune",
      area: "4.12 Acres",
      landType: "Non-Agricultural (Commercial)",
      status: "Verified & Digitally Signed",
      owners: "Shri Suresh Patil",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy-900 via-navy-950 to-emerald-950 p-6 sm:p-8 text-white shadow-xl border border-emerald-900/30">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold mb-3">
              <BadgeCheck className="h-3.5 w-3.5" />
              <span>Consumer Land Portal • DILRMP Verified</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Welcome, {userName}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Access your digital land records, 7/12 & RoR extracts, cadastral maps, and verify ownership titles with instant cryptographic security.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              icon={<Map className="h-4 w-4" />}
              onClick={() => navigate("/gis")}
            >
              Cadastral Map
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40"
              icon={<Search className="h-4 w-4" />}
              onClick={() => navigate("/records")}
            >
              Search All Records
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Search Bar */}
      <Card className="border border-slate-200 shadow-sm">
        <CardBody className="p-4 sm:p-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your land record by Survey No., Khasra, Owner Name, or Village…"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto bg-navy-900 hover:bg-navy-800 text-white" icon={<Search className="h-4 w-4" />}>
              Search Records
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Consumer Quick Services */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate("/records")}
          className="cursor-pointer group p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-500/50 transition-all"
        >
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <FileText className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-sm text-navy-900 group-hover:text-emerald-700 transition-colors">
            7/12 & RoR Extracts
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Inspect verified ownership records, survey areas, and agricultural classification.
          </p>
          <div className="mt-3 flex items-center text-xs font-semibold text-emerald-700 gap-1">
            <span>View Records</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => navigate("/gis")}
          className="cursor-pointer group p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-500/50 transition-all"
        >
          <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Map className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-sm text-navy-900 group-hover:text-teal-700 transition-colors">
            Cadastral GIS Map
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Inspect survey boundaries, plot coordinates, and geo-referenced cadastral maps.
          </p>
          <div className="mt-3 flex items-center text-xs font-semibold text-teal-700 gap-1">
            <span>Open Map</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => navigate("/records")}
          className="cursor-pointer group p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-500/50 transition-all"
        >
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-sm text-navy-900 group-hover:text-blue-700 transition-colors">
            Mutation Tracking
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Track status of sale deeds, inheritance partitions, and title transfers.
          </p>
          <div className="mt-3 flex items-center text-xs font-semibold text-blue-700 gap-1">
            <span>Track Status</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => navigate("/records/LR-2024-1")}
          className="cursor-pointer group p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-500/50 transition-all"
        >
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <DownloadCloud className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-sm text-navy-900 group-hover:text-amber-700 transition-colors">
            Certified Copies
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Download digitally signed e-Records with QR verification for loans & legal registry.
          </p>
          <div className="mt-3 flex items-center text-xs font-semibold text-amber-700 gap-1">
            <span>Download Sample</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Featured / Available Records Table */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-emerald-700" />
              <span>Verified Land Parcels & Sample Records</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any parcel to inspect full RoR extracts, ownership breakdown, mutation history, and GIS map.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/records")}>
            View All Records
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Khasra / Survey No.</th>
                <th className="py-3 px-4">Owners</th>
                <th className="py-3 px-4">Location (Village / Tehsil)</th>
                <th className="py-3 px-4">Area</th>
                <th className="py-3 px-4">Land Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {sampleParcels.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-navy-900">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono border border-slate-200">
                      {p.khasra}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-normal">
                      Khata: {p.khata}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">{p.owners}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-medium text-slate-800">{p.village}</span>, {p.tehsil} ({p.district})
                  </td>
                  <td className="py-3.5 px-4 font-medium">{p.area}</td>
                  <td className="py-3.5 px-4 text-slate-600">{p.landType}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-xs"
                      onClick={() => navigate(`/records/${p.id}`)}
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { currentUser: authUser } = useAuth();

  const currentUser = authUser || CURRENT_USER;

  const navigate = useNavigate();

  const [states, setStates] =
    useState<StateProgress[] | null>(null);

  const [tasks, setTasks] =
    useState<VerificationTask[] | null>(null);

  const [dashboard, setDashboard] =
    useState<DashboardResponse | null>(null);

  const [dashboardLoading, setDashboardLoading] =
    useState(true);

  const [dashboardError, setDashboardError] =
    useState<string | null>(null);

  const ACTIVITY = [
  {
    icon: UploadCloud,
    text: t(
      "dashboard.act1",
      "New document uploaded"
    ),
    time: t(
      "dashboard.minsAgo2",
      "2 mins ago"
    ),
    tone: "brand" as const,
  },
  {
    icon: ScanText,
    text: t(
      "dashboard.act2",
      "OCR / HTR completed"
    ),
    time: t(
      "dashboard.minsAgo9",
      "9 mins ago"
    ),
    tone: "info" as const,
  },
  {
    icon: Sparkles,
    text: t(
      "dashboard.act3",
      "AI extraction completed"
    ),
    time: t(
      "dashboard.minsAgo11",
      "11 mins ago"
    ),
    tone: "brand" as const,
  },
  {
    icon: AlertTriangle,
    text: t(
      "dashboard.act4",
      "Validation failed"
    ),
    time: t(
      "dashboard.minsAgo18",
      "18 mins ago"
    ),
    tone: "danger" as const,
  },
  {
    icon: UserCheck,
    text: t(
      "dashboard.act5",
      "Record assigned to officer"
    ),
    time: t(
      "dashboard.minsAgo24",
      "24 mins ago"
    ),
    tone: "warning" as const,
  },
  {
    icon: CheckCircle2,
    text: t(
      "dashboard.act6",
      "Record approved"
    ),
    time: t(
      "dashboard.minsAgo36",
      "36 mins ago"
    ),
    tone: "success" as const,
  },
];

  useEffect(() => {
    getStateProgress()
      .then(setStates)
      .catch((error) => {
        console.error(
          "State progress error:",
          error
        );
      });

    listVerificationTasks()
      .then(setTasks)
      .catch((error) => {
        console.error(
          "Verification tasks error:",
          error
        );
      });

    getDashboardStats()
      .then((data) => {
        console.log(
          "Dashboard data from MongoDB:",
          data
        );

        setDashboard(data);
      })
      .catch((error) => {
        console.error(
          "Dashboard API error:",
          error
        );

        setDashboardError(
          error instanceof Error
            ? error.message
            : "Failed to load dashboard"
        );
      })
      .finally(() => {
        setDashboardLoading(false);
      });
  }, []);

  // ---------------------------------------------------------
  // CITIZEN DASHBOARD
  // ---------------------------------------------------------

  if (currentUser.systemRole === "citizen") {
    return (
      <CitizenDashboard
        userName={currentUser.name}
      />
    );
  }

  // ---------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------

  if (dashboardLoading) {
    return (
      <div className="space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-64" />

            <div className="mt-2">
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map(
            (_, index) => (
              <Skeleton
                key={index}
                className="h-32 w-full"
              />
            )
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>

      </div>
    );
  }

  // ---------------------------------------------------------
  // ERROR
  // ---------------------------------------------------------

  if (dashboardError || !dashboard) {
    return (
      <Card>
        <CardBody>
          <div className="py-12 text-center">

            <XCircle className="h-10 w-10 text-danger-500 mx-auto mb-3" />

            <h2 className="text-lg font-semibold text-navy-900">
              Dashboard data could not be loaded
            </h2>

            <p className="text-sm text-slate-500 mt-2">
              {dashboardError ||
                "No dashboard data was returned by the server."}
            </p>

            <Button
              className="mt-5"
              onClick={() =>
                window.location.reload()
              }
            >
              Retry
            </Button>

          </div>
        </CardBody>
      </Card>
    );
  }

  // ---------------------------------------------------------
  // REAL DATA FROM API / MONGODB
  // ---------------------------------------------------------

  const stats = dashboard.stats;

  const validationData = [
    {
      name: t(
        "records.valid",
        "Validated"
      ),
      value: dashboard.validation.validated,
      color: "#2e7d4f",
    },
    {
      name: t(
        "verification.pending",
        "Pending"
      ),
      value: dashboard.validation.pending,
      color: "#b8860b",
    },
    {
      name: t(
        "common.failed",
        "Failed"
      ),
      value: dashboard.validation.failed,
      color: "#c0392b",
    },
    {
      name: t(
        "common.duplicate",
        "Duplicate"
      ),
      value: dashboard.validation.duplicate,
      color: "#a99f86",
    },
  ];

  const processedPercentage =
    stats.total_documents > 0
      ? (
          (stats.processed_documents /
            stats.total_documents) *
          100
        ).toFixed(1)
      : "0.0";

  const firstName =
    currentUser.name.split(" ")[1] ??
    currentUser.name;

  const pending =
  tasks?.filter(
    (task) => task.status === "pending"
  ).length ?? 0;

const overdue =
  tasks?.filter(
    (task) =>
      task.flags?.includes("overdue")
  ).length ?? 0;

const highPriority =
  tasks?.filter(
    (task) => task.priority === "High"
  ).length ?? 0;

const assignedToMe =
  tasks?.filter(
    (task) =>
      task.assignedTo === "A. Sharma"
  ).length ?? 0;

  return (
    <div className="space-y-5">

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div className="flex items-center justify-between flex-wrap gap-3">

        <div>

          <h1 className="text-xl font-semibold text-navy-900">
            {t(
              "dashboard.greeting",
              "Good morning, Officer"
            )}{" "}
            {firstName}
          </h1>

          <p className="text-sm text-slate-500 mt-0.5">
            {t(
              "dashboard.subDescription",
              "Here's today's land record digitization overview — monitor processing, AI extraction, validation and verification activity."
            )}
          </p>

        </div>

        <div className="flex gap-2">

          <Button
            variant="outline"
            size="sm"
          >
            {t(
              "dashboard.last30Days",
              "Last 30 Days"
            )}
          </Button>

          <Button
            size="sm"
            icon={
              <UploadCloud className="h-3.5 w-3.5" />
            }
            onClick={() =>
              navigate("/documents/upload")
            }
          >
            {t(
              "dashboard.uploadDocument",
              "Upload Document"
            )}
          </Button>

        </div>

      </div>

      {/* ================================================= */}
      {/* REAL KPI DATA */}
      {/* ================================================= */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <KPICard
          label={t(
            "dashboard.totalDocuments",
            "Total Documents"
          )}
          value={stats.total_documents}
          context={
            dashboard.tehsil_code
              ? `Tehsil ${dashboard.tehsil_code}`
              : "All accessible documents"
          }
          icon={
            <FileStack className="h-4 w-4" />
          }
        />

        <KPICard
          label={t(
            "dashboard.processed",
            "Processed"
          )}
          value={stats.processed_documents}
          context={`${processedPercentage}% of total uploads`}
          icon={
            <Loader2 className="h-4 w-4" />
          }
        />

        <KPICard
          label={t(
            "dashboard.pendingVerification",
            "Pending Verification"
          )}
          value={stats.pending_verification}
          tone="warning"
          context="Currently waiting for verification"
          icon={
            <ClipboardList className="h-4 w-4" />
          }
        />

        <KPICard
          label={t(
            "dashboard.validationErrors",
            "Validation Errors"
          )}
          value={stats.failed_documents}
          tone="danger"
          context="Documents requiring attention"
          icon={
            <XCircle className="h-4 w-4" />
          }
        />

        <KPICard
          label={t(
            "dashboard.processing",
            "Processing"
          )}
          value={stats.processing_documents}
          tone="brand"
          context="Currently in the AI pipeline"
          icon={
            <Loader2 className="h-4 w-4" />
          }
        />

        <KPICard
          label={t(
            "dashboard.failed",
            "Failed"
          )}
          value={stats.failed_documents}
          tone="danger"
          context="Requires attention"
          icon={
            <XCircle className="h-4 w-4" />
          }
        />

        <KPICard
          label={t(
            "dashboard.approved",
            "Approved"
          )}
          value={stats.approved_master_records}
          tone="success"
          context="Digitally certified records"
          icon={
            <ThumbsUp className="h-4 w-4" />
          }
        />

        <KPICard
          label={t(
            "dashboard.rejected",
            "Rejected"
          )}
          value={stats.rejected_documents}
          tone="danger"
          context="Sent back for re-verification"
          icon={
            <ThumbsDown className="h-4 w-4" />
          }
        />

      </div>

      {/* ================================================= */}
      {/* REAL PROCESSING GRAPH + VALIDATION DONUT */}
      {/* ================================================= */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* PROCESSING TREND */}

        <div className="lg:col-span-2">

          <ChartCard
            title={t(
              "dashboard.processingTrend",
              "Processing Trend"
            )}
            subtitle={t(
              "dashboard.processingTrendSub",
              "Documents uploaded, processed and validated over the last 7 days"
            )}
          >

            <ResponsiveContainer
              width="100%"
              height={260}
            >

              <AreaChart
                data={dashboard.trend}
                margin={{
                  left: -20,
                  right: 10,
                }}
              >

                <defs>

                  <linearGradient
                    id="upl"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#3f9280"
                      stopOpacity={0.35}
                    />

                    <stop
                      offset="95%"
                      stopColor="#3f9280"
                      stopOpacity={0}
                    />
                  </linearGradient>

                  <linearGradient
                    id="proc"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#2e7d4f"
                      stopOpacity={0.3}
                    />

                    <stop
                      offset="95%"
                      stopColor="#2e7d4f"
                      stopOpacity={0}
                    />
                  </linearGradient>

                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e9e4d5"
                />

                <XAxis
                  dataKey="day"
                  tick={{
                    fontSize: 11,
                    fill: "#6b7a72",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fontSize: 11,
                    fill: "#6b7a72",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <RTooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border:
                      "1px solid #e7dcc0",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="uploaded"
                  name={t(
                    "dashboard.uploaded",
                    "Uploaded"
                  )}
                  stroke="#175a50"
                  fill="url(#upl)"
                  strokeWidth={2}
                />

                <Area
                  type="monotone"
                  dataKey="processed"
                  name={t(
                    "dashboard.processed",
                    "Processed"
                  )}
                  stroke="#2e7d4f"
                  fill="url(#proc)"
                  strokeWidth={2}
                />

                <Area
                  type="monotone"
                  dataKey="validated"
                  name={t(
                    "dashboard.validated",
                    "Validated"
                  )}
                  stroke="#b8860b"
                  fill="transparent"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />

              </AreaChart>

            </ResponsiveContainer>

          </ChartCard>

        </div>

        {/* VALIDATION DONUT */}

        <ChartCard
          title={t(
            "dashboard.validationStatus",
            "Validation Status"
          )}
          subtitle={t(
            "dashboard.valStatusSub",
            "Share of processed documents"
          )}
        >

          <div
            style={{
              width: "100%",
              height: 180,
            }}
          >

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <PieChart>

                <Pie
                  data={validationData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                >

                  {validationData.map(
                    (entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                      />
                    )
                  )}

                </Pie>

                <RTooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border:
                      "1px solid #e7dcc0",
                  }}
                />

              </PieChart>

            </ResponsiveContainer>

          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">

            {validationData.map(
              (item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-1.5 text-xs text-slate-600"
                >

                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background:
                        item.color,
                    }}
                  />

                  {item.name}

                  <span className="ml-auto font-medium text-navy-800">
                    {item.value}%
                  </span>

                </div>
              )
            )}

          </div>

        </ChartCard>

      </div>

      {/* ================================================= */}
      {/* EXISTING STATE PROGRESS */}
      {/* ================================================= */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <div className="lg:col-span-2">

          <ChartCard
            title={t(
              "dashboard.stateProgress",
              "State-wise Progress"
            )}
            subtitle={t(
              "dashboard.stateProgressSub",
              "Total records digitized and approved per state"
            )}
            action={
              <button
                className="text-xs text-brand-600 font-medium hover:underline"
                onClick={() =>
                  navigate("/analytics")
                }
              >
                {t(
                  "dashboard.viewAll",
                  "View All"
                )}
              </button>
            }
          >

            {!states ? (

              <div className="space-y-3">

                {Array.from({
                  length: 5,
                }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-6 w-full"
                  />
                ))}

              </div>

            ) : (

              <ResponsiveContainer
                width="100%"
                height={220}
              >

                <BarChart
                  data={states}
                  layout="vertical"
                  margin={{
                    left: 10,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#e9e4d5"
                  />

                  <XAxis
                    type="number"
                    tick={{
                      fontSize: 11,
                      fill: "#6b7a72",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    dataKey="state"
                    type="category"
                    width={110}
                    tick={{
                      fontSize: 11,
                      fill: "#1b342c",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <RTooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border:
                        "1px solid #e7dcc0",
                    }}
                  />

                  <Bar
                    dataKey="totalRecords"
                    name={t(
                      "dashboard.totalRecords",
                      "Total Records"
                    )}
                    fill="#cfe6df"
                    radius={[
                      0,
                      4,
                      4,
                      0,
                    ]}
                  />

                  <Bar
                    dataKey="approved"
                    name={t(
                      "dashboard.approved",
                      "Approved"
                    )}
                    fill="#175a50"
                    radius={[
                      0,
                      4,
                      4,
                      0,
                    ]}
                  />

                </BarChart>

              </ResponsiveContainer>

            )}

          </ChartCard>

        </div>

        {/* ================================================= */}
        {/* EXISTING VERIFICATION WORKLOAD */}
        {/* ================================================= */}

        <Card>

          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">

            <h3 className="text-sm font-semibold text-navy-900">
              {t(
                "dashboard.verificationWorkload",
                "Verification Workload"
              )}
            </h3>

            <button
              className="text-xs text-brand-600 font-medium hover:underline"
              onClick={() =>
                navigate("/verification")
              }
            >
              {t(
                "dashboard.openQueue",
                "Open Queue"
              )}
            </button>

          </div>

          <div className="p-5 grid grid-cols-2 gap-4">

            <div>
              <p className="text-2xl font-semibold text-navy-900">
                {pending}
              </p>

              <p className="text-xs text-slate-500">
                {t(
                  "dashboard.pending",
                  "Pending"
                )}
              </p>
            </div>

            <div>
              <p className="text-2xl font-semibold text-navy-900">
                {assignedToMe}
              </p>

              <p className="text-xs text-slate-500">
                {t(
                  "dashboard.assignedToMe",
                  "Assigned to me"
                )}
              </p>
            </div>

            <div>
              <p className="text-2xl font-semibold text-warning-600">
                {highPriority}
              </p>

              <p className="text-xs text-slate-500">
                {t(
                  "dashboard.highPriority",
                  "High priority"
                )}
              </p>
            </div>

            <div>
              <p className="text-2xl font-semibold text-danger-500">
                {overdue}
              </p>

              <p className="text-xs text-slate-500">
                {t(
                  "dashboard.overdue",
                  "Overdue"
                )}
              </p>
            </div>

          </div>

        </Card>

      </div>

      {/* ================================================= */}
      {/* EXISTING RECENT ACTIVITY */}
      {/* ================================================= */}

      <ChartCard
        title={t(
          "dashboard.recentActivity",
          "Recent Activity"
        )}
        subtitle={t(
          "dashboard.recentActivitySub",
          "Latest processing, extraction and verification events"
        )}
      >

        <div className="flex flex-col">

          {ACTIVITY.map(
            (a, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-2.5 border-b last:border-0 border-slate-50"
              >

                <span
                  className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${toneDot[a.tone]}`}
                >
                  <a.icon className="h-3.5 w-3.5" />
                </span>

                <p className="text-sm text-navy-800 flex-1">
                  {a.text}
                </p>

                <span className="text-xs text-slate-400 shrink-0">
                  {a.time}
                </span>

              </div>
            )
          )}

        </div>

      </ChartCard>

    </div>
  );
}