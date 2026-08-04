"""Tests for the vision AI /api/analyze endpoint (Gemini 3 Flash)."""
import os
import io
import base64
import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://resale-ai-11.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Real product images (Unsplash / Pexels) used in the app fallback catalog
SAMPLE_URLS = [
    "https://images.unsplash.com/photo-1644426059269-36535c7c00fc?crop=entropy&cs=srgb&fm=jpg&w=800&q=80",  # sneakers
    "https://images.unsplash.com/photo-1639006570490-79c0c53f1080?crop=entropy&cs=srgb&fm=jpg&w=800&q=80",  # watch
    "https://images.pexels.com/photos/18254091/pexels-photo-18254091.jpeg?auto=compress&cs=tinysrgb&w=800",  # headphones
]

VALID_CONDITIONS = {"Neuf", "Très bon", "Bon", "Correct", "Usé"}


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
        r = requests.post(f"{API}/analyze", json={"photos": [sneaker_b64]}, timeout=90)
        assert r.status_code == 200, r.text
        _assert_analyzed_schema(r.json())

    def test_analyze_single_watch(self, watch_b64):
        r = requests.post(f"{API}/analyze", json={"photos": [watch_b64]}, timeout=90)
        assert r.status_code == 200, r.text
        _assert_analyzed_schema(r.json())

    def test_analyze_multiple_images(self, sneaker_b64, watch_b64, headphones_b64):
        r = requests.post(
            f"{API}/analyze",
            json={"photos": [sneaker_b64, watch_b64, headphones_b64]},
            timeout=120,
        )
        assert r.status_code == 200, r.text
        _assert_analyzed_schema(r.json())


# ---------- Error cases ----------
def test_analyze_empty_photos_returns_400():
    r = requests.post(f"{API}/analyze", json={"photos": []}, timeout=30)
    assert r.status_code == 400, r.text


def test_analyze_invalid_base64_returns_400():
    # A string that cannot be decoded as base64 at all -> should produce 400
    # The server strips data URI prefix then attempts base64.b64decode on first 64 chars.
    # Use characters that are invalid for base64.
    bad = "!!!not-base64-at-all###"
    r = requests.post(f"{API}/analyze", json={"photos": [bad]}, timeout=30)
    assert r.status_code == 400, r.text
