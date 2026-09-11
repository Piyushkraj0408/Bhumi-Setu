"""
End-to-end test: Upload a PDF via the API and check OCR result.
Tests that the live Mistral OCR pipeline runs correctly on upload.
"""
import sys, os, time
sys.path.insert(0, os.path.abspath("."))
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import requests

BASE = "http://localhost:8000/api/v1"

# Login
print("Logging in...")
resp = requests.post(f"{BASE}/auth/login", json={"email": "tehsilofficer@gov.in", "password": "TehsilOfficer123!"})
if resp.status_code != 200:
    print(f"Login failed: {resp.status_code} {resp.text}")
    sys.exit(1)

token = resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print(f"Logged in OK, token: {token[:20]}...")

# Find a test PDF file
test_file = None
for root, dirs, files in os.walk("./storage"):
    for f in files:
        if f.endswith(".pdf"):
            test_file = os.path.join(root, f)
            break
    if test_file:
        break

if not test_file:
    print("No PDF found in storage")
    sys.exit(1)

print(f"\nUploading: {test_file} ({os.path.getsize(test_file)} bytes)")

with open(test_file, "rb") as f:
    upload_resp = requests.post(
        f"{BASE}/documents",
        headers=headers,
        files={"file": (os.path.basename(test_file), f, "application/pdf")},
        data={"doc_type": "land_record"}
    )

print(f"Upload status: {upload_resp.status_code}")
if upload_resp.status_code not in (200, 201):
    print(f"Upload failed: {upload_resp.text}")
    sys.exit(1)

doc_data = upload_resp.json()
document_id = doc_data["document"]["id"]
job_id = doc_data["job"]["id"]
print(f"Document ID: {document_id}")
print(f"Job ID: {job_id}")
print(f"Document status: {doc_data['document']['status']}")
print(f"Job status: {doc_data['job']['status']}")

# Wait for OCR to complete
print("\nWaiting for OCR processing...")
time.sleep(2)

# Check job status
job_resp = requests.get(
    f"{BASE}/documents/{document_id}/jobs/{job_id}/status",
    headers=headers
)
print(f"Job status check: {job_resp.status_code}")
if job_resp.status_code == 200:
    job_info = job_resp.json()
    print(f"Job status: {job_info.get('status')}")
    print(f"Job error: {job_info.get('error')}")
    if job_info.get('result'):
        print(f"Job result: {job_info['result']}")

# Get OCR result
print("\nFetching OCR result...")
ocr_resp = requests.get(f"{BASE}/documents/{document_id}/ocr", headers=headers)
print(f"OCR fetch status: {ocr_resp.status_code}")
if ocr_resp.status_code == 200:
    ocr_data = ocr_resp.json()
    ocr = ocr_data.get("ocr") or {}
    ocr_status = ocr.get("status")
    result = ocr.get("result") or {}
    ef = result.get("extracted_fields") or {}
    conf = ocr.get("overall_confidence")
    print(f"OCR status: {ocr_status}")
    print(f"OCR confidence: {conf}")
    print(f"Extracted {len(ef)} fields:")
    for k, v in ef.items():
        if isinstance(v, dict):
            val = v.get("final_value") or v.get("value")
            fc = v.get("final_confidence") or v.get("confidence")
            print(f"  {k}: {val} (conf={fc})")
        else:
            print(f"  {k}: {v}")
else:
    print(f"Error: {ocr_resp.text}")
