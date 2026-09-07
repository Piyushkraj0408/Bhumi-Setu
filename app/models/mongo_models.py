import uuid
import enum
from datetime import datetime, timezone
from typing import Any


class UserStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"
    pending = "pending"


class DocumentStatus(str, enum.Enum):
    uploaded = "uploaded"
    queued = "queued"
    processing = "processing"
    processed = "processed"
    failed = "failed"
    deleted = "deleted"


class VersionType(str, enum.Enum):
    original = "original"
    processed = "processed"
    ocr_output = "ocr_output"
    extracted_data = "extracted_data"


class JobStatus(str, enum.Enum):
    queued = "queued"
    processing = "processing"
    done = "done"
    failed = "failed"


class MongoUser:
    """Helper wrapper for user dictionary from MongoDB."""
    def __init__(self, doc: dict[str, Any]):
        self.doc = doc
        self.id = uuid.UUID(str(doc.get("_id", doc.get("id"))))
        self.email = doc.get("email")
        self.password_hash = doc.get("password_hash")
        self.name = doc.get("name")
        self.status = UserStatus(doc.get("status", "active"))
        self.mfa_enabled = doc.get("mfa_enabled", False)
        self.created_at = doc.get("created_at") or datetime.now(timezone.utc)
        self.last_login_at = doc.get("last_login_at")
        self.role_assignments = doc.get("role_assignments", [])

    def to_dict(self) -> dict[str, Any]:
        return self.doc


class MongoDocument:
    """Helper wrapper for document dictionary from MongoDB."""
    def __init__(self, doc: dict[str, Any]):
        self.doc = doc
        self.id = uuid.UUID(str(doc.get("_id", doc.get("id"))))
        self.uploader_id = uuid.UUID(str(doc.get("uploader_id"))) if doc.get("uploader_id") else None
        self.original_filename = doc.get("original_filename", "")
        self.storage_key = doc.get("storage_key", "")
        self.file_hash = doc.get("file_hash", "")
        self.mime_type = doc.get("mime_type", "")
        self.doc_type = doc.get("doc_type")
        self.status = doc.get("status", "uploaded")
        self.scope_type = doc.get("scope_type")
        self.scope_id = doc.get("scope_id")
        self.created_at = doc.get("created_at") or datetime.now(timezone.utc)
        self.uploaded_at = doc.get("uploaded_at") or self.created_at
        self.versions = doc.get("versions", [])
        self.jobs = doc.get("jobs", [])
