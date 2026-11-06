from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import json
import base64
import binascii
import logging
import jwt
import bcrypt
import secrets
import hashlib
import time
import requests
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, Literal
import uuid
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Vendo API")
api_router = APIRouter(prefix="/api")


# --------- Models ---------
class PriceStrategy(BaseModel):
    key: str  # fast | smart | max
    label: str
    price: float
    explanation: str


class Listing(BaseModel):
    title: str
    description: str
    category: str
    keywords: List[str] = []
    condition: str
    price: float


class SellPlan(BaseModel):
    mode: str = "balanced"  # quick | best | balanced
    start_price: float
    adjusted_price: float
    minimum_price: float
    target_date: str
    adjustment_days: int = 7


class Item(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    photo: str  # base64 or url
    photos: List[str] = []
    name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    category: str
    condition: str  # Neuf | Très bon | Bon | Correct | Usé
    condition_reasons: List[str] = []
    confidence: int = 80
    missing_info: List[str] = []
    photo_coach: List[str] = []
    market_low: float
    market_high: float
    strategies: List[PriceStrategy]
    selected_strategy: str = "smart"
    listing: Listing
    sell_score: int = 60
    sell_score_breakdown: Dict[str, int] = {}
    sell_plan: SellPlan
    status: str = "draft"  # draft | ready | listed | sold
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    sold_price: Optional[float] = None
    sold_at: Optional[str] = None
    seller_id: Optional[str] = None
    seller_name: Optional[str] = None
    location_label: Optional[str] = None
    published_at: Optional[str] = None
    updated_at: Optional[str] = None
    views_count: int = 0
    favorites_count: int = 0


class ItemUpdate(BaseModel):
    listing: Optional[Listing] = None
    selected_strategy: Optional[str] = None
    sell_plan: Optional[SellPlan] = None
    status: Optional[str] = None
    sold_price: Optional[float] = None
    sold_at: Optional[str] = None
    sell_score: Optional[int] = None
    location_label: Optional[str] = None


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str
    location_label: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    email: str
    display_name: str
    location_label: Optional[str] = None
    created_at: str


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


class PublishRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    condition: Optional[str] = None
    category: Optional[str] = None
    location_label: Optional[str] = None


class FavoriteRequest(BaseModel):
    listing_id: str


class ReportRequest(BaseModel):
    listing_id: str
    reason: Literal["scam", "counterfeit", "prohibited", "misleading", "other"]
    description: Optional[str] = None


class MessageRequest(BaseModel):
    listing_id: str
    message: str


class UploadPhotosRequest(BaseModel):
    photos: List[str]


ENVIRONMENT = os.environ.get("ENVIRONMENT", "development").lower()
AUTH_SECRET = os.environ.get("AUTH_SECRET", "")
if not AUTH_SECRET:
    if ENVIRONMENT in {"production", "prod"}:
        raise RuntimeError("AUTH_SECRET is required in production")
    AUTH_SECRET = secrets.token_urlsafe(48)
    logging.getLogger(__name__).warning("AUTH_SECRET not configured; sessions will reset when the backend restarts")
AUTH_ALGORITHM = "HS256"


def _user_public(doc: dict) -> UserPublic:
    return UserPublic(
        id=doc["id"], email=doc["email"], display_name=doc["display_name"],
        location_label=doc.get("location_label"), created_at=doc["created_at"]
    )


def _make_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": user_id, "iat": int(now.timestamp()), "exp": int(now.timestamp()) + 60*60*24*30}, AUTH_SECRET, algorithm=AUTH_ALGORITHM)


async def current_user(authorization: Optional[str] = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, AUTH_SECRET, algorithms=[AUTH_ALGORITHM])
        uid = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    doc = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
    if not doc:
        raise HTTPException(status_code=401, detail="User not found")
    return doc


async def optional_user(authorization: Optional[str] = Header(default=None)) -> Optional[dict]:
    if not authorization:
        return None
    try:
        return await current_user(authorization)
    except HTTPException:
        return None


# --------- Routes ---------
@api_router.get("/")
async def root():
    return {"message": "Vendo API online"}


@api_router.post("/items", response_model=Item)
async def create_item(item: Item, authorization: Optional[str] = Header(default=None)):
    doc = item.model_dump()
    # If the caller is signed in, bind newly scanned inventory to that account.
    user = await optional_user(authorization)
    if user:
        doc["seller_id"] = user["id"]
        doc["seller_name"] = user["display_name"]
        doc["location_label"] = doc.get("location_label") or user.get("location_label")
    if not doc.get("id"):
        doc["id"] = str(uuid.uuid4())
    if not doc.get("created_at"):
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.items.insert_one(doc)
    doc.pop("_id", None)
    return Item(**doc)


@api_router.get("/items", response_model=List[Item])
async def list_items(authorization: Optional[str] = Header(default=None)):
    user = await optional_user(authorization)
    # Personal inventory is private. Guests only see legacy unowned demo/local items.
    filt = {"seller_id": user["id"]} if user else {"seller_id": None}
    items = await db.items.find(filt, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Item(**i) for i in items]


@api_router.get("/items/{item_id}", response_model=Item)
async def get_item(item_id: str, authorization: Optional[str] = Header(default=None)):
    doc = await db.items.find_one({"id": item_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Item not found")
    if doc.get("seller_id") and doc.get("status") != "listed":
        user = await optional_user(authorization)
        if not user or user["id"] != doc.get("seller_id"):
            raise HTTPException(status_code=403, detail="Not your item")
    return Item(**doc)


@api_router.patch("/items/{item_id}", response_model=Item)
async def update_item(item_id: str, patch: ItemUpdate, authorization: Optional[str] = Header(default=None)):
    existing = await db.items.find_one({"id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
    if existing.get("seller_id"):
        user = await optional_user(authorization)
        if not user or user["id"] != existing.get("seller_id"):
            raise HTTPException(status_code=403, detail="Not your item")
    updates = {k: v for k, v in patch.model_dump(exclude_none=True).items()}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    if not updates:
        doc = await db.items.find_one({"id": item_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Item not found")
        return Item(**doc)
    result = await db.items.find_one_and_update(
        {"id": item_id},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Item not found")
    result.pop("_id", None)
    return Item(**result)


@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str, authorization: Optional[str] = Header(default=None)):
    existing = await db.items.find_one({"id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
    if existing.get("seller_id"):
        user = await optional_user(authorization)
        if not user or user["id"] != existing.get("seller_id"):
            raise HTTPException(status_code=403, detail="Not your item")
    res = await db.items.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}


@api_router.get("/stats")
async def stats(authorization: Optional[str] = Header(default=None)):
    user = await optional_user(authorization)
    filt = {"seller_id": user["id"]} if user else {"seller_id": None}
    items = await db.items.find(filt, {"_id": 0}).to_list(1000)
    total_potential = sum(i.get("listing", {}).get("price", 0) for i in items if i.get("status") != "sold")
    sold_items = [i for i in items if i.get("status") == "sold"]
    total_earned = sum(i.get("sold_price") or i.get("listing", {}).get("price", 0) for i in sold_items)
    avg = (total_earned / len(sold_items)) if sold_items else 0
    return {
        "total_items": len(items),
        "total_potential": round(total_potential, 2),
        "items_sold": len(sold_items),
        "total_earned": round(total_earned, 2),
        "average_sale_price": round(avg, 2),
    }





# --------- Image storage ---------
@api_router.get("/uploads/status")
async def upload_status():
    configured = all(os.environ.get(k) for k in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"))
    return {"provider": "cloudinary" if configured else "base64-development", "configured": configured}


@api_router.post("/uploads/photos")
async def upload_photos(req: UploadPhotosRequest, user: dict = Depends(current_user)):
    cloud = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
    key = os.environ.get("CLOUDINARY_API_KEY", "")
    secret = os.environ.get("CLOUDINARY_API_SECRET", "")
    if not (cloud and key and secret):
        raise HTTPException(status_code=503, detail="Cloud image storage is not configured")
    if not req.photos or len(req.photos) > 3:
        raise HTTPException(status_code=400, detail="1-3 photos required")
    urls = []
    for photo in req.photos:
        raw = _strip_data_uri(photo)
        try:
            binary = base64.b64decode(raw, validate=True)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image data")
        if len(binary) > 8 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Image too large")
        if not (binary.startswith(b"\xff\xd8\xff") or binary.startswith(b"\x89PNG\r\n\x1a\n") or (binary[:4] == b"RIFF" and binary[8:12] == b"WEBP")):
            raise HTTPException(status_code=400, detail="Unsupported image format")
        timestamp = int(time.time())
        folder = f"vendo/{user['id']}"
        to_sign = f"folder={folder}&timestamp={timestamp}{secret}".encode()
        signature = hashlib.sha1(to_sign).hexdigest()
        mime = "image/jpeg" if binary.startswith(b"\xff\xd8\xff") else "image/png" if binary.startswith(b"\x89PNG") else "image/webp"
        data_uri = f"data:{mime};base64,{raw}"
        try:
            r = requests.post(
                f"https://api.cloudinary.com/v1_1/{cloud}/image/upload",
                data={"file": data_uri, "api_key": key, "timestamp": timestamp, "folder": folder, "signature": signature},
                timeout=35,
            )
            r.raise_for_status()
            secure = r.json()["secure_url"]
            # CDN delivery optimization suitable for feed/detail use.
            optimized = secure.replace("/upload/", "/upload/f_auto,q_auto/", 1)
            urls.append(optimized)
        except Exception as e:
            logger.exception("Cloudinary upload failed")
            raise HTTPException(status_code=502, detail=f"Image upload failed: {e}")
    return {"photos": urls}

# --------- Authentication ---------
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    email = req.email.strip().lower()
    if len(req.password.encode("utf-8")) < 8 or len(req.password.encode("utf-8")) > 72 or len(req.display_name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Valid display name and password (8-72 bytes) required")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Account already exists")
    uid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    password_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    doc = {"id": uid, "email": email, "display_name": req.display_name.strip()[:60], "location_label": (req.location_label or "").strip()[:80] or None, "password_hash": password_hash, "created_at": now}
    await db.users.insert_one(doc.copy())
    doc.pop("password_hash", None); doc.pop("_id", None)
    return AuthResponse(token=_make_token(uid), user=_user_public(doc))


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    doc = await db.users.find_one({"email": req.email.strip().lower()})
    if not doc or not bcrypt.checkpw(req.password.encode(), doc.get("password_hash", "").encode()):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    clean = {k:v for k,v in doc.items() if k not in {"_id","password_hash"}}
    return AuthResponse(token=_make_token(doc["id"]), user=_user_public(clean))


@api_router.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(current_user)):
    return _user_public(user)


@api_router.delete("/auth/account")
async def delete_account(user: dict = Depends(current_user)):
    uid = user["id"]
    # Remove user-owned marketplace/private data. Reports about their listings remain without private reporter data only if created by others.
    owned = await db.items.find({"seller_id": uid}, {"id": 1, "_id": 0}).to_list(1000)
    owned_ids = [x["id"] for x in owned]
    await db.items.delete_many({"seller_id": uid})
    await db.favorites.delete_many({"$or": [{"user_id": uid}, {"item_id": {"$in": owned_ids}}]})
    await db.messages.delete_many({"$or": [{"buyer_id": uid}, {"seller_id": uid}, {"listing_id": {"$in": owned_ids}}]})
    await db.reports.delete_many({"reporter_id": uid})
    await db.wallet_items.delete_many({"user_id": uid})
    if owned_ids:
        await db.reports.delete_many({"listing_id": {"$in": owned_ids}})
    await db.users.delete_one({"id": uid})
    return {"ok": True}


# --------- My VENDO Wallet (personal inventory, not real money) ---------
class WalletItemCreate(BaseModel):
    title: str
    description: str = ""
    photo_url: str
    value_low: float
    value_high: float
    currency: str = "EUR"  # stored amounts use the app's EUR base, like items
    category: Optional[str] = None
    condition: Optional[str] = None


class WalletItem(WalletItemCreate):
    id: str
    user_id: str
    created_at: str


@api_router.post("/wallet", response_model=WalletItem)
async def wallet_add(req: WalletItemCreate, user: dict = Depends(current_user)):
    if not req.title.strip() or req.value_low < 0 or req.value_high < req.value_low:
        raise HTTPException(status_code=400, detail="Invalid wallet item")
    doc = {**req.model_dump(), "id": str(uuid.uuid4()), "user_id": user["id"], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.wallet_items.insert_one(doc.copy())
    return WalletItem(**doc)


@api_router.get("/wallet", response_model=List[WalletItem])
async def wallet_list(user: dict = Depends(current_user)):
    return await db.wallet_items.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api_router.get("/wallet/summary")
async def wallet_summary(user: dict = Depends(current_user)):
    docs = await db.wallet_items.find({"user_id": user["id"]}, {"_id": 0, "value_low": 1, "value_high": 1}).to_list(1000)
    return {
        "count": len(docs),
        "total_low": round(sum(d["value_low"] for d in docs), 2),
        "total_high": round(sum(d["value_high"] for d in docs), 2),
        "currency": "EUR",
    }


@api_router.get("/wallet/{wallet_id}", response_model=WalletItem)
async def wallet_get(wallet_id: str, user: dict = Depends(current_user)):
    doc = await db.wallet_items.find_one({"id": wallet_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Wallet item not found")
    return doc


@api_router.delete("/wallet/{wallet_id}")
async def wallet_delete(wallet_id: str, user: dict = Depends(current_user)):
    res = await db.wallet_items.delete_one({"id": wallet_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Wallet item not found")
    return {"ok": True}



# --------- Marketplace ---------
@api_router.get("/marketplace")
async def marketplace_list(q: Optional[str] = None, category: Optional[str] = None, limit: int = 60):
    filt: Dict[str, Any] = {"status": "listed", "published_at": {"$ne": None}}
    if category and category.lower() != "all": filt["category"] = category
    if q:
        safe = re.escape(q.strip())
        filt["$or"] = [{"listing.title": {"$regex": safe, "$options": "i"}}, {"name": {"$regex": safe, "$options": "i"}}, {"brand": {"$regex": safe, "$options": "i"}}]
    projection = {"_id": 0, "id":1, "photo":1, "name":1, "brand":1, "model":1, "category":1, "condition":1, "listing":1, "market_low":1, "market_high":1, "seller_id":1, "seller_name":1, "location_label":1, "published_at":1, "views_count":1, "favorites_count":1}
    return await db.items.find(filt, projection).sort("published_at", -1).limit(max(1,min(limit,100))).to_list(100)


@api_router.get("/marketplace/{item_id}")
async def marketplace_get(item_id: str):
    doc = await db.items.find_one({"id": item_id, "status": "listed"}, {"_id":0})
    if not doc: raise HTTPException(status_code=404, detail="Listing not found")
    await db.items.update_one({"id":item_id},{"$inc":{"views_count":1}})
    doc["views_count"] = int(doc.get("views_count",0))+1
    return doc


@api_router.post("/marketplace/{item_id}/publish", response_model=Item)
async def publish_item(item_id: str, req: PublishRequest, user: dict = Depends(current_user)):
    doc = await db.items.find_one({"id": item_id})
    if not doc: raise HTTPException(status_code=404, detail="Item not found")
    if doc.get("seller_id") and doc.get("seller_id") != user["id"]: raise HTTPException(status_code=403, detail="Not your item")
    listing = dict(doc.get("listing") or {})
    for key in ("title","description","price","condition","category"):
        val = getattr(req,key)
        if val is not None:
            if key in {"condition","category"}: doc[key] = val
            if key == "category": listing["category"] = val
            elif key == "condition": listing["condition"] = val
            else: listing[key] = val
    # Public marketplace listings must use CDN/HTTPS images when Cloudinary is configured.
    cloudinary_configured = all(os.environ.get(k) for k in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"))
    photos = doc.get("photos") or ([doc.get("photo")] if doc.get("photo") else [])
    if cloudinary_configured and any((not isinstance(x, str)) or (not x.startswith("https://")) for x in photos):
        raise HTTPException(status_code=409, detail="Upload marketplace photos to cloud storage before publishing")
    now = datetime.now(timezone.utc).isoformat()
    updates = {"listing":listing,"seller_id":user["id"],"seller_name":user["display_name"],"location_label":req.location_label or user.get("location_label"),"status":"listed","published_at":doc.get("published_at") or now,"updated_at":now}
    out = await db.items.find_one_and_update({"id":item_id},{"$set":updates},return_document=True); out.pop("_id",None)
    return Item(**out)


@api_router.post("/marketplace/{item_id}/unpublish", response_model=Item)
async def unpublish_item(item_id: str, user: dict = Depends(current_user)):
    out=await db.items.find_one_and_update({"id":item_id,"seller_id":user["id"]},{"$set":{"status":"ready","updated_at":datetime.now(timezone.utc).isoformat()}},return_document=True)
    if not out: raise HTTPException(status_code=404, detail="Listing not found or not yours")
    out.pop("_id",None); return Item(**out)


@api_router.post("/marketplace/{item_id}/sold", response_model=Item)
async def mark_marketplace_sold(item_id: str, user: dict = Depends(current_user)):
    now=datetime.now(timezone.utc).isoformat()
    out=await db.items.find_one_and_update({"id":item_id,"seller_id":user["id"]},{"$set":{"status":"sold","sold_at":now,"updated_at":now}},return_document=True)
    if not out: raise HTTPException(status_code=404, detail="Listing not found or not yours")
    out.pop("_id",None); return Item(**out)


@api_router.post("/favorites/{item_id}")
async def toggle_favorite(item_id: str, user: dict = Depends(current_user)):
    if not await db.items.find_one({"id":item_id,"status":"listed"}): raise HTTPException(status_code=404, detail="Listing not found")
    existing=await db.favorites.find_one({"user_id":user["id"],"item_id":item_id})
    if existing:
        await db.favorites.delete_one({"_id":existing["_id"]}); await db.items.update_one({"id":item_id},{"$inc":{"favorites_count":-1}}); return {"favorited":False}
    await db.favorites.insert_one({"id":str(uuid.uuid4()),"user_id":user["id"],"item_id":item_id,"created_at":datetime.now(timezone.utc).isoformat()}); await db.items.update_one({"id":item_id},{"$inc":{"favorites_count":1}}); return {"favorited":True}


@api_router.get("/favorites")
async def favorite_items(user: dict = Depends(current_user)):
    favs=await db.favorites.find({"user_id":user["id"]},{"_id":0}).sort("created_at",-1).to_list(500)
    ids=[f["item_id"] for f in favs]
    if not ids:return []
    return await db.items.find({"id":{"$in":ids},"status":"listed"},{"_id":0}).to_list(500)


@api_router.post("/reports")
async def report_listing(req: ReportRequest, user: dict = Depends(current_user)):
    if not await db.items.find_one({"id":req.listing_id,"status":"listed"}): raise HTTPException(status_code=404, detail="Listing not found")
    doc={"id":str(uuid.uuid4()),"reporter_id":user["id"],"listing_id":req.listing_id,"reason":req.reason,"description":(req.description or "")[:1000],"status":"open","created_at":datetime.now(timezone.utc).isoformat()}
    await db.reports.insert_one(doc); doc.pop("_id",None); return doc


@api_router.post("/messages")
async def send_message(req: MessageRequest, user: dict = Depends(current_user)):
    listing=await db.items.find_one({"id":req.listing_id,"status":"listed"})
    if not listing: raise HTTPException(status_code=404, detail="Listing not found")
    if listing.get("seller_id") == user["id"]: raise HTTPException(status_code=400, detail="Cannot message yourself")
    text=req.message.strip()
    if len(text)<2 or len(text)>2000: raise HTTPException(status_code=400, detail="Message must be 2-2000 characters")
    doc={"id":str(uuid.uuid4()),"listing_id":req.listing_id,"listing_title":listing.get("listing",{}).get("title",listing.get("name")),"buyer_id":user["id"],"buyer_name":user["display_name"],"seller_id":listing.get("seller_id"),"message":text,"created_at":datetime.now(timezone.utc).isoformat(),"read":False}
    await db.messages.insert_one(doc); doc.pop("_id",None); return doc


@api_router.get("/messages/inbox")
async def inbox(user: dict = Depends(current_user)):
    return await db.messages.find({"seller_id":user["id"]},{"_id":0}).sort("created_at",-1).to_list(500)


@api_router.get("/my/listings")
async def my_listings(user: dict = Depends(current_user)):
    return await db.items.find({"seller_id":user["id"]},{"_id":0}).sort("created_at",-1).to_list(500)


# --------- Vision AI: item identification ---------
class AnalyzeRequest(BaseModel):
    photos: List[str]  # data URIs or raw base64 strings (JPEG/PNG/WEBP)
    locale: Optional[str] = "fr"  # ISO code — target language for AI-generated text


class AnalyzedItem(BaseModel):
    name: str
    brand: str
    model: Optional[str] = None
    category: str
    condition: str
    condition_reasons: List[str] = []
    confidence: int
    missing_info: List[str] = []
    photo_coach: List[str] = []
    market_low: float
    market_high: float
    keywords: List[str] = []
    description: str


VISION_SYSTEM_PROMPT_FR = """Tu es Vendo, expert en reconnaissance d'objets d'occasion et en estimation de leur état pour la revente (marché européen en euros).

À partir d'une ou plusieurs photos d'un objet, tu identifies l'objet ET tu évalues rigoureusement son état visible.

Tu retournes UNIQUEMENT un objet JSON valide (aucun texte autour, aucun bloc markdown).

Champs OBLIGATOIRES :
{
  "name": "Nom de l'objet (ex: Air Jordan 1 High, Casque Sony WH-1000XM5)",
  "brand": "Marque (ex: Nike, Sony, Apple)",
  "model": "Référence exacte du modèle si visible/identifiable, sinon null",
  "category": "Une des catégories: Sneakers, Vêtements, Sacs, Montres, Audio, Téléphones, Tablettes, Ordinateurs, Consoles, Jeux vidéo, Livres, Décoration, Meubles, Bijoux, Instruments, Sport, Jouets, Autre",
  "condition": "Neuf | Très bon | Bon | Correct | Usé",
  "condition_reasons": ["Éléments VISIBLES qui justifient la note d'état, en français, max 4 phrases courtes"],
  "confidence": 0-100,
  "missing_info": ["Informations manquantes à vérifier, en français, max 3"],
  "photo_coach": ["Photos additionnelles à prendre pour améliorer l'annonce, en français, max 3"],
  "market_low": nombre en EUR (borne basse plausible du marché d'occasion — estimation IA),
  "market_high": nombre en EUR (borne haute plausible — estimation IA),
  "keywords": ["5-8 mots-clés français pour l'annonce"],
  "description": "Description d'annonce professionnelle en français, 2-4 phrases, mettant en valeur l'objet ET mentionnant honnêtement les défauts visibles"
}

Règles strictes :
- Ne PRÉTENDS PAS voir un défaut, un accessoire ou un détail qui n'est pas visible sur les photos.
- Si l'angle ou la lumière ne permet pas d'évaluer, mets confidence bas et ajoute une entrée dans missing_info/photo_coach.
- Garde les noms de marques et références de modèles dans leur forme d'origine (ne les traduis PAS).
- Retourne UNIQUEMENT le JSON."""

VISION_SYSTEM_PROMPT_EN = """You are Vendo, an expert in second-hand item recognition and condition assessment for resale (European market, prices in the user's currency but you always output EUR-comparable numbers).

From one or more photos of an item, you identify the item AND rigorously assess its visible condition.

Return ONLY a valid JSON object (no surrounding text, no markdown fences).

REQUIRED fields:
{
  "name": "Product name (e.g. Air Jordan 1 High, Sony WH-1000XM5 headphones)",
  "brand": "Brand (e.g. Nike, Sony, Apple)",
  "model": "Exact model reference if visible, otherwise null",
  "category": "One of: Sneakers, Clothing, Bags, Watches, Audio, Phones, Tablets, Computers, Consoles, Video games, Books, Decoration, Furniture, Jewelry, Instruments, Sport, Toys, Other",
  "condition": "New | Very good | Good | Fair | Worn",
  "condition_reasons": ["VISIBLE elements justifying the condition, in English, max 4 short sentences"],
  "confidence": 0-100,
  "missing_info": ["Information the user should verify, in English, max 3"],
  "photo_coach": ["Additional photos to take to improve the listing, in English, max 3"],
  "market_low": number in EUR (plausible used-market low — AI estimate, NOT live market data),
  "market_high": number in EUR (plausible used-market high — AI estimate),
  "keywords": ["5-8 English keywords for the listing"],
  "description": "Professional English listing description, 2-4 sentences, showcasing the item AND honestly mentioning any visible defects"
}

Strict rules:
- Do NOT pretend to see a defect, accessory or detail that isn't visible in the photos.
- If angle or lighting doesn't allow a full assessment, use a low confidence and add entries to missing_info/photo_coach.
- Keep brand names and model references in their original form (do NOT translate them).
- Return ONLY the JSON."""


def _extract_json(text: str) -> Optional[dict]:
    """Robustly extract a JSON object from an LLM response."""
    if not text:
        return None
    # Strip common markdown fences
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    # Try full text
    try:
        return json.loads(text)
    except Exception:
        pass
    # Extract first {...} balanced block
    depth = 0
    start = -1
    for i, ch in enumerate(text):
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start >= 0:
                try:
                    return json.loads(text[start:i+1])
                except Exception:
                    start = -1
    return None


def _strip_data_uri(s: str) -> str:
    if s.startswith("data:"):
        comma = s.find(",")
        if comma >= 0:
            return s[comma+1:]
    return s


@api_router.post("/analyze", response_model=AnalyzedItem)
async def analyze_item(req: AnalyzeRequest, user: dict = Depends(current_user)):
    api_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
    if not req.photos:
        raise HTTPException(status_code=400, detail="At least one photo required")

    # Prepare up to 3 images
    images: List[ImageContent] = []
    for p in req.photos[:3]:
        raw = _strip_data_uri(p)
        if not raw or len(raw) < 32:
            continue
        # Strict base64 validation on a small prefix (enough to catch garbage)
        sample = raw[: (len(raw) // 4) * 4]  # multiple of 4
        try:
            decoded_head = base64.b64decode(sample[:512], validate=True)
        except (binascii.Error, ValueError):
            continue
        # Magic-byte check: JPEG (FFD8FF), PNG (89504E47), WEBP (RIFF....WEBP)
        if not (
            decoded_head.startswith(b"\xff\xd8\xff")
            or decoded_head.startswith(b"\x89PNG\r\n\x1a\n")
            or (decoded_head[:4] == b"RIFF" and decoded_head[8:12] == b"WEBP")
        ):
            continue
        images.append(ImageContent(image_base64=raw))

    if not images:
        raise HTTPException(status_code=400, detail="No valid base64 image provided")

    system_prompt = VISION_SYSTEM_PROMPT_EN if (req.locale or "").lower().startswith("en") else VISION_SYSTEM_PROMPT_FR

    chat = LlmChat(
        api_key=api_key,
        session_id=f"vendo-analyze-{uuid.uuid4().hex[:8]}",
        system_message=system_prompt,
    ).with_model("gemini", "gemini-3-flash-preview")

    user_msg = UserMessage(
        text="Identify this item and return the requested JSON." if system_prompt is VISION_SYSTEM_PROMPT_EN else "Identifie cet objet et retourne le JSON demandé.",
        file_contents=images,
    )

    try:
        response = await chat.send_message(user_msg)
    except Exception as e:
        logger.exception("Vision LLM call failed")
        raise HTTPException(status_code=502, detail=f"Vision AI unavailable: {e}")

    text = response if isinstance(response, str) else str(response)
    data = _extract_json(text)
    if not data:
        logger.warning("Could not parse JSON from vision response: %r", text[:400])
        raise HTTPException(status_code=502, detail="Vision AI returned unparseable response")

    # Coerce / validate fields with sensible defaults
    def _s(v, default=""): return str(v) if v is not None else default
    def _list(v):
        if isinstance(v, list):
            return [str(x) for x in v if x is not None][:8]
        return []

    try:
        low = float(data.get("market_low") or 0)
        high = float(data.get("market_high") or 0)
        if high < low:
            low, high = high, low
        if high == 0:
            high = max(low * 1.5, 10.0)
        if low == 0:
            low = max(high * 0.5, 5.0)

        cond = _s(data.get("condition"), "Bon")
        valid_cond = {"Neuf", "Très bon", "Bon", "Correct", "Usé", "New", "Very good", "Good", "Fair", "Worn"}
        if cond not in valid_cond:
            # Best-effort mapping
            low_cond = cond.lower()
            if "neuf" in low_cond:
                cond = "Neuf"
            elif "très" in low_cond or "excellent" in low_cond:
                cond = "Très bon"
            elif "correct" in low_cond or "moyen" in low_cond:
                cond = "Correct"
            elif "usé" in low_cond or "abîmé" in low_cond:
                cond = "Usé"
            else:
                cond = "Bon"

        confidence = int(data.get("confidence") or 60)
        confidence = max(0, min(100, confidence))

        result = AnalyzedItem(
            name=_s(data.get("name"), "Objet"),
            brand=_s(data.get("brand"), "Inconnu"),
            model=_s(data.get("model")) or None,
            category=_s(data.get("category"), "Autre"),
            condition=cond,
            condition_reasons=_list(data.get("condition_reasons"))[:4],
            confidence=confidence,
            missing_info=_list(data.get("missing_info"))[:3],
            photo_coach=_list(data.get("photo_coach"))[:3],
            market_low=round(low, 2),
            market_high=round(high, 2),
            keywords=_list(data.get("keywords"))[:8],
            description=_s(data.get("description"), "Objet en bon état, à saisir."),
        )
        return result
    except Exception as e:
        logger.exception("Vision response validation failed")
        raise HTTPException(status_code=502, detail=f"Invalid vision output: {e}")


app.include_router(api_router)

cors_env = os.environ.get("CORS_ORIGINS", "*")
cors_origins = [x.strip() for x in cors_env.split(",") if x.strip()] or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=cors_origins != ["*"],
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def ensure_indexes():
    # Safe, idempotent indexes for marketplace reads and ownership data.
    await db.users.create_index("email", unique=True)
    await db.items.create_index([("status", 1), ("published_at", -1)])
    await db.items.create_index([("seller_id", 1), ("created_at", -1)])
    await db.favorites.create_index([("user_id", 1), ("item_id", 1)], unique=True)
    await db.messages.create_index([("seller_id", 1), ("created_at", -1)])
    await db.reports.create_index([("listing_id", 1), ("created_at", -1)])

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
