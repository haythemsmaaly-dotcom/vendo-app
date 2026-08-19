"""Marketplace security/regression tests for a running Vendo API."""
import os, uuid, requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"


def register(name="Seller"):
    email=f"vendo-{uuid.uuid4().hex[:10]}@example.com"
    r=requests.post(f"{API}/auth/register",json={"email":email,"password":"StrongPass123!","display_name":name,"location_label":"Rotterdam"},timeout=30)
    assert r.status_code==200,r.text
    return {"Authorization":f"Bearer {r.json()['token']}"},r.json()["user"]


def item_payload():
    return {
      "photo":"https://example.com/item.jpg","photos":["https://example.com/item.jpg"],"name":"Test phone","brand":"Test","model":"X","category":"Phones","condition":"Good","condition_reasons":[],"confidence":80,"missing_info":[],"photo_coach":[],"market_low":100,"market_high":150,
      "strategies":[{"key":"fast","label":"Fast","price":100,"explanation":"x"},{"key":"smart","label":"Smart","price":125,"explanation":"x"},{"key":"max","label":"Max","price":150,"explanation":"x"}],"selected_strategy":"smart",
      "listing":{"title":"Test phone","description":"Marketplace security test","category":"Phones","keywords":["test"],"condition":"Good","price":125},
      "sell_score":75,"sell_score_breakdown":{},"sell_plan":{"mode":"balanced","start_price":125,"adjusted_price":115,"minimum_price":90,"target_date":"2026-12-01","adjustment_days":7},"status":"draft"
    }


def test_marketplace_ownership_and_contact_flow():
    seller_h,seller=register("Seller")
    buyer_h,buyer=register("Buyer")
    created=requests.post(f"{API}/items",json=item_payload(),headers=seller_h,timeout=30)
    assert created.status_code==200,created.text
    iid=created.json()["id"]

    # Buyer cannot mutate seller inventory.
    forbidden=requests.patch(f"{API}/items/{iid}",json={"status":"sold"},headers=buyer_h,timeout=30)
    assert forbidden.status_code==403,forbidden.text

    pub=requests.post(f"{API}/marketplace/{iid}/publish",json={"location_label":"Rotterdam"},headers=seller_h,timeout=30)
    assert pub.status_code==200,pub.text
    assert pub.json()["seller_id"]==seller["id"]

    feed=requests.get(f"{API}/marketplace",timeout=30)
    assert feed.status_code==200
    assert any(x["id"]==iid for x in feed.json())

    message=requests.post(f"{API}/messages",json={"listing_id":iid,"message":"Is this still available?"},headers=buyer_h,timeout=30)
    assert message.status_code==200,message.text
    inbox=requests.get(f"{API}/messages/inbox",headers=seller_h,timeout=30)
    assert inbox.status_code==200
    assert any(x["listing_id"]==iid and x["buyer_id"]==buyer["id"] for x in inbox.json())

    sold=requests.post(f"{API}/marketplace/{iid}/sold",headers=seller_h,timeout=30)
    assert sold.status_code==200
    assert sold.json()["status"]=="sold"
