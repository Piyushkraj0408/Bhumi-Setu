import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr


# --- Shared Common Schemas ---
class MessageResponse(BaseModel):
    message: str
    timestamp: datetime = datetime.now()


# --- Super Admin Schemas ---
class AdminUserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    name: str
    status: str
    created_at: datetime
    role_name: str | None = None
    scope_type: str | None = None
    scope_id: str | None = None

    class Config:
        from_attributes = True


class UpdateUserStatusRequest(BaseModel):
    status: str  # "active", "suspended", "pending"


class SystemStatsOut(BaseModel):
    total_users: int
    total_documents: int
    total_processing_jobs: int
    active_queues: int
    system_status: str = "healthy"
    database_status: str = "connected"


class RolePermissionOut(BaseModel):
    role_name: str
    permissions: list[str]


# --- State Admin Schemas ---
class DistrictOverview(BaseModel):
    district_code: str
    district_name: str
    total_tehsils: int
    total_documents_processed: int
    pending_verifications: int


class StateAnalyticsOut(BaseModel):
    state_code: str
    total_districts: int
    digitized_parcels: int
    pending_approvals: int
    ai_confidence_average: float


# --- District Admin Schemas ---
class TehsilOverview(BaseModel):
    tehsil_code: str
    tehsil_name: str
    active_officers: int
    documents_in_queue: int


class QueueMonitoringOut(BaseModel):
    district_code: str
    queued_jobs: int
    processing_jobs: int
    completed_today: int
    failed_jobs: int


# --- Tehsil Officer Schemas ---
class MasterRecordApprovalRequest(BaseModel):
    document_id: uuid.UUID
    khasra_number: str
    owner_name: str
    area_sq_meters: float
    remarks: str | None = None


class MasterRecordOut(BaseModel):
    record_id: str
    khasra_number: str
    khata_number: str
    owner_name: str
    father_or_husband_name: str
    village: str
    tehsil: str
    district: str
    total_area_sq_meters: float
    status: str
    last_updated: datetime


# --- Verification Officer Schemas ---
class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class VerificationTaskOut(BaseModel):
    task_id: str
    document_id: uuid.UUID
    original_filename: str
    overall_confidence: float
    flagged_fields: list[str]
    doc_type: str | None
    created_at: datetime


class FieldCorrection(BaseModel):
    field_name: str
    corrected_value: str
    confidence_score: float = 1.0


class VerificationSubmitRequest(BaseModel):
    corrections: list[FieldCorrection]
    verified_by_officer: bool = True
    comments: str | None = None


class RejectionRequest(BaseModel):
    reason: str
    rejection_category: str  # "illegible_scan", "missing_seal", "fraudulent", "invalid_format"


# --- Auditor Schemas ---
class AuditLogEntryOut(BaseModel):
    id: str
    user_email: str
    action: str
    resource_type: str
    resource_id: str
    ip_address: str | None = None
    created_at: datetime


class IntegrityVerificationOut(BaseModel):
    document_id: uuid.UUID
    original_filename: str
    stored_hash: str
    calculated_hash: str
    is_tamper_free: bool
    last_verified: datetime


# --- Public / Citizen Portal Schemas ---
class PublicLandSearchRequest(BaseModel):
    district: str
    tehsil: str
    village: str
    khasra_or_survey_number: str


class PublicRecordExtractOut(BaseModel):
    khasra_number: str
    khata_number: str
    owner_name_masked: str  # e.g., "R***sh K***r" for privacy
    village: str
    tehsil: str
    district: str
    total_area_sq_meters: float
    legal_status: str
    verification_badge: bool
    verified_at: datetime
