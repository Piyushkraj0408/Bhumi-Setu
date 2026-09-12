import pytest
from fastapi.testclient import TestClient
from tests.conftest import _make_user
from app.services import auth_service


@pytest.fixture
def auth_header(fake_db):
    user_doc, _ = _make_user(role="tehsil_officer", tehsil_id="TH-HAVELI")
    fake_db.users.insert_one(user_doc)
    access_token, _ = auth_service.issue_tokens(fake_db, user_doc)
    return {"Authorization": f"Bearer {access_token}"}


def test_create_sale_transaction_with_subdivision(client: TestClient, auth_header: dict, fake_db):
    """Test creating a partial sale transaction with authentic seller, buyer, and master land records."""
    seller_doc, _ = _make_user(role="public_user", email="seller.ram@test.local")
    seller_doc["name"] = "Authentic Seller Ram"
    fake_db.users.insert_one(seller_doc)
    seller_id = seller_doc["_id"]

    buyer_doc, _ = _make_user(role="public_user", email="buyer.mohan@test.local")
    buyer_doc["name"] = "Authentic Buyer Mohan"
    fake_db.users.insert_one(buyer_doc)
    buyer_id = buyer_doc["_id"]

    # Insert authentic Khasra master record (e.g. Khasra 125 with 2.5 acre)
    khasra_doc = {
        "_id": "khasra-125-uuid",
        "khasra_number": "125",
        "area": 2.5,
        "total_area_sq_meters": 2.5,
        "area_unit": "acre",
        "current_owner_id": str(seller_id),
        "owner_name": "Authentic Seller Ram",
        "is_active": True,
        "status": "active",
        "village": "Haveli",
        "district": "Pune",
        "state": "Maharashtra"
    }
    fake_db.master_records.insert_one(khasra_doc)

    payload = {
        "transaction_type": "SALE",
        "seller_id": str(seller_id),
        "buyer_id": str(buyer_id),
        "original_khasra_number": "125",
        "transferred_area": 1.0,
        "ownership_percentage_transferred": 40.0,
        "area_unit": "acre",
        "document_info": {
            "registry_number": "REG-2026-9901",
            "remarks": "Sub-Registrar Haveli Registration"
        },
        "remarks": "Partial land transfer with subdivision"
    }

    response = client.post("/api/v1/transactions", json=payload, headers=auth_header)
    assert response.status_code == 201
    data = response.json()
    assert data["transaction_id"].startswith("TXN-")
    assert data["original_khasra_number"] == "125"
    assert data["transferred_area"] == 1.0
    assert data["remaining_area"] == 1.5
    assert data["is_subdivided"] is True
    assert len(data["child_khasra_numbers"]) == 2
    assert "125/1" in data["child_khasra_numbers"]
    assert "125/2" in data["child_khasra_numbers"]

    # Verify querying by khasra
    get_resp = client.get("/api/v1/transactions/khasra/125", headers=auth_header)
    assert get_resp.status_code == 200
    records = get_resp.json()
    assert len(records) >= 1
    assert records[0]["transaction_id"] == data["transaction_id"]

    # Verify querying ownership history
    history_resp = client.get("/api/v1/transactions/khasra/125/history", headers=auth_header)
    assert history_resp.status_code == 200
    history_data = history_resp.json()
    assert history_data["khasra_number"] == "125"
    assert len(history_data["timeline"]) >= 1


def test_transaction_area_validation(client: TestClient, auth_header: dict, fake_db):
    """Verify that transferred area cannot exceed available land area in master_records."""
    seller_doc, _ = _make_user(role="public_user", email="seller2@test.local")
    seller_doc["name"] = "Owner Ram"
    fake_db.users.insert_one(seller_doc)
    seller_id = seller_doc["_id"]

    buyer_doc, _ = _make_user(role="public_user", email="buyer2@test.local")
    buyer_doc["name"] = "Buyer Mohan"
    fake_db.users.insert_one(buyer_doc)
    buyer_id = buyer_doc["_id"]

    khasra_doc = {
        "_id": "khasra-200-uuid",
        "khasra_number": "200",
        "area": 2.0,
        "total_area_sq_meters": 2.0,
        "is_active": True,
        "status": "active"
    }
    fake_db.master_records.insert_one(khasra_doc)

    payload = {
        "transaction_type": "SALE",
        "seller_id": str(seller_id),
        "buyer_id": str(buyer_id),
        "original_khasra_number": "200",
        "transferred_area": 3.5,  # Exceeds total area of 2.0
        "ownership_percentage_transferred": 100.0,
        "area_unit": "acre",
        "document_info": {
            "registry_number": "REG-2026-9902"
        }
    }

    response = client.post("/api/v1/transactions", json=payload, headers=auth_header)
    assert response.status_code == 400
    assert "cannot exceed available land area" in response.json()["detail"]
