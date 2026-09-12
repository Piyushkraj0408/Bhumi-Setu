"""
Check what documents have OCR data in the DB.
Shows status of all documents and their OCR results.
"""
import sys, os
sys.path.insert(0, os.path.abspath("."))
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.core.database import get_mongo_database
db = get_mongo_database()

docs = list(db.documents.find({"status": {"$ne": "deleted"}}, {
    "_id": 1, "original_filename": 1, "status": 1, "ocr": 1, "metadata": 1
}).limit(20))

print(f"Total documents (non-deleted): {len(docs)}")
print()

for d in docs:
    doc_id = str(d.get("_id") or d.get("id", "?"))
    fname = d.get("original_filename", "?")
    status = d.get("status", "?")
    ocr = d.get("ocr")
    has_ocr = bool(ocr)
    ocr_status = ocr.get("status") if ocr else "none"
    ef_count = len(ocr.get("result", {}).get("extracted_fields", {})) if ocr else 0
    conf = ocr.get("overall_confidence", "N/A") if ocr else "N/A"
    print(f"[{status}] {fname[:40]} ({doc_id[:8]}...)")
    print(f"         OCR: {ocr_status}, fields={ef_count}, confidence={conf}")
    if ocr and ocr.get("result", {}).get("extracted_fields"):
        ef = ocr["result"]["extracted_fields"]
        for k, v in list(ef.items())[:3]:
            if isinstance(v, dict):
                fv = v.get("final_value") or v.get("value")
                print(f"           {k}: {str(fv)[:50]}")
    print()
