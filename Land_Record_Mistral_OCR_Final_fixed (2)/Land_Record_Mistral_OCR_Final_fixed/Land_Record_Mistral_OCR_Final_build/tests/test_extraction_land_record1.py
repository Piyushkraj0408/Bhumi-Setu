import json
from pathlib import Path

from land_ocr.extraction import extract_fields


FIXTURE = (
    Path(__file__).parent
    / "fixtures"
    / "land_record1_mistral.json"
)


def test_land_record1_mistral_extraction():
    with FIXTURE.open(encoding="utf-8") as f:
        payload = json.load(f)

    fields = extract_fields(payload["pages"])

    # ---------------------------------------------------------
    # Owner information
    # ---------------------------------------------------------
    assert fields["owner_name"]["value"] == "राधेश्याम सिंह"

    assert fields["relation"]["value"] == "पिता/पति"

    assert (
        fields["relative_name"]["value"]
        == "रामविलास सिंह"
    )

    # ---------------------------------------------------------
    # Location information
    # ---------------------------------------------------------
    assert fields["village"]["value"] == "आसोपुर"

    assert (
        fields["police_station"]["value"]
        == "कानपुर"
    )

    assert (
        fields["thana_number"]["value"]
        == "34"
    )

    assert (
        fields["district"]["value"]
        == "पटना"
    )

    assert (
        fields["state"]["value"]
        == "बिहार"
    )

    # ---------------------------------------------------------
    # Land identifiers
    # ---------------------------------------------------------
    assert (
        fields["khata_number"]["value"]
        == "41"
    )

    assert (
        fields["khasra_number"]["value"]
        == "155"
    )

    # ---------------------------------------------------------
    # Evidence and confidence
    # ---------------------------------------------------------
    for field_name, field in fields.items():
        assert "evidence" in field, (
            f"{field_name} is missing evidence"
        )

        assert field["evidence"], (
            f"{field_name} has empty evidence"
        )

        assert "final_confidence" in field, (
            f"{field_name} is missing final_confidence"
        )