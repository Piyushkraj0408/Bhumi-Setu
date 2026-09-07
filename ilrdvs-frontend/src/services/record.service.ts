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

// Cached results so single-record lookup doesn't need a second API call
let _cachedRecords: LandRecord[] = [];

export async function searchRecords(filters: RecordSearchFilters = {}) {
  const raw = await apiFetch<BackendMasterRecord[]>(
    "/tehsil-officer/records/master"
  );
  _cachedRecords = raw.map(toFrontend);
  let items = [..._cachedRecords];

  if (filters.owner)
    items = items.filter((r) =>
      r.owner.toLowerCase().includes(filters.owner!.toLowerCase())
    );
  if (filters.surveyNumber)
    items = items.filter((r) => r.surveyNumber.includes(filters.surveyNumber!));
  if (filters.khasraNumber)
    items = items.filter((r) => r.khasraNumber.includes(filters.khasraNumber!));
  if (filters.khataNumber)
    items = items.filter((r) => r.khataNumber.includes(filters.khataNumber!));
  if (filters.village)
    items = items.filter((r) => r.location.village === filters.village);
  if (filters.district)
    items = items.filter((r) => r.location.district === filters.district);
  if (filters.state)
    items = items.filter((r) => r.location.state === filters.state);
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
  return _cachedRecords.find((r) => r.id === id);
}

