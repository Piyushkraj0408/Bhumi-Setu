"""
Diagnose OCR pipeline issues end-to-end.
Tests import chain, API key, and extraction.
"""
import sys, os
sys.path.insert(0, os.path.abspath("."))

# Force UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

print("=" * 60)
print("STEP 1: Check app settings")
print("=" * 60)
try:
    from app.core.config import settings
    key = settings.mistral_api_key
    print(f"  mistral_api_key present: {bool(key)}")
    print(f"  mistral_api_key value  : {key[:8]}...{key[-4:] if len(key) > 12 else key}")
    print(f"  local_storage_dir      : {settings.local_storage_dir}")
    print(f"  ocr_accept_threshold   : {settings.ocr_accept_threshold}")
    print(f"  ocr_review_threshold   : {settings.ocr_review_threshold}")
except Exception as e:
    print(f"  ERROR loading settings: {e}")
    sys.exit(1)

print()
print("=" * 60)
print("STEP 2: Check land_ocr package importability")
print("=" * 60)
_MISTRAL_SRC = os.path.join(
    os.path.abspath("."),
    "Land_Record_Mistral_OCR_Final_fixed",
    "Land_Record_Mistral_OCR_Final_build",
    "src"
)
print(f"  Adding to sys.path: {_MISTRAL_SRC}")
if _MISTRAL_SRC not in sys.path:
    sys.path.insert(0, _MISTRAL_SRC)

try:
    from land_ocr.extraction import extract_fields
    print("  land_ocr.extraction.extract_fields: OK")
except ImportError as e:
    print(f"  ERROR importing extraction: {e}")

try:
    from land_ocr.pipeline import OCRPipeline
    print("  land_ocr.pipeline.OCRPipeline: OK")
except ImportError as e:
    print(f"  ERROR importing OCRPipeline: {e}")

try:
    from land_ocr.mistral_client import MistralOCRClient
    print("  land_ocr.mistral_client.MistralOCRClient: OK")
except ImportError as e:
    print(f"  ERROR importing MistralOCRClient: {e}")

print()
print("=" * 60)
print("STEP 3: Check land_ocr config reads MISTRAL_API_KEY")
print("=" * 60)
try:
    from land_ocr.config import settings as land_settings
    land_key = land_settings.api_key
    print(f"  land_ocr api_key present: {bool(land_key)}")
    print(f"  land_ocr api_key value  : {land_key[:8] if land_key else 'EMPTY'}...")
    if not land_key:
        print("  WARNING: land_ocr config could not read MISTRAL_API_KEY from env!")
        print("  This is because land_ocr has its own .env file that may override the root one.")
        print(f"  land_ocr src dir: {_MISTRAL_SRC}")
        # Check the OCR module's own .env
        ocr_env = os.path.join(
            os.path.abspath("."),
            "Land_Record_Mistral_OCR_Final_fixed",
            "Land_Record_Mistral_OCR_Final_build",
            ".env"
        )
        print(f"  OCR .env path: {ocr_env}")
        print(f"  OCR .env exists: {os.path.isfile(ocr_env)}")
        if os.path.isfile(ocr_env):
            with open(ocr_env) as f:
                print(f"  OCR .env contents: {f.read()}")
except Exception as e:
    print(f"  ERROR: {e}")

print()
print("=" * 60)
print("STEP 4: Test MistralOCRClient construction")
print("=" * 60)
try:
    from land_ocr.mistral_client import MistralOCRClient
    client = MistralOCRClient(api_key=key, model="mistral-ocr-latest")
    print(f"  Client created successfully, model: {client.model}")
except Exception as e:
    print(f"  ERROR creating client: {e}")

print()
print("=" * 60)
print("STEP 5: Check output/pre-processed JSON files")
print("=" * 60)
output_dir = os.path.join(
    os.path.abspath("."),
    "Land_Record_Mistral_OCR_Final_fixed",
    "Land_Record_Mistral_OCR_Final_build",
    "output"
)
print(f"  Output dir: {output_dir}")
print(f"  Exists: {os.path.isdir(output_dir)}")
if os.path.isdir(output_dir):
    files = os.listdir(output_dir)
    for f in files:
        size = os.path.getsize(os.path.join(output_dir, f))
        print(f"    {f}  ({size} bytes)")

print()
print("=" * 60)
print("STEP 6: Check storage directory for uploaded files")
print("=" * 60)
storage = os.path.join(os.path.abspath("."), "storage")
print(f"  Storage dir: {storage}")
print(f"  Exists: {os.path.isdir(storage)}")
if os.path.isdir(storage):
    count = 0
    for root, dirs, files in os.walk(storage):
        for file in files:
            fp = os.path.join(root, file)
            size = os.path.getsize(fp)
            rel = os.path.relpath(fp, storage)
            print(f"    {rel} ({size} bytes)")
            count += 1
            if count > 10:
                print("    ... (showing first 10 only)")
                break
        if count > 10:
            break
    if count == 0:
        print("  No files in storage (no uploads yet)")

print()
print("=" * 60)
print("STEP 7: Try running extract_fields on the pre-built JSON")
print("=" * 60)
try:
    import json
    json_path = os.path.join(output_dir, "land_record1_final_test.json")
    if os.path.isfile(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        pages = data.get("pages", [])
        print(f"  Loaded {len(pages)} pages from JSON")
        result = extract_fields(pages)
        print(f"  extract_fields returned {len(result)} fields:")
        for fname, fval in result.items():
            fv = fval.get("final_value") or fval.get("value") if isinstance(fval, dict) else fval
            fc = fval.get("final_confidence") or fval.get("confidence") if isinstance(fval, dict) else None
            print(f"    {fname}: {fv}  (conf={fc})")
    else:
        print(f"  JSON not found: {json_path}")
except Exception as e:
    import traceback
    print(f"  ERROR: {e}")
    traceback.print_exc()

print()
print("=" * 60)
print("DIAGNOSIS COMPLETE")
print("=" * 60)
