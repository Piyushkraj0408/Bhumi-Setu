from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.core.database import get_db
from app.api.deps import get_current_user, require_roles

from app.models.mongo_models import MongoUser

from app.schemas.roles_api import (
    DeletionRequestCreate,
    DeletionApprovalRequest,
)

from app.services import deletion_service


router = APIRouter(
    prefix="/blockchain",
    tags=["Blockchain Governance"],
)


# ============================================================
# CREATE DELETION REQUEST
# ============================================================

@router.post(
    "/deletion-requests",
    summary="Create Master Record Deletion Request",
    dependencies=[
        Depends(
            require_roles(
                [
                    "verifier_officer",
                    "tehsil_officer",
                    "district_admin",
                ]
            )
        )
    ],
)
def create_deletion_request(
    payload: DeletionRequestCreate,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(
        get_current_user
    ),
):

    return deletion_service.create_deletion_request(
        db=db,
        record_id=payload.record_id,
        reason=payload.reason,
        current_user=current_user,
    )


# ============================================================
# APPROVE DELETION STAGE
# ============================================================

@router.post(
    "/deletion-requests/{request_id}/approve",
    summary="Approve Current Deletion Stage",
    dependencies=[
        Depends(
            require_roles(
                [
                    "verifier_officer",
                    "tehsil_officer",
                    "district_admin",
                ]
            )
        )
    ],
)
def approve_deletion(
    request_id: str,
    payload: DeletionApprovalRequest,
    db: Database = Depends(get_db),
    current_user: MongoUser = Depends(
        get_current_user
    ),
):

    return deletion_service.approve_deletion_stage(
        db=db,
        request_id=request_id,
        current_user=current_user,
        comments=payload.comments,
    )


# ============================================================
# VIEW DELETION REQUEST
# ============================================================

@router.get(
    "/deletion-requests/{request_id}",
    summary="View Deletion Request",
    dependencies=[
        Depends(
            require_roles(
                [
                    "verifier_officer",
                    "tehsil_officer",
                    "district_admin",
                ]
            )
        )
    ],
)
def get_deletion_request(
    request_id: str,
    db: Database = Depends(get_db),
):

    deletion_request = (
        db.deletion_requests.find_one(
            {
                "request_id": request_id
            },
            {
                "_id": 0
            },
        )
    )

    if not deletion_request:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=404,
            detail="Deletion request not found.",
        )

    return deletion_request


# ============================================================
# LIST DELETION REQUESTS
# ============================================================

@router.get(
    "/deletion-requests",
    summary="List Deletion Requests",
    dependencies=[
        Depends(
            require_roles(
                [
                    "verifier_officer",
                    "tehsil_officer",
                    "district_admin",
                ]
            )
        )
    ],
)
def list_deletion_requests(
    status: str | None = None,
    db: Database = Depends(get_db),
):

    query = {}

    if status:
        query["status"] = status

    requests = list(
        db.deletion_requests.find(
            query,
            {
                "_id": 0
            },
        ).sort(
            "created_at",
            -1,
        )
    )

    return {
        "count": len(requests),
        "requests": requests,
    }