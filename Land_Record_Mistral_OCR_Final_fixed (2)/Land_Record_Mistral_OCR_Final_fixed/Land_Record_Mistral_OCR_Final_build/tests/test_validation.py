from pathlib import Path
import pytest
from land_ocr.validation import validate_input

def test_missing_file():
    with pytest.raises(FileNotFoundError):
        validate_input("does_not_exist.pdf")

def test_bad_extension(tmp_path: Path):
    p = tmp_path / "x.txt"; p.write_text("x")
    with pytest.raises(ValueError): validate_input(p)
