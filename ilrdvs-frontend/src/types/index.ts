// ---------------------------------------------------------------------------
// ILRDVS — Core domain types
// These types define the shape of data the UI expects. Real API responses
// should be mapped to these shapes in the services layer.
// ---------------------------------------------------------------------------

export type ProcessingStatus =
  | "uploaded"
  | "processing"
  | "completed"
  | "failed";

export type VerificationStatus =
  | "pending"
  | "assigned"
  | "in_review"
  | "approved"
  | "rejected";

export type ValidationStatus = "passed" | "warning" | "failed" | "pending";

export type ConfidenceLevel = "high" | "medium" | "low";

export type UserRole =
  | "Administrator"
  | "Data Entry Officer"
  | "Verification Officer"
  | "Supervisor"
  | "GIS Officer"
  | "Auditor"
  | "Citizen / Land Owner";

/** Exact backend role key from MongoDB roles collection */
export type SystemRole =
  | "super_admin"
  | "state_admin"
  | "district_admin"
  | "tehsil_officer"
  | "verification_officer"
  | "auditor"
  | "citizen";

export interface AppUser {
  id: string;
  name: string;
  employeeId: string;
  role: UserRole;
  /** Raw backend role key — used for strict permission gating in UI */
  systemRole: SystemRole;
  /** All permissions granted to this user's role */
  permissions: string[];
  department: string;
  email: string;
  avatarInitials: string;
}

export interface LocationRef {
  state: string;
  district: string;
  tehsil: string;
  village: string;
}

export interface ProcessingStage {
  id: string;
  label: string;
  status: "completed" | "active" | "pending" | "failed";
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  error?: string;
}

export interface LandDocument {
  id: string;
  fileName: string;
  documentType:
    | "Khasra"
    | "Khatauni"
    | "Jamabandi"
    | "Record of Rights"
    | "Mutation Register"
    | "Survey Settlement"
    | "Register";
  location: LocationRef;
  uploadedBy: string;
  uploadDate: string;
  pages: number;
  language: string;
  fileSizeKb: number;
  fileType: "PDF" | "JPG" | "PNG" | "TIFF";
  processingStatus: ProcessingStatus;
  confidence: number; // overall document confidence 0-100
  validationStatus: ValidationStatus;
  verificationStatus: VerificationStatus;
  stages: ProcessingStage[];
  thumbnailColor: string;
  previewUrl?: string;
  fileUrl?: string;
  year?: string;
}

export interface ExtractedField {
  id: string;
  label: string;
  value: string;
  confidence: number;
  source: "OCR" | "HTR" | "NLP" | "Manual";
  validationStatus: ValidationStatus;
  boundingBox?: { x: number; y: number; w: number; h: number };
}

export interface ValidationIssue {
  id: string;
  documentId: string;
  type:
    | "Owner Conflict"
    | "Missing Field"
    | "Invalid Survey Number"
    | "Duplicate Record"
    | "Master-data Conflict"
    | "GIS Mismatch"
    | "Invalid Area"
    | "Village Mismatch"
    | "District Mismatch";
  field: string;
  severity: "warning" | "failed";
  reason: string;
  extractedValue: string;
  referenceValue: string;
  recommendedAction: string;
  officerAction?: "accept" | "correct" | "reject" | null;
}

export interface VerificationTask {
  id: string;
  documentId: string;
  priority: "High" | "Medium" | "Low";
  owner: string;
  location: LocationRef;
  confidence: number;
  validationIssueCount: number;
  assignedTo: string | null;
  ageHours: number;
  status: VerificationStatus;
  flags: Array<"low_confidence" | "validation_failed" | "duplicate" | "gis_mismatch" | "overdue">;
}

export interface LandRecord {
  id: string;
  documentId: string;
  owner: string;
  fatherOrHusbandName: string;
  coOwners: string[];
  surveyNumber: string;
  khasraNumber: string;
  khataNumber: string;
  area: number;
  areaUnit: "Acres" | "Hectares";
  landType: "Agricultural" | "Residential" | "Commercial" | "Barren" | "Forest";
  location: LocationRef;
  status: "Verified" | "Pending" | "Rejected";
  ocrConfidence: number;
  extractionConfidence: number;
  validationStatus: ValidationStatus;
  gisConfidence: number;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  documentId?: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
}

export interface StateProgress {
  state: string;
  totalRecords: number;
  processed: number;
  validated: number;
  verified: number;
  approved: number;
}

export interface DistrictProgress {
  district: string;
  state: string;
  documents: number;
  processed: number;
  pending: number;
  errors: number;
}

export interface KPIData {
  label: string;
  value: number;
  changePct: number;
  trend: "up" | "down";
  context: string;
}

export interface CadastralParcel {
  id: string;
  surveyNumber: string;
  owner: string;
  area: number;
  status: "Validated" | "Pending" | "Mismatch";
  gisConfidence: number;
  village: string;
  tehsil: string;
  district: string;
  coordinates: Array<[number, number]>; // polygon points, relative 0-100 for SVG map
}
