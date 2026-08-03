from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone


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


class ItemUpdate(BaseModel):
    listing: Optional[Listing] = None
    selected_strategy: Optional[str] = None
    sell_plan: Optional[SellPlan] = None
    status: Optional[str] = None
    sold_price: Optional[float] = None
    sold_at: Optional[str] = None
    sell_score: Optional[int] = None


# --------- Routes ---------
@api_router.get("/")
async def root():
    return {"message": "Vendo API online"}


@api_router.post("/items", response_model=Item)
async def create_item(item: Item):
    doc = item.model_dump()
    if not doc.get("id"):
        doc["id"] = str(uuid.uuid4())
    if not doc.get("created_at"):
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.items.insert_one(doc)
    doc.pop("_id", None)
    return Item(**doc)


@api_router.get("/items", response_model=List[Item])
async def list_items():
    items = await db.items.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Item(**i) for i in items]


@api_router.get("/items/{item_id}", response_model=Item)
async def get_item(item_id: str):
    doc = await db.items.find_one({"id": item_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Item not found")
    return Item(**doc)


@api_router.patch("/items/{item_id}", response_model=Item)
async def update_item(item_id: str, patch: ItemUpdate):
    updates = {k: v for k, v in patch.model_dump(exclude_none=True).items()}
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
async def delete_item(item_id: str):
    res = await db.items.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}


@api_router.get("/stats")
async def stats():
    items = await db.items.find({}, {"_id": 0}).to_list(1000)
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


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
