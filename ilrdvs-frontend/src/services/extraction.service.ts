/**
 * extraction.service.ts
 *
 * DEMO MODE: Returns hardcoded extraction fields for the 4 demo land record files.
 *   - Record 1: भू-स्वामित्व प्रमाण-पत्र (LPC) — राधेश्याम सिंह (दानापुर, पटना, बिहार) [Clean, >=94%]
 *   - Record 2: भू-स्वामित्व प्रमाण-पत्र (LPC) — अजय सिंह (दानापुर, पटना, बिहार) [Clean, >=94%]
 *   - Record 3: Land Possession Certificate (LPC) — दशरथ प्रसाद (औरंगाबाद, बिहार) [Clean, >=93%]
 *   - Record 4: खसरा-खतौनी — रामेश्वर प्रसाद (बिलारी, मुरादाबाद, उत्तर प्रदेश) [⚠️ Conflict, 3 flagged fields]
 *
 * After Tehsil Officer review or auto-approval, a blockchain record number (BHU-YYYY-NNNNN)
 * is generated and stored in localStorage via completedRecords.store.
 */

import { simulateLatency } from "./api";
import { getDocumentById } from "./document.service";
import { addCompletedRecord, type CompletedRecordDetails } from "./completedRecords.store";
import { CURRENT_USER } from "../data/mockData";
import type { ExtractedField, LandDocument } from "../types";

// ---------------------------------------------------------------------------
// File Classifier
// ---------------------------------------------------------------------------

export function getRecordIndex(doc?: LandDocument | string): number {
  const name = typeof doc === "string" ? doc.toLowerCase() : (doc?.fileName || "").toLowerCase();

  // Explicit index or conflict check
  if (name.includes("conflict") || name.includes("record4") || name.includes("record_4") || name.includes("land_record4") || name.includes("landrecord4")) {
    return 4;
  }
  if (name.includes("record3") || name.includes("record_3") || name.includes("land_record3") || name.includes("landrecord3")) {
    return 3;
  }
  if (name.includes("record2") || name.includes("record_2") || name.includes("land_record2") || name.includes("landrecord2")) {
    return 2;
  }
  if (name.includes("record1") || name.includes("record_1") || name.includes("land_record1") || name.includes("landrecord1")) {
    return 1;
  }

  // Document-specific keywords
  if (["rameshwar", "moradabad", "bilari", "gairpur", "1998", "khatauni"].some((k) => name.includes(k))) {
    return 4;
  }
  if (["dashrath", "aurangabad", "pandey", "427", "2015"].some((k) => name.includes(k))) {
    return 3;
  }
  if (["ajay", "156", "5.75", "2019"].some((k) => name.includes(k))) {
    return 2;
  }
  if (["radheshyam", "ramvilas", "5065", "155", "1034", "2018"].some((k) => name.includes(k))) {
    return 1;
  }

  // Standalone digits
  if (/(?:^|[\D_])4(?:[\D_]|$)/.test(name)) return 4;
  if (/(?:^|[\D_])3(?:[\D_]|$)/.test(name)) return 3;
  if (/(?:^|[\D_])2(?:[\D_]|$)/.test(name)) return 2;
  if (/(?:^|[\D_])1(?:[\D_]|$)/.test(name)) return 1;

  return 1;
}

export function isConflictDocument(doc?: LandDocument): boolean {
  return getRecordIndex(doc) === 4;
}

// ---------------------------------------------------------------------------
// 4 Hardcoded field definitions
// ---------------------------------------------------------------------------

// Record 1: राधेश्याम सिंह (Clean, Auto-pass)
function buildRecord1Fields(doc?: LandDocument): ExtractedField[] {
  const fileName = doc?.fileName || "land_record1.pdf";
  return [
    { id: "f1",  label: "Document Name",     value: fileName,                                confidence: 98, source: "NLP", validationStatus: "passed" },
    { id: "f2",  label: "Document Type",     value: "भू-स्वामित्व प्रमाण-पत्र (LPC)",        confidence: 97, source: "NLP", validationStatus: "passed" },
    { id: "f3",  label: "Owner Name",        value: "राधेश्याम सिंह",                       confidence: 96, source: "NLP", validationStatus: "passed" },
    { id: "f4",  label: "Father's Name",     value: "स्व० रामविलास सिंह",                   confidence: 95, source: "NLP", validationStatus: "passed" },
    { id: "f5",  label: "Khasra Number",     value: "155",                                  confidence: 97, source: "NLP", validationStatus: "passed" },
    { id: "f6",  label: "Khata Number",      value: "41",                                   confidence: 97, source: "NLP", validationStatus: "passed" },
    { id: "f7",  label: "Tauzi Number",      value: "5065",                                 confidence: 95, source: "NLP", validationStatus: "passed" },
    { id: "f8",  label: "Area",              value: "25 डिसमिल (0.101 Hectare)",            confidence: 94, source: "NLP", validationStatus: "passed" },
    { id: "f9",  label: "Land Type",         value: "कृषि भूमि (Agricultural)",              confidence: 95, source: "NLP", validationStatus: "passed" },
    { id: "f10", label: "Village",           value: "आसोपुर",                                confidence: 98, source: "NLP", validationStatus: "passed" },
    { id: "f11", label: "Thana / Tehsil",    value: "दानापुर (थाना सं० 34)",                 confidence: 97, source: "NLP", validationStatus: "passed" },
    { id: "f12", label: "District",          value: "पटना",                                 confidence: 99, source: "NLP", validationStatus: "passed" },
    { id: "f13", label: "State",             value: "बिहार",                                confidence: 99, source: "NLP", validationStatus: "passed" },
    { id: "f14", label: "Document Year",     value: "2018",                                 confidence: 96, source: "NLP", validationStatus: "passed" },
  ];
}

// Record 2: अजय सिंह (Clean, Auto-pass)
function buildRecord2Fields(doc?: LandDocument): ExtractedField[] {
  const fileName = doc?.fileName || "land_record2.pdf";
  return [
    { id: "f1",  label: "Document Name",     value: fileName,                                confidence: 98, source: "NLP", validationStatus: "passed" },
    { id: "f2",  label: "Document Type",     value: "भू-स्वामित्व प्रमाण-पत्र (LPC)",        confidence: 97, source: "NLP", validationStatus: "passed" },
    { id: "f3",  label: "Owner Name",        value: "अजय सिंह",                             confidence: 96, source: "NLP", validationStatus: "passed" },
    { id: "f4",  label: "Father's Name",     value: "स्व० भोला सिंह",                       confidence: 95, source: "NLP", validationStatus: "passed" },
    { id: "f5",  label: "Khasra Number",     value: "156",                                  confidence: 97, source: "NLP", validationStatus: "passed" },
    { id: "f6",  label: "Khata Number",      value: "19",                                   confidence: 98, source: "NLP", validationStatus: "passed" },
    { id: "f7",  label: "Area",              value: "5.75 डिसमिल (0.023 Hectare)",          confidence: 94, source: "NLP", validationStatus: "passed" },
    { id: "f8",  label: "Land Type",         value: "कृषि भूमि (Agricultural)",              confidence: 95, source: "NLP", validationStatus: "passed" },
    { id: "f9",  label: "Village",           value: "आसोपुर",                                confidence: 98, source: "NLP", validationStatus: "passed" },
    { id: "f10", label: "Thana / Tehsil",    value: "दानापुर (थाना सं० 34)",                 confidence: 97, source: "NLP", validationStatus: "passed" },
    { id: "f11", label: "District",          value: "पटना",                                 confidence: 99, source: "NLP", validationStatus: "passed" },
    { id: "f12", label: "State",             value: "बिहार",                                confidence: 99, source: "NLP", validationStatus: "passed" },
    { id: "f13", label: "Document Year",     value: "2019",                                 confidence: 96, source: "NLP", validationStatus: "passed" },
  ];
}

// Record 3: दशरथ प्रसाद (Clean, Auto-pass)
function buildRecord3Fields(doc?: LandDocument): ExtractedField[] {
  const fileName = doc?.fileName || "land_record3.pdf";
  return [
    { id: "f1",  label: "Document Name",     value: fileName,                                confidence: 98, source: "NLP", validationStatus: "passed" },
    { id: "f2",  label: "Document Type",     value: "Land Possession Certificate (LPC)",     confidence: 96, source: "NLP", validationStatus: "passed" },
    { id: "f3",  label: "Owner Name",        value: "दशरथ प्रसाद रामनन्दन पाण्डेय",          confidence: 94, source: "NLP", validationStatus: "passed" },
    { id: "f4",  label: "Father's Name",     value: "स्व० शंभूनाथ पाण्डेय",                 confidence: 93, source: "NLP", validationStatus: "passed" },
    { id: "f5",  label: "Khasra Number",     value: "427, 429",                              confidence: 94, source: "NLP", validationStatus: "passed" },
    { id: "f6",  label: "Khata Number",      value: "24",                                   confidence: 96, source: "NLP", validationStatus: "passed" },
    { id: "f7",  label: "Area",              value: "1-00 एकड़ (0.405 Hectare)",             confidence: 93, source: "NLP", validationStatus: "passed" },
    { id: "f8",  label: "Land Type",         value: "Agricultural Cultivating Land",         confidence: 95, source: "NLP", validationStatus: "passed" },
    { id: "f9",  label: "Village",           value: "ददईया / चित्रगोपी पडरावां",             confidence: 95, source: "NLP", validationStatus: "passed" },
    { id: "f10", label: "Tehsil / Circle",   value: "औरंगाबाद",                             confidence: 97, source: "NLP", validationStatus: "passed" },
    { id: "f11", label: "District",          value: "औरंगाबाद",                             confidence: 98, source: "NLP", validationStatus: "passed" },
    { id: "f12", label: "State",             value: "बिहार",                                confidence: 99, source: "NLP", validationStatus: "passed" },
    { id: "f13", label: "Document Year",     value: "2015",                                 confidence: 95, source: "NLP", validationStatus: "passed" },
  ];
}

// Record 4: रामेश्वर प्रसाद (⚠️ Conflict, 3 flagged fields < 70% confidence)
function buildRecord4Fields(doc?: LandDocument): ExtractedField[] {
  const fileName = doc?.fileName || "land_record4.pdf";
  return [
    // ⚠️ LOW CONFIDENCE — flagged for Tehsil Officer correction
    { id: "f1",  label: "Khasra Number",     value: "112",                                   confidence: 48, source: "NLP", validationStatus: "warning" },
    { id: "f2",  label: "Owner Name",        value: "रामेश्वर प्रसाद",                       confidence: 52, source: "NLP", validationStatus: "warning" },
    { id: "f3",  label: "Area",              value: "3 बीघा 2 बिस्वा (0.78 Hectare)",        confidence: 45, source: "NLP", validationStatus: "warning" },
    // ✅ HIGH CONFIDENCE — clean fields
    { id: "f4",  label: "Document Name",     value: fileName,                                confidence: 98, source: "NLP", validationStatus: "passed" },
    { id: "f5",  label: "Document Type",     value: "खसरा-खतौनी (Khasra-Khatauni)",          confidence: 95, source: "NLP", validationStatus: "passed" },
    { id: "f6",  label: "Father's Name",     value: "स्व० हरि लाल",                          confidence: 92, source: "NLP", validationStatus: "passed" },
    { id: "f7",  label: "Khata Number",      value: "48",                                    confidence: 91, source: "NLP", validationStatus: "passed" },
    { id: "f8",  label: "Village",           value: "गैरपुर",                                confidence: 96, source: "NLP", validationStatus: "passed" },
    { id: "f9",  label: "Patwari Halka",     value: "नवागांव",                               confidence: 93, source: "NLP", validationStatus: "passed" },
    { id: "f10", label: "Pargana",           value: "कटघर",                                  confidence: 94, source: "NLP", validationStatus: "passed" },
    { id: "f11", label: "Tehsil",            value: "बिलारी",                                confidence: 96, source: "NLP", validationStatus: "passed" },
    { id: "f12", label: "District",          value: "मुरादाबाद",                             confidence: 97, source: "NLP", validationStatus: "passed" },
    { id: "f13", label: "State",             value: "उत्तर प्रदेश",                          confidence: 98, source: "NLP", validationStatus: "passed" },
    { id: "f14", label: "Land Type",         value: "कृषि योग्य (Agricultural)",             confidence: 92, source: "NLP", validationStatus: "passed" },
    { id: "f15", label: "Document Year",     value: "1998",                                  confidence: 94, source: "NLP", validationStatus: "passed" },
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getExtractedFields(
  documentId: string,
  doc?: LandDocument,
): Promise<ExtractedField[]> {
  const targetDoc = doc || (await getDocumentById(documentId));
  const idx = getRecordIndex(targetDoc);

  let fields: ExtractedField[];
  if (idx === 1) fields = buildRecord1Fields(targetDoc);
  else if (idx === 2) fields = buildRecord2Fields(targetDoc);
  else if (idx === 3) fields = buildRecord3Fields(targetDoc);
  else fields = buildRecord4Fields(targetDoc);

  return simulateLatency(fields, 600);
}

// ---------------------------------------------------------------------------
// Record number generator (frontend-side for demo)
// ---------------------------------------------------------------------------

const REC_NUMBER_KEY = "ilrdvs_last_record_number";

export function generateRecordNumber(): string {
  const year = new Date().getFullYear();
  try {
    const prev = Number(localStorage.getItem(REC_NUMBER_KEY) ?? "0");
    const next = prev + 1;
    localStorage.setItem(REC_NUMBER_KEY, String(next));
    return `BHU-${year}-${String(next).padStart(5, "0")}`;
  } catch {
    return `BHU-${year}-00001`;
  }
}

// Helper to extract structured record details from fields list + edits
function extractDetailsFromFields(
  fields: ExtractedField[],
  edits?: Record<string, string>,
): CompletedRecordDetails {
  const val = (label: string): string => {
    const f = fields.find((x) => x.label.toLowerCase() === label.toLowerCase());
    if (!f) return "";
    return edits && edits[f.id] !== undefined ? edits[f.id] : f.value;
  };

  return {
    ownerName: val("Owner Name"),
    fatherName: val("Father's Name"),
    khasraNumber: val("Khasra Number"),
    khataNumber: val("Khata Number"),
    tauziNumber: val("Tauzi Number"),
    areaHectares: val("Area"),
    landType: val("Land Type"),
    state: val("State"),
    district: val("District"),
    tehsil: val("Tehsil") || val("Tehsil / Circle") || val("Thana / Tehsil"),
    village: val("Village"),
    documentYear: val("Document Year"),
  };
}

// ---------------------------------------------------------------------------
// Approve extraction (auto-pass flow)
// ---------------------------------------------------------------------------

export async function approveExtraction(documentId: string): Promise<{ recordNumber: string }> {
  const doc    = await getDocumentById(documentId);
  const fields = await getExtractedFields(documentId, doc);
  const docConfidence = fields.length
    ? Math.min(...fields.map((f) => f.confidence))
    : (doc?.confidence ?? 0);

  const recordNumber = generateRecordNumber();
  const details = extractDetailsFromFields(fields);

  addCompletedRecord({
    documentId,
    fileName:     doc?.fileName || documentId,
    documentType: details.documentYear ? `${details.landType || "Land Record"}` : (doc?.documentType || "Land Record"),
    location: {
      state:    details.state || doc?.location?.state || "Bihar",
      district: details.district || doc?.location?.district || "Patna",
      tehsil:   details.tehsil || doc?.location?.tehsil || "Danapur",
      village:  details.village || doc?.location?.village || "Asopur",
    },
    confidence:  docConfidence,
    decision:    "Approved",
    completedAt: new Date().toISOString(),
    officer:     CURRENT_USER.name,
    source:      "extraction",
    recordNumber,
    recordDetails: details,
  });

  await simulateLatency(undefined, 400);
  return { recordNumber };
}

// ---------------------------------------------------------------------------
// Approve conflict (Tehsil Officer review flow)
// ---------------------------------------------------------------------------

export async function approveTehsilReview(
  documentId: string,
  corrections: Record<string, string>,
): Promise<{ recordNumber: string }> {
  const doc = await getDocumentById(documentId);
  const fields = await getExtractedFields(documentId, doc);
  const recordNumber = generateRecordNumber();
  const details = extractDetailsFromFields(fields, corrections);

  addCompletedRecord({
    documentId,
    fileName:     doc?.fileName || documentId,
    documentType: "खसरा-खतौनी (Khasra-Khatauni)",
    location: {
      state:    details.state || "उत्तर प्रदेश",
      district: details.district || "मुरादाबाद",
      tehsil:   details.tehsil || "बिलारी",
      village:  details.village || "गैरपुर",
    },
    confidence:  94, // post-correction confidence
    decision:    "Approved",
    completedAt: new Date().toISOString(),
    officer:     "Tehsil Officer Sharma",
    source:      "verification",
    recordNumber,
    corrections,
    recordDetails: details,
  });

  await simulateLatency(undefined, 700);
  return { recordNumber };
}
