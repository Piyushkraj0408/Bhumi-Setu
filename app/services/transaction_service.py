import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from pymongo.database import Database
from pymongo.errors import OperationFailure

from app.core.database import get_mongo_client
from app.models.transaction_models import TransactionStatus, TransactionType
from app.schemas.transaction import (
    TransactionCreateRequest,
    TransactionResponse,
    KhasraOwnershipHistoryResponse,
    CurrentOwnerInfo,
    OwnershipTimelineEntry,
    SubdivisionChildRecord,
)

logger = logging.getLogger(__name__)


def _find_user_or_owner(db: Database, user_id: str, session=None) -> dict[str, Any] | None:
    """Finds user/owner in 'users' collection by _id, id, email, or name."""
    query = {
        "$or": [
            {"_id": user_id},
            {"id": user_id},
            {"email": user_id},
        ]
    }
    user = db.users.find_one(query, session=session)
    if not user:
        # Also check by exact name if string
        user = db.users.find_one({"name": user_id}, session=session)
    return user


def _find_khasra_record(db: Database, khasra_number: str, session=None) -> dict[str, Any] | None:
    """Finds land record in 'master_records' collection by khasra_number."""
    # First search for active record
    record = db.master_records.find_one(
        {"khasra_number": str(khasra_number).strip(), "is_active": {"$ne": False}},
        session=session,
    )
    if not record:
        record = db.master_records.find_one(
            {"khasra_number": str(khasra_number).strip()},
            session=session,
        )
    return record


def _get_next_child_khasra_numbers(db: Database, parent_khasra: str, count: int = 2, session=None) -> list[str]:
    """Generates next available child Khasra numbers, e.g. 125/1, 125/2."""
    clean_parent = str(parent_khasra).strip()
    # Find all existing khasras starting with clean_parent + "/"
    existing = list(
        db.master_records.find(
            {"khasra_number": {"$regex": f"^{clean_parent}/"}},
            {"khasra_number": 1},
            session=session,
        )
    )
    existing_numbers = {r["khasra_number"] for r in existing}

    child_numbers = []
    idx = 1
    while len(child_numbers) < count:
        candidate = f"{clean_parent}/{idx}"
        if candidate not in existing_numbers:
            child_numbers.append(candidate)
            existing_numbers.add(candidate)
        idx += 1
    return child_numbers


def create_transaction(
    db: Database,
    payload: TransactionCreateRequest,
    created_by_user_id: str | None = None,
) -> dict[str, Any]:
    """
    Creates a transaction with atomic consistency across:
    1. db.transaction
    2. db.master_records (ownership update or Khasra subdivision)
    3. db.audit_logs
    """
    client = get_mongo_client()
    now = datetime.now(timezone.utc)
    txn_date = payload.transaction_date or now
    txn_year = txn_date.year

    # ----------------------------------------------------
    # 1. VALIDATIONS
    # ----------------------------------------------------
    # Area validations
    if payload.transferred_area <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Validation failed: transferred area must be strictly greater than 0.",
        )

    # Ownership percentage validation
    if not (0 < payload.ownership_percentage_transferred <= 100.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Validation failed: ownership percentage transferred must be between 0 and 100.",
        )

    # Check seller exists
    seller_doc = _find_user_or_owner(db, payload.seller_id)
    if not seller_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Validation failed: Seller '{payload.seller_id}' does not exist.",
        )
    seller_id_resolved = str(seller_doc.get("_id", seller_doc.get("id")))
    seller_name = seller_doc.get("name", "Unknown Seller")

    # Check buyer exists
    buyer_doc = _find_user_or_owner(db, payload.buyer_id)
    if not buyer_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Validation failed: Buyer '{payload.buyer_id}' does not exist.",
        )
    buyer_id_resolved = str(buyer_doc.get("_id", buyer_doc.get("id")))
    buyer_name = buyer_doc.get("name", "Unknown Buyer")

    if seller_id_resolved == buyer_id_resolved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Validation failed: Seller and Buyer cannot be the same entity.",
        )

    # Check Khasra exists
    khasra_doc = _find_khasra_record(db, payload.original_khasra_number)
    if not khasra_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Validation failed: Khasra '{payload.original_khasra_number}' does not exist in master records.",
        )

    # Check if parent Khasra was already subdivided and inactive
    if khasra_doc.get("is_active") is False and khasra_doc.get("status") == "subdivided":
        subdivided_into = khasra_doc.get("subdivided_into", [])
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Validation failed: Khasra '{payload.original_khasra_number}' has already been subdivided "
                f"into child Khasras {subdivided_into}. Transact directly on active child Khasras."
            ),
        )

    # Land area comparison
    land_area_before = float(khasra_doc.get("total_area_sq_meters") or khasra_doc.get("area") or 0.0)
    if land_area_before <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Validation failed: Khasra '{payload.original_khasra_number}' has invalid recorded area ({land_area_before}).",
        )

    if payload.transferred_area > land_area_before:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Validation failed: Transferred area ({payload.transferred_area}) cannot exceed available "
                f"land area ({land_area_before}) for Khasra '{payload.original_khasra_number}'."
            ),
        )

    remaining_area = round(land_area_before - payload.transferred_area, 4)
    is_subdivided = remaining_area > 0.00001
    transaction_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"

    # ----------------------------------------------------
    # 2. SUBDIVISION SETUP & VALIDATION
    # ----------------------------------------------------
    child_khasra_numbers: list[str] = []
    subdivision_records: list[dict[str, Any]] = []

    if is_subdivided:
        if payload.custom_child_khasras:
            # Custom child Khasras specified by user
            total_custom_area = sum(c.area for c in payload.custom_child_khasras)
            if abs(total_custom_area - land_area_before) > 0.001:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Validation failed: Sum of child Khasra areas ({total_custom_area}) "
                        f"must exactly equal parent Khasra area ({land_area_before})."
                    ),
                )
            for c in payload.custom_child_khasras:
                if c.area > land_area_before:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Validation failed: Child Khasra area ({c.area}) cannot exceed parent area ({land_area_before}).",
                    )
                child_no = c.khasra_number or _get_next_child_khasra_numbers(db, payload.original_khasra_number, 1)[0]
                # Check duplicate
                dup = db.master_records.find_one({"khasra_number": child_no})
                if dup:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Validation failed: Duplicate child Khasra number '{child_no}' already exists.",
                    )
                is_buyer = c.allocated_to == "buyer"
                sub_rec = {
                    "khasra_number": child_no,
                    "allocated_to": c.allocated_to,
                    "owner_id": buyer_id_resolved if is_buyer else seller_id_resolved,
                    "owner_name": buyer_name if is_buyer else seller_name,
                    "area": c.area,
                    "ownership_percentage": c.ownership_percentage,
                }
                child_khasra_numbers.append(child_no)
                subdivision_records.append(sub_rec)
        else:
            # Auto-generated standard subdivision:
            # Child 1 -> Buyer (transferred area)
            # Child 2 -> Seller (remaining area)
            gen_numbers = _get_next_child_khasra_numbers(db, payload.original_khasra_number, count=2)
            child_buyer_no = gen_numbers[0]
            child_seller_no = gen_numbers[1]

            # Verify no duplicate
            dup = db.master_records.find_one({"khasra_number": {"$in": [child_buyer_no, child_seller_no]}})
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Validation failed: Generated child Khasra '{dup.get('khasra_number')}' already exists.",
                )

            child_khasra_numbers = [child_buyer_no, child_seller_no]
            subdivision_records = [
                {
                    "khasra_number": child_buyer_no,
                    "allocated_to": "buyer",
                    "owner_id": buyer_id_resolved,
                    "owner_name": buyer_name,
                    "area": payload.transferred_area,
                    "ownership_percentage": payload.ownership_percentage_transferred,
                },
                {
                    "khasra_number": child_seller_no,
                    "allocated_to": "seller",
                    "owner_id": seller_id_resolved,
                    "owner_name": seller_name,
                    "area": remaining_area,
                    "ownership_percentage": round(100.0 - payload.ownership_percentage_transferred, 2),
                },
            ]

    # ----------------------------------------------------
    # 3. BUILD TRANSACTION DOCUMENT
    # ----------------------------------------------------
    doc_info = payload.document_info.model_dump()
    if isinstance(doc_info.get("registry_date"), datetime):
        doc_info["registry_date"] = doc_info["registry_date"].isoformat()

    txn_doc = {
        "transaction_id": transaction_id,
        "transaction_type": payload.transaction_type.value,
        "transaction_date": txn_date,
        "transaction_year": txn_year,
        "seller_id": seller_id_resolved,
        "seller_name": seller_name,
        "buyer_id": buyer_id_resolved,
        "buyer_name": buyer_name,
        "original_khasra_number": payload.original_khasra_number,
        "land_area_before": land_area_before,
        "transferred_area": payload.transferred_area,
        "remaining_area": remaining_area,
        "area_unit": payload.area_unit,
        "ownership_percentage_transferred": payload.ownership_percentage_transferred,
        "document_info": doc_info,
        "status": TransactionStatus.COMPLETED.value,
        "is_subdivided": is_subdivided,
        "parent_khasra_no": payload.original_khasra_number if is_subdivided else None,
        "child_khasra_numbers": child_khasra_numbers,
        "subdivision_records": subdivision_records,
        "created_at": now,
        "created_by": created_by_user_id,
        "remarks": payload.remarks,
    }

    # ----------------------------------------------------
    # 4. ATOMIC EXECUTION VIA MONGO TRANSACTION
    # ----------------------------------------------------
    def _execute_atomic_operations(session):
        # 4.1 Insert Transaction Record into 'transaction' collection
        db.transaction.insert_one(txn_doc, session=session)

        # 4.2 Update Land / Master Records
        if is_subdivided:
            # Mark parent Khasra as subdivided (inactive)
            db.master_records.update_one(
                {"_id": khasra_doc["_id"]},
                {
                    "$set": {
                        "is_active": False,
                        "status": "subdivided",
                        "subdivided_into": child_khasra_numbers,
                        "subdivided_at": now,
                        "subdivision_transaction_id": transaction_id,
                        "last_updated": now,
                    },
                    "$push": {
                        "ownership_history": {
                            "transaction_id": transaction_id,
                            "transaction_type": payload.transaction_type.value,
                            "from_owner_id": seller_id_resolved,
                            "from_owner_name": seller_name,
                            "to_owner_id": buyer_id_resolved,
                            "to_owner_name": buyer_name,
                            "area_transferred": payload.transferred_area,
                            "ownership_percentage": payload.ownership_percentage_transferred,
                            "date": txn_date,
                            "year": txn_year,
                            "event": "SUBDIVISION_SPLIT",
                            "document_registry_number": doc_info.get("registry_number"),
                        }
                    },
                },
                session=session,
            )

            # Insert child Khasras into db.master_records
            for sub in subdivision_records:
                child_doc = {
                    "record_id": f"REC-{uuid.uuid4().hex[:12].upper()}",
                    "khasra_number": sub["khasra_number"],
                    "parent_khasra_no": payload.original_khasra_number,
                    "khata_number": khasra_doc.get("khata_number", ""),
                    "owner_id": sub["owner_id"],
                    "owner_name": sub["owner_name"],
                    "father_or_husband_name": (
                        buyer_doc.get("father_or_husband_name")
                        if sub["allocated_to"] == "buyer"
                        else khasra_doc.get("father_or_husband_name")
                    ),
                    "total_area_sq_meters": sub["area"],
                    "area_unit": payload.area_unit,
                    "ownership_percentage": sub["ownership_percentage"],
                    "village": khasra_doc.get("village", ""),
                    "tehsil": khasra_doc.get("tehsil", ""),
                    "tehsil_code": khasra_doc.get("tehsil_code", ""),
                    "district": khasra_doc.get("district", ""),
                    "status": "approved",
                    "is_active": True,
                    "created_by_transaction_id": transaction_id,
                    "created_at": now,
                    "last_updated": now,
                    "ownership_history": [
                        {
                            "transaction_id": transaction_id,
                            "transaction_type": payload.transaction_type.value,
                            "from_owner_id": seller_id_resolved,
                            "from_owner_name": seller_name,
                            "to_owner_id": sub["owner_id"],
                            "to_owner_name": sub["owner_name"],
                            "area_transferred": sub["area"],
                            "ownership_percentage": sub["ownership_percentage"],
                            "date": txn_date,
                            "year": txn_year,
                            "event": "SUBDIVISION_CREATION" if sub["allocated_to"] == "buyer" else "SUBDIVISION_RETENTION",
                            "document_registry_number": doc_info.get("registry_number"),
                        }
                    ],
                }
                db.master_records.insert_one(child_doc, session=session)
        else:
            # Full transfer (no subdivision)
            db.master_records.update_one(
                {"_id": khasra_doc["_id"]},
                {
                    "$set": {
                        "owner_id": buyer_id_resolved,
                        "owner_name": buyer_name,
                        "father_or_husband_name": buyer_doc.get(
                            "father_or_husband_name", khasra_doc.get("father_or_husband_name")
                        ),
                        "ownership_percentage": payload.ownership_percentage_transferred,
                        "last_updated": now,
                    },
                    "$push": {
                        "ownership_history": {
                            "transaction_id": transaction_id,
                            "transaction_type": payload.transaction_type.value,
                            "from_owner_id": seller_id_resolved,
                            "from_owner_name": seller_name,
                            "to_owner_id": buyer_id_resolved,
                            "to_owner_name": buyer_name,
                            "area_transferred": payload.transferred_area,
                            "ownership_percentage": payload.ownership_percentage_transferred,
                            "date": txn_date,
                            "year": txn_year,
                            "event": "OWNERSHIP_TRANSFER",
                            "document_registry_number": doc_info.get("registry_number"),
                        }
                    },
                },
                session=session,
            )

        # 4.3 Log to audit trail
        audit_doc = {
            "event_id": f"EVT-TXN-{uuid.uuid4()}",
            "user_id": created_by_user_id or seller_id_resolved,
            "user_email": buyer_doc.get("email"),
            "action": "CREATE_TRANSACTION",
            "resource_type": "transaction",
            "resource_id": transaction_id,
            "timestamp": now,
            "details": {
                "transaction_id": transaction_id,
                "transaction_type": payload.transaction_type.value,
                "original_khasra_number": payload.original_khasra_number,
                "transferred_area": payload.transferred_area,
                "is_subdivided": is_subdivided,
                "child_khasra_numbers": child_khasra_numbers,
            },
        }
        if session:
            db.audit_logs.insert_one(audit_doc, session=session)
        else:
            db.audit_logs.insert_one(audit_doc)

    # Execute inside MongoDB Session if supported, else execute directly
    session_executed = False
    if client and hasattr(client, "start_session"):
        try:
            with client.start_session() as session:
                with session.start_transaction():
                    _execute_atomic_operations(session)
                    session_executed = True
        except Exception as e:
            logger.info("MongoDB multi-document transaction session not active or supported (%s), executing directly.", e)

    if not session_executed:
        _execute_atomic_operations(session=None)

    # Return created transaction
    created_txn = db.transaction.find_one({"transaction_id": transaction_id})
    return created_txn


def get_all_transactions(
    db: Database,
    skip: int = 0,
    limit: int = 50,
    year: int | None = None,
    transaction_type: str | None = None,
    status_filter: str | None = None,
) -> tuple[list[dict[str, Any]], int]:
    """List transactions with optional filters and pagination."""
    query: dict[str, Any] = {}
    if year:
        query["transaction_year"] = year
    if transaction_type:
        query["transaction_type"] = transaction_type.upper()
    if status_filter:
        query["status"] = status_filter.upper()

    total = db.transaction.count_documents(query)
    records = list(
        db.transaction.find(query)
        .sort("transaction_date", -1)
        .skip(skip)
        .limit(limit)
    )
    return records, total


def get_transaction_by_id(db: Database, transaction_id: str) -> dict[str, Any]:
    """Fetches a single transaction by its transaction_id or _id."""
    txn = db.transaction.find_one(
        {"$or": [{"transaction_id": transaction_id}, {"_id": transaction_id}]}
    )
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction '{transaction_id}' not found.",
        )
    return txn


def get_transactions_by_owner(db: Database, owner_id: str) -> list[dict[str, Any]]:
    """Fetches all transactions where the given owner was either seller or buyer."""
    query = {
        "$or": [
            {"seller_id": owner_id},
            {"buyer_id": owner_id},
            {"seller_name": owner_id},
            {"buyer_name": owner_id},
        ]
    }
    return list(db.transaction.find(query).sort("transaction_date", -1))


def get_transactions_by_khasra(db: Database, khasra_number: str) -> list[dict[str, Any]]:
    """Fetches all transactions involving a specific Khasra number."""
    clean_khasra = str(khasra_number).strip()
    query = {
        "$or": [
            {"original_khasra_number": clean_khasra},
            {"parent_khasra_no": clean_khasra},
            {"child_khasra_numbers": clean_khasra},
        ]
    }
    return list(db.transaction.find(query).sort("transaction_date", -1))


def get_khasra_ownership_history(
    db: Database,
    khasra_number: str,
    query_year: int | None = None,
) -> dict[str, Any]:
    """
    Returns complete ownership history, provenance chain, subdivision lineage,
    and answers historical ownership questions for a given Khasra.
    """
    clean_khasra = str(khasra_number).strip()
    khasra_doc = _find_khasra_record(db, clean_khasra)
    if not khasra_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Khasra '{clean_khasra}' not found in master records.",
        )

    # 1. Transactions involving this Khasra
    transactions = get_transactions_by_khasra(db, clean_khasra)

    # 2. Determine current status and current owners
    is_active = khasra_doc.get("is_active", True)
    status_val = khasra_doc.get("status", "approved")
    parent_khasra = khasra_doc.get("parent_khasra_no")
    child_khasras = khasra_doc.get("subdivided_into", [])

    # If this khasra was subdivided, current ownership lies in active child khasras
    current_owners: list[dict[str, Any]] = []
    if not is_active and status_val == "subdivided":
        # Find active children in master_records
        active_children = list(
            db.master_records.find(
                {"parent_khasra_no": clean_khasra, "is_active": {"$ne": False}}
            )
        )
        for ch in active_children:
            current_owners.append(
                {
                    "khasra_number": ch.get("khasra_number"),
                    "owner_id": ch.get("owner_id", ""),
                    "owner_name": ch.get("owner_name", "Unknown"),
                    "father_or_husband_name": ch.get("father_or_husband_name"),
                    "area": float(ch.get("total_area_sq_meters") or ch.get("area") or 0.0),
                    "area_unit": ch.get("area_unit", "acre"),
                    "status": ch.get("status", "active"),
                    "village": ch.get("village"),
                    "tehsil": ch.get("tehsil"),
                    "district": ch.get("district"),
                }
            )
    else:
        # Currently active parcel
        current_owners.append(
            {
                "khasra_number": clean_khasra,
                "owner_id": khasra_doc.get("owner_id", ""),
                "owner_name": khasra_doc.get("owner_name", "Unknown"),
                "father_or_husband_name": khasra_doc.get("father_or_husband_name"),
                "area": float(khasra_doc.get("total_area_sq_meters") or khasra_doc.get("area") or 0.0),
                "area_unit": khasra_doc.get("area_unit", "acre"),
                "status": status_val,
                "village": khasra_doc.get("village"),
                "tehsil": khasra_doc.get("tehsil"),
                "district": khasra_doc.get("district"),
            }
        )

    # 3. Build chronological timeline
    timeline: list[dict[str, Any]] = []
    # Include embedded ownership history from master_records
    for h in khasra_doc.get("ownership_history", []):
        timeline.append(
            {
                "transaction_id": h.get("transaction_id", "HISTORICAL-INIT"),
                "transaction_type": h.get("transaction_type", "TRANSFER"),
                "from_owner_id": h.get("from_owner_id", ""),
                "from_owner_name": h.get("from_owner_name", "Previous Owner"),
                "to_owner_id": h.get("to_owner_id", ""),
                "to_owner_name": h.get("to_owner_name", khasra_doc.get("owner_name", "")),
                "area_transferred": float(h.get("area_transferred") or h.get("area") or 0.0),
                "ownership_percentage": float(h.get("ownership_percentage", 100.0)),
                "date": h.get("date") or khasra_doc.get("created_at"),
                "year": h.get("year") or getattr(khasra_doc.get("created_at"), "year", 2024),
                "event": h.get("event", "RECORD_ENTRY"),
                "document_registry_number": h.get("document_registry_number"),
            }
        )

    # Also add transactions from db.transaction if not already present
    existing_txn_ids = {t["transaction_id"] for t in timeline}
    for txn in transactions:
        if txn["transaction_id"] not in existing_txn_ids:
            timeline.append(
                {
                    "transaction_id": txn["transaction_id"],
                    "transaction_type": txn["transaction_type"],
                    "from_owner_id": txn["seller_id"],
                    "from_owner_name": txn["seller_name"],
                    "to_owner_id": txn["buyer_id"],
                    "to_owner_name": txn["buyer_name"],
                    "area_transferred": txn["transferred_area"],
                    "ownership_percentage": txn["ownership_percentage_transferred"],
                    "date": txn["transaction_date"],
                    "year": txn["transaction_year"],
                    "event": "SUBDIVISION" if txn.get("is_subdivided") else "SALE",
                    "document_registry_number": txn.get("document_info", {}).get("registry_number"),
                }
            )

    # Sort timeline chronologically
    def _get_sort_key(entry):
        d = entry.get("date")
        if isinstance(d, datetime):
            return d.timestamp()
        if isinstance(d, str):
            try:
                return datetime.fromisoformat(d).timestamp()
            except Exception:
                pass
        return entry.get("year", 2000)

    timeline.sort(key=_get_sort_key)

    # 4. Subdivision genealogy tree
    subdivision_tree = {
        "khasra_number": clean_khasra,
        "parent_khasra_no": parent_khasra,
        "child_khasras": child_khasras,
        "is_subdivided": not is_active and status_val == "subdivided",
        "subdivision_details": [
            {
                "transaction_id": t["transaction_id"],
                "created_khasras": t.get("child_khasra_numbers", []),
                "records": t.get("subdivision_records", []),
            }
            for t in transactions
            if t.get("is_subdivided")
        ],
    }

    # 5. Historical Query (e.g. "Who owned this Khasra in 2010?")
    historical_query_result = None
    if query_year is not None:
        # Scan timeline up to query_year
        owner_at_year = None
        for entry in timeline:
            if entry["year"] <= query_year:
                owner_at_year = {
                    "year": query_year,
                    "khasra_number": clean_khasra,
                    "owner_id": entry["to_owner_id"],
                    "owner_name": entry["to_owner_name"],
                    "effective_from_year": entry["year"],
                    "via_transaction": entry["transaction_id"],
                    "transaction_type": entry["transaction_type"],
                }
        if not owner_at_year:
            # Fallback to initial owner recorded in master_records
            owner_at_year = {
                "year": query_year,
                "khasra_number": clean_khasra,
                "owner_id": khasra_doc.get("owner_id", ""),
                "owner_name": khasra_doc.get("owner_name", "Initial Recorded Owner"),
                "effective_from_year": getattr(khasra_doc.get("created_at"), "year", query_year),
                "via_transaction": "INITIAL_SURVEY_RECORD",
                "transaction_type": "INITIAL_RECORD",
            }
        historical_query_result = owner_at_year

    return {
        "khasra_number": clean_khasra,
        "is_active": is_active,
        "status": status_val,
        "total_area": float(khasra_doc.get("total_area_sq_meters") or khasra_doc.get("area") or 0.0),
        "area_unit": khasra_doc.get("area_unit", "acre"),
        "parent_khasra_no": parent_khasra,
        "child_khasras": child_khasras,
        "current_owners": current_owners,
        "timeline": timeline,
        "subdivision_tree": subdivision_tree,
        "historical_query_result": historical_query_result,
    }
