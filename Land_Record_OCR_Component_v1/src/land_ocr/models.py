from typing import Any
from pydantic import BaseModel, Field

class QualityProfile(BaseModel):
    dpi: float | None = None
    blur: float = 0.0
    skew: float = 0.0
    noise: float = 0.0
    brightness: float = 0.0
    contrast: float = 0.0
    page_damage: float = 0.0
    handwriting_probability: float = 0.0
    orientation: int = 0
    overall_score: float = 0.0

class OCRRegion(BaseModel):
    region_id: str
    type: str = "text"
    bbox: list[int] = Field(default_factory=list)
    text: str = ""
    language: str | None = None
    confidence: float = 0.0
    source_engine: str = ""
    attributes: dict[str, Any] = Field(default_factory=dict)

class PageResult(BaseModel):
    page_number: int
    quality: QualityProfile
    transformations: list[str] = Field(default_factory=list)
    ocr_text: str = ""
    language: list[str] = Field(default_factory=list)
    layout: list[OCRRegion] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)

class FieldEvidence(BaseModel):
    page: int
    bbox: list[int] = Field(default_factory=list)
    text: str = ""

class ExtractedField(BaseModel):
    value: Any = None
    ocr_confidence: float = 0.0
    extraction_confidence: float = 0.0
    final_confidence: float = 0.0
    evidence: list[FieldEvidence] = Field(default_factory=list)

class OCRDocumentResult(BaseModel):
    schema_version: str = "1.0"
    document: dict[str, Any]
    processing: dict[str, Any]
    pages: list[PageResult]
    extracted_fields: dict[str, ExtractedField] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
    review_required: bool = False
