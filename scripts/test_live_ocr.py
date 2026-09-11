"""
Test the live Mistral API path specifically.
Checks if the API call actually works and returns REAL data for different files.
"""
import sys, os, tempfile
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

from app.core.config import settings
from pathlib import Path

print(f"API Key present: {bool(settings.mistral_api_key)}")
print(f"API Key: {settings.mistral_api_key[:8]}...")

# Try uploading land_record1.pdf directly to Mistral
test_file = "./storage/documents/141714eb-8706-4d68-99f5-81bfb4129812/original/land_record1.pdf"
if not os.path.isfile(test_file):
    for root, dirs, files in os.walk("./storage"):
        for f in files:
            if f.endswith(".pdf"):
                test_file = os.path.join(root, f)
                break
        if test_file:
            break

print(f"\nTest file: {test_file}")
print(f"File exists: {os.path.isfile(test_file)}")

print("\n--- Testing live OCRPipeline.process() ---")
try:
    from land_ocr.pipeline import OCRPipeline
    from land_ocr.mistral_client import MistralOCRClient

    client = MistralOCRClient(api_key=settings.mistral_api_key, model="mistral-ocr-latest")
    pipeline = OCRPipeline(client=client)

    result = pipeline.process(test_file)
    print(f"SUCCESS: Got {len(result.get('extracted_fields', {}))} fields")
    print(f"Document pages: {result.get('document', {}).get('pages')}")
    for k, v in result.get("extracted_fields", {}).items():
        if isinstance(v, dict):
            val = v.get("final_value") or v.get("value")
            conf = v.get("final_confidence") or v.get("confidence")
            print(f"  {k}: {val} (conf={conf})")
except Exception as e:
    import traceback
    print(f"ERROR: {e}")
    traceback.print_exc()

# Now test with land_record2
print("\n--- Testing with land_record2.pdf ---")
test_file2 = None
for root, dirs, files in os.walk("./storage"):
    for f in files:
        if "record2" in f.lower() or "record_2" in f.lower():
            test_file2 = os.path.join(root, f)
            break
    if test_file2:
        break

if not test_file2:
    print("No land_record2 file found, using a different file")
    for root, dirs, files in os.walk("./storage"):
        for f in files:
            if f.endswith(".pdf") and "land_record1" not in f.lower():
                test_file2 = os.path.join(root, f)
                break
        if test_file2:
            break

if test_file2:
    print(f"Test file 2: {test_file2}")
    try:
        from land_ocr.pipeline import OCRPipeline
        from land_ocr.mistral_client import MistralOCRClient
        client = MistralOCRClient(api_key=settings.mistral_api_key, model="mistral-ocr-latest")
        pipeline = OCRPipeline(client=client)
        result2 = pipeline.process(test_file2)
        print(f"SUCCESS: Got {len(result2.get('extracted_fields', {}))} fields")
        for k, v in result2.get("extracted_fields", {}).items():
            if isinstance(v, dict):
                val = v.get("final_value") or v.get("value")
                conf = v.get("final_confidence") or v.get("confidence")
                print(f"  {k}: {val} (conf={conf})")
        owner1 = result.get("extracted_fields", {}).get("owner_name", {}).get("final_value") or result.get("extracted_fields", {}).get("owner_name", {}).get("value")
        owner2 = result2.get("extracted_fields", {}).get("owner_name", {}).get("final_value") or result2.get("extracted_fields", {}).get("owner_name", {}).get("value")
        print(f"\nComparison:")
        print(f"  File 1 owner: {owner1}")
        print(f"  File 2 owner: {owner2}")
        if owner1 == owner2:
            print("  WARNING: Both files returned same owner - OCR may be returning cached data!")
        else:
            print("  OK: Different owners, OCR is working correctly!")
    except Exception as e:
        import traceback
        print(f"ERROR: {e}")
        traceback.print_exc()
