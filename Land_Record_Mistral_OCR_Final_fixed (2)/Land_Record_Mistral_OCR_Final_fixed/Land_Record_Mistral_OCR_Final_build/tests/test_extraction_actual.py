import json
from pathlib import Path

from land_ocr.extraction import extract_fields


# Real Mistral OCR response used as the extraction test fixture.
FIXTURE = Path(__file__).parent / "fixtures" / "land_record2_mistral.json"


def test_land_record2_mistral_json():
    with FIXTURE.open(encoding="utf-8") as f:
        payload = json.load(f)

    fields = extract_fields(payload["pages"])

    # ---------------------------------------------------------
    # Owner information
    # ---------------------------------------------------------
    assert fields["owner_name"]["value"] == "अजय सिंह"
    assert fields["relative_name"]["value"] == "गोला सिंह"
    assert fields["relation"]["value"] == "पिता/पति"

    # ---------------------------------------------------------
    # Location information
    # ---------------------------------------------------------
    assert fields["village"]["value"] == "आशोपुर"
    assert fields["police_station"]["value"] == "दानापुर"
    assert fields["district"]["value"] == "पटना"

    # ---------------------------------------------------------
    # Land-record identifiers
    # ---------------------------------------------------------
    assert fields["thana_number"]["value"] == "34"
    assert fields["khata_number"]["value"] == "19"
    assert fields["khasra_number"]["value"] == "156"

    # ---------------------------------------------------------
    # Area
    # ---------------------------------------------------------
    assert fields["area"]["value"] == {
        "value": "5.75",
        "unit": "डि०",
    }

    # ---------------------------------------------------------
    # Evidence and confidence are mandatory
    # ---------------------------------------------------------
    for field_name, field in fields.items():
        assert "evidence" in field, (
            f"{field_name} is missing evidence"
        )

        assert "final_confidence" in field, (
            f"{field_name} is missing final_confidence"
        )

        assert field["evidence"], (
            f"{field_name} has empty evidence"
        )