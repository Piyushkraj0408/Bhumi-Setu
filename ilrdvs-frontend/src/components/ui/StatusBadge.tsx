import type { ReactElement } from "react";
import { CheckCircle2, Clock, XCircle, AlertTriangle, Loader2, CircleDashed } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "./Badge";
import type { ProcessingStatus, ValidationStatus, VerificationStatus } from "../../types";

const PROCESSING_CONFIG: Record<ProcessingStatus, { tone: "neutral" | "info" | "success" | "danger"; icon: ReactElement; key: string; defaultLabel: string }> = {
  uploaded: { tone: "neutral", icon: <CircleDashed className="h-3 w-3" />, key: "status.uploaded", defaultLabel: "Uploaded" },
  processing: { tone: "info", icon: <Loader2 className="h-3 w-3 animate-spin" />, key: "status.processing", defaultLabel: "Processing" },
  completed: { tone: "success", icon: <CheckCircle2 className="h-3 w-3" />, key: "status.completed", defaultLabel: "Completed" },
  failed: { tone: "danger", icon: <XCircle className="h-3 w-3" />, key: "status.failed", defaultLabel: "Failed" },
};

const VALIDATION_CONFIG: Record<ValidationStatus, { tone: "success" | "warning" | "danger" | "neutral"; icon: ReactElement; key: string; defaultLabel: string }> = {
  passed: { tone: "success", icon: <CheckCircle2 className="h-3 w-3" />, key: "status.passed", defaultLabel: "Passed" },
  warning: { tone: "warning", icon: <AlertTriangle className="h-3 w-3" />, key: "status.warning", defaultLabel: "Warning" },
  failed: { tone: "danger", icon: <XCircle className="h-3 w-3" />, key: "status.failed", defaultLabel: "Failed" },
  pending: { tone: "neutral", icon: <Clock className="h-3 w-3" />, key: "status.pending", defaultLabel: "Pending" },
};

const VERIFICATION_CONFIG: Record<VerificationStatus, { tone: "neutral" | "info" | "success" | "danger" | "brand"; icon: ReactElement; key: string; defaultLabel: string }> = {
  pending: { tone: "neutral", icon: <Clock className="h-3 w-3" />, key: "status.pending", defaultLabel: "Pending" },
  assigned: { tone: "brand", icon: <Clock className="h-3 w-3" />, key: "status.assigned", defaultLabel: "Assigned" },
  in_review: { tone: "info", icon: <Loader2 className="h-3 w-3" />, key: "status.inReview", defaultLabel: "In Review" },
  approved: { tone: "success", icon: <CheckCircle2 className="h-3 w-3" />, key: "status.approved", defaultLabel: "Approved" },
  rejected: { tone: "danger", icon: <XCircle className="h-3 w-3" />, key: "status.rejected", defaultLabel: "Rejected" },
};

export function ProcessingStatusBadge({ status }: { status: ProcessingStatus }) {
  const { t } = useTranslation();
  const m = PROCESSING_CONFIG[status];
  return (
    <Badge tone={m.tone} icon={m.icon}>
      {t(m.key, m.defaultLabel)}
    </Badge>
  );
}

export function ValidationStatusBadge({ status }: { status: ValidationStatus }) {
  const { t } = useTranslation();
  const m = VALIDATION_CONFIG[status];
  return (
    <Badge tone={m.tone} icon={m.icon}>
      {t(m.key, m.defaultLabel)}
    </Badge>
  );
}

export function VerificationStatusBadge({ status }: { status: VerificationStatus }) {
  const { t } = useTranslation();
  const m = VERIFICATION_CONFIG[status];
  return (
    <Badge tone={m.tone} icon={m.icon}>
      {t(m.key, m.defaultLabel)}
    </Badge>
  );
}
