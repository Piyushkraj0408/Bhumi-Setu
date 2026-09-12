import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from pymongo.database import Database

from app.core.database import get_db
from app.core.permissions import require_permission
from app.core.scope import build_scoped_id_query, merge_scope_filter
from app.api.deps import get_current_user
from app.models.mongo_models import MongoUser
from app.schemas.roles_api import MessageResponse

router = APIRouter(prefix="/records", tags=["7. Land Records API"])


class RecordEditRequest(BaseModel):
    khasra_number: str | None = None
    owner_name: str | None = None
    area_sq_meters: float | None = None
    village: str | None = None
    remarks: str | None = None


class RecordApproveRequest(BaseModel):
    remarks: str | None = None


@router.get(
    "",
    summary="List Land Records (Scoped)",
    dependencies=[Depends(require_permission("VIEW_RECORD"))],
)
def list_records(
    skip: int = 0,
    limit: int = 50,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    """
    List land records scoped strictly to the authenticated user's jurisdiction.
    """
    scoped_query = merge_scope_filter({}, current_user)
    records = list(db.documents.find(scoped_query).skip(skip).limit(limit))
    return [
        {
            "id": str(r.get("_id", r.get("id"))),
            "original_filename": r.get("original_filename"),
            "doc_type": r.get("doc_type"),
            "status": r.get("status"),
            "state_id": r.get("state_id"),
            "district_id": r.get("district_id"),
            "tehsil_id": r.get("tehsil_id"),
            "assigned_to_user_id": r.get("assigned_to_user_id"),
            "created_at": r.get("created_at"),
        }
        for r in records
    ]


@router.get(
    "/{record_id}",
    summary="Get Land Record by ID (Anti-IDOR Scoped)",
    dependencies=[Depends(require_permission("VIEW_RECORD"))],
)
def get_record_by_id(
    record_id: str,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    """
    Fetch a single record by ID with object-level anti-IDOR scope protection.
    Returns 404 if record exists outside user's jurisdiction.
    """
    scoped_query = build_scoped_id_query(record_id, current_user)
    record = db.documents.find_one(scoped_query)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Record not found"
        )

    return {
        "id": str(record.get("_id", record.get("id"))),
        "original_filename": record.get("original_filename"),
        "doc_type": record.get("doc_type"),
        "status": record.get("status"),
        "state_id": record.get("state_id"),
        "district_id": record.get("district_id"),
        "tehsil_id": record.get("tehsil_id"),
        "assigned_to_user_id": record.get("assigned_to_user_id"),
        "metadata": record.get("metadata", {}),
        "created_at": record.get("created_at"),
    }


@router.put(
    "/{record_id}",
    response_model=MessageResponse,
    summary="Edit Land Record",
    dependencies=[Depends(require_permission("EDIT_RECORD"))],
)
def edit_record(
    record_id: str,
    payload: RecordEditRequest,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    """
    Edit record fields with anti-IDOR scoping and audit logging.
    """
    scoped_query = build_scoped_id_query(record_id, current_user)
    record = db.documents.find_one(scoped_query)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Record not found"
        )

    now = datetime.now(timezone.utc)
    update_fields: dict = {"updated_at": now}
    if payload.khasra_number:
        update_fields["metadata.khasra_number"] = payload.khasra_number
    if payload.owner_name:
        update_fields["metadata.owner_name"] = payload.owner_name
    if payload.area_sq_meters is not None:
        update_fields["metadata.area_sq_meters"] = payload.area_sq_meters
    if payload.village:
        update_fields["metadata.village"] = payload.village

    db.documents.update_one(scoped_query, {"$set": update_fields})

    # Log to audit trail
    db.audit_logs.insert_one({
        "event_id": f"EVT-EDIT-{uuid.uuid4()}",
        "user_id": str(current_user.id),
        "user_email": current_user.email,
        "role": current_user.role,
        "action": "EDIT_RECORD",
        "record_id": record_id,
        "timestamp": now,
        "details": payload.model_dump(exclude_unset=True),
    })

    return MessageResponse(message=f"Record '{record_id}' successfully updated.")


@router.post(
    "/{record_id}/approve",
    response_model=MessageResponse,
    summary="Approve Land Record (Requires APPROVE_RECORD)",
    dependencies=[Depends(require_permission("APPROVE_RECORD"))],
)
def approve_record(
    record_id: str,
    payload: RecordApproveRequest | None = None,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    """
    Approve record with anti-IDOR scoping and audit logging.
    """
    scoped_query = build_scoped_id_query(record_id, current_user)
    record = db.documents.find_one(scoped_query)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Record not found"
        )

    now = datetime.now(timezone.utc)
    db.documents.update_one(
        scoped_query,
        {
            "$set": {
                "metadata.approval_status": "approved",
                "metadata.approved_by": current_user.email,
                "metadata.approved_at": now,
                "metadata.approval_remarks": payload.remarks if payload else None,
            }
        },
    )

    # Log to audit trail
    db.audit_logs.insert_one({
        "event_id": f"EVT-APPROVE-{uuid.uuid4()}",
        "user_id": str(current_user.id),
        "user_email": current_user.email,
        "role": current_user.role,
        "action": "APPROVE_RECORD",
        "record_id": record_id,
        "timestamp": now,
        "remarks": payload.remarks if payload else None,
    })

    return MessageResponse(message=f"Record '{record_id}' successfully approved by {current_user.email}.")
