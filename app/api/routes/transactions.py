from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pymongo.database import Database

from app.core.database import get_db
from app.core.security import decode_token
from app.models.mongo_models import MongoUser
from app.schemas.transaction import (
    TransactionCreateRequest,
    TransactionResponse,
    KhasraOwnershipHistoryResponse,
)
from app.services import transaction_service

router = APIRouter(prefix="/transactions", tags=["Land Transactions & Ownership History"])

oauth2_scheme = HTTPBearer(auto_error=False)


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(oauth2_scheme),
    db: Database = Depends(get_db),
) -> MongoUser | None:
    """Extracts authenticated user if Bearer token is provided, otherwise returns None."""
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            return None
        user_doc = db.users.find_one({"_id": user_id}) or db.users.find_one({"id": user_id})
        return MongoUser(user_doc) if user_doc else None
    except Exception:
        return None


def _format_transaction(doc: dict[str, Any]) -> dict[str, Any]:
    """Helper to convert MongoDB _id and dates to API response format."""
    return {
        "id": str(doc.get("_id", "")),
        "transaction_id": doc.get("transaction_id"),
        "transaction_type": doc.get("transaction_type"),
        "transaction_date": doc.get("transaction_date"),
        "transaction_year": doc.get("transaction_year"),
        "seller_id": str(doc.get("seller_id", "")),
        "seller_name": doc.get("seller_name", ""),
        "buyer_id": str(doc.get("buyer_id", "")),
        "buyer_name": doc.get("buyer_name", ""),
        "original_khasra_number": doc.get("original_khasra_number"),
        "land_area_before": doc.get("land_area_before"),
        "transferred_area": doc.get("transferred_area"),
        "remaining_area": doc.get("remaining_area"),
        "area_unit": doc.get("area_unit", "sq_meters"),
        "ownership_percentage_transferred": doc.get("ownership_percentage_transferred"),
        "document_info": doc.get("document_info", {}),
        "status": doc.get("status"),
        "is_subdivided": doc.get("is_subdivided", False),
        "parent_khasra_no": doc.get("parent_khasra_no"),
        "child_khasra_numbers": doc.get("child_khasra_numbers", []),
        "subdivision_records": doc.get("subdivision_records", []),
        "created_at": doc.get("created_at"),
        "created_by": doc.get("created_by"),
        "remarks": doc.get("remarks"),
    }


@router.post(
    "",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Land Transaction (with Atomic Subdivision & Ownership Transfer)",
)
def create_transaction(
    payload: TransactionCreateRequest,
    db: Database = Depends(get_db),
    current_user: MongoUser | None = Depends(get_current_user_optional),
):
    """
    Creates a new land transaction.
    - If transferred area < land area before, automatically subdivides Khasra into child parcels (e.g. 125 -> 125/1, 125/2).
    - If full area is transferred, transfers ownership directly to buyer.
    - Validates area > 0, transferred area <= available area, ownership percentage 0-100, seller exists, buyer exists, Khasra exists, no duplicate Khasra numbers.
    - Executes atomically using MongoDB multi-document transactions.
    """
    created_by_id = str(current_user.id) if current_user else None
    txn_doc = transaction_service.create_transaction(
        db=db,
        payload=payload,
        created_by_user_id=created_by_id,
    )
    return _format_transaction(txn_doc)


@router.get(
    "",
    response_model=list[TransactionResponse],
    summary="Get All Land Transactions",
)
def get_all_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    year: int | None = Query(None, description="Filter by transaction year (e.g. 2024)"),
    transaction_type: str | None = Query(None, description="Filter by type (SALE, PURCHASE, GIFT, etc.)"),
    status: str | None = Query(None, description="Filter by status (COMPLETED, PENDING, etc.)"),
    db: Database = Depends(get_db),
):
    """List all transactions with filtering and pagination."""
    records, _ = transaction_service.get_all_transactions(
        db=db,
        skip=skip,
        limit=limit,
        year=year,
        transaction_type=transaction_type,
        status_filter=status,
    )
    return [_format_transaction(r) for r in records]


@router.get(
    "/khasra/{khasra_number}/history",
    response_model=KhasraOwnershipHistoryResponse,
    summary="Get Complete Khasra Ownership History & Provenance Chain",
)
def get_khasra_ownership_history(
    khasra_number: str,
    year: int | None = Query(None, description="Query owner at a specific historical year (e.g. 2010)"),
    db: Database = Depends(get_db),
):
    """
    Returns full ownership history and provenance report for a Khasra:
    - Who owns it now (active owners / active child parcels after subdivision)
    - Who owned it in any specified year (e.g. ?year=2010)
    - Chronological ownership transfers (who sold to whom, when, how much)
    - Subdivision tree and child Khasras created
    """
    history_report = transaction_service.get_khasra_ownership_history(
        db=db,
        khasra_number=khasra_number,
        query_year=year,
    )
    return history_report


@router.get(
    "/khasra/{khasra_number}",
    response_model=list[TransactionResponse],
    summary="Get Transactions by Khasra Number",
)
def get_transactions_by_khasra(
    khasra_number: str,
    db: Database = Depends(get_db),
):
    """Fetch all transactions related to a given Khasra (as original, parent, or child)."""
    records = transaction_service.get_transactions_by_khasra(db, khasra_number)
    return [_format_transaction(r) for r in records]


@router.get(
    "/owner/{owner_id}",
    response_model=list[TransactionResponse],
    summary="Get Transactions by Owner",
)
def get_transactions_by_owner(
    owner_id: str,
    db: Database = Depends(get_db),
):
    """Fetch all transactions where the given owner ID or name is either seller or buyer."""
    records = transaction_service.get_transactions_by_owner(db, owner_id)
    return [_format_transaction(r) for r in records]


@router.get(
    "/{transaction_id}",
    response_model=TransactionResponse,
    summary="Get Transaction by ID",
)
def get_transaction_by_id(
    transaction_id: str,
    db: Database = Depends(get_db),
):
    """Fetch details of a single transaction by its transaction_id or MongoDB _id."""
    txn = transaction_service.get_transaction_by_id(db, transaction_id)
    return _format_transaction(txn)
