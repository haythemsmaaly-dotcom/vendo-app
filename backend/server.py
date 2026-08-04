from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import json
import base64
import binascii
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
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


# --------- Vision AI: item identification ---------
class AnalyzeRequest(BaseModel):
    photos: List[str]  # data URIs or raw base64 strings (JPEG/PNG/WEBP)


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


VISION_SYSTEM_PROMPT = """Tu es Vendo, expert en reconnaissance d'objets d'occasion et en estimation de leur état pour la revente (marché européen en euros).

À partir d'une ou plusieurs photos d'un objet, tu identifies l'objet ET tu évalues rigoureusement son état visible.

Tu retournes UNIQUEMENT un objet JSON valide (aucun texte autour, aucun bloc markdown).

Champs OBLIGATOIRES :
{
  "name": "Nom de l'objet (ex: Air Jordan 1 High, Casque Sony WH-1000XM5)",
  "brand": "Marque (ex: Nike, Sony, Apple)",
  "model": "Référence exacte du modèle si visible/identifiable, sinon null",
  "category": "Une des catégories: Sneakers, Vêtements, Sacs, Montres, Audio, Téléphones, Tablettes, Ordinateurs, Consoles, Jeux vidéo, Livres, Décoration, Meubles, Bijoux, Instruments, Sport, Jouets, Autre",
  "condition": "Neuf | Très bon | Bon | Correct | Usé",
  "condition_reasons": ["Éléments VISIBLES qui justifient la note d'état, en français, max 4 phrases courtes. Ex: 'Rayures visibles sur la semelle', 'Boîte présente et intacte', 'Aucune usure apparente sur le cuir'. Ne mentionne QUE ce que tu vois réellement. Si tu ne vois pas de défaut, dis-le explicitement."],
  "confidence": 0-100,
  "missing_info": ["Informations manquantes que l'utilisateur devrait vérifier, en français, max 3. Ex: 'Batterie état ?', 'Boîte d'origine ?'"],
  "photo_coach": ["Photos additionnelles à prendre pour améliorer l'annonce, en français, max 3. Ex: 'Photo de l'étiquette de taille', 'Gros plan sur la semelle'"],
  "market_low": nombre en EUR (borne basse plausible du marché d'occasion actuel — estimation IA, non basée sur données live),
  "market_high": nombre en EUR (borne haute plausible — estimation IA),
  "keywords": ["5-8 mots-clés français pour l'annonce"],
  "description": "Description d'annonce professionnelle en français, 2-4 phrases, mettant en valeur l'objet ET mentionnant honnêtement les défauts visibles"
}

Règles strictes :
- Ne PRÉTENDS PAS voir un défaut, un accessoire ou un détail qui n'est pas visible sur les photos.
- Si l'angle ou la lumière ne permet pas d'évaluer, mets confidence bas et ajoute une entrée dans missing_info/photo_coach.
- Grille de condition :
  * Neuf : aucun défaut, emballage/étiquettes présents
  * Très bon : quasi neuf, micro-marques d'usage à peine visibles
  * Bon : usage visible normal, aucun défaut majeur
  * Correct : défauts esthétiques visibles mais fonctionnel
  * Usé : défauts importants ou usure marquée
- market_low et market_high doivent être cohérents (low < high) et refléter le marché de l'occasion, pas le neuf. Ce sont des estimations IA, PAS des prix issus de données marché en direct.
- Utilise TOUJOURS le français pour tous les textes.
- Retourne UNIQUEMENT le JSON, sans commentaire, sans balise markdown."""


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
async def analyze_item(req: AnalyzeRequest):
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

    chat = LlmChat(
        api_key=api_key,
        session_id=f"vendo-analyze-{uuid.uuid4().hex[:8]}",
        system_message=VISION_SYSTEM_PROMPT,
    ).with_model("gemini", "gemini-3-flash-preview")

    user_msg = UserMessage(
        text="Identifie cet objet et retourne le JSON demandé.",
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
        valid_cond = {"Neuf", "Très bon", "Bon", "Correct", "Usé"}
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
