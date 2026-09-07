import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.config import settings
from app.models.mongo_models import DocumentStatus, JobStatus
from app.services import storage_service

logger = logging.getLogger(__name__)


def calculate_confidence(result: dict[str, Any]) -> float:
    """
    Calculate overall OCR confidence.

    We use the LOWEST field confidence so that one badly
    extracted important field is not hidden by other good fields.
    """

    fields = result.get("extracted_fields") or {}

    confidences = []

    for field in fields.values():

        try:
            confidence = float(
                field.get("final_confidence", 0.0)
            )

            confidences.append(confidence)

        except (TypeError, ValueError, AttributeError):
            continue

    if not confidences:
        return 0.0

    return round(min(confidences), 4)


def get_confidence_band(score: float) -> str:

    if score >= settings.ocr_accept_threshold:
        return "high"

    if score >= settings.ocr_review_threshold:
        return "medium"

    return "low"


def process_document_with_ocr(
    db: Database,
    document_id: str,
    job_id: str
) -> None:

    document = db.documents.find_one({
        "_id": document_id
    })

    if not document:

        logger.error(
            "Document %s not found",
            document_id
        )

        return

    now = datetime.now(timezone.utc)

    # -----------------------------------------
    # Mark processing
    # -----------------------------------------

    db.processing_jobs.update_one(
        {"id": job_id},
        {
            "$set": {
                "status": JobStatus.processing.value,
                "updated_at": now
            }
        }
    )

    db.documents.update_one(
        {"_id": document_id},
        {
            "$set": {
                "status": DocumentStatus.processing.value
            }
        }
    )

    try:

        # -----------------------------------------
        # Get original document
        # -----------------------------------------

        file_data = storage_service.get_bytes(
            document["storage_key"]
        )

        filename = (
            document.get("original_filename")
            or f"{document_id}.bin"
        )

        content_type = (
            document.get("mime_type")
            or "application/octet-stream"
        )

        # -----------------------------------------
        # Send document to OCR service
        # -----------------------------------------

        ocr_url = (
            f"{settings.ocr_service_url.rstrip('/')}"
            "/api/v1/ocr/process"
        )

        logger.info(
            "Sending document %s to OCR service: %s",
            document_id,
            ocr_url
        )

        with httpx.Client(
            timeout=settings.ocr_timeout_seconds
        ) as client:

            response = client.post(
                ocr_url,
                files={
                    "file": (
                        filename,
                        file_data,
                        content_type
                    )
                }
            )

            response.raise_for_status()

            ocr_result = response.json()

        # -----------------------------------------
        # Confidence
        # -----------------------------------------

        confidence = calculate_confidence(
            ocr_result
        )

        confidence_band = get_confidence_band(
            confidence
        )

        review_required = (
            bool(
                ocr_result.get(
                    "review_required",
                    False
                )
            )
            or confidence_band != "high"
        )

        # -----------------------------------------
        # Save OCR result
        # -----------------------------------------

        ocr_data = {

            "status": "completed",

            "result": ocr_result,

            "overall_confidence": confidence,

            "confidence_band": confidence_band,

            "review_required": review_required,

            "completed_at": now
        }

        db.documents.update_one(
            {"_id": document_id},
            {
                "$set": {

                    "status":
                        DocumentStatus.processed.value,

                    "ocr": ocr_data,

                    "metadata.ocr_confidence":
                        confidence,

                    "metadata.ocr_confidence_band":
                        confidence_band,

                    "metadata.ocr_review_required":
                        review_required
                }
            }
        )

        # -----------------------------------------
        # Mark job complete
        # -----------------------------------------

        db.processing_jobs.update_one(
            {"id": job_id},
            {
                "$set": {

                    "status":
                        JobStatus.done.value,

                    "error": None,

                    "updated_at": now,

                    "result": {

                        "type": "ocr",

                        "overall_confidence":
                            confidence,

                        "confidence_band":
                            confidence_band,

                        "review_required":
                            review_required
                    }
                }
            }
        )

        # -----------------------------------------
        # Human verification
        # -----------------------------------------

        if review_required:

            flagged_fields = []

            fields = (
                ocr_result.get(
                    "extracted_fields"
                )
                or {}
            )

            for name, field in fields.items():

                try:

                    field_confidence = float(
                        field.get(
                            "final_confidence",
                            0.0
                        )
                    )

                    if (
                        field_confidence
                        < settings.ocr_accept_threshold
                    ):

                        flagged_fields.append(name)

                except (
                    TypeError,
                    ValueError,
                    AttributeError
                ):

                    flagged_fields.append(name)

            task_id = (
                f"TASK-{document_id[:8].upper()}"
            )

            db.verification_tasks.update_one(
                {"document_id": document_id},

                {
                    "$set": {

                        "task_id": task_id,

                        "document_id":
                            document_id,

                        "job_id":
                            job_id,

                        "status":
                            "pending",

                        "overall_confidence":
                            confidence,

                        "confidence_band":
                            confidence_band,

                        "flagged_fields":
                            flagged_fields,

                        "created_at":
                            document.get(
                                "created_at",
                                now
                            ),

                        "updated_at":
                            now
                    },

                    "$setOnInsert": {

                        "corrections": [],

                        "comments": None
                    }
                },

                upsert=True
            )

            logger.info(
                "Document %s sent for human verification",
                document_id
            )

        else:

            # High confidence
            db.verification_tasks.update_one(
                {"document_id": document_id},

                {
                    "$set": {

                        "status":
                            "not_required",

                        "updated_at":
                            now
                    }
                },

                upsert=True
            )

            logger.info(
                "Document %s passed OCR automatically",
                document_id
            )

    except Exception as exc:

        logger.exception(
            "OCR failed for document %s",
            document_id
        )

        error = str(exc)[:2000]

        db.processing_jobs.update_one(
            {"id": job_id},

            {
                "$set": {

                    "status":
                        JobStatus.failed.value,

                    "error":
                        error,

                    "updated_at":
                        now
                }
            }
        )

        db.documents.update_one(
            {"_id": document_id},

            {
                "$set": {

                    "status":
                        DocumentStatus.failed.value,

                    "metadata.ocr_error":
                        error
                }
            }
        )


def get_ocr_result(
    db: Database,
    document_id: str
) -> dict[str, Any]:

    document = db.documents.find_one({
        "_id": document_id
    })

    if not document:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    return {

        "document_id":
            document_id,

        "status":
            document.get("status"),

        "ocr":
            document.get("ocr")
    }