# Land Record Mistral OCR — Hindi + English

A simple local-document to JSON OCR service using the Mistral OCR API.

## Fastest path

1. Create `.venv`.
2. `pip install -r requirements.txt`.
3. Copy `.env.example` to `.env` and add `MISTRAL_API_KEY`.
4. Put a PDF/image in `input/`.
5. Run:

```powershell
$env:PYTHONPATH="src"
python -m land_ocr.cli --input input\land_record.pdf --output output\land_record.json
```

The result is JSON in `output/`.

## Supported input
PDF, PNG, JPG, JPEG, TIFF.

## What is returned
Hindi/English OCR, page markdown, structural blocks, bounding boxes, confidence scores, tables/images metadata, raw Mistral response, and extracted land-record fields.

## Important
This implementation uses the Mistral cloud API. It is not a fully open-source OCR engine. Your earlier SRS specifies a fully open-source OCR policy; use this package as the Mistral adapter/prototype unless cloud/proprietary processing is approved for your deployment.
