from pathlib import Path

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff"}
MAX_BYTES = 512 * 1024 * 1024

def validate_input(path: str | Path) -> Path:
    p = Path(path)
    if not p.exists() or not p.is_file():
        raise FileNotFoundError(f"Input file not found: {p}")
    if p.suffix.lower() not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {p.suffix}. Allowed: {sorted(ALLOWED_EXTENSIONS)}")
    if p.stat().st_size == 0:
        raise ValueError("Input file is empty")
    if p.stat().st_size > MAX_BYTES:
        raise ValueError("Input file exceeds the 512 MB Mistral file limit")
    return p
