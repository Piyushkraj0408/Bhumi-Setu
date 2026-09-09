from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from pymongo.database import Database

from app.models.mongo_models import MongoUser
from app.services import blockchain_service


# ============================================================
# REQUIRED APPROVAL STAGES
# ============================================================

APPROVAL_STAGES = [
    "verifier_officer",
    "tehsil_officer",
    "district_admin",
]


# ============================================================
# CREATE DELETION REQUEST
# ============================================================

def create_deletion_request(
    db: Database,
    record_id: str,
    reason: str,
    current_user: MongoUser,
) -> dict:

    # --------------------------------------------------------
    # Check Master Record
    # --------------------------------------------------------

    record = db.master_records.find_one(
        {
            "record_id": record_id
        }
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Master Record not found.",
        )

    # --------------------------------------------------------
    # Do not allow already revoked records
    # --------------------------------------------------------

    if record.get("status") == "revoked":
        raise HTTPException(
            status_code=409,
            detail="Master Record is already revoked.",
        )

    # --------------------------------------------------------
    # Check existing deletion request
    # --------------------------------------------------------

    existing = db.deletion_requests.find_one(
        {
            "record_id": record_id,
            "status": {
                "$in": [
                    "pending",
                    "approved",
                ]
            },
        }
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail=(
                "An active deletion request already exists "
                f"for this record: {existing.get('request_id')}"
            ),
        )

    # --------------------------------------------------------
    # Create request
    # --------------------------------------------------------

    now = datetime.now(timezone.utc)

    request_id = (
        f"DEL-{uuid.uuid4().hex[:12].upper()}"
    )

    deletion_request = {
        "request_id": request_id,

        "record_id": record_id,

        "reason": reason,

        "status": "pending",

        # Three independent approval stages
        "verifier_status": "pending",
        "tehsil_status": "pending",
        "district_status": "pending",

        "created_by": str(
            current_user.id
        ),

        "created_by_name": current_user.name,

        "created_at": now,

        "updated_at": now,

        "blockchain_transactions": [],
    }

    db.deletion_requests.insert_one(
        deletion_request
    )

    return deletion_request


# ============================================================
# APPROVE ONE STAGE
# ============================================================

def approve_deletion_stage(
    db: Database,
    request_id: str,
    current_user: MongoUser,
    comments: str | None = None,
) -> dict:

    # --------------------------------------------------------
    # Find request
    # --------------------------------------------------------

    deletion_request = (
        db.deletion_requests.find_one(
            {
                "request_id": request_id
            }
        )
    )

    if not deletion_request:
        raise HTTPException(
            status_code=404,
            detail="Deletion request not found.",
        )

    # --------------------------------------------------------
    # Check already completed
    # --------------------------------------------------------

    if deletion_request.get("status") == "approved":
        raise HTTPException(
            status_code=409,
            detail="Deletion request has already been completed.",
        )

    if deletion_request.get("status") == "rejected":
        raise HTTPException(
            status_code=409,
            detail="Deletion request has been rejected.",
        )

    # --------------------------------------------------------
    # Determine current officer role
    # --------------------------------------------------------

    user_roles = {
        role.get("role_name")
        for role in current_user.role_assignments
    }

    # Super admin does NOT automatically satisfy one of the
    # three approvals. This preserves the three-person rule.
    current_stage = None

    if "verifier_officer" in user_roles:
        current_stage = "verifier"

    elif "tehsil_officer" in user_roles:
        current_stage = "tehsil"

    elif "district_admin" in user_roles:
        current_stage = "district"

    if current_stage is None:
        raise HTTPException(
            status_code=403,
            detail=(
                "Only Verifier Officer, Tehsil Officer, "
                "or District Officer can approve deletion."
            ),
        )

    # --------------------------------------------------------
    # Make sure stages happen in order
    # --------------------------------------------------------

    if current_stage == "tehsil":

        if (
            deletion_request.get(
                "verifier_status"
            )
            != "approved"
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Verifier Officer approval is required "
                    "before Tehsil Officer approval."
                ),
            )

    if current_stage == "district":

        if (
            deletion_request.get(
                "verifier_status"
            )
            != "approved"
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Verifier Officer approval is required "
                    "before District Officer approval."
                ),
            )

        if (
            deletion_request.get(
                "tehsil_status"
            )
            != "approved"
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Tehsil Officer approval is required "
                    "before District Officer approval."
                ),
            )

    # --------------------------------------------------------
    # Prevent same stage from approving twice
    # --------------------------------------------------------

    stage_field = f"{current_stage}_status"

    if deletion_request.get(stage_field) == "approved":
        raise HTTPException(
            status_code=409,
            detail=(
                f"{current_stage.title()} approval "
                "has already been completed."
            ),
        )

    # --------------------------------------------------------
    # Prevent requester from being the same person
    # for every stage
    # --------------------------------------------------------

    previous_approvers = []

    for field in [
        "verifier_approved_by",
        "tehsil_approved_by",
        "district_approved_by",
    ]:
        value = deletion_request.get(field)

        if value:
            previous_approvers.append(value)

    current_user_id = str(
        current_user.id
    )

    if current_user_id in previous_approvers:
        raise HTTPException(
            status_code=409,
            detail=(
                "The same officer cannot provide multiple "
                "approval stages for the same deletion request."
            ),
        )

    # --------------------------------------------------------
    # Get master record
    # --------------------------------------------------------

    record_id = deletion_request.get(
        "record_id"
    )

    record = db.master_records.find_one(
        {
            "record_id": record_id
        }
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Master Record no longer exists.",
        )

    if record.get("status") == "revoked":
        raise HTTPException(
            status_code=409,
            detail="Master Record is already revoked.",
        )

    now = datetime.now(timezone.utc)

    # --------------------------------------------------------
    # Blockchain transaction for this approval
    # --------------------------------------------------------

    blockchain_result = (
        blockchain_service.create_governance_transaction(
            db=db,
            record_id=record_id,
            action=(
                f"DELETION_{current_stage.upper()}_APPROVED"
            ),
            actor_id=current_user_id,
            actor_name=current_user.name,
            metadata={
                "deletion_request_id": request_id,
                "comments": comments,
                "reason": deletion_request.get(
                    "reason"
                ),
            },
        )
    )

    # --------------------------------------------------------
    # Update approval stage
    # --------------------------------------------------------

    update_data = {
        stage_field: "approved",
        f"{current_stage}_approved_by": current_user_id,
        f"{current_stage}_approved_by_name": current_user.name,
        f"{current_stage}_approved_at": now,
        f"{current_stage}_comments": comments,
        "updated_at": now,
    }

    # --------------------------------------------------------
    # Determine whether this was final approval
    # --------------------------------------------------------

    if current_stage == "district":

        # All three have now approved.

        update_data["status"] = "approved"

        update_data[
            "completed_at"
        ] = now

        update_data[
            "completed_by"
        ] = current_user_id

        # Final blockchain transaction
        final_blockchain = (
            blockchain_service.create_governance_transaction(
                db=db,
                record_id=record_id,
                action="RECORD_REVOKED",
                actor_id=current_user_id,
                actor_name=current_user.name,
                metadata={
                    "deletion_request_id": request_id,
                    "reason": deletion_request.get(
                        "reason"
                    ),
                    "verifier_approved": True,
                    "tehsil_approved": True,
                    "district_approved": True,
                },
            )
        )

        # ----------------------------------------------------
        # Revoke record
        # ----------------------------------------------------

        db.master_records.update_one(
            {
                "record_id": record_id
            },
            {
                "$set": {
                    "status": "revoked",
                    "revoked_at": now,
                    "revoked_by": current_user_id,
                    "revocation_reason": (
                        deletion_request.get(
                            "reason"
                        )
                    ),
                    "last_updated": now,
                }
            },
        )

        # ----------------------------------------------------
        # Update document metadata
        # ----------------------------------------------------

        document_id = record.get(
            "document_id"
        )

        if document_id:

            db.documents.update_one(
                {
                    "$or": [
                        {
                            "id": document_id
                        },
                        {
                            "_id": document_id
                        },
                    ]
                },
                {
                    "$set": {
                        "metadata.master_record_status": "revoked",
                        "metadata.revoked_at": now,
                        "metadata.revocation_request_id": request_id,
                    }
                },
            )

        # ----------------------------------------------------
        # Store blockchain transaction IDs
        # ----------------------------------------------------

        update_data[
            "blockchain_transactions"
        ] = (
            deletion_request.get(
                "blockchain_transactions",
                [],
            )
            + [
                blockchain_result[
                    "transaction_id"
                ],
                final_blockchain[
                    "transaction_id"
                ],
            ]
        )

    else:

        update_data[
            "blockchain_transactions"
        ] = (
            deletion_request.get(
                "blockchain_transactions",
                [],
            )
            + [
                blockchain_result[
                    "transaction_id"
                ]
            ]
        )

    # --------------------------------------------------------
    # Save deletion request
    # --------------------------------------------------------

    db.deletion_requests.update_one(
        {
            "request_id": request_id
        },
        {
            "$set": update_data
        },
    )

    return db.deletion_requests.find_one(
        {
            "request_id": request_id
        }
    )