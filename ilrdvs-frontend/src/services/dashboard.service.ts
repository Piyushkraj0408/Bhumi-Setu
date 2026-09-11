export interface DashboardStats {
  total_documents: number;
  processed_documents: number;
  processing_documents: number;
  failed_documents: number;
  pending_verification: number;
  verified_documents: number;
  approved_master_records: number;
  rejected_documents: number;
}

export interface DashboardValidation {
  validated: number;
  pending: number;
  failed: number;
  duplicate: number;
}

export interface DashboardTrend {
  day: string;
  uploaded: number;
  processed: number;
  validated: number;
}

export interface DashboardResponse {
  officer_name: string;
  tehsil_code: string | null;

  stats: DashboardStats;

  validation: DashboardValidation;

  trend: DashboardTrend[];

  status: string;
}

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000/api/v1";

export async function getDashboardStats(): Promise<DashboardResponse> {

  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken");

  const response = await fetch(
    `${API_URL}/tehsil-officer/dashboard`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Dashboard API failed: ${response.status}`
    );
  }

  return response.json();
}