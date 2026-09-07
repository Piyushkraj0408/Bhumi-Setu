from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any

from pymongo.database import Database


GENESIS_HASH = "GENESIS"


# ============================================================
# HASHING
# ============================================================

def make_canonical_record(record: dict[str, Any]) -> dict[str, Any]:
    """
    Create a deterministic representation of a Master Record.

    MongoDB internal fields and blockchain metadata are excluded.
    """

    excluded_fields = {
        "_id",
        "blockchain",
        "validation",
        "created_at",
        "last_updated",
    }

    canonical = {}

    for key in sorted(record.keys()):
        if key not in excluded_fields:
            value = record[key]

            # Convert UUID/datetime values to strings.
            if isinstance(value, (datetime, uuid.UUID)):
                value = str(value)

            canonical[key] = value

    return canonical


def calculate_record_hash(record: dict[str, Any]) -> str:
    """
    Calculate SHA-256 hash of the canonical Master Record.
    """

    canonical_record = make_canonical_record(record)

    serialized = json.dumps(
        canonical_record,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )

    return hashlib.sha256(
        serialized.encode("utf-8")
    ).hexdigest()


# ============================================================
# BLOCK HASH
# ============================================================

def calculate_block_hash(
    block_number: int,
    timestamp: datetime,
    previous_hash: str,
    transactions: list[dict],
) -> str:

    block_data = {
        "block_number": block_number,
        "timestamp": timestamp.isoformat(),
        "previous_hash": previous_hash,
        "transactions": transactions,
    }

    serialized = json.dumps(
        block_data,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )

    return hashlib.sha256(
        serialized.encode("utf-8")
    ).hexdigest()


# ============================================================
# GET LAST BLOCK
# ============================================================

def get_last_block(db: Database) -> dict | None:
    return db.blockchain_blocks.find_one(
        {},
        sort=[("block_number", -1)],
    )


# ============================================================
# CREATE BLOCK
# ============================================================

def create_block(
    db: Database,
    transaction: dict[str, Any],
) -> dict[str, Any]:

    last_block = get_last_block(db)

    if last_block:
        block_number = (
            int(last_block["block_number"]) + 1
        )
        previous_hash = last_block["block_hash"]
    else:
        block_number = 1
        previous_hash = GENESIS_HASH

    timestamp = datetime.now(timezone.utc)

    block_hash = calculate_block_hash(
        block_number=block_number,
        timestamp=timestamp,
        previous_hash=previous_hash,
        transactions=[transaction],
    )

    block = {
        "block_number": block_number,
        "timestamp": timestamp,
        "previous_hash": previous_hash,
        "block_hash": block_hash,
        "transactions": [transaction],
    }

    db.blockchain_blocks.insert_one(block)

    return block


# ============================================================
# ANCHOR MASTER RECORD
# ============================================================

def anchor_master_record(
    db: Database,
    master_record: dict[str, Any],
    approved_by: str,
    approved_by_name: str | None = None,
) -> dict[str, Any]:

    record_hash = calculate_record_hash(
        master_record
    )

    transaction_id = str(uuid.uuid4())

    transaction = {
        "transaction_id": transaction_id,
        "record_id": master_record["record_id"],
        "document_id": master_record.get("document_id"),
        "action": "MASTER_RECORD_CREATED",
        "record_hash": record_hash,
        "approved_by": approved_by,
        "approved_by_name": approved_by_name,
        "approved_by_role": "tehsil_officer",
        "timestamp": datetime.now(timezone.utc),
    }

    block = create_block(
        db,
        transaction,
    )

    # Store transaction separately for easy searching.
    db.blockchain_transactions.insert_one(
        {
            **transaction,
            "block_number": block["block_number"],
            "block_hash": block["block_hash"],
        }
    )

    return {
        "transaction_id": transaction_id,
        "block_number": block["block_number"],
        "block_hash": block["block_hash"],
        "record_hash": record_hash,
        "action": "MASTER_RECORD_CREATED",
    }


# ============================================================
# VERIFY MASTER RECORD
# ============================================================

def verify_master_record(
    db: Database,
    record_id: str,
) -> dict[str, Any]:

    record = db.master_records.find_one(
        {
            "record_id": record_id
        }
    )

    if not record:
        return {
            "record_id": record_id,
            "verified": False,
            "tampered": False,
            "message": "Master Record not found.",
        }

    transaction = db.blockchain_transactions.find_one(
        {
            "record_id": record_id,
            "action": "MASTER_RECORD_CREATED",
        },
        sort=[("timestamp", -1)],
    )

    if not transaction:
        return {
            "record_id": record_id,
            "verified": False,
            "tampered": False,
            "message": "No blockchain transaction found.",
        }

    current_hash = calculate_record_hash(record)

    stored_hash = transaction.get(
        "record_hash"
    )

    is_match = (
        current_hash == stored_hash
    )

    return {
        "record_id": record_id,
        "verified": is_match,
        "tampered": not is_match,
        "stored_hash": stored_hash,
        "calculated_hash": current_hash,
        "block_number": transaction.get(
            "block_number"
        ),
        "block_hash": transaction.get(
            "block_hash"
        ),
        "message": (
            "Record integrity verified."
            if is_match
            else "WARNING: Master Record hash does not match blockchain."
        ),
    }


# ============================================================
# BLOCKCHAIN HISTORY
# ============================================================

def get_record_history(
    db: Database,
    record_id: str,
) -> list[dict[str, Any]]:

    transactions = list(
        db.blockchain_transactions.find(
            {
                "record_id": record_id
            },
            {
                "_id": 0
            },
        ).sort(
            "timestamp",
            1,
        )
    )

    return transactions


def create_governance_transaction(
    db: Database,
    record_id: str,
    action: str,
    actor_id: str,
    actor_name: str | None = None,
    metadata: dict | None = None,
) -> dict[str, Any]:
    """
    Create a blockchain transaction for governance actions
    such as deletion approvals and record revocation.
    """

    transaction_id = str(
        uuid.uuid4()
    )

    timestamp = datetime.now(
        timezone.utc
    )

    transaction = {
        "transaction_id": transaction_id,
        "record_id": record_id,
        "action": action,
        "actor_id": actor_id,
        "actor_name": actor_name,
        "timestamp": timestamp,
        "metadata": metadata or {},
    }

    block = create_block(
        db,
        transaction,
    )

    db.blockchain_transactions.insert_one(
        {
            **transaction,
            "block_number": block[
                "block_number"
            ],
            "block_hash": block[
                "block_hash"
            ],
        }
    )

    return {
        "transaction_id": transaction_id,
        "block_number": block[
            "block_number"
        ],
        "block_hash": block[
            "block_hash"
        ],
        "action": action,
    }