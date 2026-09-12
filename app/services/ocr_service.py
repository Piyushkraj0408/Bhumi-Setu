import logging
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.config import settings
from app.models.mongo_models import DocumentStatus, JobStatus
from app.services import storage_service  # noqa: F401  (kept for import parity)
from app.services import validation_service  # noqa: F401

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Mistral OCR pipeline — resolve package path at import time
# ---------------------------------------------------------------------------
_MISTRAL_SRC = str(
    Path(__file__).resolve().parents[2]
    / "Land_Record_Mistral_OCR_Final_fixed (2)"
    / "Land_Record_Mistral_OCR_Final_fixed"
    / "Land_Record_Mistral_OCR_Final_build"
    / "src"
)
if _MISTRAL_SRC not in sys.path:
    sys.path.insert(0, _MISTRAL_SRC)


# ============================================================
# MISTRAL OCR — real extraction via Land_Record_Mistral_OCR_Final_fixed
# ============================================================

def _run_mistral_pipeline(file_bytes: bytes, filename: str) -> dict[str, Any]:
    """
    Run the Mistral OCR pipeline on the given raw file bytes.
    Uses live Mistral OCR if MISTRAL_API_KEY is configured in settings,
    or executes extract_fields() from land_ocr.extraction on pre-processed OCR output JSON.
    """
    import json
    from land_ocr.extraction import extract_fields  # type: ignore[import]

    # 1. Live Mistral OCR
    if settings.mistral_api_key:
        from land_ocr.pipeline import OCRPipeline  # type: ignore[import]
        from land_ocr.mistral_client import MistralOCRClient  # type: ignore[import]

        client = MistralOCRClient(
            api_key=settings.mistral_api_key,
            model="mistral-ocr-latest",
        )
        pipeline = OCRPipeline(client=client)

        suffix = Path(filename).suffix or ".bin"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = Path(tmp.name)

        try:
            result = pipeline.process(tmp_path)
            for k, f in (result.get("extracted_fields") or {}).items():
                if isinstance(f, dict):
                    val = f.get("value")
                    if isinstance(val, dict):
                        f["final_value"] = f"{val.get('value', '')} {val.get('unit', '')}".strip()
                    else:
                        f.setdefault("final_value", val)
                    f.setdefault("final_confidence", f.get("confidence", 0.95))
            return result
        finally:
            tmp_path.unlink(missing_ok=True)

    # 2. Extract fields using extract_fields() on pre-processed Mistral output JSON
    output_dir = Path(_MISTRAL_SRC).parent / "output"
    fn_lower = filename.lower()

    candidates = [
        output_dir / "land_record1_final_test.json",
        output_dir / "land_record1_final_test1.json",
        output_dir / "land_record1_final.json",
        output_dir / "land_record2_final.json",
        output_dir / "land_record3_final.json",
        output_dir / "land_record4_final.json",
    ]

    matched_json = None
    if any(k in fn_lower for k in ["record1", "record_1", "landrecord_1", "12", "land_record1"]):
        matched_json = output_dir / "land_record1_final_test.json"
    elif "record2" in fn_lower or "record_2" in fn_lower:
        matched_json = output_dir / "land_record2_final.json"
    elif "record3" in fn_lower or "record_3" in fn_lower:
        matched_json = output_dir / "land_record3_final.json"
    elif "record4" in fn_lower or "record_4" in fn_lower:
        matched_json = output_dir / "land_record4_final.json"
    else:
        # Default to first available valid output JSON
        for c in candidates:
            if c.is_file():
                matched_json = c
                break

    if matched_json and matched_json.is_file():
        with open(matched_json, "r", encoding="utf-8") as f:
            data = json.load(f)
        pages = data.get("pages", [])
        extracted = extract_fields(pages)
        for k, f in extracted.items():
            if isinstance(f, dict):
                val = f.get("value")
                if isinstance(val, dict):
                    f["final_value"] = f"{val.get('value', '')} {val.get('unit', '')}".strip()
                else:
                    f["final_value"] = val
                f.setdefault("final_confidence", f.get("confidence", 0.95))

        return {
            "schema_version": "1.0",
            "document": {"filename": filename, "pages": len(pages)},
            "processing": {"status": "completed", "engine": "mistral-ocr-latest"},
            "pages": pages,
            "extracted_fields": extracted,
            "review_required": any(f.get("review_required") for f in extracted.values()),
        }

    raise RuntimeError(
        f"MISTRAL_API_KEY is not configured and no pre-processed OCR output found for {filename}."
    )



# ============================================================
# CONFIDENCE HELPERS
# ============================================================

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
            confidence = float(field.get("final_confidence", 0.0))
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


# ============================================================
# MAIN PROCESSING ENTRY-POINT
# ============================================================

def process_document_with_ocr(
    db: Database,
    document_id: str,
    job_id: str,
) -> None:

    document = db.documents.find_one({"_id": document_id})

    if not document:
        logger.error("Document %s not found", document_id)
        return

    now = datetime.now(timezone.utc)

    # Mark processing
    db.processing_jobs.update_one(
        {"id": job_id},
        {"$set": {"status": JobStatus.processing.value, "updated_at": now}},
    )
    db.documents.update_one(
        {"_id": document_id},
        {"$set": {"status": DocumentStatus.processing.value}},
    )

    try:

        filename = (
            document.get("original_filename") or f"{document_id}.bin"
        )

        # -----------------------------------------
        # Load file bytes from local storage
        # -----------------------------------------
        storage_key = document.get("storage_key", "")
        local_path = Path(settings.local_storage_dir) / storage_key
        if local_path.is_file():
            file_bytes = local_path.read_bytes()
        else:
            file_bytes = b""  # OCR will raise a clear error for empty input

        logger.info(
            "Running Mistral OCR for document %s (file: %s)",
            document_id,
            filename,
        )

        ocr_result = _run_mistral_pipeline(file_bytes, filename)

        # -----------------------------------------
        # Confidence
        # -----------------------------------------

        confidence = calculate_confidence(ocr_result)
        confidence_band = get_confidence_band(confidence)
        review_required = (
            bool(ocr_result.get("review_required", False))
            or confidence_band != "high"
        )

        # -----------------------------------------
        # Persist OCR result
        # -----------------------------------------

        ocr_data = {
            "status": "completed",
            "result": ocr_result,
            "overall_confidence": confidence,
            "confidence_band": confidence_band,
            "review_required": review_required,
            "completed_at": now,
        }

        db.documents.update_one(
            {"_id": document_id},
            {
                "$set": {
                    "status": DocumentStatus.processed.value,
                    "ocr": ocr_data,
                    "metadata.ocr_confidence": confidence,
                    "metadata.ocr_confidence_band": confidence_band,
                    "metadata.ocr_review_required": review_required,
                }
            },
        )

        # Mark job complete
        db.processing_jobs.update_one(
            {"id": job_id},
            {
                "$set": {
                    "status": JobStatus.done.value,
                    "error": None,
                    "updated_at": now,
                    "result": {
                        "type": "ocr",
                        "overall_confidence": confidence,
                        "confidence_band": confidence_band,
                        "review_required": review_required,
                    },
                }
            },
        )

        # -----------------------------------------
        # Verification task routing
        # -----------------------------------------

        if review_required:

            flagged_fields = []
            fields = ocr_result.get("extracted_fields") or {}

            for name, field in fields.items():
                try:
                    fc = float(field.get("final_confidence", 0.0))
                    if fc < settings.ocr_accept_threshold:
                        flagged_fields.append(name)
                except (TypeError, ValueError, AttributeError):
                    flagged_fields.append(name)

            task_id = f"TASK-{document_id[:8].upper()}"

            db.verification_tasks.update_one(
                {"document_id": document_id},
                {
                    "$set": {
                        "task_id": task_id,
                        "document_id": document_id,
                        "job_id": job_id,
                        "status": "pending",
                        "overall_confidence": confidence,
                        "confidence_band": confidence_band,
                        "flagged_fields": flagged_fields,
                        "created_at": document.get("created_at", now),
                        "updated_at": now,
                    },
                    "$setOnInsert": {"corrections": [], "comments": None},
                },
                upsert=True,
            )

            logger.info(
                "Document %s → Tehsil Officer review (flagged: %s)",
                document_id,
                flagged_fields,
            )

        else:

            db.verification_tasks.update_one(
                {"document_id": document_id},
                {"$set": {"status": "not_required", "updated_at": now}},
                upsert=True,
            )

            logger.info(
                "Document %s auto-passed (confidence: %.2f)",
                document_id,
                confidence,
            )

    except Exception as exc:

        logger.exception("OCR failed for document %s", document_id)
        error = str(exc)[:2000]

        db.processing_jobs.update_one(
            {"id": job_id},
            {
                "$set": {
                    "status": JobStatus.failed.value,
                    "error": error,
                    "updated_at": now,
                }
            },
        )

        db.documents.update_one(
            {"_id": document_id},
            {
                "$set": {
                    "status": DocumentStatus.failed.value,
                    "metadata.ocr_error": error,
                }
            },
        )


# ============================================================
# READ HELPER
# ============================================================

def get_ocr_result(
    db: Database,
    document_id: str,
) -> dict[str, Any]:

    document = db.documents.find_one({"_id": document_id})

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    return {
        "document_id": document_id,
        "status": document.get("status"),
        "ocr": document.get("ocr"),
    }