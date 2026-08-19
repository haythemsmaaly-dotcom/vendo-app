"""Tests for the vision AI /api/analyze endpoint (Gemini 3 Flash)."""
import os
import io
import base64
import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://resale-ai-11.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

_AUTH_HEADERS = None
def _auth_headers():
    global _AUTH_HEADERS
    if _AUTH_HEADERS is not None:
        return _AUTH_HEADERS
    import uuid
    email = f"vendo-test-{uuid.uuid4().hex[:10]}@example.com"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "TestPass123!", "display_name": "Vendo Test"}, timeout=30)
    assert r.status_code == 200, r.text
    _AUTH_HEADERS = {"Authorization": f"Bearer {r.json()['token']}"}
    return _AUTH_HEADERS


# Real product images (Unsplash / Pexels) used in the app fallback catalog
SAMPLE_URLS = [
    "https://images.unsplash.com/photo-1644426059269-36535c7c00fc?crop=entropy&cs=srgb&fm=jpg&w=800&q=80",  # sneakers
    "https://images.unsplash.com/photo-1639006570490-79c0c53f1080?crop=entropy&cs=srgb&fm=jpg&w=800&q=80",  # watch
    "https://images.pexels.com/photos/18254091/pexels-photo-18254091.jpeg?auto=compress&cs=tinysrgb&w=800",  # headphones
]

VALID_CONDITIONS_FR = {"Neuf", "Très bon", "Bon", "Correct", "Usé"}
VALID_CONDITIONS_EN = {"New", "Very good", "Good", "Fair", "Worn"}
VALID_CONDITIONS = VALID_CONDITIONS_FR | VALID_CONDITIONS_EN


def _download_and_encode(url: str, max_side: int = 800) -> str:
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    img = Image.open(io.BytesIO(r.content)).convert("RGB")
    w, h = img.size
    scale = min(1.0, max_side / max(w, h))
    if scale < 1.0:
        img = img.resize((int(w * scale), int(h * scale)))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


@pytest.fixture(scope="module")
def sneaker_b64():
    return _download_and_encode(SAMPLE_URLS[0])


@pytest.fixture(scope="module")
def watch_b64():
    return _download_and_encode(SAMPLE_URLS[1])


@pytest.fixture(scope="module")
def headphones_b64():
    return _download_and_encode(SAMPLE_URLS[2])


def _assert_analyzed_schema(d: dict):
    """Validate every field type & value from AnalyzedItem."""
    for k in ("name", "brand", "category", "condition", "confidence",
              "missing_info", "photo_coach", "market_low", "market_high",
              "keywords", "description", "condition_reasons"):
        assert k in d, f"missing field: {k}"
    # model can be null but key must exist
    assert "model" in d
    # condition_reasons: list of strings, may include empty on very-confident items
    assert isinstance(d["condition_reasons"], list)
    assert all(isinstance(x, str) for x in d["condition_reasons"])
    assert len(d["condition_reasons"]) <= 4
    assert isinstance(d["name"], str) and d["name"]
    assert isinstance(d["brand"], str)
    assert isinstance(d["category"], str)
    assert d["condition"] in VALID_CONDITIONS, f"bad condition: {d['condition']}"
    assert isinstance(d["confidence"], int) and 0 <= d["confidence"] <= 100
    assert isinstance(d["missing_info"], list)
    assert all(isinstance(x, str) for x in d["missing_info"])
    assert isinstance(d["photo_coach"], list)
    assert all(isinstance(x, str) for x in d["photo_coach"])
    assert isinstance(d["market_low"], (int, float))
    assert isinstance(d["market_high"], (int, float))
    assert d["market_low"] <= d["market_high"]
    assert isinstance(d["keywords"], list)
    assert all(isinstance(x, str) for x in d["keywords"])
    assert isinstance(d["description"], str) and d["description"]


# ---------- Real vision AI ----------
class TestVisionAnalyze:
    """Vision endpoint — LLM calls may take 20-45s each."""

    def test_analyze_single_sneaker(self, sneaker_b64):
        r = requests.post(f"{API}/analyze", json={"photos": [sneaker_b64]}, headers=_auth_headers(), timeout=90)
        assert r.status_code == 200, r.text
        _assert_analyzed_schema(r.json())

    def test_analyze_single_watch(self, watch_b64):
        r = requests.post(f"{API}/analyze", json={"photos": [watch_b64]}, headers=_auth_headers(), timeout=90)
        assert r.status_code == 200, r.text
        _assert_analyzed_schema(r.json())

    def test_analyze_multiple_images(self, sneaker_b64, watch_b64, headphones_b64):
        r = requests.post(
            f"{API}/analyze",
            json={"photos": [sneaker_b64, watch_b64, headphones_b64]},
            headers=_auth_headers(),
            timeout=120,
        )
        assert r.status_code == 200, r.text
        _assert_analyzed_schema(r.json())


# ---------- Error cases ----------
def test_analyze_empty_photos_returns_400():
    r = requests.post(f"{API}/analyze", json={"photos": []}, headers=_auth_headers(), timeout=30)
    assert r.status_code == 400, r.text


def test_analyze_invalid_base64_returns_400():
    # A string that cannot be decoded as base64 at all -> should produce 400
    # The server strips data URI prefix then attempts base64.b64decode on first 64 chars.
    # Use characters that are invalid for base64.
    bad = "!!!not-base64-at-all###"
    r = requests.post(f"{API}/analyze", json={"photos": [bad]}, headers=_auth_headers(), timeout=30)
    assert r.status_code == 400, r.text


# ---------- Locale (Iteration 5) ----------
FRENCH_HINTS = ["é", "è", "à", "ê"]


def _looks_french(text: str) -> bool:
    return any(c in text.lower() for c in FRENCH_HINTS) or " et " in f" {text.lower()} " or "avec" in text.lower()


class TestLocale:
    """/api/analyze accepts optional 'locale' — 'fr' (default) or 'en'."""

    def test_locale_en_returns_english_condition_and_desc(self, sneaker_b64):
        r = requests.post(
            f"{API}/analyze",
            json={"photos": [sneaker_b64], "locale": "en"},
            headers=_auth_headers(),
            timeout=90,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        _assert_analyzed_schema(d)
        assert d["condition"] in VALID_CONDITIONS_EN, f"EN locale should return English condition, got {d['condition']}"
        # Description should look like English (no accents typical of French)
        assert d["description"] and not _looks_french(d["description"]), (
            f"EN description looks French: {d['description'][:200]}"
        )

    def test_locale_fr_returns_french_condition(self, watch_b64):
        r = requests.post(
            f"{API}/analyze",
            json={"photos": [watch_b64], "locale": "fr"},
            headers=_auth_headers(),
            timeout=90,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        _assert_analyzed_schema(d)
        assert d["condition"] in VALID_CONDITIONS_FR, f"FR locale should return French condition, got {d['condition']}"

    def test_locale_default_is_french(self, sneaker_b64):
        # No locale field -> must default to fr
        r = requests.post(
            f"{API}/analyze",
            json={"photos": [sneaker_b64]},
            headers=_auth_headers(),
            timeout=90,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        _assert_analyzed_schema(d)
        assert d["condition"] in VALID_CONDITIONS_FR, f"default should be FR, got {d['condition']}"


# ---------- Regression: items CRUD + stats (Iteration 5) ----------
def _minimal_item_payload():
    return {
        "photo": "data:image/jpeg;base64,AAA",
        "photos": [],
        "name": "TEST_regression_item",
        "category": "Autre",
        "condition": "Bon",
        "condition_reasons": ["Reason A"],
        "confidence": 80,
        "missing_info": [],
        "photo_coach": [],
        "market_low": 10.0,
        "market_high": 30.0,
        "strategies": [
            {"key": "fast", "label": "Fast", "price": 12.0, "explanation": "x"},
            {"key": "smart", "label": "Smart", "price": 18.0, "explanation": "x"},
            {"key": "max", "label": "Max", "price": 26.0, "explanation": "x"},
        ],
        "selected_strategy": "smart",
        "listing": {
            "title": "TEST title", "description": "TEST desc", "category": "Autre",
            "keywords": ["a", "b"], "condition": "Bon", "price": 18.0,
        },
        "sell_score": 60,
        "sell_score_breakdown": {"photos": 20, "titre": 20},
        "sell_plan": {
            "mode": "balanced", "start_price": 18.0, "adjusted_price": 16.0,
            "minimum_price": 12.0, "target_date": "2026-12-01", "adjustment_days": 7,
        },
        "status": "draft",
    }


class TestItemsRegression:
    """No regression on /api/items + /api/stats after i18n/marketplace additions."""

    def test_create_get_update_delete_flow(self):
        payload = _minimal_item_payload()
        r = requests.post(f"{API}/items", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["name"] == "TEST_regression_item"
        assert created["condition_reasons"] == ["Reason A"]
        iid = created["id"]

        g = requests.get(f"{API}/items/{iid}", timeout=15)
        assert g.status_code == 200
        assert g.json()["id"] == iid

        p = requests.patch(
            f"{API}/items/{iid}",
            json={"status": "ready", "sell_score": 88},
            timeout=15,
        )
        assert p.status_code == 200
        assert p.json()["status"] == "ready"
        assert p.json()["sell_score"] == 88

        d = requests.delete(f"{API}/items/{iid}", timeout=15)
        assert d.status_code == 200
        assert requests.get(f"{API}/items/{iid}", timeout=15).status_code == 404

    def test_list_items(self):
        r = requests.get(f"{API}/items", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_stats(self):
        r = requests.get(f"{API}/stats", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_items", "total_potential", "items_sold", "total_earned", "average_sale_price"):
            assert k in d
        assert isinstance(d["total_items"], int)

