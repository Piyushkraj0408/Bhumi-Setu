import { apiFetch } from "./api";
import type { AuditEntry } from "../types";

// ---------------------------------------------------------------------------
// Backend shape (from auditor.py → AuditLogEntryOut schema)
// ---------------------------------------------------------------------------

interface BackendAuditEntry {
  id: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  ip_address: string;
  created_at: string;
}

function toFrontend(e: BackendAuditEntry): AuditEntry {
  return {
    id: e.id,
    timestamp: e.created_at,
    user: e.user_email,
    action: e.action,
    documentId: e.resource_type === "Document" ? e.resource_id : undefined,
  };
}

export async function listAuditLog(documentId?: string): Promise<AuditEntry[]> {
  const params = new URLSearchParams({ skip: "0", limit: "100" });
  const raw = await apiFetch<BackendAuditEntry[]>(
    `/auditor/audit-trail?${params}`
  );
  const items = raw.map(toFrontend);
  if (documentId) return items.filter((e) => e.documentId === documentId);
  return items;
}

