import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from pymongo.database import Database

from app.core.database import get_db
from app.core.permissions import require_permission
from app.core.scope import build_scoped_id_query
from app.api.deps import get_current_user
from app.models.mongo_models import MongoUser, DocumentStatus
from app.services import validation_service

router = APIRouter(prefix="/validation", tags=["6. Validation Engine API"])


class ValidateRequest(BaseModel):
    document_id: str | None = None
    fields: dict | None = None


class OfficerActionRequest(BaseModel):
    action: str  # "accept", "correct", "reject"
    comment: str | None = None
    corrected_value: str | None = None


@router.get(
    "/documents/{document_id}",
    summary="Get Document Validation Results and Audit Trail",
    dependencies=[Depends(require_permission("VIEW_RECORD"))],
)
def get_document_validation(
    document_id: str,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    """
    Returns full validation results for a document including:
    - Missing mandatory fields
    - Format validation
    - Cross-field contradictions
    - Duplicate detection
    - Overall status ('valid', 'warning', 'conflict')
    - Full Audit Trail
    """
    # Anti-IDOR: Check if document exists and is in user scope
    scoped_query = build_scoped_id_query(
        document_id, current_user, {"status": {"$ne": DocumentStatus.deleted.value}}
    )
    doc = db.documents.find_one(scoped_query)
    if not doc and current_user.role != "super_admin":
        # Check if it exists globally to ensure we return 404 without leaking
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or out of jurisdiction scope"
        )

    res = validation_service.validate_document_records(db, document_id)
    return res


@router.post(
    "/validate",
    summary="Run Real-time Validation on Fields",
    dependencies=[Depends(require_permission("VIEW_RECORD"))],
)
def run_validation(
    payload: ValidateRequest,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    """
    Executes real-time validation across all 6 business rule categories.
    """
    doc_id = payload.document_id or f"DOC-{uuid.uuid4()}"
    return validation_service.validate_document_records(db, doc_id, fields=payload.fields)


@router.post(
    "/documents/{document_id}/issues/{issue_id}/action",
    summary="Submit Officer Decision on Validation Issue",
    dependencies=[Depends(require_permission("VERIFY_RECORD"))],
)
def submit_officer_action(
    document_id: str,
    issue_id: str,
    payload: OfficerActionRequest,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    """
    Record officer action (accept / correct / reject) on a specific validation issue.
    """
    # Anti-IDOR scoping check
    scoped_query = build_scoped_id_query(
        document_id, current_user, {"status": {"$ne": DocumentStatus.deleted.value}}
    )
    doc = db.documents.find_one(scoped_query)
    if not doc and current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    now = datetime.now(timezone.utc)
    db.audit_logs.insert_one({
        "event_id": f"EVT-ACTION-{uuid.uuid4()}",
        "user_id": str(current_user.id),
        "user_email": current_user.email,
        "role": current_user.role,
        "action": "VERIFY_RECORD",
        "sub_action": f"ISSUE_{payload.action.upper()}",
        "record_id": document_id,
        "document_id": document_id,
        "issue_id": issue_id,
        "comment": payload.comment,
        "corrected_value": payload.corrected_value,
        "timestamp": now,
    })

    return {
        "status": "success",
        "message": f"Issue '{issue_id}' successfully marked as '{payload.action}'.",
    }
