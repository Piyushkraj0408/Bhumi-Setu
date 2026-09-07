import shutil,tempfile
from pathlib import Path
from fastapi import FastAPI,File,HTTPException,UploadFile
from .config import Settings
from .pipeline import process_document

app=FastAPI(title="Land Record OCR API",version="0.1.0")
@app.get("/health")
def health(): return {"status":"ok","service":"land-record-ocr"}
@app.post("/api/v1/ocr/process")
async def process(file:UploadFile=File(...)):
    suffix=Path(file.filename or "").suffix.lower()
    if suffix not in {".pdf",".jpg",".jpeg",".png",".tif",".tiff"}:
        raise HTTPException(415,"Unsupported document format")
    with tempfile.TemporaryDirectory() as d:
        path=Path(d)/(file.filename or "document")
        with path.open("wb") as out: shutil.copyfileobj(file.file,out)
        try: result=process_document(path,Settings())
        except Exception as e: raise HTTPException(500,str(e))
    return result.model_dump()
