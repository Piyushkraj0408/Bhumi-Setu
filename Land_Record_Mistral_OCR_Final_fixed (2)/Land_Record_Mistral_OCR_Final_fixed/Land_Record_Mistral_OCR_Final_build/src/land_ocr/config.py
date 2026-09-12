from dataclasses import dataclass
import os
from dotenv import load_dotenv

load_dotenv()

@dataclass(frozen=True)
class Settings:
    api_key: str = os.getenv("MISTRAL_API_KEY", "")
    model: str = os.getenv("MISTRAL_OCR_MODEL", "mistral-ocr-latest")
    confidence_granularity: str = os.getenv("MISTRAL_CONFIDENCE_GRANULARITY", "block")
    include_blocks: bool = os.getenv("MISTRAL_INCLUDE_BLOCKS", "true").lower() == "true"
    table_format: str | None = os.getenv("MISTRAL_TABLE_FORMAT", "markdown") or None
    extract_header: bool = os.getenv("MISTRAL_EXTRACT_HEADER", "false").lower() == "true"
    extract_footer: bool = os.getenv("MISTRAL_EXTRACT_FOOTER", "false").lower() == "true"
    timeout_seconds: int = int(os.getenv("MISTRAL_TIMEOUT_SECONDS", "180"))
    review_threshold: float = float(os.getenv("REVIEW_THRESHOLD", "0.65"))
    high_threshold: float = float(os.getenv("HIGH_THRESHOLD", "0.85"))

settings = Settings()
