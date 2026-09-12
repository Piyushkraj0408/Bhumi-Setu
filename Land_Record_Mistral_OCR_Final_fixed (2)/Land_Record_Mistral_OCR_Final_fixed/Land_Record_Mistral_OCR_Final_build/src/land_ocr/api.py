from pathlib import Path
import tempfile
from fastapi import FastAPI, File, UploadFile, HTTPException
from .pipeline import process_to_json

app = FastAPI(title="Land Record Mistral OCR", version="1.0.0")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/api/v1/ocr/process")
async def process(file: UploadFile = File(...)):
    suffix = Path(file.filename or "document.pdf").suffix.lower()
    if suffix not in {".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff"}:
        raise HTTPException(400, "Unsupported file type")
    data = await file.read()
    with tempfile.TemporaryDirectory() as td:
        inp = Path(td) / (file.filename or f"document{suffix}")
        out = Path(td) / "result.json"
        inp.write_bytes(data)
        try:
            result = process_to_json(inp, out)
        except Exception as exc:
            raise HTTPException(500, str(exc))
        return result
