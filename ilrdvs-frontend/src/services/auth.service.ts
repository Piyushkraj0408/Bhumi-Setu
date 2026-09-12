import { apiFetch, ApiError } from "./api";
import { tokenStore } from "../lib/tokenStore";
import type { AppUser } from "../types";

// ---------------------------------------------------------------------------
// Types mirroring the backend schemas
// ---------------------------------------------------------------------------

export interface LoginRequest {
  /** Email address — backend LoginRequest.email */
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  role_name?: string;
  scope_type?: string | null;
  scope_id?: string | null;
}

export interface LoginResponse {
  user: AppUser;
  token: string;
}

interface BackendTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

interface BackendRoleAssignment {
  role_name: string;
  scope_type: string | null;
  scope_id: string | null;
  permissions: string[];
}

interface BackendCurrentUser {
  id: string;
  email: string;
  name: string;
  status: string;
  roles: BackendRoleAssignment[];
  all_permissions: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert the backend user object to the frontend AppUser shape. */
function toAppUser(u: BackendCurrentUser): AppUser {
  const primaryRole = u.roles[0]?.role_name ?? "tehsil_officer";

  // Map backend snake_case role names to the frontend display labels
  const roleMap: Record<string, AppUser["role"]> = {
    super_admin: "Administrator",
    state_admin: "Administrator",
    district_admin: "Administrator",
    tehsil_officer: "Data Entry Officer",
    verification_officer: "Verification Officer",
    auditor: "Auditor",
    citizen: "Citizen / Land Owner",
  };

  const nameParts = u.name.trim().split(" ");
  const initials = nameParts
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return {
    id: u.id,
    name: u.name,
    employeeId: u.id.replace(/-/g, "").slice(0, 12).toUpperCase(),
    role: (roleMap[primaryRole] as AppUser["role"]) ?? (primaryRole === "citizen" ? "Citizen / Land Owner" : "Data Entry Officer"),
    systemRole: (primaryRole as AppUser["systemRole"]) ?? "citizen",
    permissions: u.all_permissions ?? [],
    department: primaryRole === "citizen" ? "Public Citizen Portal" : "Land Records Department",
    email: u.email,
    avatarInitials: initials || "U",
  };
}

// ---------------------------------------------------------------------------
// Public service functions
// ---------------------------------------------------------------------------

export async function login(req: LoginRequest): Promise<LoginResponse> {
  if (!req.email || !req.password) {
    throw new ApiError("Email and password are required.", 400);
  }

  // 1. Obtain tokens
  const tokenRes = await apiFetch<BackendTokenResponse>("/auth/login", {
    method: "POST",
    body: { email: req.email, password: req.password } as unknown as Record<string, unknown>,
  });

  // 2. Persist tokens before fetching /me (apiFetch reads them)
  tokenStore.set(tokenRes.access_token, tokenRes.refresh_token);

  // 3. Fetch the user profile
  const profile = await apiFetch<BackendCurrentUser>("/auth/me");
  const user = toAppUser(profile);

  return { user, token: tokenRes.access_token };
}

export async function signup(req: SignupRequest): Promise<LoginResponse> {
  if (!req.name || !req.email || !req.password) {
    throw new ApiError("Full name, email and password are required.", 400);
  }

  // 1. Register & obtain tokens
  const tokenRes = await apiFetch<BackendTokenResponse>("/auth/signup", {
    method: "POST",
    body: {
      name: req.name,
      email: req.email,
      password: req.password,
      role_name: req.role_name || "tehsil_officer",
      scope_type: req.scope_type || null,
      scope_id: req.scope_id || null,
    } as unknown as Record<string, unknown>,
  });

  // 2. Persist tokens
  tokenStore.set(tokenRes.access_token, tokenRes.refresh_token);

  // 3. Fetch user profile
  const profile = await apiFetch<BackendCurrentUser>("/auth/me");
  const user = toAppUser(profile);

  return { user, token: tokenRes.access_token };
}

export async function logout(): Promise<void> {
  const refreshToken = tokenStore.getRefresh();
  if (refreshToken) {
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
        body: { refresh_token: refreshToken } as unknown as Record<string, unknown>,
      });
    } catch {
      // Even if logout fails server-side, clear local tokens
    }
  }
  tokenStore.clear();
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const access = tokenStore.getAccess();
  if (!access) return null;
  try {
    const profile = await apiFetch<BackendCurrentUser>("/auth/me");
    return toAppUser(profile);
  } catch {
    return null;
  }
}

