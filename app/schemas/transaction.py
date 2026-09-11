from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field, field_validator
from app.models.transaction_models import TransactionType, TransactionStatus


class DocumentInfoSchema(BaseModel):
    registry_number: str = Field(..., description="Official Registry or Deed Deed Number", json_schema_extra={"example": "REG-2024-0987"})
    registry_date: datetime | str | None = Field(None, description="Date of deed registration")
    document_id: str | None = Field(None, description="Optional ID reference to uploaded document in 'documents' collection")
    sub_registrar_office: str | None = Field(None, description="Sub-registrar office name / location", json_schema_extra={"example": "Haveli Sub-Registrar Office, Pune"})
    stamp_duty_paid: float | None = Field(None, description="Stamp duty or registration fee paid", ge=0)
    remarks: str | None = Field(None, description="Deed remarks or registration notes")



class CustomChildKhasraInput(BaseModel):
    khasra_number: str | None = Field(None, description="Child Khasra number (auto-generated if omitted, e.g. 125/1)")
    area: float = Field(..., gt=0, description="Physical area allocated to this child Khasra")
    ownership_percentage: float = Field(100.0, gt=0, le=100.0, description="Ownership percentage of the holder in this child parcel")
    allocated_to: str = Field(..., description="'buyer' or 'seller'")

    @field_validator("allocated_to")
    def validate_allocation(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if v_clean not in ("buyer", "seller"):
            raise ValueError("allocated_to must be either 'buyer' or 'seller'")
        return v_clean


class TransactionCreateRequest(BaseModel):
    transaction_type: TransactionType = Field(..., description="Type of transaction (SALE, PURCHASE, TRANSFER, etc.)")
    transaction_date: datetime | None = Field(None, description="Date of the transaction (defaults to now)")
    seller_id: str = Field(..., min_length=1, description="Previous owner / seller ID (references users collection)")
    buyer_id: str = Field(..., min_length=1, description="New owner / buyer ID (references users collection)")
    original_khasra_number: str = Field(..., min_length=1, description="Original Khasra number")
    transferred_area: float = Field(..., gt=0, description="Physical land area transferred/sold")
    ownership_percentage_transferred: float = Field(
        ..., gt=0, le=100.0, description="Percentage of ownership transferred (0 to 100)"
    )
    area_unit: str = Field("sq_meters", description="Unit of area measurement (sq_meters, acre, hectare, bigha)")
    document_info: DocumentInfoSchema = Field(..., description="Document / Registry information")
    custom_child_khasras: list[CustomChildKhasraInput] | None = Field(
        None, description="Optional custom child Khasra splits if subdivision occurs"
    )
    remarks: str | None = Field(None, description="Transaction notes or remarks")


class SubdivisionChildRecord(BaseModel):
    khasra_number: str
    allocated_to: str
    owner_id: str
    owner_name: str
    area: float
    ownership_percentage: float


class TransactionResponse(BaseModel):
    id: str
    transaction_id: str
    transaction_type: TransactionType
    transaction_date: datetime
    transaction_year: int
    seller_id: str
    seller_name: str
    buyer_id: str
    buyer_name: str
    original_khasra_number: str
    land_area_before: float
    transferred_area: float
    remaining_area: float
    area_unit: str
    ownership_percentage_transferred: float
    document_info: dict[str, Any]
    status: TransactionStatus
    is_subdivided: bool
    parent_khasra_no: str | None = None
    child_khasra_numbers: list[str] = []
    subdivision_records: list[SubdivisionChildRecord] = []
    created_at: datetime
    created_by: str | None = None
    remarks: str | None = None


class OwnershipTimelineEntry(BaseModel):
    transaction_id: str
    transaction_type: str
    from_owner_id: str
    from_owner_name: str
    to_owner_id: str
    to_owner_name: str
    area_transferred: float
    ownership_percentage: float
    date: datetime | str
    year: int
    event: str
    document_registry_number: str | None = None


class CurrentOwnerInfo(BaseModel):
    khasra_number: str
    owner_id: str
    owner_name: str
    father_or_husband_name: str | None = None
    area: float
    area_unit: str | None = None
    status: str
    village: str | None = None
    tehsil: str | None = None
    district: str | None = None


class KhasraOwnershipHistoryResponse(BaseModel):
    khasra_number: str
    is_active: bool
    status: str
    total_area: float
    area_unit: str | None = None
    parent_khasra_no: str | None = None
    child_khasras: list[str] = []
    current_owners: list[CurrentOwnerInfo] = []
    timeline: list[OwnershipTimelineEntry] = []
    subdivision_tree: dict[str, Any] = {}
    historical_query_result: dict[str, Any] | None = None
