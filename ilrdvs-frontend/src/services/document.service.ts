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

// In-memory cache for uploaded documents
const uploadedDocsCache: LandDocument[] = [];

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
// Filter / paging types
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

  try {
    const params = new URLSearchParams();
    const skip = (page - 1) * pageSize;
    params.set("skip", String(skip));
    params.set("limit", String(pageSize));
    if (filters.status) {
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
    let apiItems = raw.map(toFrontend);

    // Merge with locally uploaded documents
    const all = [...uploadedDocsCache, ...apiItems.filter((a) => !uploadedDocsCache.some((u) => u.id === a.id))];

    let items = all;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (d) =>
          d.fileName.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q)
      );
    }

    return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize };
  } catch {
    let items = uploadedDocsCache;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (d) =>
          d.fileName.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q)
      );
    }
    return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize };
  }
}

export async function getDocumentById(
  id: string
): Promise<LandDocument | undefined> {
  const cached = uploadedDocsCache.find((d) => d.id === id);
  if (cached) return cached;

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
  let docId = `DOC-${Date.now().toString().slice(-6)}`;
  let backendRaw: BackendUploadResponse | undefined = undefined;

  try {
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
    docId = res.document.id;
    backendRaw = res;
  } catch {
    // Fallback ID if backend call fails or offline
  }

  let objectUrl: string | undefined = undefined;
  try {
    objectUrl = URL.createObjectURL(file);
  } catch {
    // ignore URL creation error if unsupported
  }

  const newDoc: LandDocument = {
    id: docId,
    fileName: file.name,
    documentType: (meta?.documentType as LandDocument["documentType"]) || "Khasra",
    location: {
      state: meta?.state || "",
      district: meta?.district || "",
      tehsil: meta?.tehsil || "",
      village: meta?.village || "",
    },
    year: meta?.year || "",
    previewUrl: objectUrl,
    fileUrl: objectUrl,
    uploadedBy: "Officer",
    uploadDate: new Date().toISOString(),
    pages: 1,
    language: "Hindi",
    fileSizeKb: Math.round(file.size / 1024),
    fileType: file.name.endsWith(".pdf") ? "PDF" : "JPG",
    processingStatus: "uploaded",
    confidence: 0,
    validationStatus: "pending",
    verificationStatus: "pending",
    stages: [
      { id: "s1", label: "Uploaded", status: "completed", startedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
      { id: "s2", label: "Preprocessing", status: "active", startedAt: new Date().toISOString() },
    ],
    thumbnailColor: "#4f7b5c",
  };

  uploadedDocsCache.unshift(newDoc);
  return { id: docId, raw: backendRaw };
}

// download URL helper
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

// Job status
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
  const index = uploadedDocsCache.findIndex((d) => d.id === documentId);
  if (index !== -1) uploadedDocsCache.splice(index, 1);
  try {
    await apiFetch(`/documents/${documentId}`, { method: "DELETE" });
  } catch {
    // ignore backend delete error if local
  }
}
