import hashlib
import json
import time
from pathlib import Path

from .config import settings
from .extraction import extract_fields
from .mistral_client import MistralOCRClient
from .normalizer import normalize_pages
from .validation import validate_input


class OCRPipeline:
    def __init__(self, client=None):
        self.client = client or MistralOCRClient(
            settings.api_key,
            settings.model,
            settings.timeout_seconds,
        )

    def process(self, input_path: str | Path) -> dict:
        # ---------------------------------------------------------
        # 1. Validate input PDF/image
        # ---------------------------------------------------------
        path = validate_input(input_path)

        start = time.perf_counter()

        # ---------------------------------------------------------
        # 2. Send document to Mistral OCR
        # ---------------------------------------------------------
        raw, upload = self.client.ocr_file(
            path,
            include_blocks=settings.include_blocks,
            confidence_granularity=settings.confidence_granularity,
            table_format=settings.table_format,
            extract_header=settings.extract_header,
            extract_footer=settings.extract_footer,
        )

        # ---------------------------------------------------------
        # 3. Normalize Mistral OCR response
        # ---------------------------------------------------------
        pages = normalize_pages(raw)

        # ---------------------------------------------------------
        # 4. Extract structured land-record fields
        #
        # extract_fields() is responsible for:
        # - field values
        # - evidence
        # - OCR confidence
        # - extraction confidence
        # - final confidence
        # - review_required
        # ---------------------------------------------------------
        extracted = extract_fields(pages)

        # ---------------------------------------------------------
        # 5. Detect document languages
        # ---------------------------------------------------------
        languages = []

        all_text = "\n".join(
            page.get("text", "")
            for page in pages
        )

        # Hindi / Devanagari
        if any(
            "\u0900" <= character <= "\u097F"
            for character in all_text
        ):
            languages.append("hi")

        # English / Latin alphabet
        if any(
            ("A" <= character <= "Z")
            or ("a" <= character <= "z")
            for character in all_text
        ):
            languages.append("en")

        # ---------------------------------------------------------
        # 6. Generate stable document ID
        # ---------------------------------------------------------
        digest = hashlib.sha256(
            path.read_bytes()
        ).hexdigest()

        # ---------------------------------------------------------
        # 7. Calculate processing time
        # ---------------------------------------------------------
        elapsed = int(
            (time.perf_counter() - start) * 1000
        )

        # ---------------------------------------------------------
        # 8. Determine whether human review is required
        # ---------------------------------------------------------
        review = any(
            field.get("review_required", False)
            for field in extracted.values()
        )

        # ---------------------------------------------------------
        # 9. Build final structured JSON
        # ---------------------------------------------------------
        return {
            "schema_version": "1.0",

            "document": {
                "document_id": f"sha256:{digest}",
                "filename": path.name,
                "pages": len(pages),
                "language": languages,
            },

            "processing": {
                "status": (
                    "review_required"
                    if review
                    else "completed"
                ),
                "engine": self.client.model,
                "processing_time_ms": elapsed,
            },

            "pages": pages,

            "extracted_fields": extracted,

            "warnings": [],

            "review_required": review,

            # Keep the complete raw Mistral response.
            "raw_ocr": raw,

            # Keep information about the uploaded Mistral file.
            "mistral_file": {
                "id": upload.get("id"),
                "filename": upload.get("filename"),
                "purpose": upload.get("purpose"),
            },
        }


def process_to_json(
    input_path: str | Path,
    output_path: str | Path,
) -> dict:
    """
    Process a PDF/image and save the complete structured
    OCR result as JSON.
    """

    result = OCRPipeline().process(input_path)

    out = Path(output_path)

    # Create output directory if it does not exist.
    out.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    # Save Unicode correctly, including Hindi.
    out.write_text(
        json.dumps(
            result,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    return result