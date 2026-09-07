import { apiFetch } from "./api";
import type { LandDocument } from "../types";

// ---------------------------------------------------------------------------
// Shapes from the backend
// ---------------------------------------------------------------------------

interface BackendDocument {
  id: string;
  original_filename: string;
  mime_type: string;
  doc_type: string | null;
  status: string;
  scope_type: string | null;
  scope_id: string | null;
  created_at: string;
}

interface BackendProcessingJob {
  id: string;
  document_id: string;
  status: string;
  error: string | null;
  created_at: string;
  updated_at: string;
}

interface BackendUploadResponse {
  document: BackendDocument;
  job: BackendProcessingJob;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapStatus(s: string): LandDocument["processingStatus"] {
  const m: Record<string, LandDocument["processingStatus"]> = {
    queued: "uploaded",
    processing: "processing",
    processed: "completed",
    failed: "failed",
    deleted: "failed",
  };
  return m[s] ?? "uploaded";
}

function mapDocType(t: string | null): LandDocument["documentType"] {
  const m: Record<string, LandDocument["documentType"]> = {
    khasra_map: "Khasra",
    khatauni: "Khatauni",
    jamabandi: "Jamabandi",
    record_of_rights: "Record of Rights",
    mutation_register: "Mutation Register",
    survey_settlement: "Survey Settlement",
  };
  return (t && m[t]) ? m[t] : "Khasra";
}

function mimeToFileType(mime: string): LandDocument["fileType"] {
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("png")) return "PNG";
  if (mime.includes("tiff") || mime.includes("tif")) return "TIFF";
  return "JPG";
}

/** Convert a flat BackendDocument to the richer frontend LandDocument. */
function toFrontend(d: BackendDocument): LandDocument {
  return {
    id: d.id,
    fileName: d.original_filename,
    documentType: mapDocType(d.doc_type),
    location: {
      state: d.scope_type === "state" ? (d.scope_id ?? "Unknown") : "Unknown",
      district: d.scope_type === "district" ? (d.scope_id ?? "Unknown") : "Unknown",
      tehsil: d.scope_type === "tehsil" ? (d.scope_id ?? "Unknown") : "Unknown",
      village: "Unknown",
    },
    uploadedBy: "Officer",
    uploadDate: d.created_at,
    pages: 1,
    language: "Hindi",
    fileSizeKb: 0,
    fileType: mimeToFileType(d.mime_type),
    processingStatus: mapStatus(d.status),
    confidence: 0,
    validationStatus: "pending",
    verificationStatus: "pending",
    stages: [],
    thumbnailColor: "#4f7b5c",
  };
}

// ---------------------------------------------------------------------------
// Filter / paging types (kept for API compatibility with components)
// ---------------------------------------------------------------------------

export interface DocumentFilters {
  search?: string;
  state?: string;
  district?: string;
  status?: LandDocument["processingStatus"];
  validationStatus?: LandDocument["validationStatus"];
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function listDocuments(
  filters: DocumentFilters = {}
): Promise<PagedResult<LandDocument>> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 10;
  const skip = (page - 1) * pageSize;

  const params = new URLSearchParams();
  params.set("skip", String(skip));
  params.set("limit", String(pageSize));
  if (filters.status) {
    // Map frontend status back to backend status names
    const statusMap: Record<string, string> = {
      uploaded: "queued",
      processing: "processing",
      completed: "processed",
      failed: "failed",
    };
    params.set("status_filter", statusMap[filters.status] ?? filters.status);
  }
  if (filters.district) params.set("scope_id", filters.district);

  const raw = await apiFetch<BackendDocument[]>(`/documents?${params}`);
  let items = raw.map(toFrontend);

  // Client-side search filter (backend doesn't support full-text search yet)
  if (filters.search) {
    const q = filters.search.toLowerCase();
    items = items.filter(
      (d) =>
        d.fileName.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q)
    );
  }

  return { items, total: items.length, page, pageSize };
}

export async function getDocumentById(
  id: string
): Promise<LandDocument | undefined> {
  try {
    const raw = await apiFetch<BackendDocument>(`/documents/${id}`);
    return toFrontend(raw);
  } catch {
    return undefined;
  }
}

export interface UploadMeta {
  documentType?: string;
  state?: string;
  district?: string;
  tehsil?: string;
  village?: string;
  year?: string;
}

export async function uploadDocument(
  file: File,
  meta?: UploadMeta
): Promise<{ id: string; raw?: BackendUploadResponse }> {
  const form = new FormData();
  form.append("file", file);
  if (meta?.documentType) {
    form.append("doc_type", meta.documentType.toLowerCase().replace(/ /g, "_"));
  }
  if (meta?.tehsil || meta?.district || meta?.state) {
    form.append("scope_type", meta?.tehsil ? "tehsil" : meta?.district ? "district" : "state");
    form.append("scope_id", meta?.tehsil || meta?.district || meta?.state || "");
  }

  const res = await apiFetch<BackendUploadResponse>("/documents", {
    method: "POST",
    body: form,
    isFormData: true,
  });

  return { id: res.document.id, raw: res };
}

// download URL helper (returns the backend presigned download URL)
export async function getDownloadUrl(
  documentId: string
): Promise<string | null> {
  try {
    const res = await apiFetch<{ download_url: string }>(
      `/documents/${documentId}/download`
    );
    return res.download_url;
  } catch {
    return null;
  }
}

// Job status (used by ProcessingStatusPage)
export async function getJobStatus(
  documentId: string,
  jobId: string
): Promise<BackendProcessingJob | null> {
  try {
    return await apiFetch<BackendProcessingJob>(
      `/documents/${documentId}/jobs/${jobId}/status`
    );
  } catch {
    return null;
  }
}

// Soft-delete
export async function deleteDocument(documentId: string): Promise<void> {
  await apiFetch(`/documents/${documentId}`, { method: "DELETE" });
}

