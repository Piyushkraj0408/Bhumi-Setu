from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from app.core.database import get_db
from app.api.deps import require_roles, get_current_user
from app.models.mongo_models import MongoUser
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.roles_api import (
    VerificationTaskOut,
    VerificationSubmitRequest,
    RejectionRequest,
    MessageResponse,
)
from app.services import auth_service


router = APIRouter(
    prefix="/verification-officer",
    tags=["5. Verification Officer API"],
)


# ============================================================
# LOGIN
# ============================================================

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Verification Officer Login",
)
def verifier_login(
    payload: LoginRequest,
    db: Database = Depends(get_db),
):
    """
    Dedicated login endpoint for Verification / HITL Officers.
    """

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
        "verification_officer" not in user_roles
        and "super_admin" not in user_roles
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Access denied: Verification Officer "
                "credentials required"
            ),
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
    summary="Verification Officer Dashboard Overview",
    dependencies=[
        Depends(
            require_roles(
                ["verification_officer", "super_admin"]
            )
        )
    ],
)
def get_verifier_dashboard(
    current_user: MongoUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Return real HITL verification statistics.
    """

    pending_tasks = db.verification_tasks.count_documents(
        {"status": "pending"}
    )

    verified_tasks = db.verification_tasks.count_documents(
        {"status": "verified"}
    )

    rejected_tasks = db.verification_tasks.count_documents(
        {"status": "rejected"}
    )

    return {
        "officer_name": current_user.name,
        "pending_hitl_reviews": pending_tasks,
        "verified_tasks": verified_tasks,
        "rejected_tasks": rejected_tasks,
        "status": "ready",
    }


# ============================================================
# VERIFICATION QUEUE
# ============================================================

@router.get(
    "/queue",
    response_model=list[VerificationTaskOut],
    summary="Fetch Low-Confidence Tasks",
    dependencies=[
        Depends(
            require_roles(
                ["verification_officer", "super_admin"]
            )
        )
    ],
)
def get_verification_queue(
    db: Database = Depends(get_db),
):
    """
    Retrieve pending HITL verification tasks.

    These tasks are created automatically by the OCR service
    when confidence is below the configured acceptance threshold.
    """

    tasks = list(
        db.verification_tasks.find(
            {"status": "pending"}
        )
        .sort("created_at", 1)
        .limit(20)
    )

    result = []

    for task in tasks:

        document_id = task.get("document_id")

        if not document_id:
            continue

        # ----------------------------------------------------
        # Find associated document
        # ----------------------------------------------------

        document = db.documents.find_one(
            {
                "$or": [
                    {"id": document_id},
                    {"_id": document_id},
                ]
            }
        )

        if not document:
            continue

        # ----------------------------------------------------
        # Convert document ID to UUID
        # ----------------------------------------------------

        try:
            parsed_document_id = uuid.UUID(
                str(document_id)
            )
        except (ValueError, TypeError):
            continue

        # ----------------------------------------------------
        # Build response
        # ----------------------------------------------------

        result.append(
            VerificationTaskOut(
                task_id=task.get("task_id"),
                document_id=parsed_document_id,
                original_filename=document.get(
                    "original_filename",
                    "unknown",
                ),
                overall_confidence=float(
                    task.get(
                        "overall_confidence",
                        0.0,
                    )
                ),
                flagged_fields=task.get(
                    "flagged_fields",
                    [],
                ),
                doc_type=document.get("doc_type"),
                created_at=task.get(
                    "created_at"
                ),
            )
        )

    return result


# ============================================================
# GET SINGLE VERIFICATION TASK
# ============================================================

@router.get(
    "/tasks/{task_id}",
    summary="Get Verification Task Details",
    dependencies=[
        Depends(
            require_roles(
                ["verification_officer", "super_admin"]
            )
        )
    ],
)
def get_verification_task(
    task_id: str,
    db: Database = Depends(get_db),
):
    """
    Return complete verification information including
    the OCR result that needs human review.
    """

    # --------------------------------------------------------
    # Find verification task
    # --------------------------------------------------------

    task = db.verification_tasks.find_one(
        {"task_id": task_id}
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Verification task '{task_id}' not found"
            ),
        )

    document_id = task.get("document_id")

    # --------------------------------------------------------
    # Find associated document
    # --------------------------------------------------------

    document = db.documents.find_one(
        {
            "$or": [
                {"id": document_id},
                {"_id": document_id},
            ]
        }
    )

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated document not found",
        )

    # --------------------------------------------------------
    # Return task + document + OCR
    # --------------------------------------------------------

    return {
        "task": {
            "task_id": task.get("task_id"),
            "document_id": task.get("document_id"),
            "job_id": task.get("job_id"),
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
            "verified_by": task.get("verified_by"),
            "verified_at": task.get("verified_at"),
            "rejection_category": task.get(
                "rejection_category"
            ),
            "rejection_reason": task.get(
                "rejection_reason"
            ),
            "rejected_by": task.get("rejected_by"),
            "rejected_at": task.get("rejected_at"),
            "created_at": task.get("created_at"),
            "updated_at": task.get("updated_at"),
        },

        "document": {
            "id": document.get(
                "id",
                document.get("_id"),
            ),
            "original_filename": document.get(
                "original_filename"
            ),
            "doc_type": document.get("doc_type"),
            "status": document.get("status"),
            "metadata": document.get(
                "metadata",
                {},
            ),
        },

        "ocr": document.get(
            "ocr",
            {},
        ),
    }


# ============================================================
# VERIFY TASK
# ============================================================

@router.post(
    "/tasks/{task_id}/verify",
    response_model=MessageResponse,
    summary="Submit Corrected Fields",
    dependencies=[
        Depends(
            require_roles(
                ["verification_officer", "super_admin"]
            )
        )
    ],
)
def submit_verification(
    task_id: str,
    payload: VerificationSubmitRequest,
    current_user: MongoUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Apply human corrections to OCR extracted fields
    and mark the verification task as verified.
    """

    # --------------------------------------------------------
    # Find verification task
    # --------------------------------------------------------

    task = db.verification_tasks.find_one(
        {"task_id": task_id}
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Verification task '{task_id}' not found"
            ),
        )

    # --------------------------------------------------------
    # Task must still be pending
    # --------------------------------------------------------

    if task.get("status") != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Task '{task_id}' is already "
                f"{task.get('status')}"
            ),
        )

    # --------------------------------------------------------
    # Officer must confirm verification
    # --------------------------------------------------------

    if not payload.verified_by_officer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Officer verification confirmation "
                "is required"
            ),
        )

    document_id = task.get("document_id")

    if not document_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Verification task has no document_id",
        )

    # --------------------------------------------------------
    # Find associated document
    # --------------------------------------------------------

    document = db.documents.find_one(
        {
            "$or": [
                {"id": document_id},
                {"_id": document_id},
            ]
        }
    )

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated document not found",
        )

    # --------------------------------------------------------
    # Current timestamp
    # --------------------------------------------------------

    now = datetime.now(timezone.utc)

    # ========================================================
    # GET OCR EXTRACTED FIELDS
    # ========================================================

    ocr_data = document.get("ocr", {})

    if not isinstance(ocr_data, dict):
        ocr_data = {}

    ocr_result = ocr_data.get("result", {})

    if not isinstance(ocr_result, dict):
        ocr_result = {}

    # IMPORTANT:
    # Your OCR service stores extracted_fields as a DICTIONARY:
    #
    # "extracted_fields": {
    #     "record_year": {...},
    #     "owner_name": {...},
    #     "state": {...}
    # }
    #
    # Therefore we must NOT iterate over it as a list.

    extracted_fields = ocr_result.get(
        "extracted_fields",
        {},
    )

    if not isinstance(extracted_fields, dict):
        extracted_fields = {}

    # ========================================================
    # APPLY HUMAN CORRECTIONS
    # ========================================================

    corrections = []

    for correction in payload.corrections:

        # Pydantic v2
        correction_data = correction.model_dump()

        corrections.append(correction_data)

        field_name = correction.field_name
        corrected_value = correction.corrected_value

        # ----------------------------------------------------
        # Existing OCR field
        # ----------------------------------------------------

        if field_name in extracted_fields:

            field = extracted_fields[field_name]

            if not isinstance(field, dict):
                field = {
                    "value": field
                }

            # Preserve original OCR value
            if "original_value" not in field:
                field["original_value"] = field.get(
                    "value"
                )

            # Apply human correction
            field["value"] = corrected_value

            # Store human confidence
            field["final_confidence"] = (
                correction.confidence_score
            )

            # Mark as human verified
            field["verification_status"] = (
                "human_verified"
            )

            extracted_fields[field_name] = field

        # ----------------------------------------------------
        # OCR completely missed this field
        # ----------------------------------------------------

        else:

            extracted_fields[field_name] = {
                "value": corrected_value,
                "ocr_confidence": 0.0,
                "extraction_confidence": 1.0,
                "final_confidence": (
                    correction.confidence_score
                ),
                "evidence": [],
                "verification_status":
                    "human_verified",
            }

    # ========================================================
    # UPDATE DOCUMENT OCR RESULT
    # ========================================================

    document_filter = {
        "$or": [
            {"id": document_id},
            {"_id": document_id},
        ]
    }

    update_ocr_result = db.documents.update_one(
        document_filter,
        {
            "$set": {
                "ocr.result.extracted_fields":
                    extracted_fields,
            }
        },
    )

    if update_ocr_result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Failed to update document OCR result",
        )

    # ========================================================
    # MARK VERIFICATION TASK AS VERIFIED
    # ========================================================

    update_task_result = db.verification_tasks.update_one(
        {"task_id": task_id},
        {
            "$set": {
                "status": "verified",
                "corrections": corrections,
                "comments": payload.comments,
                "verified_by": current_user.email,
                "verified_at": now,
                "updated_at": now,
            }
        },
    )

    if update_task_result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Failed to update verification task",
        )

    # ========================================================
    # UPDATE DOCUMENT VERIFICATION METADATA
    # ========================================================

    db.documents.update_one(
        document_filter,
        {
            "$set": {
                "metadata.verification_status":
                    "verified",
                "metadata.verified_by":
                    current_user.email,
                "metadata.verified_at":
                    now,
            }
        },
    )

    # ========================================================
    # RESPONSE
    # ========================================================

    return MessageResponse(
        message=(
            f"Task {task_id} successfully verified "
            f"by {current_user.email} with "
            f"{len(corrections)} corrections applied."
        )
    )


# ============================================================
# REJECT TASK
# ============================================================

@router.post(
    "/tasks/{task_id}/reject",
    response_model=MessageResponse,
    summary="Reject Illegible or Invalid Record",
    dependencies=[
        Depends(
            require_roles(
                ["verification_officer", "super_admin"]
            )
        )
    ],
)
def reject_verification_task(
    task_id: str,
    payload: RejectionRequest,
    current_user: MongoUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Reject a document when it is illegible, invalid,
    fraudulent, or otherwise unsuitable for processing.
    """

    # --------------------------------------------------------
    # Find verification task
    # --------------------------------------------------------

    task = db.verification_tasks.find_one(
        {"task_id": task_id}
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Verification task '{task_id}' not found"
            ),
        )

    # --------------------------------------------------------
    # Only pending tasks can be rejected
    # --------------------------------------------------------

    if task.get("status") != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Task '{task_id}' is already "
                f"{task.get('status')}"
            ),
        )

    document_id = task.get("document_id")

    if not document_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Verification task has no document_id",
        )

    # --------------------------------------------------------
    # Find associated document
    # --------------------------------------------------------

    document = db.documents.find_one(
        {
            "$or": [
                {"id": document_id},
                {"_id": document_id},
            ]
        }
    )

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated document not found",
        )

    # --------------------------------------------------------
    # Timestamp
    # --------------------------------------------------------

    now = datetime.now(timezone.utc)

    # ========================================================
    # MARK TASK AS REJECTED
    # ========================================================

    update_task_result = db.verification_tasks.update_one(
        {"task_id": task_id},
        {
            "$set": {
                "status": "rejected",
                "rejection_category":
                    payload.rejection_category,
                "rejection_reason":
                    payload.reason,
                "rejected_by":
                    current_user.email,
                "rejected_at":
                    now,
                "updated_at":
                    now,
            }
        },
    )

    if update_task_result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Failed to update verification task",
        )

    # ========================================================
    # UPDATE DOCUMENT METADATA
    # ========================================================

    document_filter = {
        "$or": [
            {"id": document_id},
            {"_id": document_id},
        ]
    }

    db.documents.update_one(
        document_filter,
        {
            "$set": {
                "metadata.verification_status":
                    "rejected",
                "metadata.rejection_category":
                    payload.rejection_category,
                "metadata.rejection_reason":
                    payload.reason,
                "metadata.rejected_by":
                    current_user.email,
                "metadata.rejected_at":
                    now,
            }
        },
    )

    # ========================================================
    # RESPONSE
    # ========================================================

    return MessageResponse(
        message=(
            f"Task {task_id} rejected by "
            f"{current_user.email}. "
            f"Category: {payload.rejection_category}. "
            f"Reason: {payload.reason}"
        )
    )