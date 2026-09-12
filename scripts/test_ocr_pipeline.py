"""
Test the full OCR pipeline with a real uploaded file.
Simulates what happens when a document is uploaded.
"""
import sys, os
sys.path.insert(0, os.path.abspath("."))
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

_MISTRAL_SRC = os.path.join(
    os.path.abspath("."),
    "Land_Record_Mistral_OCR_Final_fixed",
    "Land_Record_Mistral_OCR_Final_build",
    "src"
)
if _MISTRAL_SRC not in sys.path:
    sys.path.insert(0, _MISTRAL_SRC)

print("=" * 60)
print("TEST: Full OCR pipeline with a real file")
print("=" * 60)

from app.core.config import settings
from app.services.ocr_service import _run_mistral_pipeline

# Find an actual uploaded file
storage_dir = "./storage"
test_file = None
for root, dirs, files in os.walk(storage_dir):
    for f in files:
        if f.endswith((".pdf", ".jpg", ".jpeg", ".png")):
            test_file = os.path.join(root, f)
            break
    if test_file:
        break

if not test_file:
    print("No uploaded files found in storage directory")
    sys.exit(0)

print(f"Using test file: {test_file}")
file_bytes = open(test_file, "rb").read()
filename = os.path.basename(test_file)
print(f"File size: {len(file_bytes)} bytes")
print(f"Filename: {filename}")
print(f"MISTRAL_API_KEY configured: {bool(settings.mistral_api_key)}")
print()

import traceback
print("Running _run_mistral_pipeline (live Mistral OCR)...")
try:
    result = _run_mistral_pipeline(file_bytes, filename)
    print("SUCCESS!")
    ef = result.get("extracted_fields", {})
    print(f"  Extracted {len(ef)} fields:")
    for k, v in ef.items():
        if isinstance(v, dict):
            val = v.get("final_value") or v.get("value")
            conf = v.get("final_confidence") or v.get("confidence")
            print(f"    {k}: {val} (conf={conf})")
        else:
            print(f"    {k}: {v}")
except Exception as e:
    print(f"ERROR: {e}")
    traceback.print_exc()
