from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.core.database import get_db
from app.api.deps import require_roles
from app.services import blockchain_service


router = APIRouter(
    prefix="/blockchain",
    tags=["Blockchain Integrity"],
)


# ============================================================
# VERIFY RECORD
# ============================================================

@router.get(
    "/records/{record_id}/verify",
    dependencies=[
        Depends(
            require_roles(
                [
                    "tehsil_officer",
                    "district_admin",
                    "state_admin",
                    "auditor",
                    "super_admin",
                ]
            )
        )
    ],
)
def verify_blockchain_record(
    record_id: str,
    db: Database = Depends(get_db),
):
    """
    Verify whether the current MongoDB Master Record
    matches its blockchain hash.
    """

    return blockchain_service.verify_master_record(
        db=db,
        record_id=record_id,
    )


# ============================================================
# RECORD HISTORY
# ============================================================

@router.get(
    "/records/{record_id}/history",
    dependencies=[
        Depends(
            require_roles(
                [
                    "tehsil_officer",
                    "district_admin",
                    "state_admin",
                    "auditor",
                    "super_admin",
                ]
            )
        )
    ],
)
def blockchain_record_history(
    record_id: str,
    db: Database = Depends(get_db),
):
    """
    Return immutable blockchain transaction history
    for a Master Record.
    """

    history = (
        blockchain_service.get_record_history(
            db=db,
            record_id=record_id,
        )
    )

    return {
        "record_id": record_id,
        "transaction_count": len(history),
        "history": history,
    }