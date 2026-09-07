from .models import ExtractedField
def apply_quality_penalty(field: ExtractedField, quality):
    field.final_confidence=round(max(0,min(1,field.ocr_confidence*field.extraction_confidence*(.75+.25*quality))),4)
    return field
def review_required(fields,threshold=.70):
    return any(x.final_confidence<threshold for x in fields.values())
