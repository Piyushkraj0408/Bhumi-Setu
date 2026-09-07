import { simulateLatency } from "./api";
import { buildExtractionFields } from "../data/mockData";
import type { ExtractedField } from "../types";

export async function getExtractedFields(documentId: string): Promise<ExtractedField[]> {
  const seed = (documentId.charCodeAt(documentId.length - 1) % 20) + 60;
  return simulateLatency(buildExtractionFields(seed));
}

export async function approveExtraction(_documentId: string): Promise<void> {
  return simulateLatency(undefined, 400);
}
