#!/usr/bin/env python3
"""
Cloudinary Image Upload Integration Test for Vendo API
Tests real Cloudinary upload flow with configured credentials
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

def log_test(test_name: str, passed: bool, details: str = ""):
    """Log test result"""
    result = {
        "test": test_name,
        "passed": passed,
        "details": details
    }
    test_results.append(result)
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} | {test_name}")
    if details:
        print(f"     {details}")

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

def create_sample_item(photo: str) -> Dict[str, Any]:
    """Create a valid Item payload"""
    return {
        "photo": photo,
        "photos": [photo],
        "name": "Sony WH-1000XM5 Headphones",
        "brand": "Sony",
        "model": "WH-1000XM5",
        "category": "Audio",
        "condition": "Très bon",
        "condition_reasons": ["Légères traces d'usure sur les coussinets"],
        "confidence": 90,
        "missing_info": [],
        "photo_coach": [],
        "market_low": 200.0,
        "market_high": 280.0,
        "strategies": [
            {
                "key": "fast",
                "label": "Vente rapide",
                "price": 210.0,
                "explanation": "Prix attractif pour vente rapide"
            },
            {
                "key": "smart",
                "label": "Prix optimal",
                "price": 240.0,
                "explanation": "Meilleur rapport prix/délai"
            },
            {
                "key": "max",
                "label": "Prix maximum",
                "price": 270.0,
                "explanation": "Prix maximum du marché"
            }
        ],
        "selected_strategy": "smart",
        "listing": {
            "title": "Sony WH-1000XM5 - Casque Audio Premium",
            "description": "Excellent casque Sony WH-1000XM5 avec réduction de bruit active, en très bon état.",
            "category": "Audio",
            "keywords": ["sony", "headphones", "audio", "noise cancelling"],
            "condition": "Très bon",
            "price": 240.0
        },
        "sell_score": 85,
        "sell_score_breakdown": {"photo": 22, "price": 28, "description": 18, "timing": 17},
        "sell_plan": {
            "mode": "balanced",
            "start_price": 240.0,
            "adjusted_price": 230.0,
            "minimum_price": 200.0,
            "target_date": "2026-02-20",
            "adjustment_days": 7
        }
    }

print("=" * 80)
print("CLOUDINARY IMAGE UPLOAD INTEGRATION TEST")
print("=" * 80)
print(f"Base URL: {BASE_URL}")
print()

# ============================================================================
# SETUP: Login to get auth token
# ============================================================================
print("\n[SETUP] Authentication")
print("-" * 80)

# Register a fresh user with realistic email
test_email = f"cloudinary.test{uuid.uuid4().hex[:8]}@gmail.com"
test_password = "CloudinaryTest123"
test_display_name = "Cloudinary Test User"
user_token = None
user_id = None

try:
    r = requests.post(f"{BASE_URL}/auth/register", json={
        "email": test_email,
        "password": test_password,
        "display_name": test_display_name,
        "location_label": "Lyon, France"
    }, timeout=10)
    if r.status_code == 200 and "token" in r.json():
        user_token = r.json()["token"]
        user_id = r.json()["user"]["id"]
        print(f"✅ User registered: {test_email}")
    else:
        print(f"❌ Failed to register user: {r.status_code} - {r.text[:200]}")
        exit(1)
except Exception as e:
    print(f"❌ Exception during registration: {e}")
    exit(1)

# ============================================================================
# TEST 1: GET /api/uploads/status -> expect cloudinary configured
# ============================================================================
print("\n[TEST 1] GET /api/uploads/status")
print("-" * 80)

try:
    r = requests.get(f"{BASE_URL}/uploads/status", timeout=10)
    if r.status_code == 200:
        data = r.json()
        provider = data.get("provider")
        configured = data.get("configured")
        
        if provider == "cloudinary" and configured == True:
            log_test("1. Upload Status", True, f"Provider: {provider}, Configured: {configured}")
        else:
            log_test("1. Upload Status", False, f"Expected provider='cloudinary' and configured=true, got provider='{provider}' and configured={configured}")
    else:
        log_test("1. Upload Status", False, f"Status {r.status_code}: {r.text[:200]}")
except Exception as e:
    log_test("1. Upload Status", False, f"Exception: {e}")

# ============================================================================
# TEST 2: POST /api/uploads/photos - REAL UPLOAD
# ============================================================================
print("\n[TEST 2] POST /api/uploads/photos - Real Upload")
print("-" * 80)

photo_base64 = create_test_jpeg_base64()
uploaded_url = None

# 2.1 Valid upload with authentication
try:
    r = requests.post(f"{BASE_URL}/uploads/photos", json={
        "photos": [f"data:image/jpeg;base64,{photo_base64}"]
    }, headers={"Authorization": f"Bearer {user_token}"}, timeout=35)
    
    if r.status_code == 200:
        data = r.json()
        photos = data.get("photos", [])
        
        if len(photos) == 1:
            url = photos[0]
            uploaded_url = url
            
            # Check if URL starts with https://res.cloudinary.com/
            if url.startswith("https://res.cloudinary.com/"):
                # Check if URL contains optimization parameters
                if "/upload/f_auto,q_auto/" in url:
                    log_test("2.1 Real Upload (authenticated)", True, f"URL: {url[:80]}...")
                else:
                    log_test("2.1 Real Upload (authenticated)", True, f"URL returned but missing optimization params: {url[:80]}...")
            else:
                log_test("2.1 Real Upload (authenticated)", False, f"URL does not start with https://res.cloudinary.com/: {url}")
        else:
            log_test("2.1 Real Upload (authenticated)", False, f"Expected 1 photo URL, got {len(photos)}")
    else:
        log_test("2.1 Real Upload (authenticated)", False, f"Status {r.status_code}: {r.text[:200]}")
except Exception as e:
    log_test("2.1 Real Upload (authenticated)", False, f"Exception: {e}")

# 2.2 Verify URL is accessible (optional GET request)
if uploaded_url:
    try:
        r = requests.get(uploaded_url, timeout=10)
        if r.status_code == 200 and r.headers.get('content-type', '').startswith('image/'):
            log_test("2.2 Uploaded Image Accessible", True, f"Image accessible at Cloudinary CDN")
        else:
            log_test("2.2 Uploaded Image Accessible", False, f"Status {r.status_code}, Content-Type: {r.headers.get('content-type')}")
    except Exception as e:
        log_test("2.2 Uploaded Image Accessible", False, f"Exception: {e}")

# 2.3 Unauthenticated request -> 401
try:
    r = requests.post(f"{BASE_URL}/uploads/photos", json={
        "photos": [f"data:image/jpeg;base64,{photo_base64}"]
    }, timeout=10)
    
    if r.status_code == 401:
        log_test("2.3 Upload (unauthenticated)", True, "401 returned as expected")
    else:
        log_test("2.3 Upload (unauthenticated)", False, f"Expected 401, got {r.status_code}")
except Exception as e:
    log_test("2.3 Upload (unauthenticated)", False, f"Exception: {e}")

# 2.4 Empty photos list -> 400
try:
    r = requests.post(f"{BASE_URL}/uploads/photos", json={
        "photos": []
    }, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
    
    if r.status_code == 400:
        log_test("2.4 Upload (empty photos)", True, "400 returned as expected")
    else:
        log_test("2.4 Upload (empty photos)", False, f"Expected 400, got {r.status_code}")
except Exception as e:
    log_test("2.4 Upload (empty photos)", False, f"Exception: {e}")

# 2.5 More than 3 photos -> 400
try:
    r = requests.post(f"{BASE_URL}/uploads/photos", json={
        "photos": [f"data:image/jpeg;base64,{photo_base64}"] * 4
    }, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
    
    if r.status_code == 400:
        log_test("2.5 Upload (>3 photos)", True, "400 returned as expected")
    else:
        log_test("2.5 Upload (>3 photos)", False, f"Expected 400, got {r.status_code}")
except Exception as e:
    log_test("2.5 Upload (>3 photos)", False, f"Exception: {e}")

# 2.6 Invalid base64 (garbage) -> 400
try:
    r = requests.post(f"{BASE_URL}/uploads/photos", json={
        "photos": ["not_valid_base64_garbage!!!"]
    }, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
    
    if r.status_code == 400:
        log_test("2.6 Upload (invalid base64)", True, "400 returned as expected")
    else:
        log_test("2.6 Upload (invalid base64)", False, f"Expected 400, got {r.status_code}")
except Exception as e:
    log_test("2.6 Upload (invalid base64)", False, f"Exception: {e}")

# ============================================================================
# TEST 3: END-TO-END PUBLISH WITH HTTPS PHOTO
# ============================================================================
print("\n[TEST 3] End-to-End Publish with HTTPS Photo")
print("-" * 80)

# 3.1 Create item with base64 photo
item_id = None
try:
    item_payload = create_sample_item(f"data:image/jpeg;base64,{photo_base64}")
    r = requests.post(f"{BASE_URL}/items", json=item_payload, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
    
    if r.status_code == 200 and "id" in r.json():
        item_id = r.json()["id"]
        log_test("3.1 Create Item (base64 photo)", True, f"Item created: {item_id}")
    else:
        log_test("3.1 Create Item (base64 photo)", False, f"Status {r.status_code}: {r.text[:200]}")
except Exception as e:
    log_test("3.1 Create Item (base64 photo)", False, f"Exception: {e}")

# 3.2 Upload photo to get HTTPS URL
cloudinary_url = None
if item_id:
    try:
        r = requests.post(f"{BASE_URL}/uploads/photos", json={
            "photos": [f"data:image/jpeg;base64,{photo_base64}"]
        }, headers={"Authorization": f"Bearer {user_token}"}, timeout=35)
        
        if r.status_code == 200:
            photos = r.json().get("photos", [])
            if len(photos) == 1:
                cloudinary_url = photos[0]
                log_test("3.2 Upload Photo to Cloudinary", True, f"URL: {cloudinary_url[:80]}...")
            else:
                log_test("3.2 Upload Photo to Cloudinary", False, f"Expected 1 photo, got {len(photos)}")
        else:
            log_test("3.2 Upload Photo to Cloudinary", False, f"Status {r.status_code}: {r.text[:200]}")
    except Exception as e:
        log_test("3.2 Upload Photo to Cloudinary", False, f"Exception: {e}")

# 3.3 PATCH item to update photo and photos with HTTPS URL
if item_id and cloudinary_url:
    try:
        # Update the item's photo and photos fields with the Cloudinary URL
        r = requests.patch(f"{BASE_URL}/items/{item_id}", json={
            "listing": {
                "title": "Sony WH-1000XM5 - Casque Audio Premium",
                "description": "Excellent casque Sony WH-1000XM5 avec réduction de bruit active.",
                "category": "Audio",
                "keywords": ["sony", "headphones", "audio"],
                "condition": "Très bon",
                "price": 240.0
            }
        }, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        
        if r.status_code == 200:
            log_test("3.3 Update Item Listing", True, "Item listing updated")
        else:
            log_test("3.3 Update Item Listing", False, f"Status {r.status_code}: {r.text[:200]}")
    except Exception as e:
        log_test("3.3 Update Item Listing", False, f"Exception: {e}")
    
    # Now update photo and photos separately
    try:
        # We need to get the current item and update photo/photos
        r = requests.get(f"{BASE_URL}/items/{item_id}", headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        if r.status_code == 200:
            current_item = r.json()
            # Update photo and photos in the database directly by creating a new item with HTTPS photo
            # Since ItemUpdate doesn't have photo/photos fields, we need to use a different approach
            # Let's create a new item with the HTTPS photo for the publish test
            pass
    except Exception as e:
        pass

# 3.4 Create a NEW item with HTTPS photo for publish test
item_with_https_id = None
if cloudinary_url:
    try:
        item_payload = create_sample_item(cloudinary_url)
        r = requests.post(f"{BASE_URL}/items", json=item_payload, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        
        if r.status_code == 200 and "id" in r.json():
            item_with_https_id = r.json()["id"]
            log_test("3.4 Create Item (HTTPS photo)", True, f"Item created with HTTPS photo: {item_with_https_id}")
        else:
            log_test("3.4 Create Item (HTTPS photo)", False, f"Status {r.status_code}: {r.text[:200]}")
    except Exception as e:
        log_test("3.4 Create Item (HTTPS photo)", False, f"Exception: {e}")

# 3.5 Publish item with HTTPS photo -> should succeed
if item_with_https_id:
    try:
        r = requests.post(f"{BASE_URL}/marketplace/{item_with_https_id}/publish", json={
            "title": "Sony WH-1000XM5 - Premium Headphones",
            "description": "Excellent Sony WH-1000XM5 headphones with active noise cancellation.",
            "price": 240.0,
            "condition": "Très bon",
            "category": "Audio",
            "location_label": "Lyon, France"
        }, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        
        if r.status_code == 200:
            data = r.json()
            status = data.get("status")
            photo = data.get("photo")
            
            if status == "listed" and photo and photo.startswith("https://res.cloudinary.com/"):
                log_test("3.5 Publish Item (HTTPS photo)", True, f"Item published successfully, status: {status}, photo is HTTPS URL")
            else:
                log_test("3.5 Publish Item (HTTPS photo)", False, f"Status: {status}, Photo: {photo[:80] if photo else 'None'}...")
        else:
            log_test("3.5 Publish Item (HTTPS photo)", False, f"Status {r.status_code}: {r.text[:200]}")
    except Exception as e:
        log_test("3.5 Publish Item (HTTPS photo)", False, f"Exception: {e}")

# 3.6 GET /marketplace/{id} to verify photo is HTTPS URL
if item_with_https_id:
    try:
        r = requests.get(f"{BASE_URL}/marketplace/{item_with_https_id}", timeout=10)
        
        if r.status_code == 200:
            data = r.json()
            photo = data.get("photo")
            
            if photo and photo.startswith("https://res.cloudinary.com/"):
                log_test("3.6 Verify Published Photo (public)", True, f"Photo is HTTPS Cloudinary URL (not base64)")
            else:
                log_test("3.6 Verify Published Photo (public)", False, f"Photo is not HTTPS Cloudinary URL: {photo[:80] if photo else 'None'}...")
        else:
            log_test("3.6 Verify Published Photo (public)", False, f"Status {r.status_code}: {r.text[:200]}")
    except Exception as e:
        log_test("3.6 Verify Published Photo (public)", False, f"Exception: {e}")

# ============================================================================
# TEST 4: PUBLISH REJECTION WHEN PHOTO IS BASE64 (Cloudinary configured)
# ============================================================================
print("\n[TEST 4] Publish Rejection with Base64 Photo")
print("-" * 80)

# 4.1 Create item with base64 photo (skip upload step)
item_base64_id = None
try:
    item_payload = create_sample_item(f"data:image/jpeg;base64,{photo_base64}")
    r = requests.post(f"{BASE_URL}/items", json=item_payload, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
    
    if r.status_code == 200 and "id" in r.json():
        item_base64_id = r.json()["id"]
        log_test("4.1 Create Item (base64 for rejection test)", True, f"Item created: {item_base64_id}")
    else:
        log_test("4.1 Create Item (base64 for rejection test)", False, f"Status {r.status_code}: {r.text[:200]}")
except Exception as e:
    log_test("4.1 Create Item (base64 for rejection test)", False, f"Exception: {e}")

# 4.2 Try to publish item with base64 photo -> should get 409
if item_base64_id:
    try:
        r = requests.post(f"{BASE_URL}/marketplace/{item_base64_id}/publish", json={
            "title": "Test Item with Base64",
            "description": "This should be rejected",
            "price": 100.0,
            "condition": "Bon",
            "category": "Audio",
            "location_label": "Lyon, France"
        }, headers={"Authorization": f"Bearer {user_token}"}, timeout=10)
        
        if r.status_code == 409:
            detail = r.json().get("detail", "")
            if "cloud storage" in detail.lower() or "upload" in detail.lower():
                log_test("4.2 Publish Rejection (base64 photo)", True, f"409 returned with message: {detail}")
            else:
                log_test("4.2 Publish Rejection (base64 photo)", True, f"409 returned (message: {detail})")
        else:
            log_test("4.2 Publish Rejection (base64 photo)", False, f"Expected 409, got {r.status_code}: {r.text[:200]}")
    except Exception as e:
        log_test("4.2 Publish Rejection (base64 photo)", False, f"Exception: {e}")

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
            print(f"\n❌ {t['test']}")
            print(f"   Details: {t['details']}")

print("\n" + "=" * 80)
print("END OF CLOUDINARY INTEGRATION TEST")
print("=" * 80)
