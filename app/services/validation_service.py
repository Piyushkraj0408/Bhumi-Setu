from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from pymongo.database import Database


# ============================================================
# CONFIGURATION
# ============================================================

REASONABLE_MIN_YEAR = 1800
REASONABLE_MAX_YEAR = datetime.now().year + 1

AREA_WARNING_PERCENT = 5.0
AREA_CONFLICT_PERCENT = 10.0


# ============================================================
# FIELD ALIASES
# ============================================================

FIELD_ALIASES = {
    "khasra_number": [
        "khasra_number",
        "khasra",
        "survey_number",
        "survey_no",
    ],
    "khata_number": [
        "khata_number",
        "khata",
        "khata_no",
    ],
    "owner_name": [
        "owner_name",
        "owner",
        "land_owner",
        "name",
    ],
    "father_or_husband_name": [
        "father_or_husband_name",
        "father_name",
        "husband_name",
        "guardian_name",
    ],
    "village": [
        "village",
        "village_name",
    ],
    "tehsil": [
        "tehsil",
        "tehsil_name",
    ],
    "district": [
        "district",
        "district_name",
    ],
    "area": [
        "area",
        "total_area",
        "total_area_sq_meters",
        "area_sq_meters",
        "land_area",
    ],
    "record_year": [
        "record_year",
        "year",
        "document_year",
    ],
}


# ============================================================
# HELPERS
# ============================================================

def normalize_text(value: Any) -> str:
    if value is None:
        return ""

    return " ".join(
        str(value)
        .strip()
        .lower()
        .split()
    )


def get_field_value(
    fields: dict[str, Any],
    canonical_name: str,
) -> Any:

    aliases = FIELD_ALIASES.get(
        canonical_name,
        [canonical_name],
    )

    for alias in aliases:

        value = fields.get(alias)

        if isinstance(value, dict):
            value = value.get("value")

        if value not in (None, ""):
            return value

    return None


def get_ocr_value(
    extracted_fields: dict[str, Any],
    canonical_name: str,
) -> Any:

    return get_field_value(
        extracted_fields,
        canonical_name,
    )


def parse_float(value: Any) -> float | None:

    if value is None:
        return None

    if isinstance(value, (int, float)):
        return float(value)

    text = str(value).strip()

    text = text.replace(",", "")

    # Keep numbers and decimal point
    match = re.search(
        r"-?\d+(?:\.\d+)?",
        text,
    )

    if not match:
        return None

    try:
        return float(match.group())
    except ValueError:
        return None


def parse_year(value: Any) -> int | None:

    if value is None:
        return None

    match = re.search(
        r"\b(1[89]\d{2}|20\d{2}|21\d{2})\b",
        str(value),
    )

    if not match:
        return None

    return int(match.group())


def normalize_khasra(value: Any) -> str:

    if value is None:
        return ""

    return (
        str(value)
        .strip()
        .lower()
        .replace(" ", "")
    )


def values_match(
    value_a: Any,
    value_b: Any,
) -> bool:

    if value_a is None or value_b is None:
        return False

    return normalize_text(
        value_a
    ) == normalize_text(
        value_b
    )


# ============================================================
# VALIDATION ENGINE
# ============================================================

def validate_master_record(
    db: Database,
    master_record: dict[str, Any],
    ocr_fields: dict[str, Any] | None = None,
) -> dict[str, Any]:

    ocr_fields = ocr_fields or {}

    issues: list[dict[str, Any]] = []

    # ========================================================
    # 1. MANDATORY FIELDS
    # ========================================================

    mandatory_fields = [
        "khasra_number",
        "owner_name",
        "village",
        "tehsil",
        "district",
        "area",
    ]

    for field_name in mandatory_fields:

        value = master_record.get(
            field_name
        )

        if value in (None, ""):

            issues.append({
                "field": field_name,
                "type": "missing_required_field",
                "severity": "conflict",
                "message": (
                    f"Mandatory field '{field_name}' "
                    "is missing."
                ),
            })

    # ========================================================
    # 2. KHASRA FORMAT
    # ========================================================

    khasra = master_record.get(
        "khasra_number"
    )

    if khasra:

        khasra_text = str(
            khasra
        ).strip()

        # Allows:
        # 104
        # 104/2B
        # 104-A
        # 104/2-B
        # 104/2B/1

        if not re.fullmatch(
            r"[A-Za-z0-9]+(?:[\/\-][A-Za-z0-9]+)*",
            khasra_text,
        ):

            issues.append({
                "field": "khasra_number",
                "type": "invalid_format",
                "severity": "conflict",
                "message": (
                    "Khasra number has an invalid format."
                ),
                "value": khasra,
            })

    # ========================================================
    # 3. AREA VALIDATION
    # ========================================================

    area = parse_float(
        master_record.get(
            "total_area_sq_meters"
        )
    )

    if area is None:

        area = parse_float(
            master_record.get(
                "area_sq_meters"
            )
        )

    if area is None:

        issues.append({
            "field": "total_area_sq_meters",
            "type": "invalid_area",
            "severity": "conflict",
            "message": (
                "Area must be numeric."
            ),
        })

    elif area <= 0:

        issues.append({
            "field": "total_area_sq_meters",
            "type": "invalid_area",
            "severity": "conflict",
            "message": (
                "Area must be greater than zero."
            ),
            "value": area,
        })

    # ========================================================
    # 4. RECORD YEAR
    # ========================================================

    record_year = parse_year(
        master_record.get(
            "record_year"
        )
    )

    if master_record.get(
        "record_year"
    ) not in (None, ""):

        if record_year is None:

            issues.append({
                "field": "record_year",
                "type": "invalid_year",
                "severity": "warning",
                "message": (
                    "Record year could not be interpreted."
                ),
                "value": master_record.get(
                    "record_year"
                ),
            })

        elif not (
            REASONABLE_MIN_YEAR
            <= record_year
            <= REASONABLE_MAX_YEAR
        ):

            issues.append({
                "field": "record_year",
                "type": "unreasonable_year",
                "severity": "warning",
                "message": (
                    "Record year is outside the "
                    "reasonable configured range."
                ),
                "value": record_year,
            })

    # ========================================================
    # 5. OCR CROSS-FIELD CONTRADICTIONS
    # ========================================================

    comparable_fields = [
        "khasra_number",
        "owner_name",
        "village",
        "tehsil",
        "district",
    ]

    for field_name in comparable_fields:

        master_value = master_record.get(
            field_name
        )

        ocr_value = get_ocr_value(
            ocr_fields,
            field_name,
        )

        if (
            master_value not in (None, "")
            and ocr_value not in (None, "")
        ):

            if field_name == "khasra_number":

                master_normalized = normalize_khasra(
                    master_value
                )

                ocr_normalized = normalize_khasra(
                    ocr_value
                )

                match = (
                    master_normalized
                    == ocr_normalized
                )

            else:

                match = values_match(
                    master_value,
                    ocr_value,
                )

            if not match:

                issues.append({
                    "field": field_name,
                    "type": "ocr_master_conflict",
                    "severity": "conflict",
                    "message": (
                        f"OCR value differs from "
                        f"Tehsil-approved value."
                    ),
                    "ocr_value": ocr_value,
                    "master_value": master_value,
                })

    # ========================================================
    # 6. AREA CROSS-CHECK
    # ========================================================

    ocr_area = parse_float(
        get_ocr_value(
            ocr_fields,
            "area",
        )
    )

    if (
        area is not None
        and ocr_area is not None
        and ocr_area > 0
    ):

        difference_percent = (
            abs(area - ocr_area)
            / ocr_area
        ) * 100

        if (
            difference_percent
            > AREA_CONFLICT_PERCENT
        ):

            issues.append({
                "field": "total_area_sq_meters",
                "type": "area_conflict",
                "severity": "conflict",
                "message": (
                    "Master-record area differs "
                    "significantly from OCR area."
                ),
                "ocr_value": ocr_area,
                "master_value": area,
                "difference_percent": round(
                    difference_percent,
                    2,
                ),
            })

        elif (
            difference_percent
            > AREA_WARNING_PERCENT
        ):

            issues.append({
                "field": "total_area_sq_meters",
                "type": "area_warning",
                "severity": "warning",
                "message": (
                    "Master-record area differs "
                    "slightly from OCR area."
                ),
                "ocr_value": ocr_area,
                "master_value": area,
                "difference_percent": round(
                    difference_percent,
                    2,
                ),
            })

    # ========================================================
    # 7. DUPLICATE DOCUMENT
    # ========================================================

    document_id = master_record.get(
        "document_id"
    )

    if document_id:

        duplicate_document = (
            db.master_records.find_one(
                {
                    "document_id": document_id,
                    "status": {
                        "$ne": "revoked"
                    },
                    "record_id": {
                        "$ne": master_record.get(
                            "record_id"
                        )
                    },
                }
            )
        )

        if duplicate_document:

            issues.append({
                "field": "document_id",
                "type": "duplicate_document",
                "severity": "conflict",
                "message": (
                    "This document already has "
                    "an active master record."
                ),
                "existing_record_id": (
                    duplicate_document.get(
                        "record_id"
                    )
                ),
            })

    # ========================================================
    # 8. DUPLICATE KHASRA + VILLAGE
    # ========================================================

    if khasra and master_record.get(
        "village"
    ):

        existing = (
            db.master_records.find_one(
                {
                    "status": {
                        "$ne": "revoked"
                    },
                    "khasra_number": khasra,
                    "village": master_record.get(
                        "village"
                    ),
                    "record_id": {
                        "$ne": master_record.get(
                            "record_id"
                        )
                    },
                }
            )
        )

        if existing:

            issues.append({
                "field": "khasra_number",
                "type": "duplicate_khasra_village",
                "severity": "warning",
                "message": (
                    "Another active master record "
                    "has the same Khasra number "
                    "and village."
                ),
                "existing_record_id": (
                    existing.get(
                        "record_id"
                    )
                ),
            })

    # ========================================================
    # 9. DUPLICATE KHASRA + OWNER
    # ========================================================

    if khasra and master_record.get(
        "owner_name"
    ):

        existing = (
            db.master_records.find_one(
                {
                    "status": {
                        "$ne": "revoked"
                    },
                    "khasra_number": khasra,
                    "owner_name": master_record.get(
                        "owner_name"
                    ),
                    "record_id": {
                        "$ne": master_record.get(
                            "record_id"
                        )
                    },
                }
            )
        )

        if existing:

            issues.append({
                "field": "khasra_number",
                "type": "duplicate_khasra_owner",
                "severity": "warning",
                "message": (
                    "Another active master record "
                    "has the same Khasra number "
                    "and owner."
                ),
                "existing_record_id": (
                    existing.get(
                        "record_id"
                    )
                ),
            })

    # ========================================================
    # 10. DETERMINE FINAL STATUS
    # ========================================================

    has_conflict = any(
        issue["severity"] == "conflict"
        for issue in issues
    )

    has_warning = any(
        issue["severity"] == "warning"
        for issue in issues
    )

    if has_conflict:

        validation_status = "conflict"
        is_valid = False

    elif has_warning:

        validation_status = "warning"
        is_valid = True

    else:

        validation_status = "valid"
        is_valid = True

    # ========================================================
    # RESULT
    # ========================================================

    return {
        "status": validation_status,
        "is_valid": is_valid,
        "issue_count": len(issues),
        "conflict_count": sum(
            1
            for issue in issues
            if issue["severity"] == "conflict"
        ),
        "warning_count": sum(
            1
            for issue in issues
            if issue["severity"] == "warning"
        ),
        "issues": issues,
        "validated_at": datetime.now(
            timezone.utc
        ),
    }


# ============================================================
# SAVE VALIDATION RESULT
# ============================================================

def save_validation_result(
    db: Database,
    master_record: dict[str, Any],
    validation_result: dict[str, Any],
    validated_by: str | None = None,
) -> dict[str, Any]:

    record_id = master_record.get(
        "record_id"
    )

    result_document = {
        "record_id": record_id,
        "document_id": master_record.get(
            "document_id"
        ),

        "status": validation_result[
            "status"
        ],

        "is_valid": validation_result[
            "is_valid"
        ],

        "issue_count": validation_result[
            "issue_count"
        ],

        "conflict_count": validation_result[
            "conflict_count"
        ],

        "warning_count": validation_result[
            "warning_count"
        ],

        "issues": validation_result[
            "issues"
        ],

        "validated_by": validated_by,

        "validated_at": validation_result[
            "validated_at"
        ],
    }

    db.validation_results.insert_one(
        result_document
    )

    return result_document