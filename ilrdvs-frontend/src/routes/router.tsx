import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { LoginPage } from "../pages/Login/LoginPage";
import { DashboardPage } from "../pages/Dashboard/DashboardPage";
import { DocumentUploadPage } from "../pages/Documents/DocumentUploadPage";
import { DocumentManagementPage } from "../pages/Documents/DocumentManagementPage";
import { DocumentDetailsPage } from "../pages/Documents/DocumentDetailsPage";
import { ProcessingStatusPage } from "../pages/Documents/ProcessingStatusPage";
import { OcrViewerPage } from "../pages/Documents/OcrViewerPage";
import { ExtractionViewerPage } from "../pages/Documents/ExtractionViewerPage";
import { ValidationResultsPage } from "../pages/Documents/ValidationResultsPage";
import { VerificationQueuePage } from "../pages/Verification/VerificationQueuePage";
import { VerificationWorkspacePage } from "../pages/Verification/VerificationWorkspacePage";
import { RecordSearchPage } from "../pages/Records/RecordSearchPage";
import { RecordDetailsPage } from "../pages/Records/RecordDetailsPage";
import { GisMapPage } from "../pages/GIS/GisMapPage";
import { AnalyticsPage } from "../pages/Analytics/AnalyticsPage";
import { AuditTrailPage } from "../pages/Audit/AuditTrailPage";
import { AdministrationPage } from "../pages/Administration/AdministrationPage";
import { SettingsPage } from "../pages/Settings/SettingsPage";

const bc = (items: Array<{ label: string; to?: string }>) => ({ handle: { breadcrumb: items } });

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginPage /> },
  {
    element: <AppShell />,
    children: [
      { path: "/dashboard", element: <DashboardPage />, ...bc([{ label: "Dashboard" }]) },

      { path: "/documents/upload", element: <DocumentUploadPage />, ...bc([{ label: "Documents", to: "/documents" }, { label: "Upload" }]) },
      { path: "/documents", element: <DocumentManagementPage />, ...bc([{ label: "Documents" }]) },
      { path: "/documents/processing/:id", element: <ProcessingStatusPage />, ...bc([{ label: "Documents", to: "/documents" }, { label: "Processing" }]) },
      { path: "/documents/:id/ocr", element: <OcrViewerPage />, ...bc([{ label: "AI Processing" }, { label: "OCR / HTR" }]) },
      { path: "/documents/:id/extraction", element: <ExtractionViewerPage />, ...bc([{ label: "AI Processing" }, { label: "Extraction" }]) },
      { path: "/documents/:id/validation", element: <ValidationResultsPage />, ...bc([{ label: "AI Processing" }, { label: "Validation" }]) },
      { path: "/documents/:id", element: <DocumentDetailsPage />, ...bc([{ label: "Documents", to: "/documents" }, { label: "Details" }]) },

      { path: "/verification", element: <VerificationQueuePage />, ...bc([{ label: "Verification", to: "/verification" }, { label: "Queue" }]) },
      { path: "/verification/:id", element: <VerificationWorkspacePage />, ...bc([{ label: "Verification", to: "/verification" }, { label: "Workspace" }]) },

      { path: "/records", element: <RecordSearchPage />, ...bc([{ label: "Land Records" }, { label: "Search" }]) },
      { path: "/records/:id", element: <RecordDetailsPage />, ...bc([{ label: "Land Records", to: "/records" }, { label: "Record Details" }]) },

      { path: "/gis", element: <GisMapPage />, ...bc([{ label: "GIS" }, { label: "Cadastral Map" }]) },

      { path: "/analytics", element: <AnalyticsPage />, ...bc([{ label: "Analytics" }]) },
      { path: "/audit", element: <AuditTrailPage />, ...bc([{ label: "Audit Trail" }]) },
      { path: "/admin", element: <AdministrationPage />, ...bc([{ label: "Administration" }]) },
      { path: "/settings", element: <SettingsPage />, ...bc([{ label: "Settings" }]) },

      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
