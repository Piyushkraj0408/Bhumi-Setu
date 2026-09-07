import uuid
from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from pymongo.database import Database

from app.core.database import get_db
from app.core.permissions import require_permission
from app.api.deps import require_roles, get_current_user
from app.models.mongo_models import MongoUser, DocumentStatus
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.document import (
    DocumentUploadResponse,
    DocumentOut,
    ProcessingJobOut,
)
from app.schemas.roles_api import (
    MasterRecordApprovalRequest,
    MasterRecordOut,
    MessageResponse,
)
from app.services import document_service, auth_service


router = APIRouter(
    prefix="/tehsil-officer",
    tags=["4. Tehsil Officer API"],
)


# ============================================================
# HELPERS
# ============================================================

def get_tehsil_code(current_user: MongoUser) -> str | None:
    """
    Get the Tehsil scope assigned to the logged-in officer.
    """
    for role in current_user.role_assignments:
        if role.get("role_name") == "tehsil_officer":
            return role.get("scope_id")

    return None


def get_document(db: Database, document_id: str):
    """
    Find a document regardless of whether the project stores
    the UUID in _id or id.
    """
    return db.documents.find_one(
        {
            "$or": [
                {"_id": document_id},
                {"id": document_id},
            ]
        }
    )


def extract_fields(ocr_result: dict) -> dict:
    """
    Safely get extracted OCR fields.
    """
    return ocr_result.get("extracted_fields") or {}


def field_value(fields: dict, name: str):
    """
    Extract the actual value from an OCR field.

    Supports:
        {"value": "..."}
    and
        {"final_value": "..."}
    """
    field = fields.get(name)

    if not isinstance(field, dict):
        return field

    if "final_value" in field:
        return field.get("final_value")

    if "value" in field:
        return field.get("value")

    return None


# ============================================================
# LOGIN
# ============================================================

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Tehsil Officer Login",
)
def tehsil_officer_login(
    payload: LoginRequest,
    db: Database = Depends(get_db),
):
    """Dedicated login endpoint for Tehsil Land Officers."""

    user = auth_service.authenticate_user(
        db,
        payload.email,
        payload.password,
    )

    user_roles = {
        ra.get("role_name")
        for ra in user.get("role_assignments", [])
    }

    if (
        "tehsil_officer" not in user_roles
        and "super_admin" not in user_roles
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Tehsil Officer credentials required",
        )

    access_token, refresh_token = auth_service.issue_tokens(
        db,
        user,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


# ============================================================
# DASHBOARD
# ============================================================

@router.get(
    "/dashboard",
    summary="Tehsil Officer Dashboard Overview",
    dependencies=[
        Depends(
            require_roles(
                ["tehsil_officer", "super_admin"]
            )
        )
    ],
)
def get_tehsil_dashboard(
    current_user: MongoUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Real Tehsil Officer dashboard using MongoDB counts.
    """

    tehsil_code = get_tehsil_code(current_user)

    document_query = {
        "status": {
            "$ne": DocumentStatus.deleted.value
        }
    }

    if tehsil_code:
        document_query["scope_id"] = tehsil_code

    total_documents = db.documents.count_documents(
        document_query
    )

    processed_documents = db.documents.count_documents(
        {
            **document_query,
            "status": DocumentStatus.processed.value,
        }
    )

    failed_documents = db.documents.count_documents(
        {
            **document_query,
            "status": DocumentStatus.failed.value,
        }
    )

    pending_tasks = db.verification_tasks.count_documents(
        {
            "status": "pending"
        }
    )

    verified_tasks = db.verification_tasks.count_documents(
        {
            "status": "verified"
        }
    )

    master_records = db.master_records.count_documents(
        {
            "status": "approved"
        }
    )

    return {
        "officer_name": current_user.name,
        "tehsil_code": tehsil_code,
        "total_documents": total_documents,
        "processed_documents": processed_documents,
        "failed_documents": failed_documents,
        "pending_verification_tasks": pending_tasks,
        "verified_documents": verified_tasks,
        "approved_master_records": master_records,
        "status": "ready",
    }


# ============================================================
# DOCUMENT UPLOAD
# ============================================================

@router.post(
    "/documents/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload Land Document for Tehsil",
    dependencies=[
        Depends(
            require_roles(
                ["tehsil_officer", "super_admin"]
            )
        )
    ],
)
def upload_tehsil_document(
    file: UploadFile = File(...),
    doc_type: str | None = Form("khasra_map"),
    village_name: str | None = Form(None),
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    """Upload scans, Khasra maps, or 7/12 records."""

    tehsil_code = get_tehsil_code(current_user)

    document_doc, job_doc = document_service.upload_document(
        db,
        file=file,
        uploader_id=current_user.id,
        doc_type=doc_type,
        scope_type="tehsil",
        scope_id=tehsil_code,
    )

    # Save village information if supplied.
    if village_name:
        db.documents.update_one(
            {
                "$or": [
                    {"_id": document_doc["id"]},
                    {"id": document_doc["id"]},
                ]
            },
            {
                "$set": {
                    "metadata.village_name": village_name
                }
            },
        )

    return DocumentUploadResponse(
        document=DocumentOut(
            id=uuid.UUID(document_doc["id"]),
            original_filename=document_doc["original_filename"],
            mime_type=document_doc["mime_type"],
            doc_type=document_doc.get("doc_type"),
            status=document_doc["status"],
            scope_type=document_doc.get("scope_type"),
            scope_id=document_doc.get("scope_id"),
            created_at=document_doc["created_at"],
            uploaded_at=(
                document_doc.get("uploaded_at")
                or document_doc["created_at"]
            ),
        ),
        job=ProcessingJobOut(
            id=uuid.UUID(job_doc["id"]),
            document_id=uuid.UUID(job_doc["document_id"]),
            status=job_doc["status"],
            error=job_doc.get("error"),
            created_at=job_doc["created_at"],
            updated_at=job_doc["updated_at"],
        ),
    )


# ============================================================
# DOCUMENT LIST
# ============================================================

@router.get(
    "/documents",
    response_model=list[DocumentOut],
    summary="List Documents for Tehsil",
    dependencies=[
        Depends(
            require_roles(
                ["tehsil_officer", "super_admin"]
            )
        )
    ],
)
def list_tehsil_documents(
    status_filter: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    """
    View documents belonging to the officer's Tehsil.
    """

    tehsil_code = get_tehsil_code(current_user)

    query = {
        "status": {
            "$ne": DocumentStatus.deleted.value
        }
    }

    if tehsil_code:
        query["scope_id"] = tehsil_code

    if status_filter:
        query["status"] = status_filter

    docs = list(
        db.documents
        .find(query)
        .skip(skip)
        .limit(limit)
    )

    return [
        DocumentOut(
            id=uuid.UUID(
                str(d.get("_id", d.get("id")))
            ),
            original_filename=d["original_filename"],
            mime_type=d["mime_type"],
            doc_type=d.get("doc_type"),
            status=d["status"],
            scope_type=d.get("scope_type"),
            scope_id=d.get("scope_id"),
            created_at=d["created_at"],
            uploaded_at=(
                d.get("uploaded_at")
                or d.get("created_at")
            ),
        )
        for d in docs
    ]


# ============================================================
# VERIFICATION QUEUE FOR TEHSIL OFFICER
# ============================================================

@router.get(
    "/verification-queue",
    summary="View Verified OCR Records Awaiting Tehsil Approval",
    dependencies=[
        Depends(
            require_roles(
                ["tehsil_officer", "super_admin"]
            )
        )
    ],
)
def get_verification_queue(
    skip: int = 0,
    limit: int = 50,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    """
    Show documents that have passed Verification Officer review
    and are ready for Tehsil Officer approval.
    """

    tehsil_code = get_tehsil_code(current_user)

    query = {
        "status": "verified"
    }

    tasks = list(
        db.verification_tasks
        .find(query)
        .sort("updated_at", -1)
        .skip(skip)
        .limit(limit)
    )

    results = []

    for task in tasks:

        document_id = task.get("document_id")

        document = get_document(
            db,
            str(document_id),
        )

        if not document:
            continue

        if (
            tehsil_code
            and document.get("scope_id") != tehsil_code
        ):
            continue

        results.append(
            {
                "task_id": task.get("task_id"),
                "document_id": document_id,
                "filename": document.get(
                    "original_filename"
                ),
                "confidence": task.get(
                    "overall_confidence"
                ),
                "confidence_band": task.get(
                    "confidence_band"
                ),
                "status": task.get("status"),
                "updated_at": task.get("updated_at"),
            }
        )

    return results


# ============================================================
# VIEW SINGLE RECORD BEFORE APPROVAL
# ============================================================

@router.get(
    "/verification-queue/{task_id}",
    summary="View OCR Data Before Master Record Approval",
    dependencies=[
        Depends(
            require_roles(
                ["tehsil_officer", "super_admin"]
            )
        )
    ],
)
def get_verification_record(
    task_id: str,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    """
    Return verification task + OCR extracted fields
    for Tehsil Officer review.
    """

    task = db.verification_tasks.find_one(
        {
            "task_id": task_id
        }
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Verification task not found",
        )

    document = get_document(
        db,
        str(task.get("document_id")),
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    tehsil_code = get_tehsil_code(current_user)

    if (
        tehsil_code
        and document.get("scope_id") != tehsil_code
    ):
        raise HTTPException(
            status_code=403,
            detail="Document does not belong to your Tehsil",
        )

    ocr = document.get("ocr") or {}

    return {
        "task": {
            "task_id": task.get("task_id"),
            "document_id": task.get("document_id"),
            "status": task.get("status"),
            "overall_confidence": task.get(
                "overall_confidence"
            ),
            "confidence_band": task.get(
                "confidence_band"
            ),
            "flagged_fields": task.get(
                "flagged_fields",
                [],
            ),
            "corrections": task.get(
                "corrections",
                [],
            ),
            "comments": task.get("comments"),
        },
        "document": {
            "id": document.get(
                "id",
                document.get("_id"),
            ),
            "filename": document.get(
                "original_filename"
            ),
            "doc_type": document.get(
                "doc_type"
            ),
            "scope_type": document.get(
                "scope_type"
            ),
            "scope_id": document.get(
                "scope_id"
            ),
        },
        "ocr": ocr,
    }


# ============================================================
# APPROVE MASTER RECORD
# ============================================================

@router.post(
    "/records/approve",
    response_model=MessageResponse,
    summary="Final Approve Master Land Record",
    dependencies=[
        Depends(
            require_permission("APPROVE_RECORD")
        )
    ],
)
def approve_master_record(
    payload: MasterRecordApprovalRequest,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    """
    Convert verified OCR data into a permanent Master Land Record.
    """

    document_id = str(payload.document_id)

    document = get_document(
        db,
        document_id,
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    tehsil_code = get_tehsil_code(current_user)

    if (
        tehsil_code
        and document.get("scope_id") != tehsil_code
    ):
        raise HTTPException(
            status_code=403,
            detail="Document does not belong to your Tehsil",
        )

    ocr = document.get("ocr") or {}

    if not ocr:
        raise HTTPException(
            status_code=400,
            detail="OCR result not available",
        )

    # --------------------------------------------------------
    # Find extracted OCR fields
    # --------------------------------------------------------

    ocr_result = ocr.get("result") or {}

    fields = extract_fields(
        ocr_result
    )

    # --------------------------------------------------------
    # Create Master Record
    # --------------------------------------------------------

    record_id = (
        f"REC-{uuid.uuid4().hex[:12].upper()}"
    )

    now = datetime.now(timezone.utc)

    master_record = {
        "record_id": record_id,

        "document_id": document_id,

        "khasra_number": (
            payload.khasra_number
            or field_value(
                fields,
                "khasra_number",
            )
        ),

        "khata_number": field_value(
            fields,
            "khata_number",
        ),

        "owner_name": field_value(
            fields,
            "owner_name",
        ),

        "father_or_husband_name": field_value(
            fields,
            "father_or_husband_name",
        ) or field_value(
            fields,
            "father_name",
        ),

        "village": field_value(
            fields,
            "village",
        ) or document.get(
            "metadata",
            {},
        ).get(
            "village_name"
        ),

        "tehsil": field_value(
            fields,
            "tehsil",
        ),

        "district": field_value(
            fields,
            "district",
        ),

        "total_area_sq_meters": field_value(
            fields,
            "total_area_sq_meters",
        ) or field_value(
            fields,
            "area",
        ),

        "status": "approved",

        "approved_by": str(
            current_user.id
        ),

        "approved_by_name": current_user.name,

        "approved_at": now,

        "last_updated": now,

        "source": "ocr_verified",

        "created_at": now,
    }

    # --------------------------------------------------------
    # Prevent duplicate Master Record
    # --------------------------------------------------------

    existing = db.master_records.find_one(
        {
            "document_id": document_id
        }
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Master Record already exists for this document",
        )

    # --------------------------------------------------------
    # Save Master Record
    # --------------------------------------------------------

    db.master_records.insert_one(
        master_record
    )

    # --------------------------------------------------------
    # Update document
    # --------------------------------------------------------

    db.documents.update_one(
        {
            "$or": [
                {"_id": document_id},
                {"id": document_id},
            ]
        },
        {
            "$set": {
                "metadata.master_record_id": record_id,
                "metadata.master_record_status": "approved",
                "metadata.approved_by": str(
                    current_user.id
                ),
                "metadata.approved_at": now,
            }
        },
    )

    # --------------------------------------------------------
    # Update verification task
    # --------------------------------------------------------

    db.verification_tasks.update_one(
        {
            "document_id": document_id
        },
        {
            "$set": {
                "status": "master_record_approved",
                "master_record_id": record_id,
                "approved_by": str(
                    current_user.id
                ),
                "approved_at": now,
                "updated_at": now,
            }
        },
    )

    return MessageResponse(
        message=(
            f"Land Record for Khasra "
            f"{master_record['khasra_number']} "
            f"successfully approved and committed "
            f"to Master Registry."
        )
    )


# ============================================================
# MASTER RECORD LIST
# ============================================================

@router.get(
    "/records/master",
    response_model=list[MasterRecordOut],
    summary="View Master Land Records",
    dependencies=[
        Depends(
            require_permission("VIEW_RECORD")
        )
    ],
)
def get_master_records(
    skip: int = 0,
    limit: int = 50,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(get_current_user),
):
    """
    Retrieve actual approved Master Land Records.
    """

    tehsil_code = get_tehsil_code(current_user)

    query = {
        "status": "approved"
    }

    if tehsil_code:
        query["tehsil_code"] = tehsil_code

    records = list(
        db.master_records
        .find(query)
        .sort("last_updated", -1)
        .skip(skip)
        .limit(limit)
    )

    result = []

    for record in records:

        result.append(
            MasterRecordOut(
                record_id=record.get(
                    "record_id"
                ),
                khasra_number=record.get(
                    "khasra_number"
                ),
                khata_number=record.get(
                    "khata_number"
                ),
                owner_name=record.get(
                    "owner_name"
                ),
                father_or_husband_name=record.get(
                    "father_or_husband_name"
                ),
                village=record.get(
                    "village"
                ),
                tehsil=record.get(
                    "tehsil"
                ),
                district=record.get(
                    "district"
                ),
                total_area_sq_meters=record.get(
                    "total_area_sq_meters"
                ),
                status=record.get(
                    "status"
                ),
                last_updated=record.get(
                    "last_updated"
                ),
            )
        )

    return result