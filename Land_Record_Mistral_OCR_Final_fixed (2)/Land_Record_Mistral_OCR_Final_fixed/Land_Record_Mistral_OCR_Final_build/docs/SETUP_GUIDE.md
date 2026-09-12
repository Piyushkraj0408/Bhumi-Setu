# Setup Guide — Windows

## 1. Get a Mistral API key
Create a Mistral API key in your Mistral platform account. Do not commit it to Git.

## 2. Create the Python environment
```powershell
cd D:\Land_Record_Mistral_OCR_Final
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 3. Configure the key
```powershell
Copy-Item .env.example .env
notepad .env
```
Set:
```text
MISTRAL_API_KEY=YOUR_REAL_KEY
MISTRAL_OCR_MODEL=mistral-ocr-latest
```

## 4. Put your document in input/
Supported: PDF, PNG, JPG, JPEG, TIFF.

Example:
```text
input\land_record.pdf
```

## 5. Run
```powershell
$env:PYTHONPATH="src"
python -m land_ocr.cli --input input\land_record.pdf --output output\land_record.json
```

## 6. Result
Open:
```text
output\land_record.json
```

## 7. Run tests
```powershell
$env:PYTHONPATH="src"
pytest -q
```

## 8. Optional API server
```powershell
$env:PYTHONPATH="src"
uvicorn land_ocr.api:app --reload
```
Then open `http://127.0.0.1:8000/docs` and upload a document to `POST /api/v1/ocr/process`.

## Notes
- Local documents are uploaded to Mistral and processed by its cloud OCR API.
- The package requests block-level confidence and paragraph/layout blocks.
- `raw_ocr` preserves the original Mistral OCR response for audit/debugging.
- Mistral API limits and pricing are controlled by Mistral and can change.
