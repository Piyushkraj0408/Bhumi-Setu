import { apiFetch } from "./api";
import { addCompletedRecord } from "./completedRecords.store";
import { getDocumentById, listDocuments } from "./document.service";
import { CURRENT_USER } from "../data/mockData";
import type { CompletedDecision } from "./completedRecords.store";
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
  let confidence = Math.round(t.overall_confidence);
  if (confidence <= 1 && confidence > 0) {
    confidence = Math.round(confidence * 100);
  }
  if (!confidence || isNaN(confidence)) {
    confidence = 72;
  }
  const flags: VerificationTask["flags"] = [];
  if (confidence < 80) flags.push("low_confidence");
  if ((t.flagged_fields?.length ?? 0) > 0) flags.push("validation_failed");

  return {
    id: t.task_id,
    documentId: String(t.document_id),
    priority: confidence < 65 ? "High" : confidence < 85 ? "Medium" : "Low",
    owner: t.original_filename,
    location: {
      state: "Rajasthan",
      district: "Jaipur",
      tehsil: "Amber",
      village: "Kukas",
    },
    confidence,
    validationIssueCount: t.flagged_fields?.length ?? 0,
    assignedTo: null,
    ageHours: Math.max(
      1,
      Math.round(
        (Date.now() - new Date(t.created_at || Date.now()).getTime()) / 3_600_000
      )
    ),
    status: "pending",
    flags,
  };
}

export async function listVerificationTasks(
  filters: VerificationFilters = {}
): Promise<VerificationTask[]> {
  let items: VerificationTask[] = [];
  try {
    const raw = await apiFetch<BackendVerificationTask[]>(
      "/verification-officer/queue"
    );
    if (Array.isArray(raw) && raw.length > 0) {
      items = raw.map(toFrontend);
    }
  } catch {
    // Backend queue fetch error — fallback below
  }

  // Fallback: if queue is empty, load all documents from MongoDB
  if (items.length === 0) {
    try {
      const docResult = await listDocuments({ pageSize: 50 });
      items = docResult.items.map((doc) => ({
        id: `TASK-${doc.id.slice(0, 8).toUpperCase()}`,
        documentId: doc.id,
        priority: (doc.confidence || 72) < 65 ? "High" : (doc.confidence || 72) < 85 ? "Medium" : "Low",
        owner: doc.fileName,
        location: doc.location || { state: "Rajasthan", district: "Jaipur", tehsil: "Amber", village: "Kukas" },
        confidence: doc.confidence || 72,
        validationIssueCount: 1,
        assignedTo: null,
        ageHours: Math.max(1, Math.round((Date.now() - new Date(doc.uploadDate || Date.now()).getTime()) / 3_600_000)),
        status: "pending",
        flags: ["low_confidence"],
      }));
    } catch {
      // return empty if both fail
    }
  }

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
  const tasks = await listVerificationTasks();
  const found = tasks.find((t) => t.id === id || t.documentId === id);
  if (found) return found;

  try {
    const raw = await apiFetch<{
      task: BackendVerificationTask;
      document: { id: string; original_filename: string; doc_type?: string };
    }>(`/verification-officer/tasks/${id}`);
    if (raw?.task) {
      return toFrontend({
        ...raw.task,
        document_id: raw.document?.id || raw.task.document_id,
        original_filename: raw.document?.original_filename || raw.task.original_filename || id,
      });
    }
  } catch {
    const doc = await getDocumentById(id);
    if (doc) {
      return {
        id: `TASK-${doc.id.slice(0, 8).toUpperCase()}`,
        documentId: doc.id,
        priority: "Medium",
        owner: doc.fileName,
        location: doc.location || { state: "Rajasthan", district: "Jaipur", tehsil: "Amber", village: "Kukas" },
        confidence: doc.confidence || 72,
        validationIssueCount: 0,
        assignedTo: null,
        ageHours: 1,
        status: "pending",
        flags: [],
      };
    }
  }
  return undefined;
}

export type VerificationDecision = "approve" | "reject" | "request_review";

export async function submitVerificationDecision(
  taskId: string,
  decision: VerificationDecision,
  comment?: string,
  task?: VerificationTask
): Promise<void> {
  // Map to a human-readable completed decision label
  const decisionLabel: CompletedDecision =
    decision === "approve"
      ? "Approved"
      : decision === "reject"
      ? "Rejected"
      : "Review Requested";

  // Fetch document details for richer completed record metadata
  const docId = task?.documentId || taskId;
  const doc = await getDocumentById(docId).catch(() => undefined);

  // Save to persistent completed records store immediately
  addCompletedRecord({
    documentId: docId,
    fileName: doc?.fileName || task?.owner || docId,
    documentType: doc?.documentType || "Land Record",
    location: {
      state:    doc?.location?.state    || task?.location?.state    || "",
      district: doc?.location?.district || task?.location?.district || "",
      tehsil:   doc?.location?.tehsil   || task?.location?.tehsil   || "",
      village:  doc?.location?.village  || task?.location?.village  || "",
    },
    confidence: task?.confidence ?? doc?.confidence ?? 0,
    decision: decisionLabel,
    completedAt: new Date().toISOString(),
    officer: CURRENT_USER.name,
    source: "verification",
  });

  // Submit to backend (best-effort — don't block on failure)
  try {
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
          verified_by_officer: true,
          comments: comment ?? "",
        } as unknown as Record<string, unknown>,
      });
    }
  } catch {
    // Backend error — record is already saved locally
  }
}
