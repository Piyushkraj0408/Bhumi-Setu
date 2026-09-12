import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function Breadcrumb({ items }: { items: Array<{ label: string; to?: string }> }) {
  const { t } = useTranslation();

  const keyMap: Record<string, string> = {
    Dashboard: "nav.dashboard",
    Documents: "nav.documents",
    "Upload Document": "nav.uploadDocument",
    "All Documents": "nav.allDocuments",
    Processing: "nav.processing",
    "AI Processing": "nav.aiProcessing",
    "OCR / HTR": "nav.ocr",
    Extraction: "nav.extraction",
    Validation: "nav.validation",
    Verification: "nav.verification",
    "Verification Queue": "nav.verificationQueue",
    "My Tasks": "nav.myTasks",
    Completed: "nav.completed",
    "Land Records": "nav.landRecords",
    "Search Records": "nav.searchRecords",
    "Record Details": "nav.recordDetails",
    GIS: "nav.gis",
    "Cadastral Map": "nav.cadastralMap",
    "Spatial Validation": "nav.spatialValidation",
    Analytics: "nav.analytics",
    "Audit Trail": "nav.auditTrail",
    Administration: "nav.administration",
    Settings: "nav.settings",
  };

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const displayLabel = keyMap[item.label] ? t(keyMap[item.label], item.label) : item.label;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3 text-slate-300" />}
            {item.to ? (
              <Link to={item.to} className="hover:text-brand-600 transition-colors">
                {displayLabel}
              </Link>
            ) : (
              <span className="text-navy-800 font-medium">{displayLabel}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
