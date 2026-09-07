import type { ReactElement } from "react";
import { CheckCircle2, Clock, XCircle, AlertTriangle, Loader2, CircleDashed } from "lucide-react";
import { Badge } from "./Badge";
import type { ProcessingStatus, ValidationStatus, VerificationStatus } from "../../types";

const PROCESSING_MAP: Record<ProcessingStatus, { tone: "neutral" | "info" | "success" | "danger"; icon: ReactElement; label: string }> = {
  uploaded: { tone: "neutral", icon: <CircleDashed className="h-3 w-3" />, label: "Uploaded" },
  processing: { tone: "info", icon: <Loader2 className="h-3 w-3 animate-spin" />, label: "Processing" },
  completed: { tone: "success", icon: <CheckCircle2 className="h-3 w-3" />, label: "Completed" },
  failed: { tone: "danger", icon: <XCircle className="h-3 w-3" />, label: "Failed" },
};

const VALIDATION_MAP: Record<ValidationStatus, { tone: "success" | "warning" | "danger" | "neutral"; icon: ReactElement; label: string }> = {
  passed: { tone: "success", icon: <CheckCircle2 className="h-3 w-3" />, label: "Passed" },
  warning: { tone: "warning", icon: <AlertTriangle className="h-3 w-3" />, label: "Warning" },
  failed: { tone: "danger", icon: <XCircle className="h-3 w-3" />, label: "Failed" },
  pending: { tone: "neutral", icon: <Clock className="h-3 w-3" />, label: "Pending" },
};

const VERIFICATION_MAP: Record<VerificationStatus, { tone: "neutral" | "info" | "success" | "danger" | "brand"; icon: ReactElement; label: string }> = {
  pending: { tone: "neutral", icon: <Clock className="h-3 w-3" />, label: "Pending" },
  assigned: { tone: "brand", icon: <Clock className="h-3 w-3" />, label: "Assigned" },
  in_review: { tone: "info", icon: <Loader2 className="h-3 w-3" />, label: "In Review" },
  approved: { tone: "success", icon: <CheckCircle2 className="h-3 w-3" />, label: "Approved" },
  rejected: { tone: "danger", icon: <XCircle className="h-3 w-3" />, label: "Rejected" },
};

export function ProcessingStatusBadge({ status }: { status: ProcessingStatus }) {
  const m = PROCESSING_MAP[status];
  return (
    <Badge tone={m.tone} icon={m.icon}>
      {m.label}
    </Badge>
  );
}

export function ValidationStatusBadge({ status }: { status: ValidationStatus }) {
  const m = VALIDATION_MAP[status];
  return (
    <Badge tone={m.tone} icon={m.icon}>
      {m.label}
    </Badge>
  );
}

export function VerificationStatusBadge({ status }: { status: VerificationStatus }) {
  const m = VERIFICATION_MAP[status];
  return (
    <Badge tone={m.tone} icon={m.icon}>
      {m.label}
    </Badge>
  );
}
