import type {
  AppUser,
  AuditEntry,
  CadastralParcel,
  DistrictProgress,
  LandDocument,
  LandRecord,
  StateProgress,
  ValidationIssue,
  VerificationTask,
} from "../types";

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

export const STATES = [
  "Uttar Pradesh",
  "Rajasthan",
  "Madhya Pradesh",
  "Bihar",
  "Maharashtra",
];

export const DISTRICTS_BY_STATE: Record<string, string[]> = {
  "Uttar Pradesh": ["Mathura", "Agra", "Lucknow", "Varanasi", "Meerut"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Alwar"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior"],
  Bihar: ["Patna", "Gaya", "Muzaffarpur"],
  Maharashtra: ["Pune", "Nashik", "Nagpur"],
};

export const VILLAGES = [
  "Govardhan", "Rampur", "Sadar", "Barsana", "Chhata", "Kosi Kalan",
  "Nandgaon", "Farah", "Baldeo", "Mahaban", "Sonkh", "Naujheel",
  "Chaumuha", "Radhakund", "Jait", "Fatehabad", "Kiraoli", "Bichpuri",
];

const FIRST_NAMES = [
  "Ramesh", "Suresh", "Mahesh", "Rajesh", "Sita", "Kamla", "Mohan",
  "Ganga", "Radha", "Krishna", "Rakesh", "Vinod", "Sunita", "Meena",
  "Ashok", "Vijay", "Prakash", "Devendra", "Shobha", "Lalita", "Ram Prasad",
  "Shiv Lal", "Hari Om", "Bhagwan Das", "Chhote Lal", "Girraj",
];

const LAST_NAMES = [
  "Kumar", "Singh", "Sharma", "Yadav", "Chaudhary", "Verma", "Devi",
  "Gupta", "Prasad", "Lal", "Rathore", "Tomar",
];

const RECORD_TYPES: LandDocument["documentType"][] = [
  "Khasra",
  "Khatauni",
  "Jamabandi",
  "Record of Rights",
  "Mutation Register",
  "Survey Settlement",
  "Register",
];

const OFFICER_NAMES = [
  "A. Sharma", "R. Verma", "S. Yadav", "N. Gupta", "P. Chauhan",
  "M. Tiwari", "K. Rathore", "D. Singh",
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rnd = seededRandom(42);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(rnd() * (max - min + 1)) + min;
}

function fullName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

function pad(num: number, len = 3): string {
  return String(num).padStart(len, "0");
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(randInt(8, 18), randInt(0, 59), 0, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Current signed-in user
// ---------------------------------------------------------------------------

export const CURRENT_USER: AppUser = {
  id: "u-001",
  name: "Officer Anjali Sharma",
  employeeId: "MRD-UP-10245",
  role: "Verification Officer",
  systemRole: "verification_officer",
  permissions: ["VIEW_RECORD", "VERIFY_RECORD"],
  department: "Land Records Division, Mathura",
  email: "anjali.sharma@rural.gov.in",
  avatarInitials: "AS",
};

// ---------------------------------------------------------------------------
// Processing stage template
// ---------------------------------------------------------------------------

const STAGE_LABELS = [
  "Uploaded",
  "Preprocessing",
  "OCR / HTR",
  "Layout Analysis",
  "NLP Extraction",
  "Confidence Scoring",
  "Validation",
  "Human Verification",
  "Approval",
  "Digital Land Record",
];

function buildStages(completedThrough: number, failed = false): LandDocument["stages"] {
  return STAGE_LABELS.map((label, i) => {
    const id = `stage-${i}`;
    if (failed && i === completedThrough) {
      return { id, label, status: "failed" as const, error: "Illegible handwriting region detected on page 2." };
    }
    if (i < completedThrough) {
      return {
        id,
        label,
        status: "completed" as const,
        startedAt: daysAgo(2),
        completedAt: daysAgo(2),
        durationSeconds: randInt(20, 240),
      };
    }
    if (i === completedThrough) {
      return { id, label, status: "active" as const, startedAt: daysAgo(0) };
    }
    return { id, label, status: "pending" as const };
  });
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

const THUMB_COLORS = ["#e9dcc3", "#e4d4b8", "#ded0c0", "#e6dcc9"];

export const DOCUMENTS: LandDocument[] = Array.from({ length: 48 }).map((_, i) => {
  const state = pick(STATES);
  const district = pick(DISTRICTS_BY_STATE[state]);
  const village = pick(VILLAGES);
  const confidence = randInt(45, 99);
  const stageProgress = randInt(2, 10);
  const failed = rnd() < 0.08;
  const processingStatus: LandDocument["processingStatus"] =
    failed ? "failed" : stageProgress >= 10 ? "completed" : stageProgress <= 2 ? "uploaded" : "processing";

  const validationStatus: LandDocument["validationStatus"] =
    confidence > 90 ? "passed" : confidence > 70 ? "warning" : "failed";

  const verificationStatus: LandDocument["verificationStatus"] =
    processingStatus !== "completed"
      ? "pending"
      : pick(["pending", "assigned", "in_review", "approved", "rejected"] as const);

  return {
    id: `DOC-2024-${pad(1000 + i)}`,
    fileName: `${pick(RECORD_TYPES).toLowerCase().replace(/\s+/g, "_")}_${randInt(100, 999)}.pdf`,
    documentType: pick(RECORD_TYPES),
    location: { state, district, tehsil: district, village },
    uploadedBy: pick(OFFICER_NAMES),
    uploadDate: daysAgo(randInt(0, 60)),
    pages: randInt(1, 6),
    language: pick(["Hindi", "English", "Hindi + English"]),
    fileSizeKb: randInt(400, 8200),
    fileType: pick(["PDF", "JPG", "PNG", "TIFF"]),
    processingStatus,
    confidence,
    validationStatus,
    verificationStatus,
    stages: buildStages(stageProgress, failed),
    thumbnailColor: pick(THUMB_COLORS),
  };
});

// ---------------------------------------------------------------------------
// Extraction fields (for a given "focus" document used across viewers)
// ---------------------------------------------------------------------------

export function buildExtractionFields(seedConfidence = 84) {
  const fields = [
    { id: "f1", label: "Owner Name", value: "Ramesh Kumar", conf: seedConfidence + 13 },
    { id: "f2", label: "Father / Husband Name", value: "Suresh Kumar", conf: seedConfidence + 8 },
    { id: "f3", label: "Survey Number", value: "142/3A", conf: seedConfidence - 22 },
    { id: "f4", label: "Khasra Number", value: "142", conf: seedConfidence + 5 },
    { id: "f5", label: "Khata Number", value: "67", conf: seedConfidence + 3 },
    { id: "f6", label: "Village", value: "Govardhan", conf: seedConfidence + 10 },
    { id: "f7", label: "Tehsil", value: "Govardhan", conf: seedConfidence + 9 },
    { id: "f8", label: "District", value: "Mathura", conf: seedConfidence + 11 },
    { id: "f9", label: "State", value: "Uttar Pradesh", conf: seedConfidence + 12 },
    { id: "f10", label: "Land Area", value: "2.45 Acres", conf: seedConfidence + 4 },
    { id: "f11", label: "Land Classification", value: "Agricultural", conf: seedConfidence + 6 },
  ];
  return fields.map((f) => ({
    id: f.id,
    label: f.label,
    value: f.value,
    confidence: Math.max(38, Math.min(99, f.conf)),
    source: "NLP" as const,
    validationStatus: (f.conf > 88 ? "passed" : f.conf > 70 ? "warning" : "failed") as
      | "passed"
      | "warning"
      | "failed",
  }));
}

// ---------------------------------------------------------------------------
// Validation issues
// ---------------------------------------------------------------------------

export const VALIDATION_ISSUES: ValidationIssue[] = [
  {
    id: "VI-001",
    documentId: "DOC-2024-1004",
    type: "Owner Conflict",
    field: "Owner Name",
    severity: "failed",
    reason: "Extracted owner name differs from reference land-record database.",
    extractedValue: "Ramesh Kumar",
    referenceValue: "Rajesh Kumar",
    recommendedAction: "Review the original document and confirm the correct owner before approval.",
    officerAction: null,
  },
  {
    id: "VI-002",
    documentId: "DOC-2024-1004",
    type: "Invalid Survey Number",
    field: "Survey Number",
    severity: "warning",
    reason: "Survey number format does not match the district's registry pattern.",
    extractedValue: "142/3A",
    referenceValue: "142/3B",
    recommendedAction: "Cross-check against the tehsil survey ledger.",
    officerAction: null,
  },
  {
    id: "VI-003",
    documentId: "DOC-2024-1012",
    type: "Missing Field",
    field: "Khata Number",
    severity: "failed",
    reason: "Khata number could not be located on the scanned page.",
    extractedValue: "—",
    referenceValue: "N/A",
    recommendedAction: "Manually inspect page 2 of the original register.",
    officerAction: null,
  },
  {
    id: "VI-004",
    documentId: "DOC-2024-1020",
    type: "Duplicate Record",
    field: "Survey Number + Village",
    severity: "warning",
    reason: "A record with the same survey number and village already exists.",
    extractedValue: "DOC-2024-1020",
    referenceValue: "DOC-2024-0892",
    recommendedAction: "Confirm whether this is a mutation of the existing record.",
    officerAction: null,
  },
  {
    id: "VI-005",
    documentId: "DOC-2024-1031",
    type: "GIS Mismatch",
    field: "Parcel Boundary",
    severity: "warning",
    reason: "Recorded area differs from the cadastral map measurement by more than 8%.",
    extractedValue: "2.45 Acres",
    referenceValue: "2.10 Acres (GIS)",
    recommendedAction: "Run spatial validation against the cadastral layer.",
    officerAction: null,
  },
  {
    id: "VI-006",
    documentId: "DOC-2024-1044",
    type: "Village Mismatch",
    field: "Village",
    severity: "failed",
    reason: "Village name on document does not match the declared tehsil's village list.",
    extractedValue: "Sonkh",
    referenceValue: "Naujheel",
    recommendedAction: "Confirm village against tehsil master data.",
    officerAction: null,
  },
];

// ---------------------------------------------------------------------------
// Verification queue
// ---------------------------------------------------------------------------

export const VERIFICATION_TASKS: VerificationTask[] = Array.from({ length: 24 }).map((_, i) => {
  const state = pick(STATES);
  const district = pick(DISTRICTS_BY_STATE[state]);
  const confidence = randInt(38, 92);
  const flags: VerificationTask["flags"] = [];
  if (confidence < 70) flags.push("low_confidence");
  if (rnd() < 0.35) flags.push("validation_failed");
  if (rnd() < 0.15) flags.push("duplicate");
  if (rnd() < 0.15) flags.push("gis_mismatch");
  const ageHours = randInt(1, 96);
  if (ageHours > 48) flags.push("overdue");

  return {
    id: `VT-${pad(500 + i)}`,
    documentId: `DOC-2024-${pad(1000 + i)}`,
    priority: confidence < 60 ? "High" : confidence < 80 ? "Medium" : "Low",
    owner: fullName(),
    location: { state, district, tehsil: district, village: pick(VILLAGES) },
    confidence,
    validationIssueCount: flags.includes("validation_failed") ? randInt(1, 3) : 0,
    assignedTo: rnd() < 0.6 ? pick(OFFICER_NAMES) : null,
    ageHours,
    status: pick(["pending", "assigned", "in_review"] as const),
    flags,
  };
});

// ---------------------------------------------------------------------------
// Land records
// ---------------------------------------------------------------------------

export const LAND_RECORDS: LandRecord[] = Array.from({ length: 40 }).map((_, i) => {
  const state = pick(STATES);
  const district = pick(DISTRICTS_BY_STATE[state]);
  const village = pick(VILLAGES);
  const ocrConfidence = randInt(60, 99);
  const extractionConfidence = randInt(55, 99);
  const gisConfidence = randInt(50, 99);
  const overall = Math.round((ocrConfidence + extractionConfidence) / 2);

  return {
    id: `LR-2024-${pad(1 + i)}`,
    documentId: `DOC-2024-${pad(1000 + i)}`,
    owner: fullName(),
    fatherOrHusbandName: fullName(),
    coOwners: rnd() < 0.3 ? [fullName()] : [],
    surveyNumber: `${randInt(50, 400)}/${randInt(1, 9)}${pick(["A", "B", "C"])}`,
    khasraNumber: String(randInt(50, 400)),
    khataNumber: String(randInt(10, 200)),
    area: Number((randInt(20, 500) / 100).toFixed(2)),
    areaUnit: pick(["Acres", "Hectares"]),
    landType: pick(["Agricultural", "Residential", "Commercial", "Barren", "Forest"]),
    location: { state, district, tehsil: district, village },
    status: overall > 88 ? "Verified" : overall > 65 ? "Pending" : "Rejected",
    ocrConfidence,
    extractionConfidence,
    validationStatus: overall > 88 ? "passed" : overall > 70 ? "warning" : "failed",
    gisConfidence,
  };
});

// ---------------------------------------------------------------------------
// State / district progress
// ---------------------------------------------------------------------------

export const STATE_PROGRESS: StateProgress[] = STATES.map((state) => {
  const total = randInt(8000, 32000);
  const processed = Math.round(total * (randInt(60, 98) / 100));
  const validated = Math.round(processed * (randInt(70, 96) / 100));
  const verified = Math.round(validated * (randInt(65, 92) / 100));
  const approved = Math.round(verified * (randInt(80, 98) / 100));
  return { state, totalRecords: total, processed, validated, verified, approved };
});

export const DISTRICT_PROGRESS: DistrictProgress[] = Object.entries(DISTRICTS_BY_STATE)
  .flatMap(([state, districts]) => districts.map((district) => ({ state, district })))
  .slice(0, 12)
  .map(({ state, district }) => {
    const documents = randInt(600, 4200);
    const processed = Math.round(documents * (randInt(55, 97) / 100));
    const errors = randInt(2, 60);
    return {
      district,
      state,
      documents,
      processed,
      pending: documents - processed,
      errors,
    };
  });

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------

export const AUDIT_LOG: AuditEntry[] = [
  { id: "A-1", timestamp: daysAgo(0), user: "System", action: "Document uploaded", documentId: "DOC-2024-1042" },
  { id: "A-2", timestamp: daysAgo(0), user: "System", action: "OCR / HTR completed", documentId: "DOC-2024-1042" },
  { id: "A-3", timestamp: daysAgo(0), user: "System", action: "AI extraction completed", documentId: "DOC-2024-1042" },
  { id: "A-4", timestamp: daysAgo(0), user: "System", action: "Validation completed", documentId: "DOC-2024-1042" },
  {
    id: "A-5",
    timestamp: daysAgo(0),
    user: "Supervisor R. Verma",
    action: "Assigned to Officer",
    documentId: "DOC-2024-1042",
    newValue: "A. Sharma",
  },
  {
    id: "A-6",
    timestamp: daysAgo(0),
    user: "Officer A. Sharma",
    action: "Field corrected",
    documentId: "DOC-2024-1042",
    previousValue: "Survey No. 142/3A",
    newValue: "Survey No. 142/3B",
    reason: "Matched against tehsil survey ledger",
  },
  { id: "A-7", timestamp: daysAgo(0), user: "System", action: "Validation re-run", documentId: "DOC-2024-1042" },
  {
    id: "A-8",
    timestamp: daysAgo(0),
    user: "Officer A. Sharma",
    action: "Record approved",
    documentId: "DOC-2024-1042",
  },
  ...Array.from({ length: 30 }).map((_, i) => ({
    id: `A-${9 + i}`,
    timestamp: daysAgo(randInt(1, 45)),
    user: pick(OFFICER_NAMES),
    action: pick([
      "Document uploaded",
      "OCR / HTR completed",
      "AI extraction completed",
      "Validation completed",
      "Validation failed",
      "Record assigned",
      "Field corrected",
      "Record approved",
      "Record rejected",
      "Re-verification requested",
    ]),
    documentId: `DOC-2024-${pad(1000 + randInt(0, 47))}`,
  })),
];

// ---------------------------------------------------------------------------
// Cadastral parcels (relative coordinates for a simple SVG map mock)
// ---------------------------------------------------------------------------

export const CADASTRAL_PARCELS: CadastralParcel[] = [
  {
    id: "P-1",
    surveyNumber: "124/1",
    owner: "Suresh Chand",
    area: 1.8,
    status: "Validated",
    gisConfidence: 96,
    village: "Rampur",
    tehsil: "Sadar",
    district: "Ghaziabad",
    coordinates: [[10, 10], [45, 8], [48, 42], [8, 45]],
  },
  {
    id: "P-2",
    surveyNumber: "124/2",
    owner: "Ram Prasad",
    area: 0.43,
    status: "Validated",
    gisConfidence: 94,
    village: "Rampur",
    tehsil: "Sadar",
    district: "Ghaziabad",
    coordinates: [[45, 8], [80, 12], [78, 44], [48, 42]],
  },
  {
    id: "P-3",
    surveyNumber: "125/1",
    owner: "Meena Devi",
    area: 2.1,
    status: "Pending",
    gisConfidence: 71,
    village: "Rampur",
    tehsil: "Sadar",
    district: "Ghaziabad",
    coordinates: [[80, 12], [95, 20], [92, 50], [78, 44]],
  },
  {
    id: "P-4",
    surveyNumber: "124/1",
    owner: "Suresh Chand",
    area: 1.2,
    status: "Mismatch",
    gisConfidence: 58,
    village: "Rampur",
    tehsil: "Sadar",
    district: "Ghaziabad",
    coordinates: [[8, 45], [48, 42], [50, 80], [10, 85]],
  },
  {
    id: "P-5",
    surveyNumber: "125/1",
    owner: "Meena Devi",
    area: 1.6,
    status: "Validated",
    gisConfidence: 91,
    village: "Rampur",
    tehsil: "Sadar",
    district: "Ghaziabad",
    coordinates: [[48, 42], [78, 44], [80, 82], [50, 80]],
  },
];

export const RECENT_UPLOADS = DOCUMENTS.slice(0, 6);
