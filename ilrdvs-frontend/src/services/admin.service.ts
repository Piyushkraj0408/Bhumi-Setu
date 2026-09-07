import { apiFetch } from "./api";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  status: "active" | "suspended" | "pending";
  role_name?: string;
  scope_type?: string;
  scope_id?: string;
  created_at: string;
}

export interface CreateUserPayload extends Record<string, unknown> {
  email: string;
  password: string;
  name: string;
  role_name: string;
  scope_type?: string;
  scope_id?: string;
}

export async function getUsers(): Promise<AdminUser[]> {
  try {
    return await apiFetch<AdminUser[]>("/super-admin/users");
  } catch {
    // Fallback default users if offline/mock
    return [
      { id: "u-1", name: "Super Administrator", email: "superadmin@gov.in", role_name: "super_admin", status: "active", created_at: new Date().toISOString() },
      { id: "u-2", name: "State Land Director", email: "stateadmin@gov.in", role_name: "state_admin", scope_type: "state", scope_id: "ST-MAHA", status: "active", created_at: new Date().toISOString() },
      { id: "u-3", name: "District Collector Pune", email: "districtadmin@gov.in", role_name: "district_admin", scope_type: "district", scope_id: "D-PUNE", status: "active", created_at: new Date().toISOString() },
      { id: "u-4", name: "Tehsildar Haveli", email: "tehsilofficer@gov.in", role_name: "tehsil_officer", scope_type: "tehsil", scope_id: "TH-HAVELI", status: "active", created_at: new Date().toISOString() },
      { id: "u-5", name: "Land Record Verifier", email: "verifier@gov.in", role_name: "verification_officer", scope_type: "tehsil", scope_id: "TH-HAVELI", status: "active", created_at: new Date().toISOString() },
      { id: "u-6", name: "Vigilance Auditor", email: "auditor@gov.in", role_name: "auditor", status: "active", created_at: new Date().toISOString() },
    ];
  }
}

export async function createSystemUser(payload: CreateUserPayload): Promise<AdminUser> {
  return await apiFetch<AdminUser>("/super-admin/users", {
    method: "POST",
    body: payload,
  });
}

export async function toggleUserStatus(
  userId: string,
  status: "active" | "suspended"
): Promise<{ message: string }> {
  return await apiFetch<{ message: string }>(`/super-admin/users/${userId}/status`, {
    method: "PUT",
    body: { status },
  });
}
