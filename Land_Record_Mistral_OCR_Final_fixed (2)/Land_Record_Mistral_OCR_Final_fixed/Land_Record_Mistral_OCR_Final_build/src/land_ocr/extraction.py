"""Land-record field extraction for normalized/raw Mistral OCR output.

The extractor accepts:
1. normalized pages containing blocks/tables; and
2. lightweight pages containing index + markdown/text.

It maps OCR evidence into canonical land-record fields without inventing
values. Evidence, bounding boxes and OCR confidence are retained whenever
Mistral provides them.
"""

from __future__ import annotations

import re
from typing import Any, Iterable, Optional


_FIELD_ALIASES = {
    "owner_name": ["नाम", "खातेदार", "स्वामी", "owner", "owner name"],
    "relative_name": [
        "पिता/पति",
        "पिता",
        "पिता का नाम",
        "पति",
        "पुत्र",
        "पुत्री",
        "पत्नी",
        "father",
        "father name",
        "husband",
        "husband name",
    ],
    "village": ["ग्राम", "गांव", "गाँव", "village"],
    "tehsil": ["तहसील/प्रखंड", "तहसील", "प्रखंड", "tehsil"],
    "district": ["जिला", "district"],
    "state": ["राज्य", "state"],
    "tauzi_number": [
        "तौजी संख्या",
        "तौजी सं",
        "तौजी नं",
        "तौजी",
        "tauzi number",
        "tauzi no",
        "tauzi",
    ],
    "khata_number": [
        "खाता संख्या",
        "खाता सं",
        "खाता नं",
        "खाता",
        "khata no",
        "khata",
    ],
    "khasra_number": [
        "खेसरा संख्या",
        "खेसरा सं",
        "खेसरा",
        "खसरा संख्या",
        "खसरा",
        "गाटा संख्या",
        "गाटा",
        "khasra",
        "survey",
    ],
    "plot_number": [
        "प्लॉट संख्या",
        "प्लॉट",
        "प्लाट",
        "plot no",
        "plot",
    ],
    "area": ["रकवा", "रकबा", "क्षेत्रफल", "area"],
    "mutation_number": [
        "दाखिल खारिज",
        "नामांतरण",
        "म्यूटेशन",
        "mutation",
    ],
    "registration_number": [
        "पंजीकरण",
        "रजिस्ट्रेशन",
        "registration",
    ],
    "document_year": [
        "दस्तावेज़ वर्ष",
        "दस्तावेज वर्ष",
        "प्रमाण-पत्र वर्ष",
        "certificate year",
        "document year",
    ],
    "document_type": [
        "document type",
        "दस्तावेज प्रकार",
        "दस्तावेज़ प्रकार",
    ],
    "land_type": [
        "भूमि प्रकार",
        "भूमि का प्रकार",
        "land type",
        "type of land",
        "land category",
    ],
    "record_year": [
        "रिकॉर्ड वर्ष",
        "अभिलेख वर्ष",
        "वर्ष",
        "साल",
        "record year",
    ],
    "land_classification": [
        "भूमि वर्गीकरण",
        "भूमि की किस्म",
        "वर्गीकरण",
        "classification",
    ],
    "ownership_type": [
        "स्वामित्व प्रकार",
        "ownership type",
    ],
    "police_station": [
        "थाना",
        "थाना का नाम",
        "police station",
    ],
    "thana_number": [
        "थाना संख्या",
        "थाना सं",
        "थाना नं",
    ],
}


_NUMBER_FIELDS = {
    "tauzi_number",
    "khata_number",
    "khasra_number",
    "plot_number",
    "mutation_number",
    "registration_number",
    "record_year",
    "thana_number",
}


_REVIEW_THRESHOLD = 0.85

_DIGITS = str.maketrans(
    "०१२३४५६७८९",
    "0123456789",
)


# ---------------------------------------------------------------------------
# Basic helpers
# ---------------------------------------------------------------------------


def _clean(value: Any) -> str:
    if value is None:
        return ""

    value = str(value)

    value = (
        value
        .replace("\u200b", "")
        .replace("\ufeff", "")
        .replace("\xa0", " ")
    )

    return re.sub(r"\s+", " ", value).strip()


def _norm(value: Any) -> str:
    return _clean(value).lower().replace("ः", ":")


def _page_number(page: dict[str, Any]) -> int:
    if "page_number" in page:
        return int(page["page_number"])

    return int(page.get("index", 0)) + 1


def _page_text(page: dict[str, Any]) -> str:
    return _clean(
        page.get("markdown")
        or page.get("text")
        or ""
    )


def _synthetic_block(text: str) -> dict[str, Any]:
    return {
        "type": "text",
        "text": text,
        "bbox": None,
        "confidence": None,
        "min_confidence": None,
        "block_type_confidence": None,
    }


# ---------------------------------------------------------------------------
# Block iteration
# ---------------------------------------------------------------------------


def _iter_text_blocks(
    pages: list[dict[str, Any]],
) -> Iterable[tuple[int, dict[str, Any]]]:
    """Yield text blocks from Mistral or lightweight test pages."""

    for page in pages:
        page_no = _page_number(page)

        blocks = page.get("blocks") or []
        emitted = False

        for block in blocks:
            if not isinstance(block, dict):
                continue

            # Table blocks are processed separately.
            if block.get("type") in {"image", "table"}:
                continue

            text = _clean(
                block.get(
                    "text",
                    block.get("content", ""),
                )
            )

            if text:
                emitted = True
                yield page_no, block

        # Compatibility with simple markdown/text-only tests.
        if not emitted:
            raw = page.get("markdown") or page.get("text") or ""

            for line in str(raw).splitlines():
                line = _clean(line)

                if (
                    line
                    and "|" not in line
                    and not line.startswith("![")
                    and not line.startswith("[tbl-")
                ):
                    yield page_no, _synthetic_block(line)


def _iter_tables(
    pages: list[dict[str, Any]],
) -> Iterable[
    tuple[int, dict[str, Any], dict[str, Any]]
]:
    """Yield both explicit Mistral tables and table blocks.

    Mistral/canonical JSON can represent tables in either form:

    1. page["tables"]
    2. page["blocks"] with type="table"

    Both representations are supported.
    """

    for page in pages:
        page_no = _page_number(page)

        table_blocks = [
            block
            for block in page.get("blocks") or []
            if (
                isinstance(block, dict)
                and block.get("type") == "table"
            )
        ]

        # ---------------------------------------------------------------
        # Case 1: explicit page["tables"]
        # ---------------------------------------------------------------

        tables = page.get("tables") or []

        yielded_block_ids: set[int] = set()

        for table in tables:
            if not isinstance(table, dict):
                continue

            content = table.get("content") or ""

            if not _clean(content):
                continue

            block = None
            table_id = table.get("id")

            if table_id:
                block = next(
                    (
                        candidate
                        for candidate in table_blocks
                        if candidate.get("table_id") == table_id
                    ),
                    None,
                )

            if block is None and len(table_blocks) == 1:
                block = table_blocks[0]

            if block is None:
                block = _synthetic_block(content)
                block["type"] = "table"

            else:
                yielded_block_ids.add(id(block))

            yield page_no, table, block

        # ---------------------------------------------------------------
        # Case 2: canonical JSON contains only table blocks
        # ---------------------------------------------------------------

        for block in table_blocks:
            if id(block) in yielded_block_ids:
                continue

            content = _clean(
                block.get(
                    "text",
                    block.get("content", ""),
                )
            )

            if not content:
                continue

            table = {
                "content": content,
                "id": block.get("table_id"),
            }

            yield page_no, table, block


# ---------------------------------------------------------------------------
# Evidence and confidence
# ---------------------------------------------------------------------------


def _evidence(
    page: int,
    block: dict[str, Any],
    source: str,
    text: Optional[str] = None,
) -> dict[str, Any]:
    scores = block.get("confidence_scores") or {}

    return {
        "page": page,
        "bbox": block.get("bbox"),
        "source": source,
        "text": _clean(
            text
            if text is not None
            else block.get(
                "text",
                block.get("content", ""),
            )
        ),
        "ocr_confidence": block.get(
            "confidence",
            scores.get(
                "average_content_confidence_score"
            ),
        ),
        "min_ocr_confidence": block.get(
            "min_confidence",
            scores.get(
                "minimum_content_confidence_score"
            ),
        ),
        "block_type_confidence": block.get(
            "block_type_confidence",
            scores.get(
                "block_type_confidence_score"
            ),
        ),
    }


def _make_field(
    value: Any,
    page: int,
    block: Optional[dict[str, Any]],
    source: str,
    extraction_confidence: float,
    evidence_text: Optional[str] = None,
) -> dict[str, Any]:

    raw_conf = (
        None
        if block is None
        else block.get(
            "confidence",
            (
                block.get("confidence_scores") or {}
            ).get(
                "average_content_confidence_score"
            ),
        )
    )

    ocr_conf = (
        float(raw_conf)
        if raw_conf is not None
        else None
    )

    final = (
        extraction_confidence
        if ocr_conf is None
        else round(
            0.65 * ocr_conf
            + 0.35 * extraction_confidence,
            4,
        )
    )

    return {
        "value": value,
        "page": page,
        "ocr_confidence": (
            round(ocr_conf, 4)
            if ocr_conf is not None
            else None
        ),
        "extraction_confidence": round(
            extraction_confidence,
            4,
        ),
        "final_confidence": final,
        "review_required": (
            final < _REVIEW_THRESHOLD
        ),
        "evidence": [
            _evidence(
                page,
                block
                or _synthetic_block(
                    evidence_text or str(value)
                ),
                source,
                evidence_text or None,
            )
        ],
    }


# ---------------------------------------------------------------------------
# Value parsers
# ---------------------------------------------------------------------------


def _extract_number(
    value: str,
) -> Optional[str]:
    value = _clean(value)

    match = re.search(
        r"(?<![\d०-९])"
        r"[\d०-९]+"
        r"(?:[/\-][\d०-९]+)?"
        r"[A-Za-z]?",
        value,
    )

    if not match:
        return None

    return match.group(0).translate(_DIGITS)


def _extract_area(
    value: str,
) -> tuple[Optional[str], Optional[str]]:
    value = _clean(value)

    match = re.search(
        r"([\d०-९]+(?:[.,][\d०-९]+)?)"
        r"\s*"
        r"(हेक्टेयर|हे\.?|ha|hectare|acre|"
        r"एकड़|डि०|डि\.?|डेसिमल|शि०|शि\.?)?",
        value,
        re.I,
    )

    if not match:
        return None, None

    number = (
        match.group(1)
        .replace(",", ".")
        .translate(_DIGITS)
    )

    unit = _clean(match.group(2)) or None

    return number, unit


# ---------------------------------------------------------------------------
# Markdown table parser
# ---------------------------------------------------------------------------


def _parse_markdown_table(
    content: str,
) -> tuple[list[str], list[list[str]]]:
    rows: list[list[str]] = []

    for line in str(content).splitlines():
        if "|" not in line:
            continue

        cells = [
            cell.strip()
            for cell in (
                line.strip()
                .strip("|")
                .split("|")
            )
        ]

        rows.append(cells)

    if len(rows) < 2:
        return [], []

    header = rows[0]

    data: list[list[str]] = []

    for row in rows[1:]:

        # Ignore markdown separator row.
        if all(
            re.fullmatch(
                r":?-{3,}:?",
                cell.replace(" ", ""),
            )
            for cell in row
        ):
            continue

        row = row + [
            ""
        ] * max(
            0,
            len(header) - len(row),
        )

        data.append(
            row[: len(header)]
        )

    return header, data


def _table_unit(
    content: str,
    index: int,
) -> Optional[str]:
    rows = [
        [
            cell.strip()
            for cell in (
                line.strip()
                .strip("|")
                .split("|")
            )
        ]
        for line in str(content).splitlines()
        if "|" in line
    ]

    if len(rows) < 3:
        return None

    sub = rows[2]

    unit_map = {
        "ac": "एकड़",
        "acre": "एकड़",
        "एकड़": "एकड़",
        "हेक्टेयर": "हेक्टेयर",
        "हे०": "हेक्टेयर",
        "हे.": "हेक्टेयर",
        "ha": "हेक्टेयर",
        "hectare": "हेक्टेयर",
        "डि०": "डि०",
        "डि.": "डि०",
        "डि": "डि०",
        "decimal": "डि०",
        "डेसिमल": "डि०",
        "शि०": "शि०",
        "शि.": "शि०",
        "शि": "शि०",
        "बीघा": "बीघा",
        "bigha": "बीघा",
        "बिस्वा": "बिस्वा",
        "biswa": "बिस्वा",
    }

    for candidate_index in (
        index,
        index + 1,
        index - 1,
    ):
        if (
            0 <= candidate_index < len(sub)
            and _clean(sub[candidate_index])
            and not re.fullmatch(
                r":?-{3,}:?",
                _clean(sub[candidate_index]),
            )
        ):
            raw_u = _clean(sub[candidate_index])
            return unit_map.get(raw_u.lower(), raw_u)

    for c in sub:
        c_clean = _clean(c).lower()
        if c_clean in unit_map:
            return unit_map[c_clean]

    return None


# ---------------------------------------------------------------------------
# Document metadata
# ---------------------------------------------------------------------------


def _document_type_from_text(
    page: int,
    block: dict[str, Any],
) -> Optional[dict[str, Any]]:
    """Detect known land-document titles without guessing unknown types."""
    text = _clean(
        block.get(
            "text",
            block.get("content", ""),
        )
    )

    if not text:
        return None

    patterns = [
        (
            r"भू[-\s]?स्वामित्व\s*प्रमाण[-\s]?पत्र",
            "land_possession_certificate",
            0.98,
        ),
        (
            r"land\s+possession\s+certificate",
            "land_possession_certificate",
            0.98,
        ),
    ]

    for pattern, value, confidence in patterns:
        if re.search(pattern, text, re.I):
            return _make_field(
                value,
                page,
                block,
                "document_title",
                confidence,
                text,
            )

    return None


def _extract_document_year(
    page: int,
    block: dict[str, Any],
) -> Optional[dict[str, Any]]:
    """Extract a year only when a date/year pattern is reasonably explicit.

    This deliberately avoids treating arbitrary numbers such as Tauzi,
    Khata, Khasra, page numbers, or OCR headers as a document year.
    """
    text = _clean(
        block.get(
            "text",
            block.get("content", ""),
        )
    )

    if not text:
        return None

    # Explicit four-digit year.
    explicit = re.search(
        r"(?:document\s+year|certificate\s+year|"
        r"दस्तावेज़?\s*वर्ष|प्रमाण[-\s]?पत्र\s*वर्ष)"
        r"\s*[:：-]?\s*(19\d{2}|20\d{2})",
        text,
        re.I,
    )
    if explicit:
        year = explicit.group(1)
        return _make_field(
            year,
            page,
            block,
            "document_year",
            0.95,
            text,
        )

    # Labeled date followed by a date.
    labeled_date = re.search(
        r"(?:date|दिनांक|तारीख)"
        r"\s*[:：-]?\s*"
        r"(\d{1,2}[/-]\d{1,2}[/-](\d{2,4}))",
        text,
        re.I,
    )
    if labeled_date:
        raw_year = labeled_date.group(2)
        year = (
            "20" + raw_year
            if len(raw_year) == 2
            else raw_year
        )
        return _make_field(
            year,
            page,
            block,
            "document_date",
            0.90,
            text,
        )

    # A standalone date such as 31/5/19 can occur in the certificate header.
    # Treat two-digit years as 20xx for this project, but only when the whole
    # date pattern is present.
    standalone_date = re.search(
        r"\b\d{1,2}[/-]\d{1,2}[/-](\d{2,4})\b",
        text,
    )
    if standalone_date:
        raw_year = standalone_date.group(1)
        year = (
            "20" + raw_year
            if len(raw_year) == 2
            else raw_year
        )
        return _make_field(
            year,
            page,
            block,
            "document_date",
            0.86,
            text,
        )

    return None


def _extract_land_type(
    page: int,
    block: dict[str, Any],
) -> Optional[dict[str, Any]]:
    """Extract land type/class from explicit text only."""
    text = _clean(
        block.get(
            "text",
            block.get("content", ""),
        )
    )

    if not text:
        return None

    # Explicit labelled form.
    labelled = re.search(
        r"(?:भूमि\s+का\s+प्रकार|भूमि\s+प्रकार|land\s+type|"
        r"type\s+of\s+land|land\s+category)"
        r"\s*[:：-]?\s*(.+?)(?=\s+(?:खाता|खेसरा|खसरा|क्षेत्रफल|"
        r"रकबा|area|ग्राम|village)|$)",
        text,
        re.I,
    )

    if labelled:
        value = _clean(labelled.group(1))
        if value:
            return _make_field(
                value,
                page,
                block,
                "land_type",
                0.86,
                text,
            )

    # Explicit English phrases found in land-possession certificates.
    english = re.search(
        r"\b(agricultural(?:\s+land)?|cultivating\s+land|"
        r"residential\s+land|commercial\s+land|industrial\s+land|"
        r"forest\s+land|barren\s+land|pasture\s+land)\b",
        text,
        re.I,
    )

    if english:
        value = english.group(1).lower()
        if "agricultural" in value or "cultivating" in value:
            value = "agricultural"
        elif "residential" in value:
            value = "residential"
        elif "commercial" in value:
            value = "commercial"
        elif "industrial" in value:
            value = "industrial"
        elif "forest" in value:
            value = "forest"
        elif "barren" in value:
            value = "barren"
        elif "pasture" in value:
            value = "pasture"

        return _make_field(
            value,
            page,
            block,
            "land_type",
            0.86,
            text,
        )

    return None



# ---------------------------------------------------------------------------
# Owner / relative / relation
# ---------------------------------------------------------------------------


def _normalize_relation(
    value: str,
) -> str:
    value = _clean(value)

    # OCR frequently renders:
    # पिता, पति
    # instead of:
    # पिता/पति
    value = re.sub(
        r"पिता\s*[,，]\s*पति",
        "पिता/पति",
        value,
    )

    value = re.sub(
        r"पिता\s*/\s*पति",
        "पिता/पति",
        value,
    )

    return value


def _strip_deceased_prefix(
    value: str,
) -> str:
    return re.sub(
        r"^(?:स्व\s*[०0O\.]?\s*|स्वर्गीय)\s*",
        "",
        _clean(value),
    ).strip()


def _extract_owner_relative(
    page: int,
    block: dict[str, Any],
) -> dict[str, dict[str, Any]]:

    text = _clean(
        block.get(
            "text",
            block.get("content", ""),
        )
    )

    if not text:
        return {}

    result: dict[str, dict[str, Any]] = {}

    relation_pattern = (
        r"(पिता\s*[/,，]\s*पति|"
        r"पिता|पति)"
    )

    # ---------------------------------------------------------------
    # Form:
    #
    # नाम अजय सिंह पिता/पति स्व० गोला सिंह
    #
    # Also:
    #
    # नाम अजय सिंह पिता, पति स्व० गोला सिंह
    # ---------------------------------------------------------------

    match = re.search(
        rf"नाम\s*[:：]?\s*(.+?)\s+"
        rf"{relation_pattern}\s*[:：]?\s*(.+?)"
        rf"(?=\s+(?:ग्राम|गांव|गाँव|थाना|जिला|"
        rf"तहसील|प्रखंड)\b|$)",
        text,
    )

    if match:

        owner = _clean(
            match.group(1)
        )

        relation = _normalize_relation(
            match.group(2)
        )

        relative = _strip_deceased_prefix(
            match.group(3)
        )

        result["owner_name"] = _make_field(
            owner,
            page,
            block,
            "text_block",
            0.94,
            text,
        )

        result["relation"] = _make_field(
            relation,
            page,
            block,
            "text_block",
            0.96,
            text,
        )

        result["relative_name"] = _make_field(
            relative,
            page,
            block,
            "text_block",
            0.92,
            text,
        )

        return result

    # ---------------------------------------------------------------
    # Label/value form:
    #
    # नाम: राम प्रसाद
    # पिता: श्याम प्रसाद
    # ---------------------------------------------------------------

    name = re.search(
        r"(?:^|\s)नाम\s*[:：]\s*(.+)$",
        text,
    )

    if name:

        result["owner_name"] = _make_field(
            _clean(name.group(1)),
            page,
            block,
            "text_block",
            0.94,
            text,
        )

    rel = re.search(
        rf"(?:^|\s){relation_pattern}"
        rf"\s*[:：]\s*(.+)$",
        text,
    )

    if rel:

        relative = _strip_deceased_prefix(
            rel.group(2)
        )

        relation = _normalize_relation(
            rel.group(1)
        )

        result["relation"] = _make_field(
            relation,
            page,
            block,
            "text_block",
            0.95,
            text,
        )

        result["relative_name"] = _make_field(
            relative,
            page,
            block,
            "text_block",
            0.92,
            text,
        )

    return result


# ---------------------------------------------------------------------------
# Location extraction
# ---------------------------------------------------------------------------


def _extract_location(
    page: int,
    block: dict[str, Any],
) -> dict[str, dict[str, Any]]:

    text = _clean(
        block.get(
            "text",
            block.get("content", ""),
        )
    )

    result: dict[str, dict[str, Any]] = {}

    if not text:
        return result

    # ---------------------------------------------------------------
    # Village
    #
    # ग्राम आशोपुर थाना दानापुर जिला पटना
    #
    # => आशोपुर
    # ---------------------------------------------------------------

    match = re.search(
        r"(?:^|\s)"
        r"(?:ग्राम|गांव|गाँव|village)"
        r"\s*[:：-]?\s*(.+?)"
        r"(?=\s+(?:थाना|जिला|तहसील|प्रखंड|राज्य)(?:\s|$)|"
        r"[,;|]|$)",
        text,
        re.I,
    )

    if match:

        village = _clean(
            match.group(1)
        )

        # Remove a table-style thana suffix if one
        # accidentally entered the text value.
        village = re.sub(
            r",?\s*थाना\s*"
            r"(?:संख्या|सं(?:०|0)?|"
            r"नं(?:०|0)?|नंबर)?"
            r"\s*[०-९0-9.-]+\s*$",
            "",
            village,
            flags=re.I,
        ).strip(" ,:-")

        if village:

            result["village"] = _make_field(
                village,
                page,
                block,
                "text_block",
                0.92,
                text,
            )

    # ---------------------------------------------------------------
    # Police station
    #
    # IMPORTANT:
    #
    # थाना दानापुर    जिला पटना
    #
    # must become:
    #
    # police_station = दानापुर
    #
    # not:
    #
    # दानापुर जिला पटना
    # ---------------------------------------------------------------

    match = re.search(
        r"(?:^|\s)"
        r"थाना\s*[:：-]?\s*(.+?)"
        r"(?=\s+(?:जिला|ग्राम|गांव|गाँव|"
        r"तहसील|प्रखंड|राज्य|खाता|खेसरा)(?:\s|$)|"
        r"[,;|]|$)",
        text,
        re.I,
    )

    if match:

        police_station = _clean(
            match.group(1)
        )

        # A thana number is not part of the
        # police-station name.
        police_station = re.sub(
            r"\s*,?\s*"
            r"(?:संख्या|सं(?:०|0)?|"
            r"नं(?:०|0)?|नंबर)"
            r"\s*[-:–—]*\s*"
            r"[०0-९0-9]+\s*$",
            "",
            police_station,
            flags=re.I,
        ).strip(" ,:-")

        if police_station:

            result["police_station"] = _make_field(
                police_station,
                page,
                block,
                "text_block",
                0.92,
                text,
            )

    # ---------------------------------------------------------------
    # District
    #
    # जिला पटना
    #
    # Also:
    #
    # जिला पटना (बिहार)
    # ---------------------------------------------------------------

    match = re.search(
        r"(?:^|\s)"
        r"जिला\s*[:：-]?\s*(.+?)"
        r"(?=\s+(?:राज्य|ग्राम|गांव|गाँव|"
        r"थाना|तहसील|प्रखंड|खाता|खेसरा)(?:\s|$)|"
        r"[,;|]|$)",
        text,
        re.I,
    )

    if match:

        district_value = _clean(
            match.group(1)
        )

        # Support:
        # जिला पटना (बिहार)
        state_match = re.search(
            r"^(.*?)\s*"
            r"\(\s*([^)]+)\s*\)\s*$",
            district_value,
        )

        if state_match:

            district = _clean(
                state_match.group(1)
            )

            state = _clean(
                state_match.group(2)
            )

            if district:

                result["district"] = _make_field(
                    district,
                    page,
                    block,
                    "text_block",
                    0.94,
                    text,
                )

            if state:

                result["state"] = _make_field(
                    state,
                    page,
                    block,
                    "text_block",
                    0.90,
                    text,
                )

        else:

            district = district_value.strip(
                " ,:-"
            )

            if district:

                result["district"] = _make_field(
                    district,
                    page,
                    block,
                    "text_block",
                    0.94,
                    text,
                )

    # ---------------------------------------------------------------
    # State
    # ---------------------------------------------------------------

    match = re.search(
        r"(?:^|\s)"
        r"राज्य\s*[:：-]?\s*(.+)$",
        text,
        re.I,
    )

    if match and "state" not in result:

        state = _clean(
            match.group(1)
        )

        if state:

            result["state"] = _make_field(
                state,
                page,
                block,
                "text_block",
                0.90,
                text,
            )

    return result


# ---------------------------------------------------------------------------
# Generic label/value extraction
# ---------------------------------------------------------------------------


def _extract_generic(
    page: int,
    block: dict[str, Any],
    existing: set[str],
) -> dict[str, dict[str, Any]]:

    text = _clean(
        block.get(
            "text",
            block.get("content", ""),
        )
    )

    result: dict[str, dict[str, Any]] = {}

    if not text:
        return result

    # These fields have dedicated semantic parsers.
    excluded = {
        "owner_name",
        "relative_name",
        "relation",
        "village",
        "district",
        "state",
        "police_station",
        "document_year",
        "document_type",
        "land_type",
    }

    for field, aliases in _FIELD_ALIASES.items():

        if field in existing or field in excluded:
            continue

        for alias in sorted(
            aliases,
            key=len,
            reverse=True,
        ):

            match = re.search(
                re.escape(alias)
                + r"\s*[:：\-]?\s*(.+)$",
                text,
                re.I,
            )

            if not match:
                continue

            value = _clean(
                match.group(1)
            )

            if field in _NUMBER_FIELDS:

                value = _extract_number(
                    value
                )

                if not value:
                    continue

                confidence = 0.90

            elif field == "area":

                number, unit = _extract_area(
                    value
                )

                if not number:
                    continue

                value = {
                    "value": number,
                    "unit": unit,
                }

                confidence = 0.90

            else:

                confidence = 0.82

            result[field] = _make_field(
                value,
                page,
                block,
                "text_block",
                confidence,
                text,
            )

            break

    return result


# ---------------------------------------------------------------------------
# Table extraction
# ---------------------------------------------------------------------------


def _extract_table(
    page: int,
    table: dict[str, Any],
    block: dict[str, Any],
) -> dict[str, dict[str, Any]]:

    content = table.get(
        "content",
        "",
    )

    header, rows = _parse_markdown_table(
        content
    )

    if not header or not rows:
        return {}

    normalized = [
        _norm(header_value)
        for header_value in header
    ]

    col: dict[str, int] = {}

    # ---------------------------------------------------------------
    # Identify columns from headers
    # ---------------------------------------------------------------

    for i, header_value in enumerate(
        normalized
    ):

        if (
            ("ग्राम" in header_value or "village" in header_value)
            and "थाना" in header_value
        ):
            col["village_thana"] = i

        elif (
            "तौजी" in header_value
            or "tauzi" in header_value
            or "टोली" in header_value
        ):
            col["tauzi_number"] = i

        elif (
            "खाता" in header_value
            or "khata" in header_value
        ):
            col["khata_number"] = i

        elif any(
            k in header_value
            for k in ["खेसरा", "खसरा", "khesra", "khesara", "khasra", "survey"]
        ):
            col["khasra_number"] = i

        elif any(
            k in header_value
            for k in ["रकवा", "रकबा", "area", "क्षेत्रफल"]
        ):
            col["area"] = i

        elif any(
            k in header_value
            for k in ["no.", "no", "sl.", "sl", "क्रम", "sr."]
        ):
            col["serial_no"] = i

    # ---------------------------------------------------------------
    # Find non-empty data rows (filtering out blank rows & subheaders)
    # ---------------------------------------------------------------
    unit_tokens = {
        "ac", "d", "n", "s", "e", "w",
        "एकड़", "शि०", "डि०", "बीघा", "बिस्वा", "बिस्वांसी",
        "ha", "hectare", "acre", "decimal"
    }

    data_rows = []
    for r in rows:
        non_empty = [_clean(c) for c in r if _clean(c)]
        if not non_empty:
            continue
        if all(_norm(c) in unit_tokens for c in non_empty):
            continue
        data_rows.append(r)

    if not data_rows:
        return {}

    # Primary data row
    row = data_rows[0]

    # ---------------------------------------------------------------
    # Handle shifted columns:
    # When column 0 is Serial No. (e.g. 'No.') but in the OCR table
    # the serial column was empty in the form so values shifted left:
    # row[0] = Khata No ('24')
    # row[1] = Khesara No ('423 (429)')
    # row[2] = Area ('1-00')
    # ---------------------------------------------------------------
    is_shifted = False
    if (
        "serial_no" in col
        and col["serial_no"] == 0
        and "khata_number" in col
        and col["khata_number"] == 1
        and "khasra_number" in col
        and col["khasra_number"] == 2
    ):
        c0 = _clean(row[0]) if len(row) > 0 else ""
        c1 = _clean(row[1]) if len(row) > 1 else ""
        c2 = _clean(row[2]) if len(row) > 2 else ""
        if (
            re.match(r"^\d+[\s\-\.]\d{2}$", c2)
            or ("area" in col and col["area"] < len(row) and not _clean(row[col["area"]]))
        ):
            is_shifted = True

    def cell(name: str) -> str:
        if is_shifted:
            if name == "khata_number":
                return _clean(row[0]) if len(row) > 0 else ""
            elif name == "khasra_number":
                return _clean(row[1]) if len(row) > 1 else ""
            elif name == "area":
                return _clean(row[2]) if len(row) > 2 else ""

        index = col.get(name)
        if index is None or index >= len(row):
            return ""
        return _clean(row[index])

    result: dict[str, dict[str, Any]] = {}

    # Area fallback: if area column is empty but adjacent column has value
    if (
        not is_shifted
        and "area" in col
        and col["area"] + 1 < len(header)
        and not _clean(row[col["area"]])
    ):
        area_raw = _clean(row[col["area"] + 1])
        area_col_idx = col["area"] + 1
    else:
        area_raw = cell("area")
        area_col_idx = 2 if is_shifted else col.get("area", 0)

    # ---------------------------------------------------------------
    # Village + Thana number
    # ---------------------------------------------------------------

    village_thana = cell(
        "village_thana"
    )

    if village_thana:

        match = re.match(
            r"^\s*(.+?)"
            r"(?:\s*,?\s*थाना\s*"
            r"(?:संख्या|"
            r"सं(?:०|0)?|"
            r"नं(?:०|0)?|"
            r"नंबर)?"
            r"\s*[-:–—]?\s*"
            r"([०-९0-9]+))?"
            r"\s*$",
            village_thana,
        )

        if not match:

            fallback = re.match(
                r"^\s*(.+?)"
                r"\s*,?\s*थाना\s*"
                r"सं\s*[०0]\s*"
                r"[-:–—]?\s*"
                r"([०-९0-9]+)"
                r"\s*$",
                village_thana,
            )

            if fallback:
                match = fallback

        if match:

            village = _clean(
                match.group(1)
            )

            if village:

                result["village"] = _make_field(
                    village,
                    page,
                    block,
                    "table",
                    0.95,
                    village_thana,
                )

            thana_number = (
                match.group(2)
                .translate(_DIGITS)
                if match.group(2)
                else None
            )

            if thana_number:

                result["thana_number"] = _make_field(
                    thana_number,
                    page,
                    block,
                    "table",
                    0.97,
                    village_thana,
                )

    # ---------------------------------------------------------------
    # Tauzi
    # ---------------------------------------------------------------

    tauzi = _extract_number(
        cell("tauzi_number")
    )

    if tauzi:
        result["tauzi_number"] = _make_field(
            tauzi,
            page,
            block,
            "table",
            0.98,
            cell("tauzi_number"),
        )

    # ---------------------------------------------------------------
    # Khata
    # ---------------------------------------------------------------

    khata = _extract_number(
        cell("khata_number")
    )

    if khata:

        result["khata_number"] = _make_field(
            khata,
            page,
            block,
            "table",
            0.98,
            cell("khata_number"),
        )

    # ---------------------------------------------------------------
    # Khasra
    # ---------------------------------------------------------------

    khasra = _extract_number(
        cell("khasra_number")
    )

    if khasra:

        result["khasra_number"] = _make_field(
            khasra,
            page,
            block,
            "table",
            0.98,
            cell("khasra_number"),
        )

    # ---------------------------------------------------------------
    # Area
    # ---------------------------------------------------------------

    if area_raw:

        area_clean = area_raw
        hyphen_area = re.match(r"^(\d+)[\s\-](\d{2})$", area_clean)
        if hyphen_area:
            area_clean = f"{hyphen_area.group(1)}.{hyphen_area.group(2)}"

        number, unit = _extract_area(
            area_clean
        )

        if not number:
            number = _extract_number(area_clean)

        if number and not unit:

            unit = _table_unit(
                content,
                area_col_idx,
            )

        if number:

            result["area"] = _make_field(
                {
                    "value": number,
                    "unit": unit,
                },
                page,
                block,
                "table",
                0.97,
                area_raw,
            )

    return result


# ---------------------------------------------------------------------------
# Main extractor
# ---------------------------------------------------------------------------


def extract_fields(
    pages: list[dict[str, Any]],
) -> dict[str, Any]:
    """Extract evidence-backed canonical land-record fields."""

    fields: dict[str, dict[str, Any]] = {}

    blocks = list(
        _iter_text_blocks(pages)
    )

    # ------------------------------------------------------------------
    # Pass 1:
    # Structure-specific text extraction
    # ------------------------------------------------------------------

    for page, block in blocks:

        extracted = {
            **_extract_owner_relative(
                page,
                block,
            ),
            **_extract_location(
                page,
                block,
            ),
        }

        for key, value in extracted.items():

            if key not in fields:
                fields[key] = value

    # ------------------------------------------------------------------
    # Pass 2:
    # Document metadata extraction
    # ------------------------------------------------------------------

    for page, block in blocks:
        document_type = _document_type_from_text(page, block)
        if document_type is not None:
            fields.setdefault("document_type", document_type)

        document_year = _extract_document_year(page, block)
        if document_year is not None:
            fields.setdefault("document_year", document_year)

        land_type = _extract_land_type(page, block)
        if land_type is not None:
            fields.setdefault("land_type", land_type)

    # ------------------------------------------------------------------
    # Pass 3:
    # Generic label/value extraction
    # ------------------------------------------------------------------

    for page, block in blocks:

        extracted = _extract_generic(
            page,
            block,
            set(fields),
        )

        for key, value in extracted.items():

            fields.setdefault(
                key,
                value,
            )

    # ------------------------------------------------------------------
    # Pass 4:
    # Table extraction
    #
    # Table column semantics are stronger than generic regex.
    # ------------------------------------------------------------------

    for page, table, block in _iter_tables(
        pages
    ):

        extracted = _extract_table(
            page,
            table,
            block,
        )

        for key, value in extracted.items():

            fields[key] = value

    return fields


def generate_warnings(
    pages: list[dict[str, Any]],
    fields: dict[str, Any],
) -> list[str]:
    """Generate human-readable warnings for unrecognised text and missing fields."""

    warnings: list[str] = []

    # 1. Check for poorly recognised / noisy text blocks
    for page in pages:
        page_no = _page_number(page)
        for block in page.get("blocks", []):
            if not isinstance(block, dict):
                continue
            b_type = block.get("type", "")
            if b_type in {"image", "table"}:
                continue

            text = _clean(block.get("text", block.get("content", "")))
            if not text:
                continue

            scores = block.get("confidence_scores") or {}
            conf = block.get(
                "confidence",
                scores.get("average_content_confidence_score"),
            )

            if conf is not None and float(conf) < 0.65:
                snippet = text[:45] + "..." if len(text) > 45 else text
                pct = round(float(conf) * 100)
                warnings.append(
                    f"Page {page_no}: Text '{snippet}' was poorly recognised by OCR "
                    f"(confidence: {pct}%) — Critical Warning, manual verification required."
                )

    # 2. Check for missing core land record fields
    core_fields = [
        ("owner_name", "Owner Name (नाम)"),
        ("village", "Village (ग्राम)"),
        ("khata_number", "Khata Number (खाता संख्या)"),
        ("khasra_number", "Khasra Number (खेसरा / खसरा संख्या)"),
        ("area", "Area (रकबा / क्षेत्रफल)"),
    ]

    for field_key, label in core_fields:
        field_obj = fields.get(field_key)
        if not field_obj or not field_obj.get("value"):
            warnings.append(
                f"Field not recognised: '{label}' could not be reliably extracted from the document."
            )
        elif float(field_obj.get("final_confidence", 1.0)) < 0.65:
            pct = round(float(field_obj.get("final_confidence", 0.0)) * 100)
            warnings.append(
                f"Critical Warning: '{label}' has critically low confidence ({pct}%) "
                f"— manual verification is required."
            )
        elif float(field_obj.get("final_confidence", 1.0)) < 0.85:
            pct = round(float(field_obj.get("final_confidence", 0.0)) * 100)
            warnings.append(
                f"Medium Warning: '{label}' has confidence {pct}% "
                f"— Tehsil Officer review recommended."
            )

    return warnings


__all__ = [
    "extract_fields",
    "generate_warnings",
]