"""Fix tehsil_code for records that have incorrect scope."""
import sys, os
sys.path.insert(0, os.path.abspath("."))
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.core.database import get_mongo_database

db = get_mongo_database()

print("=== Users (email, role_assignments) ===")
for u in db.users.find({}, {"_id": 0, "email": 1, "role_assignments": 1}):
    print(u)

print("\n=== Master Records (record_id, owner, tehsil_code, status) ===")
for r in db.master_records.find({}, {"_id": 0, "record_id": 1, "owner_name": 1, "tehsil_code": 1, "status": 1}):
    tc = r.get("tehsil_code", "NONE")
    print(f"  {r.get('record_id')} | {r.get('owner_name')} | tehsil_code={tc} | status={r.get('status')}")

# Fix: any record without a proper tehsil_code → default to TH-HAVELI
result = db.master_records.update_many(
    {"tehsil_code": {"$nin": ["TH-HAVELI", "TH-MULSHI", "TH-MAVAL", "TH-SHIRUR", "TH-BARAMATI"]}},
    {"$set": {"tehsil_code": "TH-HAVELI"}}
)
print(f"\nFixed {result.modified_count} records with invalid tehsil_code → TH-HAVELI")

print("\n=== After fix ===")
for r in db.master_records.find({}, {"_id": 0, "record_id": 1, "owner_name": 1, "tehsil_code": 1, "status": 1}):
    print(f"  {r.get('record_id')} | tehsil_code={r.get('tehsil_code')}")
