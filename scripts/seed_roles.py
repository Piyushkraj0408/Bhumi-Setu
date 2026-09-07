"""Run once against a fresh MongoDB database: python -m scripts.seed_roles

Creates the base roles/permissions and grants them per the hierarchy.
Seeds default test users for all 6 administration roles.
"""

import sys
from pymongo.errors import OperationFailure, ServerSelectionTimeoutError
from app.core.config import settings
from app.core.database import get_mongo_database, init_db
from app.services import auth_service

PERMISSIONS = [
    "UPLOAD_DOCUMENT",
    "PROCESS_DOCUMENT",
    "VIEW_RECORD",
    "EDIT_RECORD",
    "VERIFY_RECORD",
    "APPROVE_RECORD",
    "EXPORT_DATA",
    "VIEW_AUDIT",
    "MANAGE_USERS",
]

ROLE_PERMISSIONS = {
    "super_admin": PERMISSIONS,  # everything
    "state_admin": [
        "UPLOAD_DOCUMENT", "PROCESS_DOCUMENT", "VIEW_RECORD", "EDIT_RECORD",
        "VERIFY_RECORD", "APPROVE_RECORD", "EXPORT_DATA", "VIEW_AUDIT", "MANAGE_USERS",
    ],
    "district_admin": [
        "UPLOAD_DOCUMENT", "PROCESS_DOCUMENT", "VIEW_RECORD", "EDIT_RECORD",
        "VERIFY_RECORD", "APPROVE_RECORD", "VIEW_AUDIT",
    ],
    "tehsil_officer": [
        "UPLOAD_DOCUMENT", "PROCESS_DOCUMENT", "VIEW_RECORD", "EDIT_RECORD", "VERIFY_RECORD",
    ],
    "verification_officer": ["VIEW_RECORD", "VERIFY_RECORD"],
    "auditor": ["VIEW_RECORD", "VIEW_AUDIT", "EXPORT_DATA"],
    "citizen": ["VIEW_RECORD"],
}

DEFAULT_TEST_USERS = [
    ("citizen@gov.in", "Citizen123!", "Ramesh Patil (Land Owner)", "citizen", None, None),
    ("superadmin@gov.in", "AdminPassword123!", "Super Administrator", "super_admin", None, None),
    ("stateadmin@gov.in", "StateAdmin123!", "State Land Director", "state_admin", "state", "ST-MAHA"),
    ("districtadmin@gov.in", "DistrictAdmin123!", "District Collector Pune", "district_admin", "district", "D-PUNE"),
    ("tehsilofficer@gov.in", "TehsilOfficer123!", "Tehsildar Haveli", "tehsil_officer", "tehsil", "TH-HAVELI"),
    ("verifier@gov.in", "Verifier123!", "Land Record Verifier", "verification_officer", "tehsil", "TH-HAVELI"),
    ("auditor@gov.in", "Auditor123!", "Vigilance Auditor", "auditor", None, None),
]

SAMPLE_MASTER_RECORDS = [
    {
        "record_id": "LR-2024-1",
        "document_id": "doc-sample-1",
        "khasra_number": "42/1",
        "khata_number": "108",
        "owner_name": "Ramesh Patil",
        "father_or_husband_name": "Ganpat Patil",
        "village": "Haveli",
        "tehsil": "Haveli",
        "district": "Pune",
        "total_area_sq_meters": 9914.8,
        "status": "approved",
        "tehsil_code": "TH-HAVELI",
    },
    {
        "record_id": "LR-2024-2",
        "document_id": "doc-sample-2",
        "khasra_number": "108/B",
        "khata_number": "214",
        "owner_name": "Anand Rao",
        "father_or_husband_name": "Venkatesh Rao",
        "village": "Wagholi",
        "tehsil": "Haveli",
        "district": "Pune",
        "total_area_sq_meters": 7284.3,
        "status": "approved",
        "tehsil_code": "TH-HAVELI",
    },
    {
        "record_id": "LR-2024-3",
        "document_id": "doc-sample-3",
        "khasra_number": "77/3",
        "khata_number": "92",
        "owner_name": "Suresh Patil",
        "father_or_husband_name": "Ramchandra Patil",
        "village": "Hinjewadi",
        "tehsil": "Mulshi",
        "district": "Pune",
        "total_area_sq_meters": 16673.1,
        "status": "approved",
        "tehsil_code": "TH-MULSHI",
    },
    {
        "record_id": "LR-2024-4",
        "document_id": "doc-sample-4",
        "khasra_number": "15/2",
        "khata_number": "55",
        "owner_name": "Sunita Sharma",
        "father_or_husband_name": "Omprakash Sharma",
        "village": "Kothrud",
        "tehsil": "Haveli",
        "district": "Pune",
        "total_area_sq_meters": 4046.86,
        "status": "approved",
        "tehsil_code": "TH-HAVELI",
    },
    {
        "record_id": "LR-2024-5",
        "document_id": "doc-sample-5",
        "khasra_number": "91/A",
        "khata_number": "301",
        "owner_name": "Pooja Deshmukh",
        "father_or_husband_name": "Pratap Deshmukh",
        "village": "Shivajinagar",
        "tehsil": "Haveli",
        "district": "Pune",
        "total_area_sq_meters": 8093.72,
        "status": "approved",
        "tehsil_code": "TH-HAVELI",
    },
]


def seed():
    if "<db_password>" in settings.mongodb_uri or "<password>" in settings.mongodb_uri:
        print("\n[ERROR] Password placeholder '<db_password>' found in .env file.")
        print("Please run: python -m scripts.set_mongo_credentials")
        print("Or edit .env and replace '<db_password>' with your real password.\n")
        sys.exit(1)

    try:
        print("[1/4] Connecting to MongoDB and creating indexes...")
        init_db()
        db = get_mongo_database()

        # Ping test
        db.command("ping")
        print("[2/4] Connected successfully! Seeding permissions...")

        for name in PERMISSIONS:
            db.permissions.update_one(
                {"name": name},
                {"$set": {"name": name}},
                upsert=True,
            )

        print("[3/4] Seeding roles and permissions...")
        for role_name, perms in ROLE_PERMISSIONS.items():
            db.roles.update_one(
                {"name": role_name},
                {"$set": {"name": role_name, "permissions": perms}},
                upsert=True,
            )

        print("[4/4] Seeding default test users for all roles...")
        for email, password, name, role_name, scope_type, scope_id in DEFAULT_TEST_USERS:
            existing = db.users.find_one({"email": email})
            if not existing:
                auth_service.create_user(
                    db,
                    email=email,
                    password=password,
                    name=name,
                    role_name=role_name,
                    scope_type=scope_type,
                    scope_id=scope_id,
                )
                print(f" -> Created user: {email} ({role_name})")
            else:
                print(f" -> User exists: {email}")

        print("\n[5/5] Seeding verified master land records...")
        from datetime import datetime, timezone
        now_dt = datetime.now(timezone.utc)
        for r in SAMPLE_MASTER_RECORDS:
            r_doc = r.copy()
            r_doc["created_at"] = now_dt
            r_doc["last_updated"] = now_dt
            db.master_records.update_one(
                {"record_id": r["record_id"]},
                {"$set": r_doc},
                upsert=True,
            )
            print(f" -> Master record synced: {r['record_id']} (Khasra {r['khasra_number']} - {r['owner_name']})")

        print("\nSUCCESS: MongoDB Database Seeded Successfully!")

    except OperationFailure as e:
        print(f"\n[ERROR] MongoDB Authentication Failed: {e.details.get('errmsg', str(e))}")
        print("\nHow to fix:")
        print("Run: python -m scripts.set_mongo_credentials")
        sys.exit(1)
    except ServerSelectionTimeoutError as e:
        print(f"\n[ERROR] MongoDB Connection Timeout: {e}")
        print("\nHow to fix:")
        print("1. Go to MongoDB Atlas -> 'Network Access' tab.")
        print("2. Click 'Add IP Address' -> Choose 'Allow Access from Anywhere' (0.0.0.0/0) -> Save.")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    seed()
