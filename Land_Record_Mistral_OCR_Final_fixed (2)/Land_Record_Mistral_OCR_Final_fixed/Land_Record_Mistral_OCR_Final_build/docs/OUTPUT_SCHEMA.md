# Output JSON

The output contains:

- `schema_version`
- `document`: id, filename, page count, detected Hindi/English languages
- `processing`: status, OCR engine/model, duration
- `pages`: OCR markdown, page confidence, blocks, bounding boxes, tables, images, dimensions
- `extracted_fields`: configured land-record fields with value, OCR confidence, extraction confidence, final confidence, evidence and review flag
- `warnings`
- `review_required`
- `raw_ocr`: complete Mistral response
- `mistral_file`: uploaded file metadata

This keeps both structured output and raw supporting OCR evidence.
