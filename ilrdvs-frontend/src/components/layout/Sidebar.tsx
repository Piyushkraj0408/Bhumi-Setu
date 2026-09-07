import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  FileStack,
  UploadCloud,
  Files,
  Cpu,
  ScanText,
  Sparkles,
  ShieldCheck,
  ClipboardCheck,
  ListChecks,
  CheckCircle2,
  Search,
  Map,
  MapPinned,
  Compass,
  BarChart3,
  History,
  Settings2,
  UserCog,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Landmark,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { useAuth } from "../../lib/AuthContext";
import type { SystemRole } from "../../types";

interface NavChild {
  label: string;
  tKey?: string;
  to: string;
  icon: React.ElementType;
  /** Roles allowed to see this nav item. Omit = visible to all. */
  roles?: SystemRole[];
}
interface NavGroup {
  label: string;
  tKey?: string;
  icon: React.ElementType;
  to?: string;
  children?: NavChild[];
  /** Roles allowed to see this group. Omit = visible to all. */
  roles?: SystemRole[];
}

// ---------------------------------------------------------------------------
// Role-gated navigation map
// Each item declares which systemRoles can see it.
// super_admin & state_admin see everything (handled in canSee()).
// ---------------------------------------------------------------------------
const NAV: NavGroup[] = [
  { label: "Dashboard", tKey: "nav.dashboard", icon: LayoutDashboard, to: "/dashboard" },

  {
    label: "Documents",
    tKey: "nav.documents",
    icon: FileStack,
    roles: ["super_admin", "state_admin", "district_admin", "tehsil_officer"],
    children: [
      {
        label: "Upload Document",
        tKey: "nav.uploadDocument",
        to: "/documents/upload",
        icon: UploadCloud,
        roles: ["super_admin", "state_admin", "district_admin", "tehsil_officer"],
      },
      {
        label: "All Documents",
        tKey: "nav.allDocuments",
        to: "/documents",
        icon: Files,
        roles: ["super_admin", "state_admin", "district_admin", "tehsil_officer"],
      },
      {
        label: "Processing",
        tKey: "nav.processing",
        to: "/documents/processing",
        icon: Cpu,
        roles: ["super_admin", "state_admin", "district_admin", "tehsil_officer"],
      },
    ],
  },

  {
    label: "AI Processing",
    tKey: "nav.aiProcessing",
    icon: Sparkles,
    roles: ["super_admin", "state_admin", "district_admin", "tehsil_officer"],
    children: [
      {
        label: "OCR / HTR",
        tKey: "nav.ocr",
        to: "/ai/ocr",
        icon: ScanText,
        roles: ["super_admin", "state_admin", "district_admin", "tehsil_officer"],
      },
      {
        label: "Extraction",
        tKey: "nav.extraction",
        to: "/ai/extraction",
        icon: Sparkles,
        roles: ["super_admin", "state_admin", "district_admin", "tehsil_officer"],
      },
      {
        label: "Validation",
        tKey: "nav.validation",
        to: "/ai/validation",
        icon: ShieldCheck,
        roles: ["super_admin", "state_admin", "district_admin", "tehsil_officer"],
      },
    ],
  },

  {
    label: "Verification",
    tKey: "nav.verification",
    icon: ClipboardCheck,
    roles: ["super_admin", "state_admin", "district_admin", "tehsil_officer", "verification_officer"],
    children: [
      {
        label: "Verification Queue",
        tKey: "nav.verificationQueue",
        to: "/verification",
        icon: ListChecks,
        roles: ["super_admin", "state_admin", "district_admin", "tehsil_officer", "verification_officer"],
      },
      {
        label: "My Tasks",
        tKey: "nav.myTasks",
        to: "/verification/my-tasks",
        icon: ClipboardCheck,
        roles: ["super_admin", "state_admin", "district_admin", "tehsil_officer", "verification_officer"],
      },
      {
        label: "Completed",
        tKey: "nav.completed",
        to: "/verification/completed",
        icon: CheckCircle2,
        roles: ["super_admin", "state_admin", "district_admin", "tehsil_officer", "verification_officer"],
      },
    ],
  },

  {
    label: "Land Records",
    tKey: "nav.landRecords",
    icon: Landmark,
    children: [
      { label: "Search Records", tKey: "nav.searchRecords", to: "/records", icon: Search },
      { label: "Record Details", tKey: "nav.recordDetails", to: "/records/LR-2024-1", icon: MapPinned },
    ],
  },

  {
    label: "GIS",
    tKey: "nav.gis",
    icon: Map,
    roles: ["super_admin", "state_admin", "district_admin", "tehsil_officer"],
    children: [
      {
        label: "Cadastral Map",
        tKey: "nav.cadastralMap",
        to: "/gis",
        icon: Map,
        roles: ["super_admin", "state_admin", "district_admin", "tehsil_officer"],
      },
      {
        label: "Spatial Validation",
        tKey: "nav.spatialValidation",
        to: "/gis?tab=validation",
        icon: Compass,
        roles: ["super_admin", "state_admin", "district_admin", "tehsil_officer"],
      },
    ],
  },

  {
    label: "Analytics",
    tKey: "nav.analytics",
    icon: BarChart3,
    to: "/analytics",
    roles: ["super_admin", "state_admin", "district_admin"],
  },

  {
    label: "Audit Trail",
    tKey: "nav.auditTrail",
    icon: History,
    to: "/audit",
    roles: ["super_admin", "state_admin", "district_admin", "auditor"],
  },

  {
    label: "Administration",
    tKey: "nav.administration",
    icon: UserCog,
    to: "/admin",
    roles: ["super_admin", "state_admin"],
  },

  { label: "Settings", tKey: "nav.settings", icon: Settings2, to: "/settings" },
];

// ---------------------------------------------------------------------------
// Helper: can a role see a nav item?
// super_admin and state_admin always see everything.
// ---------------------------------------------------------------------------
function canSee(itemRoles: SystemRole[] | undefined, userRole: SystemRole): boolean {
  if (!itemRoles) return true; // no restriction
  if (userRole === "super_admin" || userRole === "state_admin") return true;
  return itemRoles.includes(userRole);
}

function GroupItem({
  group,
  collapsed,
  userRole,
}: {
  group: NavGroup;
  collapsed: boolean;
  userRole: SystemRole;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  if (!canSee(group.roles, userRole)) return null;

  const displayLabel = group.tKey ? t(group.tKey, group.label) : group.label;

  if (!group.children) {
    return (
      <NavLink
        to={group.to!}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
          )
        }
      >
        <group.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{displayLabel}</span>}
      </NavLink>
    );
  }

  // Filter children by role
  const visibleChildren = group.children.filter((c) => canSee(c.roles, userRole));
  if (visibleChildren.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
      >
        <group.icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{displayLabel}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </>
        )}
      </button>
      {open && !collapsed && (
        <div className="mt-0.5 ml-3.5 pl-3 border-l border-white/10 flex flex-col gap-0.5">
          {visibleChildren.map((child) => (
            <ChildLink key={child.to} child={child} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChildLink({ child }: { child: NavChild }) {
  const { t } = useTranslation();
  const location = useLocation();
  const [childPath, childSearch] = child.to.split("?");
  const isActive =
    location.pathname === childPath &&
    (childSearch ? location.search === `?${childSearch}` : location.search === "");

  const displayLabel = child.tKey ? t(child.tKey, child.label) : child.label;

  return (
    <NavLink
      to={child.to}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
        isActive ? "bg-brand-600/90 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <child.icon className="h-3.5 w-3.5 shrink-0" />
      <span>{displayLabel}</span>
    </NavLink>
  );
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const userRole: SystemRole = currentUser?.systemRole ?? "tehsil_officer";

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 bg-navy-950 flex flex-col shrink-0 transition-all duration-200 border-r border-white/5",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      <div className="flex items-center gap-3 px-3.5 h-16 border-b border-white/10 shrink-0">
        <div className="h-9 w-9 rounded-full bg-white p-0.5 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
          <img
            src="/logo.png"
            alt="BhoomiSetu"
            className="w-full h-full object-cover rounded-full"
          />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-white text-sm font-bold leading-tight tracking-tight">BhoomiSetu</p>
            <p className="text-[10px] text-emerald-400 font-medium leading-tight truncate">Land Records Portal</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3 flex flex-col gap-1">
        {NAV.map((group) => (
          <GroupItem key={group.label} group={group} collapsed={collapsed} userRole={userRole} />
        ))}
      </nav>

      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-4 h-11 border-t border-white/10 text-slate-400 hover:text-white text-xs shrink-0"
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        {!collapsed && <span>{t("nav.collapse", "Collapse")}</span>}
      </button>
    </aside>
  );
}
