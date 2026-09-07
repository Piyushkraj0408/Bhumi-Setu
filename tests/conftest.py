"""
conftest.py — Shared fixtures for RBAC & scoping tests.

Strategy:
  - Use an in-memory dict-backed collection (FakeCollection) that supports
    the MongoDB query operators used by our routes ($and, $or, dot-notation).
  - Patch `app.core.database.get_db` to return the mock DB.
  - Mint real JWT access tokens signed with the app's secret key so the full
    `get_current_user` dependency chain is exercised without hitting production.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token


# ---------------------------------------------------------------------------
# In-memory MongoDB-like store
# ---------------------------------------------------------------------------

class FakeCollection:
    """Minimal dict-backed collection supporting find/find_one/insert_one/update_one."""

    def __init__(self):
        self._docs: list[dict] = []

    def insert_one(self, doc: dict):
        self._docs.append(doc.copy())
        result = MagicMock()
        result.inserted_id = doc.get("_id", doc.get("id"))
        return result

    # ------------------------------------------------------------------
    # Query helpers
    # ------------------------------------------------------------------
    def _match(self, doc: dict, query: dict) -> bool:
        for key, val in query.items():
            if key == "$and":
                if not all(self._match(doc, sub) for sub in val):
                    return False
            elif key == "$or":
                if not any(self._match(doc, sub) for sub in val):
                    return False
            elif isinstance(val, dict):
                doc_val = self._get_nested(doc, key)
                for op, operand in val.items():
                    if op == "$in" and doc_val not in operand:
                        return False
                    elif op == "$eq" and doc_val != operand:
                        return False
            else:
                doc_val = self._get_nested(doc, key)
                if doc_val != val:
                    return False
        return True

    @staticmethod
    def _get_nested(doc: dict, key: str):
        parts = key.split(".")
        cur = doc
        for part in parts:
            if not isinstance(cur, dict):
                return None
            cur = cur.get(part)
        return cur

    def find(self, query: dict = None):
        query = query or {}
        return FakeList([d for d in self._docs if self._match(d, query)])

    def find_one(self, query: dict = None):
        query = query or {}
        for d in self._docs:
            if self._match(d, query):
                return d
        return None

    def update_one(self, query: dict, update: dict):
        for i, d in enumerate(self._docs):
            if self._match(d, query):
                if "$set" in update:
                    for k, v in update["$set"].items():
                        parts = k.split(".")
                        cur = self._docs[i]
                        for part in parts[:-1]:
                            cur = cur.setdefault(part, {})
                        cur[parts[-1]] = v
                break

    def delete_one(self, query: dict):
        for i, d in enumerate(self._docs):
            if self._match(d, query):
                self._docs.pop(i)
                return


class FakeList(list):
    """List with .skip()/.limit() chaining support."""
    def skip(self, n):
        return FakeList(self[n:])

    def limit(self, n):
        return FakeList(self[:n])


class FakeDB:
    """Top-level fake database with named collection access."""

    def __init__(self):
        self._collections: dict[str, FakeCollection] = {}

    def __getattr__(self, name: str) -> FakeCollection:
        if name.startswith("_"):
            raise AttributeError(name)
        if name not in self._collections:
            self._collections[name] = FakeCollection()
        return self._collections[name]


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def fake_db():
    return FakeDB()


@pytest.fixture(autouse=True)
def fake_db_clean(fake_db):
    """Wipe all collections before each test."""
    for col in list(fake_db._collections.values()):
        col._docs.clear()
    yield


def _make_user(
    *,
    role: str,
    state_id: str | None = None,
    district_id: str | None = None,
    tehsil_id: str | None = None,
    user_id: str | None = None,
    email: str | None = None,
) -> tuple[dict, str]:
    """Return (user_doc, jwt_token)."""
    uid = user_id or str(uuid.uuid4())
    email = email or f"{role}@test.local"
    user_doc = {
        "_id": uid,
        "id": uid,
        "email": email,
        "name": role.replace("_", " ").title(),
        "password_hash": "hashed",
        "status": "active",
        "role": role,
        "state_id": state_id,
        "district_id": district_id,
        "tehsil_id": tehsil_id,
        "role_assignments": [
            {
                "role_name": role,
                "scope_type": (
                    "state" if state_id else
                    "district" if district_id else
                    "tehsil" if tehsil_id else
                    "national"
                ),
                "scope_id": state_id or district_id or tehsil_id or "ALL",
            }
        ],
        "created_at": datetime.now(timezone.utc),
    }
    token = create_access_token(subject=uid)
    return user_doc, token


@pytest.fixture()
def verification_officer_a(fake_db):
    uid = str(uuid.uuid4())
    doc, token = _make_user(role="verification_officer", user_id=uid)
    fake_db.users.insert_one(doc)
    return doc, token


@pytest.fixture()
def district_admin_a(fake_db):
    doc, token = _make_user(role="district_admin", district_id="DIST-PUNE")
    fake_db.users.insert_one(doc)
    return doc, token


@pytest.fixture()
def district_admin_b(fake_db):
    doc, token = _make_user(
        role="district_admin",
        district_id="DIST-NASHIK",
        email="da_b@test.local",
    )
    fake_db.users.insert_one(doc)
    return doc, token


@pytest.fixture()
def super_admin_user(fake_db):
    doc, token = _make_user(role="super_admin", email="superadmin@test.local")
    fake_db.users.insert_one(doc)
    return doc, token


@pytest.fixture()
def client(fake_db):
    """TestClient with DB dependency overridden to use fake_db."""
    from app.main import app
    from app.core.database import get_db

    app.dependency_overrides[get_db] = lambda: fake_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()
