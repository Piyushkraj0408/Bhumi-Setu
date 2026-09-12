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


    # 1. Missing Mandatory Fields Check
    # =========================================================================
    missing_fields = []
    for mf in MANDATORY_FIELDS:
        val = extract_field_value(doc_fields, mf["key"], mf["aliases"])
        if val is None or str(val).strip() == "":
            missing_fields.append(mf["label"])
            issues.append({
                "id": f"ISSUE-MANDATORY-{mf['key']}",
                "documentId": document_id,
                "type": "Missing Field",
                "field": mf["label"],
                "severity": "failed",
                "reason": f"Mandatory field '{mf['label']}' is missing from extracted document record.",
                "extractedValue": "Missing",
                "referenceValue": "Required",
                "recommendedAction": f"Enter the required '{mf['label']}' value manually.",
                "officerAction": None
            })
            record_audit("MANDATORY_FIELD_CHECK", mf["label"], "CONFLICT", f"Mandatory field '{mf['label']}' is missing.", "Missing", "Required")
        else:
            record_audit("MANDATORY_FIELD_CHECK", mf["label"], "PASSED", f"Mandatory field '{mf['label']}' is present.", val, "Present")

    # =========================================================================
    # 2. Format Validation
    # =========================================================================
    # 2.1 Khasra Number Format
    khasra_val = extract_field_value(doc_fields, "khasra_number", ["khasra_no", "khasra", "survey_number"])
    if khasra_val:
        khasra_str = str(khasra_val).strip()
        if not KHASRA_PATTERN.match(khasra_str):
            issues.append({
                "id": "ISSUE-FORMAT-KHASRA",
                "documentId": document_id,
                "type": "Invalid Survey Number",
                "field": "Khasra Number",
                "severity": "failed",
                "reason": f"Khasra number '{khasra_str}' contains invalid format. Expected format like '124', '124/1', or '45-A'.",
                "extractedValue": khasra_str,
                "referenceValue": "Valid Khasra Pattern (e.g., 124/1)",
                "recommendedAction": "Correct the Khasra number to standard cadastral format.",
                "officerAction": None
            })
            record_audit("FORMAT_VALIDATION", "Khasra Number", "CONFLICT", f"Invalid Khasra number pattern: '{khasra_str}'.", khasra_str, "Standard Pattern")
        else:
            record_audit("FORMAT_VALIDATION", "Khasra Number", "PASSED", "Khasra number format valid.", khasra_str, "Valid")

    # 2.2 Area Numeric & Positive Check
    area_val = extract_field_value(doc_fields, "area", ["area_sq_meters", "total_area", "rakba"])
    parsed_area = None
    if area_val is not None:
        try:
            # Clean string like "4.50 Acres", "1200 sq.m", "3.2"
            clean_num = re.sub(r"[^\d.]", "", str(area_val))
            parsed_area = float(clean_num) if clean_num else None
            if parsed_area is None or parsed_area <= 0:
                issues.append({
                    "id": "ISSUE-FORMAT-AREA",
                    "documentId": document_id,
                    "type": "Invalid Area",
                    "field": "Area",
                    "severity": "failed",
                    "reason": f"Area must be a positive numeric value greater than zero (found '{area_val}').",
                    "extractedValue": str(area_val),
                    "referenceValue": "> 0.00",
                    "recommendedAction": "Enter a valid positive area number.",
                    "officerAction": None
                })
                record_audit("FORMAT_VALIDATION", "Area", "CONFLICT", f"Area value '{area_val}' is non-positive or invalid.", area_val, "> 0.0")
            else:
                record_audit("FORMAT_VALIDATION", "Area", "PASSED", f"Area value '{parsed_area}' is positive and valid.", parsed_area, "> 0.0")
        except (ValueError, TypeError):
            issues.append({
                "id": "ISSUE-FORMAT-AREA-NAN",
                "documentId": document_id,
                "type": "Invalid Area",
                "field": "Area",
                "severity": "failed",
                "reason": f"Area '{area_val}' is not a valid number.",
                "extractedValue": str(area_val),
                "referenceValue": "Numeric",
                "recommendedAction": "Enter a numeric area value.",
                "officerAction": None
            })
            record_audit("FORMAT_VALIDATION", "Area", "CONFLICT", f"Area '{area_val}' cannot be parsed as numeric.", area_val, "Numeric")

    # 2.3 Record Year Reasonability
    year_val = extract_field_value(doc_fields, "record_year", ["year", "fasli_year"])
    current_year = datetime.now().year
    if year_val:
        try:
            clean_year = int(re.sub(r"[^\d]", "", str(year_val)))
            if clean_year < 1800 or clean_year > current_year + 1:
                issues.append({
                    "id": "ISSUE-FORMAT-YEAR",
                    "documentId": document_id,
                    "type": "Master-data Conflict",
                    "field": "Record Year",
                    "severity": "warning",
                    "reason": f"Record year '{clean_year}' is outside reasonable range (1800 - {current_year + 1}).",
                    "extractedValue": str(clean_year),
                    "referenceValue": f"1800 - {current_year + 1}",
                    "recommendedAction": "Verify the record year on the physical document.",
                    "officerAction": None
                })
                record_audit("FORMAT_VALIDATION", "Record Year", "WARNING", f"Record year '{clean_year}' outside standard range.", clean_year, f"1800-{current_year+1}")
            else:
                record_audit("FORMAT_VALIDATION", "Record Year", "PASSED", f"Record year '{clean_year}' is reasonable.", clean_year, "Valid Range")
        except (ValueError, TypeError):
            record_audit("FORMAT_VALIDATION", "Record Year", "WARNING", f"Record year '{year_val}' could not be parsed.", year_val, "YYYY")

    # =========================================================================
    # 3. Cross-Field Contradictions (vs Master Records / GIS)
    # =========================================================================
    owner_val = extract_field_value(doc_fields, "owner_name", ["owner", "khatedar_name"])
    village_val = extract_field_value(doc_fields, "village", ["village_name", "gram"])
    district_val = extract_field_value(doc_fields, "district", ["district_name", "jila"])

    # Search for matching Master Record in DB (or cadastral parcels)
    master_record = None
    if khasra_val:
        master_record = db.master_records.find_one({"khasra_number": str(khasra_val).strip()}) if "master_records" in db.list_collection_names() else None
    
    # 3.1 Village Mismatch Check
    scope_village = doc_fields.get("scope_id") if doc_fields.get("scope_type") == "village" else None
    if master_record and master_record.get("village") and village_val:
        ref_v = str(master_record.get("village"))
        if ref_v.lower() != str(village_val).strip().lower():
            issues.append({
                "id": "ISSUE-CROSS-VILLAGE",
                "documentId": document_id,
                "type": "Village Mismatch",
                "field": "Village",
                "severity": "failed",
                "reason": f"OCR extracted village '{village_val}' contradicts master cadastral registry '{ref_v}'.",
                "extractedValue": str(village_val),
                "referenceValue": ref_v,
                "recommendedAction": "Confirm village boundary with Tehsil revenue office.",
                "officerAction": None
            })
            record_audit("CROSS_FIELD_CONTRADICTION", "Village", "CONFLICT", f"Village mismatch: '{village_val}' vs Master '{ref_v}'.", village_val, ref_v)
        else:
            record_audit("CROSS_FIELD_CONTRADICTION", "Village", "PASSED", "Village matches master cadastral registry.", village_val, ref_v)
    else:
        record_audit("CROSS_FIELD_CONTRADICTION", "Village", "PASSED", "Village verified against scope.", village_val, "Verified")

    # 3.2 Owner Name Differences (Fuzzy Match vs Master Record)
    if master_record and master_record.get("owner_name") and owner_val:
        ref_owner = str(master_record.get("owner_name"))
        sim = calculate_string_similarity(str(owner_val), ref_owner)
        if sim < 0.70:
            issues.append({
                "id": "ISSUE-CROSS-OWNER",
                "documentId": document_id,
                "type": "Owner Conflict",
                "field": "Owner Name",
                "severity": "failed",
                "reason": f"Extracted owner name '{owner_val}' differs significantly from recorded title owner '{ref_owner}' ({int(sim*100)}% match).",
                "extractedValue": str(owner_val),
                "referenceValue": ref_owner,
                "recommendedAction": "Check mutation register or legal succession deed.",
                "officerAction": None
            })
            record_audit("CROSS_FIELD_CONTRADICTION", "Owner Name", "CONFLICT", f"Owner name discrepancy: '{owner_val}' vs Master '{ref_owner}'.", owner_val, ref_owner)
        elif sim < 0.90:
            issues.append({
                "id": "ISSUE-CROSS-OWNER-WARN",
                "documentId": document_id,
                "type": "Owner Conflict",
                "field": "Owner Name",
                "severity": "warning",
                "reason": f"Minor spelling difference in owner name: '{owner_val}' vs '{ref_owner}' ({int(sim*100)}% match).",
                "extractedValue": str(owner_val),
                "referenceValue": ref_owner,
                "recommendedAction": "Verify phonetic spelling variation.",
                "officerAction": None
            })
            record_audit("CROSS_FIELD_CONTRADICTION", "Owner Name", "WARNING", f"Minor owner spelling variance: '{owner_val}' vs '{ref_owner}'.", owner_val, ref_owner)
        else:
            record_audit("CROSS_FIELD_CONTRADICTION", "Owner Name", "PASSED", f"Owner name matches master record ({int(sim*100)}%).", owner_val, ref_owner)

    # 3.3 Area Variance (>5% discrepancy vs Master/GIS record)
    if master_record and master_record.get("total_area_sq_meters") and parsed_area is not None:
        ref_area = float(master_record.get("total_area_sq_meters"))
        variance_pct = abs(parsed_area - ref_area) / ref_area * 100
        if variance_pct > 5.0:
            issues.append({
                "id": "ISSUE-CROSS-AREA",
                "documentId": document_id,
                "type": "Invalid Area",
                "field": "Area",
                "severity": "failed",
                "reason": f"Extracted area ({parsed_area:.2f}) differs by {variance_pct:.1f}% from master surveyed area ({ref_area:.2f}) — exceeds 5% threshold.",
                "extractedValue": f"{parsed_area:.2f} sq.m",
                "referenceValue": f"{ref_area:.2f} sq.m",
                "recommendedAction": "Order cadastral re-survey or verify sub-division mutation.",
                "officerAction": None
            })
            record_audit("CROSS_FIELD_CONTRADICTION", "Area", "CONFLICT", f"Area variance {variance_pct:.1f}% exceeds 5% limit.", f"{parsed_area}", f"{ref_area}")
        elif variance_pct > 1.0:
            issues.append({
                "id": "ISSUE-CROSS-AREA-WARN",
                "documentId": document_id,
                "type": "Invalid Area",
                "field": "Area",
                "severity": "warning",
                "reason": f"Minor area variance of {variance_pct:.1f}% between document and registry.",
                "extractedValue": f"{parsed_area:.2f} sq.m",
                "referenceValue": f"{ref_area:.2f} sq.m",
                "recommendedAction": "Accept with tolerance note.",
                "officerAction": None
            })
            record_audit("CROSS_FIELD_CONTRADICTION", "Area", "WARNING", f"Minor area variance {variance_pct:.1f}%.", f"{parsed_area}", f"{ref_area}")
        else:
            record_audit("CROSS_FIELD_CONTRADICTION", "Area", "PASSED", f"Area matches master registry within tolerance ({variance_pct:.1f}%).", f"{parsed_area}", f"{ref_area}")

    # =========================================================================
    # 4. Duplicate Detection
    # =========================================================================
    # 4.1 Same Khasra + Same Village
    if khasra_val and village_val:
        dup_query = {
            "id": {"$ne": document_id},
            "status": {"$ne": "deleted"},
            "$or": [
                {"ocr.result.extracted_fields.khasra_number.value": str(khasra_val).strip()},
                {"metadata.khasra_number": str(khasra_val).strip()},
            ]
        }
        dup_doc = db.documents.find_one(dup_query)
        if dup_doc:
            dup_id = dup_doc.get("id") or dup_doc.get("_id")
            issues.append({
                "id": "ISSUE-DUP-KHASRA-VILLAGE",
                "documentId": document_id,
                "type": "Duplicate Record",
                "field": "Khasra + Village",
                "severity": "failed",
                "reason": f"Duplicate Khasra '{khasra_val}' already processed in document '{dup_id}' for village '{village_val}'.",
                "extractedValue": f"{khasra_val} ({village_val})",
                "referenceValue": f"Existing Doc: {dup_id}",
                "recommendedAction": "Inspect previous record or reject duplicate filing.",
                "officerAction": None
            })
            record_audit("DUPLICATE_DETECTION", "Khasra + Village", "CONFLICT", f"Duplicate Khasra in village '{village_val}' found in doc '{dup_id}'.", f"{khasra_val}", f"Doc {dup_id}")
        else:
            record_audit("DUPLICATE_DETECTION", "Khasra + Village", "PASSED", "No duplicate Khasra in village found.", f"{khasra_val}", "Unique")

    # 4.2 Duplicate Document by File Hash
    file_hash = doc_fields.get("file_hash")
    if file_hash:
        dup_hash_doc = db.documents.find_one({"file_hash": file_hash, "id": {"$ne": document_id}, "status": {"$ne": "deleted"}})
        if dup_hash_doc:
            dup_hash_id = dup_hash_doc.get("id") or dup_hash_doc.get("_id")
            issues.append({
                "id": "ISSUE-DUP-FILE-HASH",
                "documentId": document_id,
                "type": "Duplicate Record",
                "field": "Document File",
                "severity": "failed",
                "reason": f"Exact identical document binary already processed under ID '{dup_hash_id}'.",
                "extractedValue": f"Hash: {file_hash[:12]}...",
                "referenceValue": f"Processed Doc: {dup_hash_id}",
                "recommendedAction": "Reject duplicate document upload.",
                "officerAction": None
            })
            record_audit("DUPLICATE_DETECTION", "Document Binary Hash", "CONFLICT", f"Duplicate file hash matches document '{dup_hash_id}'.", file_hash[:12], f"Doc {dup_hash_id}")
        else:
            record_audit("DUPLICATE_DETECTION", "Document Binary Hash", "PASSED", "Document file hash is unique.", file_hash[:12], "Unique")

    # =========================================================================
    # 5. Overall Validation Status
    # =========================================================================
    has_conflict = any(i["severity"] == "failed" for i in issues)
    has_warning = any(i["severity"] == "warning" for i in issues)

    if has_conflict:
        validation_status = "conflict"  # mapped to "failed" in UI
    elif has_warning:
        validation_status = "warning"
    else:
        validation_status = "valid"  # mapped to "passed" in UI

    result = {
        "document_id": document_id,
        "validation_status": validation_status,
        "summary": {
            "total_checks": len(audit_trail),
            "passed_checks": sum(1 for a in audit_trail if a["status"] == "PASSED"),
            "warnings_count": sum(1 for a in audit_trail if a["status"] == "WARNING"),
            "conflicts_count": sum(1 for a in audit_trail if a["status"] == "CONFLICT"),
            "missing_fields_count": len(missing_fields),
        },
        "missing_fields": missing_fields,
        "issues": issues,
        "audit_trail": audit_trail,
        "validated_at": now.isoformat()
    }

    # Persist validation results and audit trail in MongoDB
    db.documents.update_one(
        {"$or": [{"id": document_id}, {"_id": document_id}]},
        {
            "$set": {
                "validation": result,
                "metadata.validation_status": validation_status,
                "metadata.validation_issues_count": len(issues),
                "metadata.validated_at": now
            }
        }
    )

    # Also log to system audit_logs collection
    db.audit_logs.insert_one({
        "event_id": f"EVT-VAL-{document_id[:8].upper()}-{int(now.timestamp())}",
        "document_id": document_id,
        "action": "VALIDATION_RUN",
        "status": validation_status,
        "issues_found": len(issues),
        "performed_by": "Automated Validation Engine",
        "timestamp": now,
        "summary": result["summary"]
    })

    return result


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
