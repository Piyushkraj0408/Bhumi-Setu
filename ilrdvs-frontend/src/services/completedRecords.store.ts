/**
 * completedRecords.store.ts
 *
 * A lightweight localStorage-backed store that tracks every document
 * that has been approved or rejected via the Extraction Viewer or
 * Verification Workspace. This persists across page reloads and is
 * read by the CompletedVerificationsPage.
 */

const STORAGE_KEY = "ilrdvs_completed_records";

export type CompletedDecision = "Approved" | "Rejected" | "Review Requested";

export interface CompletedRecord {
  /** Unique entry ID (document ID + timestamp) */
  id: string;
  /** The document / task ID */
  documentId: string;
  /** Original file name */
  fileName: string;
  /** Document type e.g. "Khasra" */
  documentType: string;
  /** Location metadata */
  location: {
    state: string;
    district: string;
    tehsil: string;
    village: string;
  };
  /** Overall confidence at approval time */
  confidence: number;
  /** The decision made */
  decision: CompletedDecision;
  /** ISO string of when the decision was recorded */
  completedAt: string;
  /** Name of the officer who actioned it */
  officer: string;
  /** Source workflow: "extraction" | "verification" */
  source: "extraction" | "verification";
}

// ---------------------------------------------------------------------------
// Read / Write helpers
// ---------------------------------------------------------------------------

function readAll(): CompletedRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CompletedRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(records: CompletedRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore quota errors
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Add a newly completed record. De-duplication: replaces existing entry for same documentId+source. */
export function addCompletedRecord(record: Omit<CompletedRecord, "id">): void {
  const existing = readAll().filter(
    (r) => !(r.documentId === record.documentId && r.source === record.source)
  );
  const newRecord: CompletedRecord = {
    ...record,
    id: `${record.documentId}-${record.source}-${Date.now()}`,
  };
  writeAll([newRecord, ...existing]);
}

/** Return all completed records, newest first. */
export function getCompletedRecords(): CompletedRecord[] {
  return readAll();
}

/** Clear all completed records (for testing). */
export function clearCompletedRecords(): void {
  localStorage.removeItem(STORAGE_KEY);
}
