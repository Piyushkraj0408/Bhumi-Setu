import pytest
from fastapi.testclient import TestClient


def test_user_signup_success(fake_db, client: TestClient):
    """Confirm a new user can sign up successfully and receive JWT tokens."""
    payload = {
        "name": "Shri Anand Rao",
        "email": "anand.rao@gov.in",
        "password": "SecurePassword123!",
        "role_name": "tehsil_officer",
        "scope_type": "tehsil",
        "scope_id": "TH-HAVELI",
    }
    response = client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

    # Verify user exists in database
    user_doc = fake_db.users.find_one({"email": "anand.rao@gov.in"})
    assert user_doc is not None
    assert user_doc["name"] == "Shri Anand Rao"
    assert user_doc["role_assignments"][0]["role_name"] == "tehsil_officer"
    assert user_doc["role_assignments"][0]["scope_id"] == "TH-HAVELI"


def test_user_signup_token_authenticates_me_endpoint(fake_db, client: TestClient):
    """Confirm the issued access token allows immediately calling /api/v1/auth/me."""
    payload = {
        "name": "Pooja Deshmukh",
        "email": "pooja.deshmukh@gov.in",
        "password": "StrongPassword456!",
        "role_name": "verification_officer",
        "scope_type": "tehsil",
        "scope_id": "TH-PUNE",
    }
    signup_res = client.post("/api/v1/auth/signup", json=payload)
    assert signup_res.status_code == 201
    token = signup_res.json()["access_token"]

    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["name"] == "Pooja Deshmukh"
    assert me_data["email"] == "pooja.deshmukh@gov.in"
    assert any(r["role_name"] == "verification_officer" for r in me_data["roles"])


def test_user_signup_duplicate_email_conflict(fake_db, client: TestClient):
    """Confirm signing up with an already registered email returns 409 Conflict."""
    payload = {
        "name": "Officer One",
        "email": "existing.user@gov.in",
        "password": "Password123!",
        "role_name": "tehsil_officer",
    }
    res1 = client.post("/api/v1/auth/signup", json=payload)
    assert res1.status_code == 201

    # Second signup with same email
    res2 = client.post("/api/v1/auth/signup", json=payload)
    assert res2.status_code == 409
    assert "already registered" in res2.json()["detail"].lower()


def test_consumer_signup_defaults_to_citizen(fake_db, client: TestClient):
    """Confirm a consumer signup without role defaults to 'citizen' and can view records."""
    payload = {
        "name": "Kavita Patil",
        "email": "kavita.patil@example.com",
        "password": "Password123!",
    }
    res = client.post("/api/v1/auth/signup", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data

    # Verify user saved with citizen role
    user = fake_db.users.find_one({"email": "kavita.patil@example.com"})
    assert user is not None
    assert user["role_assignments"][0]["role_name"] == "citizen"

    # Verify profile via /auth/me
    token = data["access_token"]
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    assert any(r["role_name"] == "citizen" for r in me_res.json()["roles"])

