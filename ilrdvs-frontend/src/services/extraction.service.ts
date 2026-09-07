import { simulateLatency } from "./api";
import { buildExtractionFields } from "../data/mockData";
import { getDocumentById } from "./document.service";
import { addCompletedRecord } from "./completedRecords.store";
import { CURRENT_USER } from "../data/mockData";
import type { ExtractedField, LandDocument } from "../types";

export async function getExtractedFields(
  documentId: string,
  doc?: LandDocument
): Promise<ExtractedField[]> {
  const targetDoc = doc || (await getDocumentById(documentId));
  const seed = (documentId.charCodeAt(documentId.length - 1) % 20) + 75;
  return simulateLatency(buildExtractionFields(seed, targetDoc));
}

export async function approveExtraction(documentId: string): Promise<void> {
  // Fetch doc metadata to save meaningful info in the store
  const doc = await getDocumentById(documentId);
  const fields = await getExtractedFields(documentId, doc);
  const avgConfidence = fields.length
    ? Math.round(fields.reduce((s, f) => s + f.confidence, 0) / fields.length)
    : 0;

  addCompletedRecord({
    documentId,
    fileName: doc?.fileName || documentId,
    documentType: doc?.documentType || "Land Record",
    location: {
      state:    doc?.location?.state    || "",
      district: doc?.location?.district || "",
      tehsil:   doc?.location?.tehsil   || "",
      village:  doc?.location?.village  || "",
    },
    confidence: avgConfidence,
    decision: "Approved",
    completedAt: new Date().toISOString(),
    officer: CURRENT_USER.name,
    source: "extraction",
  });

  return simulateLatency(undefined, 400);
}
