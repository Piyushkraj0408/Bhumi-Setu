import { apiFetch } from "./api";
import type { VerificationTask } from "../types";

// ---------------------------------------------------------------------------
// Backend shapes (from verification_officer.py → VerificationTaskOut schema)
// ---------------------------------------------------------------------------

interface BackendVerificationTask {
  task_id: string;
  document_id: string;
  original_filename: string;
  overall_confidence: number;
  flagged_fields: string[];
  doc_type: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Filters (kept for API compatibility — filtered client-side where backend
// doesn't support query params yet)
// ---------------------------------------------------------------------------

export interface VerificationFilters {
  onlyLowConfidence?: boolean;
  onlyValidationFailed?: boolean;
  onlyDuplicate?: boolean;
  onlyGisMismatch?: boolean;
  assignedToMe?: boolean;
  onlyHighPriority?: boolean;
  onlyOverdue?: boolean;
}

function toFrontend(t: BackendVerificationTask): VerificationTask {
  const confidence = t.overall_confidence;
  const flags: VerificationTask["flags"] = [];
  if (confidence < 80) flags.push("low_confidence");
  if (t.flagged_fields.length > 2) flags.push("validation_failed");

  return {
    id: t.task_id,
    documentId: String(t.document_id),
    priority: confidence < 70 ? "High" : confidence < 85 ? "Medium" : "Low",
    owner: t.original_filename,
    location: {
      state: "Unknown",
      district: "Unknown",
      tehsil: "Unknown",
      village: "Unknown",
    },
    confidence,
    validationIssueCount: t.flagged_fields.length,
    assignedTo: null,
    ageHours: Math.round(
      (Date.now() - new Date(t.created_at).getTime()) / 3_600_000
    ),
    status: "pending",
    flags,
  };
}

export async function listVerificationTasks(
  filters: VerificationFilters = {}
): Promise<VerificationTask[]> {
  const raw = await apiFetch<BackendVerificationTask[]>(
    "/verification-officer/queue"
  );
  let items = raw.map(toFrontend);

  if (filters.onlyLowConfidence)
    items = items.filter((t) => t.flags.includes("low_confidence"));
  if (filters.onlyValidationFailed)
    items = items.filter((t) => t.flags.includes("validation_failed"));
  if (filters.onlyDuplicate)
    items = items.filter((t) => t.flags.includes("duplicate"));
  if (filters.onlyGisMismatch)
    items = items.filter((t) => t.flags.includes("gis_mismatch"));
  if (filters.onlyHighPriority)
    items = items.filter((t) => t.priority === "High");
  if (filters.onlyOverdue)
    items = items.filter((t) => t.flags.includes("overdue"));

  return items;
}

export async function getVerificationTask(
  id: string
): Promise<VerificationTask | undefined> {
  // No single-task endpoint — fetch queue and find by id
  const tasks = await listVerificationTasks();
  return tasks.find((t) => t.id === id);
}

export type VerificationDecision = "approve" | "reject" | "request_review";

export async function submitVerificationDecision(
  taskId: string,
  decision: VerificationDecision,
  comment?: string
): Promise<void> {
  if (decision === "reject") {
    await apiFetch(`/verification-officer/tasks/${taskId}/reject`, {
      method: "POST",
      body: {
        rejection_category: "illegible",
        reason: comment ?? "Rejected by officer",
      } as unknown as Record<string, unknown>,
    });
  } else {
    await apiFetch(`/verification-officer/tasks/${taskId}/verify`, {
      method: "POST",
      body: {
        corrections: [],
        officer_comment: comment ?? "",
      } as unknown as Record<string, unknown>,
    });
  }
}

