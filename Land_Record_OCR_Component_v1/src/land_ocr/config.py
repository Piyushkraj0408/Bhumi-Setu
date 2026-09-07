import os
from dataclasses import dataclass

@dataclass
class Settings:
    engine: str = os.getenv("OCR_ENGINE", "tesseract")
    languages: str = os.getenv("OCR_LANGUAGES", "eng+hin")
    review_threshold: float = float(os.getenv("OCR_REVIEW_THRESHOLD", "0.70"))
    accept_threshold: float = float(os.getenv("OCR_ACCEPT_THRESHOLD", "0.90"))
    dpi: int = int(os.getenv("OCR_DPI", "300"))
    max_pages: int = int(os.getenv("OCR_MAX_PAGES", "200"))
    tesseract_cmd: str | None = os.getenv("TESSERACT_CMD") or None
