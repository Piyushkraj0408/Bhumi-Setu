import enum
from datetime import datetime, timezone
from typing import Any


class TransactionType(str, enum.Enum):
    SALE = "SALE"
    PURCHASE = "PURCHASE"
    TRANSFER = "TRANSFER"
    INHERITANCE = "INHERITANCE"
    PARTITION = "PARTITION"
    GIFT = "GIFT"
    SUBDIVISION = "SUBDIVISION"


class TransactionStatus(str, enum.Enum):
    COMPLETED = "COMPLETED"
    PENDING = "PENDING"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class MongoTransaction:
    """Helper wrapper for transaction dictionary from MongoDB collection 'transaction'."""

    def __init__(self, doc: dict[str, Any]):
        self.doc = doc
        self.id = str(doc.get("_id", ""))
        self.transaction_id = doc.get("transaction_id", "")
        self.transaction_type = TransactionType(doc.get("transaction_type", "SALE"))
        self.transaction_date = doc.get("transaction_date") or datetime.now(timezone.utc)
        self.transaction_year = doc.get("transaction_year") or self.transaction_date.year
        self.seller_id = doc.get("seller_id", "")
        self.seller_name = doc.get("seller_name", "")
        self.buyer_id = doc.get("buyer_id", "")
        self.buyer_name = doc.get("buyer_name", "")
        self.original_khasra_number = doc.get("original_khasra_number", "")
        self.land_area_before = float(doc.get("land_area_before", 0.0))
        self.transferred_area = float(doc.get("transferred_area", 0.0))
        self.remaining_area = float(doc.get("remaining_area", 0.0))
        self.area_unit = doc.get("area_unit", "acre")
        self.ownership_percentage_transferred = float(doc.get("ownership_percentage_transferred", 0.0))
        self.document_info = doc.get("document_info", {})
        self.status = TransactionStatus(doc.get("status", "COMPLETED"))
        self.is_subdivided = doc.get("is_subdivided", False)
        self.parent_khasra_no = doc.get("parent_khasra_no")
        self.child_khasra_numbers = doc.get("child_khasra_numbers", [])
        self.subdivision_records = doc.get("subdivision_records", [])
        self.created_at = doc.get("created_at") or datetime.now(timezone.utc)
        self.created_by = doc.get("created_by")
        self.remarks = doc.get("remarks")

    def to_dict(self) -> dict[str, Any]:
        return self.doc
