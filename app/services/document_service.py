
import hashlib
import uuid
import logging
from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile, status
from pymongo.database import Database

from app.models.mongo_models import (
    DocumentStatus,
    VersionType,
    JobStatus,
)
from app.services import storage_service
from app.services import ocr_service
from app.services import validation_service

logger = logging.getLogger(__name__)


# ============================================================
# FILE CONFIGURATION
# ============================================================

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/tif",
}

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".tiff",
    ".tif",
}

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


# EICAR signature used for malware-scan testing
EICAR_SIGNATURE = b"EICAR-STANDARD-ANTIVIRUS-TEST-FILE"


# ============================================================
# MALWARE SCAN
# ============================================================

def _scan_for_malware(data: bytes) -> None:
    """
    Scans the uploaded binary data for the EICAR
    antivirus test signature.
    """

    if EICAR_SIGNATURE in data:
        logger.warning(
            "Malware signature detected in uploaded file"
        )

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "File failed malware scan: "
                "malicious payload signature detected"
            ),
        )


# ============================================================
# FILE TYPE VALIDATION
# ============================================================

def _validate_file_type(file: UploadFile) -> str:
    """
    Validate uploaded file using MIME type first
    and file extension as fallback.

    Returns:
        Validated MIME type.
    """

    content_type = (
        file.content_type.lower()
        if file.content_type
        else ""
    )

    filename = file.filename or "uploaded_document"

    ext = (
        "." + filename.rsplit(".", 1)[-1].lower()
        if "." in filename
        else ""
    )

    # --------------------------------------------------------
    # Validate using MIME type
    # --------------------------------------------------------

    if content_type in ALLOWED_MIME_TYPES:
        return content_type

    # --------------------------------------------------------
    # Fallback to extension
    # --------------------------------------------------------

    ext_to_mime = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".tiff": "image/tiff",
        ".tif": "image/tiff",
    }

    if ext in ext_to_mime:
        return ext_to_mime[ext]

    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail=(
            f"Unsupported file type: "
            f"{content_type or 'unknown'} "
            "(allowed: PDF, JPEG, PNG, TIFF)"
        ),
    )


# ============================================================
# DOCUMENT UPLOAD
# ============================================================

def upload_document(
    db: Database,
    file: UploadFile,
    uploader_id: str | uuid.UUID,
    doc_type: str | None,
    scope_type: str | None,
    scope_id: str | None,
) -> tuple[dict, dict]:

    # --------------------------------------------------------
    # 1. Validate file type
    # --------------------------------------------------------

    validated_mime = _validate_file_type(file)

    # --------------------------------------------------------
    # 2. Read uploaded file
    # --------------------------------------------------------

    try:
        data = file.file.read()

    except Exception as e:
        logger.exception(
            "Could not read uploaded file"
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not read upload file: {str(e)}",
        )

    finally:
        # Reset file pointer
        try:
            file.file.seek(0)
        except Exception:
            pass

    # --------------------------------------------------------
    # 3. Validate file is not empty
    # --------------------------------------------------------

    if len(data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    # --------------------------------------------------------
    # 4. Validate file size
    # --------------------------------------------------------

    if len(data) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"File too large. Maximum size is "
                f"{MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB"
            ),
        )

    # --------------------------------------------------------
    # 5. Malware scan
    # --------------------------------------------------------

    _scan_for_malware(data)

    # --------------------------------------------------------
    # 6. Generate identifiers
    # --------------------------------------------------------

    file_hash = hashlib.sha256(data).hexdigest()

    document_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())
    version_id = str(uuid.uuid4())

    safe_filename = (
        file.filename
        or f"document_{document_id}"
    )

    storage_key = (
        f"documents/"
        f"{document_id}/"
        f"original/"
        f"{safe_filename}"
    )

    # --------------------------------------------------------
    # 7. Store original document
    # --------------------------------------------------------

    storage_service.upload_bytes(
        storage_key,
        data,
        validated_mime,
    )

    now = datetime.now(timezone.utc)

    # --------------------------------------------------------
    # 8. Create document version
    # --------------------------------------------------------

    version_obj = {
        "id": version_id,
        "document_id": document_id,
        "version_type": VersionType.original.value,
        "storage_key": storage_key,
        "created_at": now,
    }

    # --------------------------------------------------------
    # 9. Create processing job
    # --------------------------------------------------------

    job_obj = {
        "id": job_id,
        "document_id": document_id,
        "status": JobStatus.queued.value,
        "error": None,
        "created_at": now,
        "updated_at": now,
    }

    # --------------------------------------------------------
    # 10. Create document object
    # --------------------------------------------------------

    document_doc = {
        "_id": document_id,
        "id": document_id,

        "uploader_id": str(uploader_id),

        "original_filename": safe_filename,

        "storage_key": storage_key,

        "file_hash": file_hash,

        "mime_type": validated_mime,

        "doc_type": doc_type,

        "status": DocumentStatus.queued.value,

        "scope_type": scope_type,

        "scope_id": scope_id,

        "created_at": now,

        "uploaded_at": now,

        "uploaded_at_iso": now.isoformat(),

        "versions": [
            version_obj
        ],

        "jobs": [
            job_obj
        ],

        "metadata": {},
    }

    # --------------------------------------------------------
    # 11. Save document in MongoDB
    # --------------------------------------------------------

    db.documents.insert_one(
        document_doc
    )

    # --------------------------------------------------------
    # 12. Save processing job separately
    # --------------------------------------------------------

    db.processing_jobs.insert_one(
        job_obj
    )

    # ========================================================
    # AUDIT LOG
    # ========================================================

    try:

        uploader = db.users.find_one({
            "$or": [
                {
                    "_id": str(uploader_id)
                },
                {
                    "id": str(uploader_id)
                },
            ]
        })

        uploader_email = (
            uploader.get("email", "system")
            if uploader
            else "system"
        )

        db.audit_logs.insert_one({

            "_id": str(uuid.uuid4()),

            "user_id": str(uploader_id),

            "user_email": uploader_email,

            "action": "DOCUMENT_UPLOADED",

            "resource_type": "Document",

            "resource_id": document_id,

            "ip_address": "127.0.0.1",

            "details": {

                "filename": safe_filename,

                "doc_type": doc_type,

                "scope_type": scope_type,

                "scope_id": scope_id,

                "uploaded_at": now.isoformat(),
            },

            "created_at": now,
        })

    except Exception as e:

        # Audit failure should NOT prevent OCR
        logger.warning(
            "Failed to create audit log for "
            "document %s: %s",
            document_id,
            e,
        )

    # ========================================================
    # OCR PROCESSING
    # ========================================================

    try:

        logger.info(
            "Starting OCR processing for document %s",
            document_id,
        )

        ocr_service.process_document_with_ocr(

            db=db,

            document_id=document_id,

            job_id=job_id,
        )

        logger.info(
            "OCR processing completed for document %s",
            document_id,
        )

    except Exception as e:

        # OCR failure should be logged.
        # The upload itself should remain valid.

        logger.exception(
            "OCR processing failed for document %s: %s",
            document_id,
            e,
        )

    # --------------------------------------------------------
    # 13. Return uploaded document + processing job
    # --------------------------------------------------------

    return document_doc, job_obj


# ============================================================
# SOFT DELETE DOCUMENT
# ============================================================

def soft_delete_document(
    db: Database,
    document_id: str | uuid.UUID,
) -> None:

    doc_id_str = str(document_id)

    result = db.documents.update_one(

        {
            "_id": doc_id_str
        },

        {
            "$set": {
                "status":
                    DocumentStatus.deleted.value
            }
        },
    )

    if result.matched_count == 0:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
