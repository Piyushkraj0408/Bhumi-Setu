"""
tests/test_rbac_scoping.py
==========================
Automated pytest suite verifying RBAC enforcement and geographic data scoping.

Test Coverage
─────────────
A) 403 Forbidden  — verification_officer cannot call APPROVE_RECORD endpoint.
B) 404 Anti-IDOR  — district_admin from District A cannot view/edit a record
                    belonging to District B (even though EDIT_RECORD is in
                    their permission list).
C) Scope Isolation — verification_officer can only see records where
                     assigned_to_user_id == their own id.
"""

import uuid
from datetime import datetime, timezone

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _insert_record(
    fake_db,
    *,
    record_id: str | None = None,
    district_id: str | None = None,
    state_id: str | None = None,
    tehsil_id: str | None = None,
    assigned_to_user_id: str | None = None,
    status: str = "processed",
) -> str:
    rid = record_id or str(uuid.uuid4())
    fake_db.documents.insert_one(
        {
            "_id": rid,
            "id": rid,
            "original_filename": f"test_record_{rid}.pdf",
            "doc_type": "khasra",
            "status": status,
            "state_id": state_id,
            "district_id": district_id,
            "tehsil_id": tehsil_id,
            "assigned_to_user_id": assigned_to_user_id,
            "created_by": "seed_user",
            "created_at": datetime.now(timezone.utc),
            "metadata": {
                "khasra_number": "KH-001",
                "owner_name": "Test Owner",
                "village": "Test Village",
                "tehsil": "Test Tehsil",
                "district": "Test District",
                "area_sq_meters": 1000.0,
                "approval_status": "pending",
            },
        }
    )
    return rid


# ===========================================================================
# Suite A — Permission Enforcement (RBAC)
# ===========================================================================


class TestPermissionEnforcement:
    """Role → permitted / forbidden action mapping."""

    # -----------------------------------------------------------------------
    # A-1  verification_officer → APPROVE_RECORD  (expects 403)
    # -----------------------------------------------------------------------

    def test_verification_officer_cannot_approve_record(
        self, client, fake_db, verification_officer_a
    ):
        """
        GIVEN a verification_officer (has VIEW_RECORD, VERIFY_RECORD)
        WHEN  they POST to /records/{id}/approve
        THEN  the API must return HTTP 403 Forbidden.
        """
        vo_doc, vo_token = verification_officer_a

        # Insert a record assigned specifically to this officer
        rid = _insert_record(
            fake_db,
            assigned_to_user_id=str(vo_doc["id"]),
            district_id="DIST-PUNE",
            state_id="STATE-MH",
        )

        resp = client.post(
            f"/api/v1/records/{rid}/approve",
            json={"remarks": "Looks good"},
            headers=_auth(vo_token),
        )

        assert resp.status_code == 403, (
            f"Expected 403 Forbidden but got {resp.status_code}: {resp.text}"
        )
        body = resp.json()
        assert "detail" in body, "Response should contain a 'detail' error field"

    # -----------------------------------------------------------------------
    # A-2  verification_officer → EDIT_RECORD  (expects 403)
    # -----------------------------------------------------------------------

    def test_verification_officer_cannot_edit_record(
        self, client, fake_db, verification_officer_a
    ):
        """
        GIVEN a verification_officer
        WHEN  they PUT to /records/{id}
        THEN  the API must return HTTP 403 Forbidden.
        """
        vo_doc, vo_token = verification_officer_a

        rid = _insert_record(
            fake_db,
            assigned_to_user_id=str(vo_doc["id"]),
        )

        resp = client.put(
            f"/api/v1/records/{rid}",
            json={"owner_name": "Hacked Name"},
            headers=_auth(vo_token),
        )

        assert resp.status_code == 403, (
            f"Expected 403 but got {resp.status_code}: {resp.text}"
        )

    # -----------------------------------------------------------------------
    # A-3  verification_officer CAN verify (VIEW_RECORD + VERIFY_RECORD)
    # -----------------------------------------------------------------------

    def test_verification_officer_can_view_own_record(
        self, client, fake_db, verification_officer_a
    ):
        """
        GIVEN a verification_officer
        WHEN  they GET /records/{id} for a record assigned to them
        THEN  the API must return HTTP 200.
        """
        vo_doc, vo_token = verification_officer_a

        rid = _insert_record(
            fake_db,
            assigned_to_user_id=str(vo_doc["id"]),
        )

        resp = client.get(
            f"/api/v1/records/{rid}",
            headers=_auth(vo_token),
        )

        assert resp.status_code == 200, (
            f"Expected 200 but got {resp.status_code}: {resp.text}"
        )
        data = resp.json()
        assert data["id"] == rid


# ===========================================================================
# Suite B — Anti-IDOR Geographic Scoping
# ===========================================================================


class TestAntiIDORGeographicScoping:
    """district_admin can only see records in their own district."""

    # -----------------------------------------------------------------------
    # B-1  GET /records/{id}  cross-district  →  404
    # -----------------------------------------------------------------------

    def test_district_admin_cannot_get_other_district_record(
        self, client, fake_db, district_admin_a, district_admin_b
    ):
        """
        GIVEN district_admin_a is scoped to DIST-PUNE
        WHEN  they GET /records/{id} for a record belonging to DIST-NASHIK
        THEN  the API must return HTTP 404 (not 403, to avoid existence leakage).
        """
        _, da_a_token = district_admin_a

        # Record belongs to District B (NASHIK)
        rid = _insert_record(fake_db, district_id="DIST-NASHIK")

        resp = client.get(
            f"/api/v1/records/{rid}",
            headers=_auth(da_a_token),
        )

        assert resp.status_code == 404, (
            f"Anti-IDOR violation: district_admin_a should NOT see a NASHIK "
            f"record. Got {resp.status_code}: {resp.text}"
        )

    # -----------------------------------------------------------------------
    # B-2  PUT /records/{id}  cross-district  →  404
    # -----------------------------------------------------------------------

    def test_district_admin_cannot_edit_other_district_record(
        self, client, fake_db, district_admin_a
    ):
        """
        GIVEN district_admin_a is scoped to DIST-PUNE (has EDIT_RECORD permission)
        WHEN  they PUT /records/{id} for a record belonging to DIST-NASHIK
        THEN  the API must return HTTP 404 — permission alone is not enough.
        """
        _, da_a_token = district_admin_a

        rid = _insert_record(fake_db, district_id="DIST-NASHIK")

        resp = client.put(
            f"/api/v1/records/{rid}",
            json={"owner_name": "Injected Owner"},
            headers=_auth(da_a_token),
        )

        assert resp.status_code == 404, (
            f"Anti-IDOR violation: EDIT across district boundary should return 404. "
            f"Got {resp.status_code}: {resp.text}"
        )

    # -----------------------------------------------------------------------
    # B-3  district_admin_a CAN get their own district record
    # -----------------------------------------------------------------------

    def test_district_admin_can_get_own_district_record(
        self, client, fake_db, district_admin_a
    ):
        """
        GIVEN district_admin_a is scoped to DIST-PUNE
        WHEN  they GET /records/{id} for a PUNE record
        THEN  the API must return HTTP 200.
        """
        _, da_a_token = district_admin_a

        rid = _insert_record(fake_db, district_id="DIST-PUNE")

        resp = client.get(
            f"/api/v1/records/{rid}",
            headers=_auth(da_a_token),
        )

        assert resp.status_code == 200, (
            f"Expected 200 for own-district record, got {resp.status_code}: {resp.text}"
        )

    # -----------------------------------------------------------------------
    # B-4  district_admin_a list endpoint returns only their district records
    # -----------------------------------------------------------------------

    def test_district_admin_list_filtered_to_own_district(
        self, client, fake_db, district_admin_a
    ):
        """
        GIVEN two records — one PUNE, one NASHIK — in the database
        WHEN  district_admin_a (PUNE) calls GET /records
        THEN  only the PUNE record appears in the response.
        """
        _, da_a_token = district_admin_a

        pune_id = _insert_record(fake_db, district_id="DIST-PUNE")
        _insert_record(fake_db, district_id="DIST-NASHIK")

        resp = client.get("/api/v1/records", headers=_auth(da_a_token))

        assert resp.status_code == 200, (
            f"List records failed: {resp.status_code}: {resp.text}"
        )
        records = resp.json()
        record_ids = [r["id"] for r in records]

        assert pune_id in record_ids, "PUNE record must appear in scoped list"
        assert all(
            r.get("district_id") == "DIST-PUNE" for r in records
        ), "Scoped list must ONLY contain PUNE records"


# ===========================================================================
# Suite C — Verification Officer Scope Isolation
# ===========================================================================


class TestVerificationOfficerScopeIsolation:
    """verification_officer can only see records assigned to them."""

    # -----------------------------------------------------------------------
    # C-1  GET /records/{id} for unassigned record → 404
    # -----------------------------------------------------------------------

    def test_verification_officer_cannot_see_unassigned_record(
        self, client, fake_db, verification_officer_a
    ):
        """
        GIVEN verification_officer_a exists
        WHEN  they GET /records/{id} for a record NOT assigned to them
        THEN  the API must return HTTP 404.
        """
        vo_doc, vo_token = verification_officer_a
        other_officer_id = str(uuid.uuid4())

        # Record assigned to a different officer
        rid = _insert_record(
            fake_db,
            assigned_to_user_id=other_officer_id,
        )

        resp = client.get(
            f"/api/v1/records/{rid}",
            headers=_auth(vo_token),
        )

        assert resp.status_code == 404, (
            f"Scope violation: verification_officer should NOT access unassigned "
            f"record. Got {resp.status_code}: {resp.text}"
        )

    # -----------------------------------------------------------------------
    # C-2  GET /records (list) returns ONLY assigned records
    # -----------------------------------------------------------------------

    def test_verification_officer_list_only_assigned_records(
        self, client, fake_db, verification_officer_a
    ):
        """
        GIVEN three records: one assigned to VO-A, two to other officers
        WHEN  VO-A calls GET /records
        THEN  only the record assigned to VO-A is returned.
        """
        vo_doc, vo_token = verification_officer_a
        vo_id = str(vo_doc["id"])

        assigned_id = _insert_record(fake_db, assigned_to_user_id=vo_id)
        _insert_record(fake_db, assigned_to_user_id=str(uuid.uuid4()))
        _insert_record(fake_db, assigned_to_user_id=str(uuid.uuid4()))

        resp = client.get("/api/v1/records", headers=_auth(vo_token))

        assert resp.status_code == 200, (
            f"List records failed: {resp.status_code}: {resp.text}"
        )
        records = resp.json()
        record_ids = [r["id"] for r in records]

        assert assigned_id in record_ids, "VO's own assigned record must be visible"
        assert len(records) == 1, (
            f"VO should only see 1 record (their own), but got {len(records)}"
        )

    # -----------------------------------------------------------------------
    # C-3  GET /records/{id} for record assigned to self → 200
    # -----------------------------------------------------------------------

    def test_verification_officer_can_see_own_assigned_record(
        self, client, fake_db, verification_officer_a
    ):
        """
        GIVEN verification_officer_a exists
        WHEN  they GET /records/{id} for a record assigned to them
        THEN  the API must return HTTP 200.
        """
        vo_doc, vo_token = verification_officer_a
        vo_id = str(vo_doc["id"])

        rid = _insert_record(fake_db, assigned_to_user_id=vo_id)

        resp = client.get(
            f"/api/v1/records/{rid}",
            headers=_auth(vo_token),
        )

        assert resp.status_code == 200, (
            f"Expected 200 for own assigned record, got {resp.status_code}: {resp.text}"
        )
        assert resp.json()["id"] == rid


# ===========================================================================
# Suite D — Authentication Edge Cases
# ===========================================================================


class TestAuthenticationEdgeCases:
    """Unauthenticated / tampered requests should always be rejected."""

    def test_no_token_returns_403_or_401(self, client):
        """Requests without a Bearer token must be rejected."""
        resp = client.get("/api/v1/records")
        assert resp.status_code in (401, 403), (
            f"Expected 401/403 for unauthenticated request, got {resp.status_code}"
        )

    def test_invalid_token_returns_401(self, client):
        """Requests with an invalid/tampered token must be rejected."""
        resp = client.get(
            "/api/v1/records",
            headers={"Authorization": "Bearer totally.invalid.token"},
        )
        assert resp.status_code == 401, (
            f"Expected 401 for invalid token, got {resp.status_code}"
        )

    def test_super_admin_can_access_any_record(
        self, client, fake_db, super_admin_user
    ):
        """super_admin has no geographic restriction — can see any record."""
        _, sa_token = super_admin_user

        # Insert a record with an unrelated district
        rid = _insert_record(fake_db, district_id="DIST-SOME-REMOTE")

        resp = client.get(
            f"/api/v1/records/{rid}",
            headers=_auth(sa_token),
        )

        assert resp.status_code == 200, (
            f"super_admin should access any record. Got {resp.status_code}: {resp.text}"
        )
