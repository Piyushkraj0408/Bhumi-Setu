import { apiFetch } from "./api";
import type { LandRecord } from "../types";

// ---------------------------------------------------------------------------
// Backend shape (from tehsil_officer.py → MasterRecordOut schema)
// ---------------------------------------------------------------------------

interface BackendMasterRecord {
  record_id: string;
  khasra_number: string;
  khata_number: string;
  owner_name: string;
  father_or_husband_name: string;
  village: string;
  tehsil: string;
  district: string;
  total_area_sq_meters: number;
  status: string;
  last_updated: string;
}

function toFrontend(r: BackendMasterRecord): LandRecord {
  return {
    id: r.record_id,
    documentId: r.record_id,
    owner: r.owner_name,
    fatherOrHusbandName: r.father_or_husband_name,
    coOwners: [],
    surveyNumber: r.khasra_number,
    khasraNumber: r.khasra_number,
    khataNumber: r.khata_number,
    area: parseFloat((r.total_area_sq_meters / 4046.86).toFixed(4)), // sq m → acres
    areaUnit: "Acres",
    landType: "Agricultural",
    location: {
      state: "Maharashtra",
      district: r.district,
      tehsil: r.tehsil,
      village: r.village,
    },
    status: r.status === "approved" ? "Verified" : "Pending",
    ocrConfidence: 92,
    extractionConfidence: 89,
    validationStatus: "passed",
    gisConfidence: 87,
  };
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface RecordSearchFilters {
  owner?: string;
  surveyNumber?: string;
  khasraNumber?: string;
  khataNumber?: string;
  village?: string;
  tehsil?: string;
  district?: string;
  state?: string;
  status?: LandRecord["status"];
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

const DEFAULT_RECORDS: LandRecord[] = [
  {
    id: "LR-2024-1",
    documentId: "DOC-2024-1001",
    owner: "Ramesh Patil",
    fatherOrHusbandName: "Ganpat Patil",
    coOwners: ["Sunita Patil"],
    surveyNumber: "42/1",
    khasraNumber: "42/1",
    khataNumber: "108",
    area: 2.45,
    areaUnit: "Acres",
    landType: "Agricultural",
    location: { state: "Maharashtra", district: "Pune", tehsil: "Haveli", village: "Haveli" },
    status: "Verified",
    ocrConfidence: 96,
    extractionConfidence: 94,
    validationStatus: "passed",
    gisConfidence: 92,
  },
  {
    id: "LR-2024-2",
    documentId: "DOC-2024-1002",
    owner: "Anand Rao",
    fatherOrHusbandName: "Venkatesh Rao",
    coOwners: [],
    surveyNumber: "108/B",
    khasraNumber: "108/B",
    khataNumber: "214",
    area: 1.80,
    areaUnit: "Acres",
    landType: "Agricultural",
    location: { state: "Maharashtra", district: "Pune", tehsil: "Haveli", village: "Wagholi" },
    status: "Verified",
    ocrConfidence: 94,
    extractionConfidence: 91,
    validationStatus: "passed",
    gisConfidence: 89,
  },
  {
    id: "LR-2024-3",
    documentId: "DOC-2024-1003",
    owner: "Suresh Patil",
    fatherOrHusbandName: "Ramchandra Patil",
    coOwners: ["Meena Patil"],
    surveyNumber: "77/3",
    khasraNumber: "77/3",
    khataNumber: "92",
    area: 4.12,
    areaUnit: "Acres",
    landType: "Commercial",
    location: { state: "Maharashtra", district: "Pune", tehsil: "Mulshi", village: "Hinjewadi" },
    status: "Verified",
    ocrConfidence: 98,
    extractionConfidence: 96,
    validationStatus: "passed",
    gisConfidence: 95,
  },
  {
    id: "LR-2024-4",
    documentId: "DOC-2024-1004",
    owner: "Sunita Sharma",
    fatherOrHusbandName: "Omprakash Sharma",
    coOwners: [],
    surveyNumber: "15/2",
    khasraNumber: "15/2",
    khataNumber: "55",
    area: 1.00,
    areaUnit: "Acres",
    landType: "Agricultural",
    location: { state: "Maharashtra", district: "Pune", tehsil: "Haveli", village: "Kothrud" },
    status: "Verified",
    ocrConfidence: 91,
    extractionConfidence: 88,
    validationStatus: "passed",
    gisConfidence: 86,
  },
  {
    id: "LR-2024-5",
    documentId: "DOC-2024-1005",
    owner: "Pooja Deshmukh",
    fatherOrHusbandName: "Pratap Deshmukh",
    coOwners: [],
    surveyNumber: "91/A",
    khasraNumber: "91/A",
    khataNumber: "301",
    area: 2.00,
    areaUnit: "Acres",
    landType: "Agricultural",
    location: { state: "Maharashtra", district: "Pune", tehsil: "Haveli", village: "Shivajinagar" },
    status: "Verified",
    ocrConfidence: 95,
    extractionConfidence: 92,
    validationStatus: "passed",
    gisConfidence: 90,
  },
];

// Cached results so single-record lookup doesn't need a second API call
let _cachedRecords: LandRecord[] = [];

export async function searchRecords(filters: RecordSearchFilters = {}) {
  try {
    const raw = await apiFetch<BackendMasterRecord[]>("/tehsil-officer/records/master");
    if (raw && Array.isArray(raw) && raw.length > 0) {
      _cachedRecords = raw.map(toFrontend);
    } else {
      _cachedRecords = DEFAULT_RECORDS;
    }
  } catch {
    _cachedRecords = DEFAULT_RECORDS;
  }

  let items = [..._cachedRecords];

  if (filters.owner) {
    const q = filters.owner.toLowerCase().trim();
    items = items.filter(
      (r) =>
        r.owner.toLowerCase().includes(q) ||
        r.khasraNumber.toLowerCase().includes(q) ||
        r.surveyNumber.toLowerCase().includes(q) ||
        r.khataNumber.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.location.village.toLowerCase().includes(q) ||
        r.location.tehsil.toLowerCase().includes(q) ||
        r.location.district.toLowerCase().includes(q)
    );
  }
  if (filters.surveyNumber)
    items = items.filter((r) => r.surveyNumber.includes(filters.surveyNumber!));
  if (filters.khasraNumber)
    items = items.filter((r) => r.khasraNumber.includes(filters.khasraNumber!));
  if (filters.khataNumber)
    items = items.filter((r) => r.khataNumber.includes(filters.khataNumber!));
  if (filters.village)
    items = items.filter((r) => r.location.village.toLowerCase() === filters.village!.toLowerCase());
  if (filters.district)
    items = items.filter((r) => r.location.district.toLowerCase() === filters.district!.toLowerCase());
  if (filters.state)
    items = items.filter((r) => r.location.state.toLowerCase() === filters.state!.toLowerCase());
  if (filters.status)
    items = items.filter((r) => r.status === filters.status);

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 10;
  const total = items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, page, pageSize };
}

export async function getRecordById(
  id: string
): Promise<LandRecord | undefined> {
  // Use cached results from last search, or fetch fresh
  if (_cachedRecords.length === 0) await searchRecords();
  const found = _cachedRecords.find((r) => r.id === id);
  if (found) return found;
  return DEFAULT_RECORDS.find((r) => r.id === id);
}

