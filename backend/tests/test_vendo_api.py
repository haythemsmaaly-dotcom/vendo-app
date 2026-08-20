"""Vendo API tests covering CRUD on /api/items and /api/stats."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://vendo-continue.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _sample_item_payload(name="TEST_Item"):
    return {
        "photo": "https://example.com/x.jpg",
        "photos": ["https://example.com/x.jpg"],
        "name": name,
        "brand": "TESTBrand",
        "model": "TM1",
        "category": "Tests",
        "condition": "Neuf",
        "confidence": 90,
        "missing_info": [],
        "photo_coach": [],
        "market_low": 100,
        "market_high": 200,
        "strategies": [
            {"key": "fast", "label": "Vente rapide", "price": 95, "explanation": "x"},
            {"key": "smart", "label": "Prix intelligent", "price": 150, "explanation": "x"},
            {"key": "max", "label": "Prix maximum", "price": 204, "explanation": "x"},
        ],
        "selected_strategy": "smart",
        "listing": {
            "title": "TEST Title",
            "description": "TEST description",
            "category": "Tests",
            "keywords": ["test"],
            "condition": "Neuf",
            "price": 150,
        },
        "sell_score": 70,
        "sell_score_breakdown": {"prix": 20, "photos": 15, "description": 15, "condition": 10, "titre": 10},
        "sell_plan": {
            "mode": "balanced",
            "start_price": 150,
            "adjusted_price": 138,
            "minimum_price": 90,
            "target_date": "2026-02-01",
            "adjustment_days": 7,
        },
        "status": "draft",
    }


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- Health ----
def test_root(client):
    r = client.get(f"{API}/")
    assert r.status_code == 200
    assert "Vendo" in r.json().get("message", "")


# ---- List seeded items ----
def test_list_items_seeded(client):
    r = client.get(f"{API}/items")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 5, f"Expected 5+ seeded items, got {len(data)}"
    it = data[0]
    for k in ("id", "name", "listing", "strategies", "sell_plan", "sell_score", "status"):
        assert k in it


# ---- Stats ----
def test_stats(client):
    r = client.get(f"{API}/stats")
    assert r.status_code == 200
    d = r.json()
    for k in ("total_items", "total_potential", "items_sold", "total_earned", "average_sale_price"):
        assert k in d
    assert d["total_items"] >= 5
    assert d["items_sold"] >= 1


# ---- CRUD flow ----
class TestItemCRUD:
    created_id = None

    def test_create_item(self, client):
        payload = _sample_item_payload(f"TEST_Item_{uuid.uuid4().hex[:6]}")
        r = client.post(f"{API}/items", json=payload)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["id"]
        assert doc["name"] == payload["name"]
        assert doc["listing"]["price"] == 150
        TestItemCRUD.created_id = doc["id"]

    def test_get_item(self, client):
        assert TestItemCRUD.created_id
        r = client.get(f"{API}/items/{TestItemCRUD.created_id}")
        assert r.status_code == 200
        assert r.json()["id"] == TestItemCRUD.created_id

    def test_patch_item(self, client):
        assert TestItemCRUD.created_id
        patch = {
            "selected_strategy": "max",
            "status": "ready",
            "listing": {
                "title": "TEST Updated",
                "description": "updated",
                "category": "Tests",
                "keywords": ["k"],
                "condition": "Neuf",
                "price": 199,
            },
        }
        r = client.patch(f"{API}/items/{TestItemCRUD.created_id}", json=patch)
        assert r.status_code == 200, r.text
        # verify persistence via GET
        g = client.get(f"{API}/items/{TestItemCRUD.created_id}").json()
        assert g["selected_strategy"] == "max"
        assert g["status"] == "ready"
        assert g["listing"]["price"] == 199

    def test_delete_item(self, client):
        assert TestItemCRUD.created_id
        r = client.delete(f"{API}/items/{TestItemCRUD.created_id}")
        assert r.status_code == 200
        g = client.get(f"{API}/items/{TestItemCRUD.created_id}")
        assert g.status_code == 404


# ---- Not found ----
def test_get_missing_item_404(client):
    r = client.get(f"{API}/items/nonexistent-xyz")
    assert r.status_code == 404


def test_patch_missing_item_404(client):
    r = client.patch(f"{API}/items/nonexistent-xyz", json={"status": "sold"})
    assert r.status_code == 404


def test_delete_missing_item_404(client):
    r = client.delete(f"{API}/items/nonexistent-xyz")
    assert r.status_code == 404
