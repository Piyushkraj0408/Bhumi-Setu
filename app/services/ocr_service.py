import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.config import settings
from app.models.mongo_models import DocumentStatus, JobStatus
from app.services import storage_service  # noqa: F401  (kept for import parity)
from app.services import validation_service  # noqa: F401

logger = logging.getLogger(__name__)


# ============================================================
# DEMO MODE — hardcoded extraction (replaces live OCR)
# ============================================================

def _detect_record_index(filename: str) -> int:
    """
    Map uploaded filename to one of the 4 demo land record files.
    - land_record1 / record1 / 1 -> Record 1 (भू-स्वामित्व प्रमाण-पत्र / Radheshyam Singh)
    - land_record2 / record2 / 2 -> Record 2 (भू-स्वामित्व प्रमाण-पत्र / Ajay Singh)
    - land_record3 / record3 / 3 -> Record 3 (Land Possession Certificate / Dashrath Prasad)
    - land_record4 / record4 / 4 / conflict -> Record 4 (खसरा-खतौनी / Rameshwar Prasad - Conflict)
    """
    fn = filename.lower()
    if "conflict" in fn or "record4" in fn or "record_4" in fn or "land_record4" in fn or "landrecord4" in fn:
        return 4
    if "record3" in fn or "record_3" in fn or "land_record3" in fn or "landrecord3" in fn:
        return 3
    if "record2" in fn or "record_2" in fn or "land_record2" in fn or "landrecord2" in fn:
        return 2
    if "record1" in fn or "record_1" in fn or "land_record1" in fn or "landrecord1" in fn:
        return 1

    # Content-specific keywords
    if any(k in fn for k in ["rameshwar", "moradabad", "bilari", "gairpur", "1998", "khatauni"]):
        return 4
    if any(k in fn for k in ["dashrath", "aurangabad", "pandey", "427", "2015"]):
        return 3
    if any(k in fn for k in ["ajay", "156", "5.75", "2019"]):
        return 2
    if any(k in fn for k in ["radheshyam", "ramvilas", "5065", "155", "1034", "2018"]):
        return 1

    import re
    if re.search(r'(?:^|[\D_])4(?:[\D_]|$)', fn):
        return 4
    if re.search(r'(?:^|[\D_])3(?:[\D_]|$)', fn):
        return 3
    if re.search(r'(?:^|[\D_])2(?:[\D_]|$)', fn):
        return 2
    if re.search(r'(?:^|[\D_])1(?:[\D_]|$)', fn):
        return 1

    return 1


def _is_conflict_file(filename: str) -> bool:
    """Return True when the uploaded file triggers the conflict / review flow (File 4)."""
    return _detect_record_index(filename) == 4


def _demo_extract(filename: str) -> dict[str, Any]:
    """
    Return deterministic extraction result for the 4 demo land records.
    - Files 1, 2, 3: High confidence (>= 0.93) -> Auto-pass, anchor to blockchain
    - File 4: Low confidence on khasra, owner, area -> Routes to Tehsil Officer for review
    """
    idx = _detect_record_index(filename)

    # ------------------------------------------------------------
    # File 1: भू-स्वामित्व प्रमाण-पत्र — राधेश्याम सिंह (पटना, बिहार)
    # ------------------------------------------------------------
    if idx == 1:
        return {
            "document_type": "भू-स्वामित्व प्रमाण-पत्र (LPC)",
            "language": "Hindi",
            "review_required": False,
            "extracted_fields": {
                "owner_name": {
                    "final_value": "राधेश्याम सिंह",
                    "raw_value": "राधेश्याम सिंह",
                    "final_confidence": 0.96,
                },
                "father_name": {
                    "final_value": "स्व० रामविलास सिंह",
                    "raw_value": "स्व० रामविलास सिंह",
                    "final_confidence": 0.95,
                },
                "khasra_number": {
                    "final_value": "155",
                    "raw_value": "155 (एक सौ पचपन)",
                    "final_confidence": 0.97,
                },
                "khata_number": {
                    "final_value": "41",
                    "raw_value": "41 (इकतालीस)",
                    "final_confidence": 0.97,
                },
                "tauzi_number": {
                    "final_value": "5065",
                    "raw_value": "5065",
                    "final_confidence": 0.95,
                },
                "area_hectares": {
                    "final_value": "0.101",
                    "raw_value": "25 डिसमिल",
                    "final_confidence": 0.94,
                },
                "village": {
                    "final_value": "आसोपुर",
                    "raw_value": "आसोपुर",
                    "final_confidence": 0.98,
                },
                "thana": {
                    "final_value": "दानापुर (थाना सं० 34)",
                    "raw_value": "दानापुर (34)",
                    "final_confidence": 0.97,
                },
                "tehsil": {
                    "final_value": "दानापुर",
                    "raw_value": "दानापुर",
                    "final_confidence": 0.97,
                },
                "district": {
                    "final_value": "पटना",
                    "raw_value": "पटना (बिहार)",
                    "final_confidence": 0.99,
                },
                "state": {
                    "final_value": "बिहार",
                    "raw_value": "बिहार",
                    "final_confidence": 0.99,
                },
                "land_type": {
                    "final_value": "कृषि भूमि (Agricultural)",
                    "raw_value": "कृषि भूमि",
                    "final_confidence": 0.95,
                },
                "document_year": {
                    "final_value": "2018",
                    "raw_value": "15/11/2018",
                    "final_confidence": 0.96,
                },
            },
        }

    # ------------------------------------------------------------
    # File 2: भू-स्वामित्व प्रमाण-पत्र — अजय सिंह (पटना, बिहार)
    # ------------------------------------------------------------
    if idx == 2:
        return {
            "document_type": "भू-स्वामित्व प्रमाण-पत्र (LPC)",
            "language": "Hindi",
            "review_required": False,
            "extracted_fields": {
                "owner_name": {
                    "final_value": "अजय सिंह",
                    "raw_value": "अजय सिंह",
                    "final_confidence": 0.96,
                },
                "father_name": {
                    "final_value": "स्व० भोला सिंह",
                    "raw_value": "स्व० भोला सिंह",
                    "final_confidence": 0.95,
                },
                "khasra_number": {
                    "final_value": "156",
                    "raw_value": "156",
                    "final_confidence": 0.97,
                },
                "khata_number": {
                    "final_value": "19",
                    "raw_value": "19",
                    "final_confidence": 0.98,
                },
                "area_hectares": {
                    "final_value": "0.023",
                    "raw_value": "5.75 डिसमिल",
                    "final_confidence": 0.94,
                },
                "village": {
                    "final_value": "आसोपुर",
                    "raw_value": "आसोपुर",
                    "final_confidence": 0.98,
                },
                "thana": {
                    "final_value": "दानापुर (थाना सं० 34)",
                    "raw_value": "दानापुर (34)",
                    "final_confidence": 0.97,
                },
                "tehsil": {
                    "final_value": "दानापुर",
                    "raw_value": "दानापुर",
                    "final_confidence": 0.97,
                },
                "district": {
                    "final_value": "पटना",
                    "raw_value": "पटना",
                    "final_confidence": 0.99,
                },
                "state": {
                    "final_value": "बिहार",
                    "raw_value": "बिहार",
                    "final_confidence": 0.99,
                },
                "land_type": {
                    "final_value": "कृषि भूमि (Agricultural)",
                    "raw_value": "कृषि भूमि",
                    "final_confidence": 0.95,
                },
                "document_year": {
                    "final_value": "2019",
                    "raw_value": "31/05/2019",
                    "final_confidence": 0.96,
                },
            },
        }

    # ------------------------------------------------------------
    # File 3: Land Possession Certificate — दशरथ प्रसाद (औरंगाबाद, बिहार)
    # ------------------------------------------------------------
    if idx == 3:
        return {
            "document_type": "Land Possession Certificate (LPC)",
            "language": "Hindi/English",
            "review_required": False,
            "extracted_fields": {
                "owner_name": {
                    "final_value": "दशरथ प्रसाद रामनन्दन पाण्डेय",
                    "raw_value": "दशरथ प्रसाद रामनन्दन पाण्डेय",
                    "final_confidence": 0.94,
                },
                "father_name": {
                    "final_value": "स्व० शंभूनाथ पाण्डेय",
                    "raw_value": "स्व० शंभूनाथ पाण्डेय",
                    "final_confidence": 0.93,
                },
                "khasra_number": {
                    "final_value": "427, 429",
                    "raw_value": "427 / 429",
                    "final_confidence": 0.94,
                },
                "khata_number": {
                    "final_value": "24",
                    "raw_value": "24",
                    "final_confidence": 0.96,
                },
                "area_hectares": {
                    "final_value": "0.405",
                    "raw_value": "1-00 एकड़ (एक एकड़ मात्र)",
                    "final_confidence": 0.93,
                },
                "village": {
                    "final_value": "ददईया / चित्रगोपी पडरावां",
                    "raw_value": "वी.आई.डी. कालोनी चित्रगोपी",
                    "final_confidence": 0.95,
                },
                "tehsil": {
                    "final_value": "औरंगाबाद",
                    "raw_value": "औरंगाबाद",
                    "final_confidence": 0.97,
                },
                "district": {
                    "final_value": "औरंगाबाद",
                    "raw_value": "औरंगाबाद (बिहार)",
                    "final_confidence": 0.98,
                },
                "state": {
                    "final_value": "बिहार",
                    "raw_value": "बिहार",
                    "final_confidence": 0.99,
                },
                "land_type": {
                    "final_value": "Agricultural Cultivating Land",
                    "raw_value": "Agricultural Cultivating land",
                    "final_confidence": 0.95,
                },
                "document_year": {
                    "final_value": "2015",
                    "raw_value": "22/06/2015",
                    "final_confidence": 0.95,
                },
            },
        }

    # ------------------------------------------------------------
    # File 4: खसरा-खतौनी — रामेश्वर प्रसाद (मुरादाबाद, उत्तर प्रदेश) [⚠️ CONFLICT]
    # ------------------------------------------------------------
    return {
        "document_type": "खसरा-खतौनी (Khasra-Khatauni)",
        "language": "Hindi",
        "review_required": True,
        "extracted_fields": {
            "khasra_number": {
                "final_value": "112",
                "raw_value": "1l2",
                "final_confidence": 0.48,
            },
            "owner_name": {
                "final_value": "रामेश्वर प्रसाद",
                "raw_value": "रामेस्वर प्रसाद्",
                "final_confidence": 0.52,
            },
            "area_hectares": {
                "final_value": "0.78",
                "raw_value": "3-2-0 (3 बीघा 2 बिस्वा)",
                "final_confidence": 0.45,
            },
            "father_name": {
                "final_value": "स्व० हरि लाल",
                "raw_value": "स्व० हरि लाल",
                "final_confidence": 0.92,
            },
            "khata_number": {
                "final_value": "48",
                "raw_value": "48",
                "final_confidence": 0.91,
            },
            "village": {
                "final_value": "गैरपुर",
                "raw_value": "गैरपुर",
                "final_confidence": 0.96,
            },
            "pargana": {
                "final_value": "कटघर",
                "raw_value": "कटघर",
                "final_confidence": 0.94,
            },
            "patwari_halka": {
                "final_value": "नवागांव",
                "raw_value": "नवागांव",
                "final_confidence": 0.93,
            },
            "tehsil": {
                "final_value": "बिलारी",
                "raw_value": "बिलारी",
                "final_confidence": 0.96,
            },
            "district": {
                "final_value": "मुरादाबाद",
                "raw_value": "मुरादाबाद",
                "final_confidence": 0.97,
            },
            "state": {
                "final_value": "उत्तर प्रदेश",
                "raw_value": "उत्तर प्रदेश",
                "final_confidence": 0.98,
            },
            "land_type": {
                "final_value": "कृषि योग्य (Agricultural)",
                "raw_value": "कृषि योग्य",
                "final_confidence": 0.92,
            },
            "document_year": {
                "final_value": "1998",
                "raw_value": "वर्ष 1998-99",
                "final_confidence": 0.94,
            },
        },
    }


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

        logger.info(
            "[DEMO] Running hardcoded extraction for document %s (file: %s)",
            document_id,
            filename,
        )

        ocr_result = _demo_extract(filename)

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
                "[DEMO] Document %s → Tehsil Officer review (flagged: %s)",
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
                "[DEMO] Document %s auto-passed (confidence: %.2f)",
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