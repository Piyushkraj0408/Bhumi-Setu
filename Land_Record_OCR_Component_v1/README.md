# Land Record OCR & Document Understanding Component v1.0

Implementation baseline for the approved SRS/SDD.

## Pipeline
Input -> Ingestion -> Quality Analysis -> Adaptive Preprocessing -> Layout ->
Replaceable OCRService -> OCR Normalization -> Entity Extraction ->
Confidence -> Versioned JSON -> Parent Backend -> Database/Verification

## Supported
- PDF, JPG, JPEG, PNG, TIFF
- scanned and historical/degraded pages
- Hindi + English
- printed OCR
- handwriting detection + replaceable handwriting-recognition interface
- text inside stamp/seal regions
- field confidence and evidence
- FastAPI + CLI
- Docker

Maps are intentionally outside this component. A map region may be preserved as metadata, but map interpretation belongs to the separate map module.

## Quick start

Windows:
```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Install Tesseract and Hindi language data, then verify:
```powershell
tesseract --version
tesseract --list-langs
```

Run:
```powershell
$env:PYTHONPATH="src"
python -m land_ocr.cli --input path	oecord.pdf --output result.json
```

API:
```powershell
$env:PYTHONPATH="src"
uvicorn land_ocr.api:app --reload
```

Swagger: http://127.0.0.1:8000/docs

Tests:
```powershell
$env:PYTHONPATH="src"
pytest -q
```

## Engine policy

The application depends on an internal OCR interface, not a concrete OCR library. Tesseract is the lightweight baseline. PaddleOCR is an optional adapter and should be benchmarked on the project's real Hindi/English land-record corpus before becoming the production default.

Handwriting recognition is intentionally an adapter. The system must not falsely treat printed OCR as handwriting OCR. A validated Hindi/English handwriting model can be plugged into `HandwritingOCR` without changing downstream code.

See `SETUP_GUIDE.md`, `EXPLAINED.md`, and `IMPLEMENTATION_BASELINE.md`.
