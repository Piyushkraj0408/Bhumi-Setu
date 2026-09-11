import json
from pathlib import Path


FIXTURE = Path(__file__).parent / "fixtures" / "land_record2_mistral.json"


def test_actual_mistral_shape():
    with FIXTURE.open(encoding="utf-8") as f:
        payload = json.load(f)

    assert "pages" in payload
    assert isinstance(payload["pages"], list)
    assert len(payload["pages"]) >= 1

    page = payload["pages"][0]

    assert "page_number" in page
    assert "text" in page
    assert "blocks" in page
    assert isinstance(page["blocks"], list)

    # The normalized Mistral result should preserve tables.
    assert "tables" in page
    assert isinstance(page["tables"], list)