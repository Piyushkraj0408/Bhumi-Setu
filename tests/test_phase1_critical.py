import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import Settings
from app.services import auth_service


def test_cors_whitelisted_origin_allowed(client: TestClient):
    """Confirm a request from a whitelisted origin succeeds with proper CORS headers."""
    response = client.options(
        "/api/v1/auth/me",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert response.headers.get("access-control-allow-credentials") == "true"


def test_cors_disallowed_origin_rejected(client: TestClient):
    """Confirm a request from a non-whitelisted origin does NOT get access-control-allow-origin."""
    response = client.options(
        "/api/v1/auth/me",
        headers={
            "Origin": "http://evil-attacker-site.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    # Disallowed origin is not reflected in access-control-allow-origin header
    assert response.headers.get("access-control-allow-origin") != "http://evil-attacker-site.com"


def test_wildcard_cors_with_credentials_raises_error():
    """Confirm that wildcard origin '*' with credentials validation raises ValueError."""
    with pytest.raises(ValueError, match="strictly prohibited"):
        s = Settings(allowed_origins="*,http://localhost:5173")
        _ = s.cors_origins


def test_invalid_refresh_token_returns_401(client: TestClient):
    """Confirm an invalid or expired refresh token returns 401 Unauthorized."""
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "invalid.expired.jwt.token"},
    )
    assert response.status_code == 401


def test_all_6_roles_login_authenticates_correctly(fake_db, client: TestClient):
    """Verify each of the 6 roles can authenticate and retain their exact role identity."""
    from tests.conftest import _make_user

    roles = [
        ("super_admin", "superadmin@gov.in", None, None, None),
        ("state_admin", "stateadmin@gov.in", "ST-MAHA", None, None),
        ("district_admin", "districtadmin@gov.in", None, "DIST-PUNE", None),
        ("tehsil_officer", "tehsilofficer@gov.in", None, None, "TH-HAVELI"),
        ("verification_officer", "verifier@gov.in", None, None, "TH-HAVELI"),
        ("auditor", "auditor@gov.in", None, None, None),
    ]

    for role_name, email, st_id, dst_id, th_id in roles:
        doc, _ = _make_user(
            role=role_name,
            email=email,
            state_id=st_id,
            district_id=dst_id,
            tehsil_id=th_id,
        )
        fake_db.users.insert_one(doc)
        access_tok, refresh_tok = auth_service.issue_tokens(fake_db, doc)

        # Call /api/v1/auth/me with access token
        resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_tok}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == email
        assert any(r["role_name"] == role_name for r in data["roles"])
