from pathlib import Path
import time
from .config import Settings
from .ingestion import load_pages
from .quality import analyze_page
from .preprocessing import preprocess
from .layout import detect_layout
from .extraction import extract_fields
from .confidence import apply_quality_penalty,review_required
from .models import OCRDocumentResult,PageResult
from .ocr.base import OCRService
from .ocr.tesseract_adapter import TesseractAdapter
from .ocr.handwriting_adapter import HandwritingOCR

def build_ocr_service(s):
    if s.engine=="tesseract":
        printed=TesseractAdapter(s.tesseract_cmd)
        return OCRService(printed,HandwritingOCR(),printed)
    if s.engine=="paddle":
        from .ocr.paddle_adapter import PaddleOCRAdapter
        p=PaddleOCRAdapter("hi")
        return OCRService(p,p,p)
    raise ValueError(f"Unknown OCR engine: {s.engine}")

def process_document(path,settings=None):
    s=settings or Settings(); path=Path(path); start=time.perf_counter()
    service=build_ocr_service(s); pages=load_pages(path,s.dpi,s.max_pages)
    page_results=[]; fields={}; warnings=[]
    for n,original in enumerate(pages,1):
        q=analyze_page(original,s.dpi); work,ops=preprocess(original,q)
        layout=detect_layout(work)
        regions=service.recognize(work,s.languages,q.handwriting_probability>=.60)
        for stamp in [x for x in layout if x.type=="stamp"]:
            x1,y1,x2,y2=stamp.bbox; crop=work[y1:y2,x1:x2]
            if crop.size:
                for sr in service.recognize_stamp(crop,s.languages):
                    sr.bbox=[sr.bbox[0]+x1,sr.bbox[1]+y1,sr.bbox[2]+x1,sr.bbox[3]+y1]
                    regions.append(sr)
        for k,v in extract_fields(regions,n).items(): fields[k]=apply_quality_penalty(v,q.overall_score)
        page_results.append(PageResult(page_number=n,quality=q,transformations=ops,
            ocr_text=" ".join(r.text for r in regions),language=sorted(set(r.language for r in regions if r.language)),
            layout=regions+layout))
    return OCRDocumentResult(
        document={"document_id":path.stem,"filename":path.name,"pages":len(page_results),
                  "language":sorted(set(x for p in page_results for x in p.language))},
        processing={"status":"completed" if pages else "failed","ocr_engine":s.engine,
                    "processing_time_ms":round((time.perf_counter()-start)*1000,2),"pipeline_version":"0.1.0"},
        pages=page_results,extracted_fields=fields,warnings=warnings,
        review_required=review_required(fields,s.review_threshold))
