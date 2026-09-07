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

// Storage array for real uploaded documents
export const DOCUMENTS: LandDocument[] = [];

// ---------------------------------------------------------------------------
// Dynamic extraction fields builder for fresh uploaded documents
// ---------------------------------------------------------------------------

export function buildExtractionFields(_seedConfidence = 90, meta?: LandDocument) {
  const village = meta?.location?.village || "Selected Village";
  const tehsil = meta?.location?.tehsil || "Selected Tehsil";
  const district = meta?.location?.district || "Selected District";
  const state = meta?.location?.state || "Selected State";
  const docType = meta?.documentType || "Land Record";
  const year = meta?.year || "";
  const fileName = meta?.fileName || "Uploaded_Record.pdf";

  const fields = [
    { id: "f1", label: "Document Name", value: fileName, conf: 98 },
    { id: "f2", label: "Record Type", value: docType, conf: 96 },
    { id: "f3", label: "State", value: state, conf: 99 },
    { id: "f4", label: "District", value: district, conf: 99 },
    { id: "f5", label: "Tehsil", value: tehsil, conf: 99 },
    { id: "f6", label: "Village", value: village, conf: 99 },
    { id: "f7", label: "Year", value: year, conf: 95 },
    { id: "f8", label: "Document ID", value: meta?.id || "DOC-NEW", conf: 100 },
  ];

  return fields.map((f) => ({
    id: f.id,
    label: f.label,
    value: f.value,
    confidence: Math.max(70, Math.min(100, f.conf)),
    source: "NLP" as const,
    validationStatus: "passed" as const,
  }));
}

export const VALIDATION_ISSUES: ValidationIssue[] = [];
export const VERIFICATION_TASKS: VerificationTask[] = [];
export const LAND_RECORDS: LandRecord[] = [];

export const STATE_PROGRESS: StateProgress[] = STATES.map((state) => ({
  state,
  totalRecords: 0,
  processed: 0,
  validated: 0,
  verified: 0,
  approved: 0,
}));

export const DISTRICT_PROGRESS: DistrictProgress[] = Object.entries(DISTRICTS_BY_STATE)
  .flatMap(([state, districts]) => districts.map((district) => ({ state, district })))
  .slice(0, 12)
  .map(({ state, district }) => ({
    district,
    state,
    documents: 0,
    processed: 0,
    pending: 0,
    errors: 0,
  }));

export const AUDIT_LOG: AuditEntry[] = [];
export const CADASTRAL_PARCELS: CadastralParcel[] = [];
export const RECENT_UPLOADS: LandDocument[] = [];
