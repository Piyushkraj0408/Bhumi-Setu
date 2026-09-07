import { useState } from "react";
import { Navigate, Outlet, useMatches } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "../../lib/AuthContext";
import { Loader2 } from "lucide-react";

export interface RouteBreadcrumbHandle {
  breadcrumb?: Array<{ label: string; to?: string }>;
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const { currentUser, isLoading } = useAuth();
  const matches = useMatches();
  const last = [...matches].reverse().find((m) => (m.handle as RouteBreadcrumbHandle)?.breadcrumb);
  const breadcrumb = (last?.handle as RouteBreadcrumbHandle)?.breadcrumb ?? [{ label: "Dashboard" }];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface text-slate-500 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        <span className="text-sm font-medium">Verifying session…</span>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header breadcrumb={breadcrumb} />
        <main className="flex-1 p-5 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

