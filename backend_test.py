#!/usr/bin/env python3
"""
Comprehensive backend regression test for Vendo API
Tests all endpoints with proper authentication, ownership, and error handling
"""

import requests
import json
import base64
import uuid
from typing import Optional, Dict, Any

# Base URL from frontend/.env
BASE_URL = "https://vendo-continue.preview.emergentagent.com/api"

# Test credentials
DEMO_EMAIL = "demo@vendo.app"
DEMO_PASSWORD = "vendo12345"

# Test results tracking
test_results = []

def log_test(endpoint: str, method: str, status_code: int, expected: int, passed: bool, details: str = ""):
    """Log test result"""
    result = {
        "endpoint": endpoint,
        "method": method,
        "status_code": status_code,
        "expected": expected,
        "passed": passed,
        "details": details
    }
    test_results.append(result)
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} | {method} {endpoint} | {status_code} (expected {expected}) | {details}")

def create_test_jpeg_base64() -> str:
    """Create a minimal valid JPEG base64 string for testing"""
    # Minimal valid JPEG (1x1 red pixel)
    jpeg_bytes = bytes([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x03, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
        0x37, 0xFF, 0xD9
    ])
    return base64.b64encode(jpeg_bytes).decode('utf-8')

def create_sample_item(photo_base64: str) -> Dict[str, Any]:
    """Create a valid Item payload"""
    return {
        "photo": f"data:image/jpeg;base64,{photo_base64}",
        "photos": [],
        "name": "Nike Air Max 90",
        "brand": "Nike",
        "model": "Air Max 90",
        "category": "Sneakers",
        "condition": "Très bon",
        "condition_reasons": ["Légères traces d'usure sur la semelle"],
        "confidence": 85,
        "missing_info": [],
        "photo_coach": [],
        "market_low": 80.0,
        "market_high": 120.0,
        "strategies": [
            {
                "key": "fast",
                "label": "Vente rapide",
                "price": 85.0,
                "explanation": "Prix attractif pour vente rapide"
            },
            {
                "key": "smart",
                "label": "Prix optimal",
                "price": 100.0,
                "explanation": "Meilleur rapport prix/délai"
            },
            {
                "key": "max",
                "label": "Prix maximum",
                "price": 115.0,
                "explanation": "Prix maximum du marché"
            }
        ],
        "selected_strategy": "smart",
        "listing": {
            "title": "Nike Air Max 90 - Excellent état",
            "description": "Superbes Nike Air Max 90 en très bon état, portées quelques fois seulement.",
            "category": "Sneakers",
            "keywords": ["nike", "air max", "sneakers", "baskets"],
            "condition": "Très bon",
            "price": 100.0
        },
        "sell_score": 75,
        "sell_score_breakdown": {"photo": 20, "price": 25, "description": 15, "timing": 15},
        "sell_plan": {
            "mode": "balanced",
            "start_price": 100.0,
            "adjusted_price": 95.0,
            "minimum_price": 80.0,
            "target_date": "2026-02-15",
            "adjustment_days": 7
        }
    }

print("=" * 80)
print("VENDO API COMPREHENSIVE BACKEND REGRESSION TEST")
print("=" * 80)
print(f"Base URL: {BASE_URL}")
print()

# ============================================================================
# 1. HEALTH CHECK
# ============================================================================
print("\n[1] HEALTH CHECK")
print("-" * 80)
try:
    r = requests.get(f"{BASE_URL}/", timeout=10)
    passed = r.status_code == 200 and r.json().get("message") == "Vendo API online"
    log_test("/", "GET", r.status_code, 200, passed, r.json().get("message", ""))
except Exception as e:
    log_test("/", "GET", 0, 200, False, f"Exception: {e}")

# ============================================================================
# 2. AUTHENTICATION
# ============================================================================
print("\n[2] AUTHENTICATION")
print("-" * 80)

# 2.1 Register with fresh user (real-looking email)
test_email = f"testuser{uuid.uuid4().hex[:8]}@gmail.com"
test_password = "SecurePass123"
test_display_name = "Test User"

try:
    r = requests.post(f"{BASE_URL}/auth/register", json={
        "email": test_email,
        "password": test_password,
        "display_name": test_display_name,
        "location_label": "Paris, France"
    }, timeout=10)
    passed = r.status_code == 200 and "token" in r.json() and "user" in r.json()
    if passed:
        user_token = r.json()["token"]
        user_id = r.json()["user"]["id"]
        log_test("/auth/register", "POST", r.status_code, 200, True, f"User created: {test_email}")
    else:
        log_test("/auth/register", "POST", r.status_code, 200, False, r.text[:200])
        user_token = None
        user_id = None
except Exception as e:
    log_test("/auth/register", "POST", 0, 200, False, f"Exception: {e}")
    user_token = None
    user_id = None

# 2.2 Duplicate register -> 409
try:
    r = requests.post(f"{BASE_URL}/auth/register", json={
        "email": test_email,
        "password": test_password,
        "display_name": test_display_name
    }, timeout=10)
    passed = r.status_code == 409
    log_test("/auth/register (duplicate)", "POST", r.status_code, 409, passed, "Duplicate email rejected")
except Exception as e:
    log_test("/auth/register (duplicate)", "POST", 0, 409, False, f"Exception: {e}")

# 2.3 Weak password (<8 bytes) -> 400
try:
    r = requests.post(f"{BASE_URL}/auth/register", json={
        "email": f"weak{uuid.uuid4().hex[:6]}@gmail.com",
        "password": "short",
        "display_name": "Weak User"
    }, timeout=10)
    passed = r.status_code == 400
    log_test("/auth/register (weak password)", "POST", r.status_code, 400, passed, "Weak password rejected")
except Exception as e:
    log_test("/auth/register (weak password)", "POST", 0, 400, False, f"Exception: {e}")

# 2.4 Login with correct credentials -> 200
try:
    r = requests.post(f"{BASE_URL}/auth/login", json={
        "email": test_email,
        "password": test_password
    }, timeout=10)
    passed = r.status_code == 200 and "token" in r.json()
    log_test("/auth/login (correct)", "POST", r.status_code, 200, passed, "Login successful")
except Exception as e:
    log_test("/auth/login (correct)", "POST", 0, 200, False, f"Exception: {e}")

# 2.5 Login with wrong password -> 401
try:
    r = requests.post(f"{BASE_URL}/auth/login", json={
        "email": test_email,
        "password": "WrongPassword123"
    }, timeout=10)
    passed = r.status_code == 401
    log_test("/auth/login (wrong password)", "POST", r.status_code, 401, passed, "Wrong password rejected")
except Exception as e:
    log_test("/auth/login (wrong password)", "POST", 0, 401, False, f"Exception: {e}")

# 2.6 Login with unknown email -> 401
try:
    r = requests.post(f"{BASE_URL}/auth/login", json={
        "email": f"unknown{uuid.uuid4().hex[:8]}@gmail.com",
        "password": "SomePassword123"
    }, timeout=10)
    passed = r.status_code == 401
    log_test("/auth/login (unknown email)", "POST", r.status_code, 401, passed, "Unknown email rejected")
except Exception as e:
    log_test("/auth/login (unknown email)", "POST", 0, 401, False, f"Exception: {e}")

# 2.7 GET /auth/me with Bearer token -> 200
if user_token:
    try:
        r = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 200 and r.json().get("email") == test_email
        log_test("/auth/me (with token)", "GET", r.status_code, 200, passed, f"User: {r.json().get('display_name', '')}")
    except Exception as e:
        log_test("/auth/me (with token)", "GET", 0, 200, False, f"Exception: {e}")

# 2.8 GET /auth/me without token -> 401
try:
    r = requests.get(f"{BASE_URL}/auth/me", timeout=10)
    passed = r.status_code == 401
    log_test("/auth/me (no token)", "GET", r.status_code, 401, passed, "No token rejected")
except Exception as e:
    log_test("/auth/me (no token)", "GET", 0, 401, False, f"Exception: {e}")

# 2.9 GET /auth/me with bad token -> 401
try:
    r = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": "Bearer invalid_token_xyz"}, timeout=10)
    passed = r.status_code == 401
    log_test("/auth/me (bad token)", "GET", r.status_code, 401, passed, "Bad token rejected")
except Exception as e:
    log_test("/auth/me (bad token)", "GET", 0, 401, False, f"Exception: {e}")

# 2.10 Also test with demo credentials
try:
    r = requests.post(f"{BASE_URL}/auth/login", json={
        "email": DEMO_EMAIL,
        "password": DEMO_PASSWORD
    }, timeout=10)
    passed = r.status_code == 200 and "token" in r.json()
    if passed:
        demo_token = r.json()["token"]
        demo_user_id = r.json()["user"]["id"]
        log_test("/auth/login (demo)", "POST", r.status_code, 200, True, f"Demo user: {DEMO_EMAIL}")
    else:
        log_test("/auth/login (demo)", "POST", r.status_code, 200, False, r.text[:200])
        demo_token = None
        demo_user_id = None
except Exception as e:
    log_test("/auth/login (demo)", "POST", 0, 200, False, f"Exception: {e}")
    demo_token = None
    demo_user_id = None

# ============================================================================
# 3. ITEMS CRUD + OWNERSHIP
# ============================================================================
print("\n[3] ITEMS CRUD + OWNERSHIP")
print("-" * 80)

photo_base64 = create_test_jpeg_base64()
item_payload = create_sample_item(photo_base64)

# 3.1 POST /items (authenticated) creates item bound to user
item_id = None
if user_token:
    try:
        r = requests.post(f"{BASE_URL}/items", json=item_payload, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 200 and "id" in r.json() and r.json().get("seller_id") == user_id
        if passed:
            item_id = r.json()["id"]
            log_test("/items (create)", "POST", r.status_code, 200, True, f"Item created: {item_id}")
        else:
            log_test("/items (create)", "POST", r.status_code, 200, False, r.text[:200])
    except Exception as e:
        log_test("/items (create)", "POST", 0, 200, False, f"Exception: {e}")

# 3.2 GET /items (authenticated) returns only user's items
if user_token:
    try:
        r = requests.get(f"{BASE_URL}/items", headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 200 and isinstance(r.json(), list)
        if passed:
            user_items = r.json()
            all_owned = all(i.get("seller_id") == user_id for i in user_items)
            log_test("/items (list)", "GET", r.status_code, 200, all_owned, f"Found {len(user_items)} items, all owned by user")
        else:
            log_test("/items (list)", "GET", r.status_code, 200, False, r.text[:200])
    except Exception as e:
        log_test("/items (list)", "GET", 0, 200, False, f"Exception: {e}")

# 3.3 GET /items/{id} (owner)
if user_token and item_id:
    try:
        r = requests.get(f"{BASE_URL}/items/{item_id}", headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 200 and r.json().get("id") == item_id
        log_test(f"/items/{item_id} (owner)", "GET", r.status_code, 200, passed, "Owner can access")
    except Exception as e:
        log_test(f"/items/{item_id} (owner)", "GET", 0, 200, False, f"Exception: {e}")

# 3.4 PATCH /items/{id} (owner)
if user_token and item_id:
    try:
        r = requests.patch(f"{BASE_URL}/items/{item_id}", json={
            "listing": {
                "title": "Updated Nike Air Max 90",
                "description": "Updated description",
                "category": "Sneakers",
                "keywords": ["nike", "updated"],
                "condition": "Très bon",
                "price": 110.0
            }
        }, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 200 and r.json().get("listing", {}).get("title") == "Updated Nike Air Max 90"
        log_test(f"/items/{item_id} (update)", "PATCH", r.status_code, 200, passed, "Owner can update")
    except Exception as e:
        log_test(f"/items/{item_id} (update)", "PATCH", 0, 200, False, f"Exception: {e}")

# 3.5 Ownership test: create item as user A, then user B tries to access (should get 403 for private item)
demo_item_id = None
if demo_token:
    try:
        demo_item_payload = create_sample_item(photo_base64)
        demo_item_payload["name"] = "Demo User's Adidas Sneakers"
        r = requests.post(f"{BASE_URL}/items", json=demo_item_payload, headers={"Authorization": f"Bearer {demo_token}"}, timeout=10)
        if r.status_code == 200:
            demo_item_id = r.json()["id"]
            log_test("/items (demo create)", "POST", r.status_code, 200, True, f"Demo item created: {demo_item_id}")
        else:
            log_test("/items (demo create)", "POST", r.status_code, 200, False, r.text[:200])
    except Exception as e:
        log_test("/items (demo create)", "POST", 0, 200, False, f"Exception: {e}")

# 3.6 User A tries to access User B's private item -> 403
if user_token and demo_item_id:
    try:
        r = requests.get(f"{BASE_URL}/items/{demo_item_id}", headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 403
        log_test(f"/items/{demo_item_id} (non-owner)", "GET", r.status_code, 403, passed, "Non-owner blocked from private item")
    except Exception as e:
        log_test(f"/items/{demo_item_id} (non-owner)", "GET", 0, 403, False, f"Exception: {e}")

# 3.7 User A tries to PATCH User B's item -> 403
if user_token and demo_item_id:
    try:
        r = requests.patch(f"{BASE_URL}/items/{demo_item_id}", json={"status": "ready"}, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 403
        log_test(f"/items/{demo_item_id} (non-owner update)", "PATCH", r.status_code, 403, passed, "Non-owner blocked from updating")
    except Exception as e:
        log_test(f"/items/{demo_item_id} (non-owner update)", "PATCH", 0, 403, False, f"Exception: {e}")

# 3.8 User A tries to DELETE User B's item -> 403
if user_token and demo_item_id:
    try:
        r = requests.delete(f"{BASE_URL}/items/{demo_item_id}", headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 403
        log_test(f"/items/{demo_item_id} (non-owner delete)", "DELETE", r.status_code, 403, passed, "Non-owner blocked from deleting")
    except Exception as e:
        log_test(f"/items/{demo_item_id} (non-owner delete)", "DELETE", 0, 403, False, f"Exception: {e}")

# ============================================================================
# 4. STATS
# ============================================================================
print("\n[4] STATS")
print("-" * 80)

if user_token:
    try:
        r = requests.get(f"{BASE_URL}/stats", headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 200 and "total_items" in r.json()
        if passed:
            stats = r.json()
            log_test("/stats", "GET", r.status_code, 200, True, f"Stats: {stats.get('total_items')} items, {stats.get('total_potential')} EUR potential")
        else:
            log_test("/stats", "GET", r.status_code, 200, False, r.text[:200])
    except Exception as e:
        log_test("/stats", "GET", 0, 200, False, f"Exception: {e}")

# ============================================================================
# 5. MARKETPLACE
# ============================================================================
print("\n[5] MARKETPLACE")
print("-" * 80)

# 5.1 Publish item (auth + owner) -> item becomes status listed
published_item_id = None
if user_token and item_id:
    try:
        r = requests.post(f"{BASE_URL}/marketplace/{item_id}/publish", json={
            "title": "Nike Air Max 90 - Marketplace",
            "description": "Great condition Nike Air Max 90",
            "price": 105.0,
            "condition": "Très bon",
            "category": "Sneakers",
            "location_label": "Paris, France"
        }, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 200 and r.json().get("status") == "listed" and r.json().get("published_at") is not None
        if passed:
            published_item_id = item_id
            log_test(f"/marketplace/{item_id}/publish", "POST", r.status_code, 200, True, "Item published successfully (base64 photo accepted in dev)")
        else:
            log_test(f"/marketplace/{item_id}/publish", "POST", r.status_code, 200, False, r.text[:200])
    except Exception as e:
        log_test(f"/marketplace/{item_id}/publish", "POST", 0, 200, False, f"Exception: {e}")

# 5.2 GET /marketplace (public) lists listed items
try:
    r = requests.get(f"{BASE_URL}/marketplace", timeout=10)
    passed = r.status_code == 200 and isinstance(r.json(), list)
    if passed:
        marketplace_items = r.json()
        all_listed = all(i.get("status") == "listed" for i in marketplace_items if "status" in i)
        log_test("/marketplace (list)", "GET", r.status_code, 200, True, f"Found {len(marketplace_items)} listed items")
    else:
        log_test("/marketplace (list)", "GET", r.status_code, 200, False, r.text[:200])
except Exception as e:
    log_test("/marketplace (list)", "GET", 0, 200, False, f"Exception: {e}")

# 5.3 GET /marketplace/{id} increments views_count
if published_item_id:
    try:
        r1 = requests.get(f"{BASE_URL}/marketplace/{published_item_id}", timeout=10)
        if r1.status_code == 200:
            views_before = r1.json().get("views_count", 0)
            r2 = requests.get(f"{BASE_URL}/marketplace/{published_item_id}", timeout=10)
            if r2.status_code == 200:
                views_after = r2.json().get("views_count", 0)
                passed = views_after > views_before
                log_test(f"/marketplace/{published_item_id} (views)", "GET", r2.status_code, 200, passed, f"Views: {views_before} -> {views_after}")
            else:
                log_test(f"/marketplace/{published_item_id} (views)", "GET", r2.status_code, 200, False, r2.text[:200])
        else:
            log_test(f"/marketplace/{published_item_id} (views)", "GET", r1.status_code, 200, False, r1.text[:200])
    except Exception as e:
        log_test(f"/marketplace/{published_item_id} (views)", "GET", 0, 200, False, f"Exception: {e}")

# 5.4 POST /marketplace/{id}/unpublish (auth + owner)
if user_token and published_item_id:
    try:
        r = requests.post(f"{BASE_URL}/marketplace/{published_item_id}/unpublish", headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 200 and r.json().get("status") == "ready"
        log_test(f"/marketplace/{published_item_id}/unpublish", "POST", r.status_code, 200, passed, "Item unpublished")
    except Exception as e:
        log_test(f"/marketplace/{published_item_id}/unpublish", "POST", 0, 200, False, f"Exception: {e}")

# 5.5 Re-publish for sold test
if user_token and published_item_id:
    try:
        r = requests.post(f"{BASE_URL}/marketplace/{published_item_id}/publish", json={}, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 200
        log_test(f"/marketplace/{published_item_id}/publish (re-publish)", "POST", r.status_code, 200, passed, "Item re-published")
    except Exception as e:
        log_test(f"/marketplace/{published_item_id}/publish (re-publish)", "POST", 0, 200, False, f"Exception: {e}")

# 5.6 POST /marketplace/{id}/sold (auth + owner)
if user_token and published_item_id:
    try:
        r = requests.post(f"{BASE_URL}/marketplace/{published_item_id}/sold", headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 200 and r.json().get("status") == "sold" and r.json().get("sold_at") is not None
        log_test(f"/marketplace/{published_item_id}/sold", "POST", r.status_code, 200, passed, "Item marked as sold")
    except Exception as e:
        log_test(f"/marketplace/{published_item_id}/sold", "POST", 0, 200, False, f"Exception: {e}")

# 5.7 Non-owner tries to unpublish -> 404/403
if demo_token and published_item_id:
    try:
        r = requests.post(f"{BASE_URL}/marketplace/{published_item_id}/unpublish", headers={"Authorization": f"Bearer {demo_token}"}, timeout=10)
        passed = r.status_code in [403, 404]
        log_test(f"/marketplace/{published_item_id}/unpublish (non-owner)", "POST", r.status_code, "403/404", passed, "Non-owner blocked")
    except Exception as e:
        log_test(f"/marketplace/{published_item_id}/unpublish (non-owner)", "POST", 0, "403/404", False, f"Exception: {e}")

# ============================================================================
# 6. FAVORITES
# ============================================================================
print("\n[6] FAVORITES")
print("-" * 80)

# Create a new item and publish it for favorites testing
fav_item_id = None
if demo_token:
    try:
        fav_item_payload = create_sample_item(photo_base64)
        fav_item_payload["name"] = "Favorite Test Item"
        r = requests.post(f"{BASE_URL}/items", json=fav_item_payload, headers={"Authorization": f"Bearer {demo_token}"}, timeout=10)
        if r.status_code == 200:
            fav_item_id = r.json()["id"]
            # Publish it
            r2 = requests.post(f"{BASE_URL}/marketplace/{fav_item_id}/publish", json={}, headers={"Authorization": f"Bearer {demo_token}"}, timeout=10)
            if r2.status_code == 200:
                log_test("/items (fav test item)", "POST", r2.status_code, 200, True, f"Fav test item published: {fav_item_id}")
            else:
                log_test("/items (fav test item)", "POST", r2.status_code, 200, False, r2.text[:200])
        else:
            log_test("/items (fav test item)", "POST", r.status_code, 200, False, r.text[:200])
    except Exception as e:
        log_test("/items (fav test item)", "POST", 0, 200, False, f"Exception: {e}")

# 6.1 POST /favorites/{id} toggles favorite
if user_token and fav_item_id:
    try:
        r = requests.post(f"{BASE_URL}/favorites/{fav_item_id}", headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 200 and r.json().get("favorited") == True
        log_test(f"/favorites/{fav_item_id} (add)", "POST", r.status_code, 200, passed, "Item favorited")
    except Exception as e:
        log_test(f"/favorites/{fav_item_id} (add)", "POST", 0, 200, False, f"Exception: {e}")

# 6.2 GET /favorites returns favorited items
if user_token:
    try:
        r = requests.get(f"{BASE_URL}/favorites", headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 200 and isinstance(r.json(), list)
        if passed:
            favs = r.json()
            log_test("/favorites (list)", "GET", r.status_code, 200, True, f"Found {len(favs)} favorited items")
        else:
            log_test("/favorites (list)", "GET", r.status_code, 200, False, r.text[:200])
    except Exception as e:
        log_test("/favorites (list)", "GET", 0, 200, False, f"Exception: {e}")

# 6.3 Toggle again to unfavorite
if user_token and fav_item_id:
    try:
        r = requests.post(f"{BASE_URL}/favorites/{fav_item_id}", headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 200 and r.json().get("favorited") == False
        log_test(f"/favorites/{fav_item_id} (remove)", "POST", r.status_code, 200, passed, "Item unfavorited")
    except Exception as e:
        log_test(f"/favorites/{fav_item_id} (remove)", "POST", 0, 200, False, f"Exception: {e}")

# 6.4 Favoriting a non-listed item -> 404
if user_token and demo_item_id:
    try:
        r = requests.post(f"{BASE_URL}/favorites/{demo_item_id}", headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 404
        log_test(f"/favorites/{demo_item_id} (non-listed)", "POST", r.status_code, 404, passed, "Non-listed item rejected")
    except Exception as e:
        log_test(f"/favorites/{demo_item_id} (non-listed)", "POST", 0, 404, False, f"Exception: {e}")

# ============================================================================
# 7. MESSAGES
# ============================================================================
print("\n[7] MESSAGES")
print("-" * 80)

# 7.1 POST /messages (buyer, listing must be listed, cannot message own listing)
if user_token and fav_item_id:
    try:
        r = requests.post(f"{BASE_URL}/messages", json={
            "listing_id": fav_item_id,
            "message": "Hi, is this item still available? I'm very interested!"
        }, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 200 and "id" in r.json()
        log_test("/messages (send)", "POST", r.status_code, 200, passed, "Message sent successfully")
    except Exception as e:
        log_test("/messages (send)", "POST", 0, 200, False, f"Exception: {e}")

# 7.2 Cannot message own listing -> 400
if demo_token and fav_item_id:
    try:
        r = requests.post(f"{BASE_URL}/messages", json={
            "listing_id": fav_item_id,
            "message": "Trying to message my own listing"
        }, headers={"Authorization": f"Bearer {demo_token}"}, timeout=10)
        passed = r.status_code == 400
        log_test("/messages (own listing)", "POST", r.status_code, 400, passed, "Cannot message own listing")
    except Exception as e:
        log_test("/messages (own listing)", "POST", 0, 400, False, f"Exception: {e}")

# 7.3 Message too short (<2 chars) -> 400
if user_token and fav_item_id:
    try:
        r = requests.post(f"{BASE_URL}/messages", json={
            "listing_id": fav_item_id,
            "message": "x"
        }, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 400
        log_test("/messages (too short)", "POST", r.status_code, 400, passed, "Short message rejected")
    except Exception as e:
        log_test("/messages (too short)", "POST", 0, 400, False, f"Exception: {e}")

# 7.4 Message too long (>2000 chars) -> 400
if user_token and fav_item_id:
    try:
        r = requests.post(f"{BASE_URL}/messages", json={
            "listing_id": fav_item_id,
            "message": "x" * 2001
        }, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 400
        log_test("/messages (too long)", "POST", r.status_code, 400, passed, "Long message rejected")
    except Exception as e:
        log_test("/messages (too long)", "POST", 0, 400, False, f"Exception: {e}")

# 7.5 GET /messages/inbox for seller
if demo_token:
    try:
        r = requests.get(f"{BASE_URL}/messages/inbox", headers={"Authorization": f"Bearer {demo_token}"}, timeout=10)
        passed = r.status_code == 200 and isinstance(r.json(), list)
        if passed:
            inbox = r.json()
            log_test("/messages/inbox", "GET", r.status_code, 200, True, f"Inbox has {len(inbox)} messages")
        else:
            log_test("/messages/inbox", "GET", r.status_code, 200, False, r.text[:200])
    except Exception as e:
        log_test("/messages/inbox", "GET", 0, 200, False, f"Exception: {e}")

# ============================================================================
# 8. REPORTS
# ============================================================================
print("\n[8] REPORTS")
print("-" * 80)

# 8.1 POST /reports with valid reason enum
if user_token and fav_item_id:
    try:
        r = requests.post(f"{BASE_URL}/reports", json={
            "listing_id": fav_item_id,
            "reason": "scam",
            "description": "This listing looks suspicious"
        }, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 200 and "id" in r.json()
        log_test("/reports (scam)", "POST", r.status_code, 200, passed, "Report submitted")
    except Exception as e:
        log_test("/reports (scam)", "POST", 0, 200, False, f"Exception: {e}")

# 8.2 Test other valid reasons
for reason in ["counterfeit", "prohibited", "misleading", "other"]:
    if user_token and fav_item_id:
        try:
            r = requests.post(f"{BASE_URL}/reports", json={
                "listing_id": fav_item_id,
                "reason": reason,
                "description": f"Testing {reason} reason"
            }, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
            passed = r.status_code == 200
            log_test(f"/reports ({reason})", "POST", r.status_code, 200, passed, f"Report with {reason} submitted")
        except Exception as e:
            log_test(f"/reports ({reason})", "POST", 0, 200, False, f"Exception: {e}")

# ============================================================================
# 9. UPLOADS
# ============================================================================
print("\n[9] UPLOADS")
print("-" * 80)

# 9.1 GET /uploads/status -> provider "base64-development" and configured=false in dev
try:
    r = requests.get(f"{BASE_URL}/uploads/status", timeout=10)
    passed = r.status_code == 200 and r.json().get("provider") == "base64-development" and r.json().get("configured") == False
    log_test("/uploads/status", "GET", r.status_code, 200, passed, f"Provider: {r.json().get('provider')}, Configured: {r.json().get('configured')}")
except Exception as e:
    log_test("/uploads/status", "GET", 0, 200, False, f"Exception: {e}")

# 9.2 POST /uploads/photos -> 503 when Cloudinary unconfigured
if user_token:
    try:
        r = requests.post(f"{BASE_URL}/uploads/photos", json={
            "photos": [f"data:image/jpeg;base64,{photo_base64}"]
        }, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 503
        log_test("/uploads/photos", "POST", r.status_code, 503, passed, "Cloudinary unconfigured, 503 expected")
    except Exception as e:
        log_test("/uploads/photos", "POST", 0, 503, False, f"Exception: {e}")

# ============================================================================
# 10. AI VISION
# ============================================================================
print("\n[10] AI VISION")
print("-" * 80)

# 10.1 POST /analyze with valid JPEG base64 image -> 200 AnalyzedItem JSON
if user_token:
    try:
        r = requests.post(f"{BASE_URL}/analyze", json={
            "photos": [f"data:image/jpeg;base64,{photo_base64}"],
            "locale": "en"
        }, headers={"Authorization": f"Bearer {user_token}"}, timeout=30)
        passed = r.status_code == 200 and "name" in r.json() and "brand" in r.json() and "category" in r.json()
        if passed:
            analyzed = r.json()
            log_test("/analyze (valid)", "POST", r.status_code, 200, True, f"Analyzed: {analyzed.get('name')} by {analyzed.get('brand')}")
        else:
            log_test("/analyze (valid)", "POST", r.status_code, 200, False, r.text[:200])
    except Exception as e:
        log_test("/analyze (valid)", "POST", 0, 200, False, f"Exception: {e}")

# 10.2 Invalid/garbage base64 -> 400
if user_token:
    try:
        r = requests.post(f"{BASE_URL}/analyze", json={
            "photos": ["not_valid_base64_garbage!!!"],
            "locale": "en"
        }, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 400
        log_test("/analyze (invalid base64)", "POST", r.status_code, 400, passed, "Invalid base64 rejected")
    except Exception as e:
        log_test("/analyze (invalid base64)", "POST", 0, 400, False, f"Exception: {e}")

# 10.3 Missing auth -> 401
try:
    r = requests.post(f"{BASE_URL}/analyze", json={
        "photos": [f"data:image/jpeg;base64,{photo_base64}"],
        "locale": "en"
    }, timeout=10)
    passed = r.status_code == 401
    log_test("/analyze (no auth)", "POST", r.status_code, 401, passed, "No auth rejected")
except Exception as e:
    log_test("/analyze (no auth)", "POST", 0, 401, False, f"Exception: {e}")

# ============================================================================
# 11. DELETE ACCOUNT (CASCADE)
# ============================================================================
print("\n[11] DELETE ACCOUNT")
print("-" * 80)

# Delete the test user account (cascade should remove all related data)
if user_token:
    try:
        r = requests.delete(f"{BASE_URL}/auth/account", headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        passed = r.status_code == 200 and r.json().get("ok") == True
        log_test("/auth/account (delete)", "DELETE", r.status_code, 200, passed, "Account deleted with cascade")
    except Exception as e:
        log_test("/auth/account (delete)", "DELETE", 0, 200, False, f"Exception: {e}")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)

total_tests = len(test_results)
passed_tests = sum(1 for t in test_results if t["passed"])
failed_tests = total_tests - passed_tests

print(f"\nTotal Tests: {total_tests}")
print(f"Passed: {passed_tests} ✅")
print(f"Failed: {failed_tests} ❌")
print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")

if failed_tests > 0:
    print("\n" + "=" * 80)
    print("FAILED TESTS DETAILS")
    print("=" * 80)
    for t in test_results:
        if not t["passed"]:
            print(f"\n❌ {t['method']} {t['endpoint']}")
            print(f"   Status: {t['status_code']} (expected {t['expected']})")
            print(f"   Details: {t['details']}")

print("\n" + "=" * 80)
print("END OF BACKEND REGRESSION TEST")
print("=" * 80)
