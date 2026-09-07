# Setup Guide

## Python
Use Python 3.11.

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Tesseract
Install Tesseract as a native executable. Put it on PATH or set:

```powershell
$env:TESSERACT_CMD="C:\Program Files\Tesseract-OCR\tesseract.exe"
```

Install `eng` and `hin` trained data.

## Run CLI
```powershell
$env:PYTHONPATH="src"
python -m land_ocr.cli --input .\document.pdf --output .\ocr_result.json
```

## Run API
```powershell
$env:PYTHONPATH="src"
uvicorn land_ocr.api:app --host 127.0.0.1 --port 8000
```

## Optional PaddleOCR
```powershell
pip install -r requirements-paddle.txt
```

Then:
```powershell
$env:OCR_ENGINE="paddle"
$env:PYTHONPATH="src"
python -m land_ocr.cli --input .\document.png
```

Paddle runtime/model versions should be locked only after benchmark and license review.

## Docker
```bash
docker compose up --build
```
