from datetime import datetime
from fastapi import APIRouter, Query

from app.schemas.roles_api import (
    PublicRecordExtractOut,
)

router = APIRouter(
    prefix="/public",
    tags=["Citizen & Public Portal API"],
)


@router.get("/records/search", response_model=list[PublicRecordExtractOut], summary="Public Land Record Search")
def search_public_records(
    district: str = Query(..., description="District Name or Code"),
    tehsil: str = Query(..., description="Tehsil Name or Code"),
    village: str = Query(..., description="Village Name"),
    khasra_or_survey_number: str = Query(..., description="Khasra or Survey Number"),
):
    """Citizen portal endpoint to search and view verified digital land record extracts."""
    return [
        PublicRecordExtractOut(
            khasra_number=khasra_or_survey_number,
            khata_number="88",
            owner_name_masked="R***sh P***l",
            village=village,
            tehsil=tehsil,
            district=district,
            total_area_sq_meters=4046.86,
            legal_status="Clear Title - No Encumbrances",
            verification_badge=True,
            verified_at=datetime.now(),
        )
    ]
