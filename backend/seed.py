"""Seed the Vendo database with realistic sample items."""
import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
import uuid

sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]


def build(entry):
    smart = round((entry["market_low"] + entry["market_high"]) / 2)
    fast = round(entry["market_low"] * 0.95)
    mx = round(entry["market_high"] * 1.02)
    created = datetime.now(timezone.utc) - timedelta(days=entry.get("age_days", 1))
    return {
        "id": str(uuid.uuid4()),
        "photo": entry["photo"],
        "photos": [entry["photo"]],
        "name": entry["name"],
        "brand": entry["brand"],
        "model": entry.get("model"),
        "category": entry["category"],
        "condition": entry["condition"],
        "confidence": entry["confidence"],
        "missing_info": entry["missing_info"],
        "photo_coach": entry["photo_coach"],
        "market_low": entry["market_low"],
        "market_high": entry["market_high"],
        "strategies": [
            {"key": "fast", "label": "Vente rapide", "price": fast,
             "explanation": "Prix agressif pour vendre en moins de 7 jours."},
            {"key": "smart", "label": "Prix intelligent", "price": smart,
             "explanation": "Le meilleur rapport rapidité / valeur."},
            {"key": "max", "label": "Prix maximum", "price": mx,
             "explanation": "Prix ambitieux pour maximiser vos gains."},
        ],
        "selected_strategy": entry.get("selected", "smart"),
        "listing": {
            "title": f"{entry['brand']} {entry['name']} — {entry['condition']}",
            "description": entry["description"],
            "category": entry["category"],
            "keywords": entry["keywords"],
            "condition": entry["condition"],
            "price": entry.get("price", smart),
        },
        "sell_score": entry["sell_score"],
        "sell_score_breakdown": entry["breakdown"],
        "sell_plan": {
            "mode": "balanced",
            "start_price": smart,
            "adjusted_price": round(smart * 0.92),
            "minimum_price": round(entry["market_low"] * 0.9),
            "target_date": (datetime.now(timezone.utc) + timedelta(days=14)).date().isoformat(),
            "adjustment_days": 7,
        },
        "status": entry["status"],
        "created_at": created.isoformat(),
        "sold_price": entry.get("sold_price"),
        "sold_at": entry.get("sold_at"),
    }


SAMPLES = [
    {
        "name": "Air Jordan 1 High", "brand": "Nike", "model": "AJ1 Retro High OG",
        "category": "Sneakers", "condition": "Très bon", "confidence": 92,
        "missing_info": ["Taille exacte", "Boîte d'origine ?"],
        "photo_coach": ["Photo de l'étiquette de taille.", "Semelle en gros plan.", "Toute rayure ou usure."],
        "market_low": 180, "market_high": 320,
        "keywords": ["jordan", "nike", "sneakers", "rétro", "baskets"],
        "description": "Paire de Nike Air Jordan 1 High en très bon état. Peu portées, cuir souple, aucun défaut majeur.",
        "photo": "https://images.unsplash.com/photo-1644426059269-36535c7c00fc?crop=entropy&cs=srgb&fm=jpg&w=800&q=80",
        "sell_score": 78, "breakdown": {"prix": 22, "photos": 15, "description": 18, "condition": 15, "titre": 15},
        "status": "ready", "age_days": 1,
    },
    {
        "name": "Sony WH-1000XM5", "brand": "Sony", "model": "WH-1000XM5",
        "category": "Audio", "condition": "Neuf", "confidence": 96,
        "missing_info": ["Facture d'achat ?"],
        "photo_coach": ["Photo de la boîte et accessoires.", "Coussinets en gros plan."],
        "market_low": 220, "market_high": 340,
        "keywords": ["casque", "sony", "noise cancelling", "audio", "sans fil"],
        "description": "Casque Sony WH-1000XM5 comme neuf, très peu utilisé. Réduction de bruit exceptionnelle, autonomie 30h.",
        "photo": "https://images.pexels.com/photos/18254091/pexels-photo-18254091.jpeg?auto=compress&cs=tinysrgb&w=800",
        "sell_score": 88, "breakdown": {"prix": 25, "photos": 20, "description": 18, "condition": 15, "titre": 15},
        "status": "listed", "age_days": 3,
    },
    {
        "name": "Rolex Submariner", "brand": "Rolex", "model": "Submariner Date",
        "category": "Montres", "condition": "Bon", "confidence": 88,
        "missing_info": ["Numéro de série", "Certificat"],
        "photo_coach": ["Numéro de série.", "Gros plan cadran.", "Bracelet et fermoir."],
        "market_low": 8500, "market_high": 12500,
        "keywords": ["rolex", "submariner", "montre luxe", "automatique"],
        "description": "Rolex Submariner en très bel état, révisée récemment. Mouvement automatique parfaitement fonctionnel.",
        "photo": "https://images.unsplash.com/photo-1639006570490-79c0c53f1080?crop=entropy&cs=srgb&fm=jpg&w=800&q=80",
        "sell_score": 62, "breakdown": {"prix": 20, "photos": 10, "description": 12, "condition": 10, "titre": 10},
        "status": "draft", "age_days": 5,
    },
    {
        "name": "Veste en cuir vintage", "brand": "Schott", "model": "Perfecto 618",
        "category": "Vêtements", "condition": "Bon", "confidence": 74,
        "missing_info": ["Taille", "Année"],
        "photo_coach": ["Étiquette intérieure.", "Coutures et col.", "Usure du cuir."],
        "market_low": 180, "market_high": 420,
        "keywords": ["cuir", "perfecto", "vintage", "schott"],
        "description": "Veste en cuir noir style Perfecto, vintage authentique. Cuir souple, patine unique.",
        "photo": "https://images.pexels.com/photos/10958906/pexels-photo-10958906.jpeg?auto=compress&cs=tinysrgb&w=800",
        "sell_score": 55, "breakdown": {"prix": 15, "photos": 10, "description": 10, "condition": 10, "titre": 10},
        "status": "draft", "age_days": 8,
    },
    {
        "name": "iPad Air 5", "brand": "Apple", "model": "iPad Air 5 M1 64Go Wi-Fi",
        "category": "Tablettes", "condition": "Très bon", "confidence": 94,
        "missing_info": ["Boîte d'origine ?"],
        "photo_coach": ["Photo de l'écran allumé.", "Dos et coins.", "Numéro de série."],
        "market_low": 380, "market_high": 520,
        "keywords": ["ipad", "apple", "air", "tablette", "m1"],
        "description": "iPad Air 5 (puce M1) 64 Go Wi-Fi en excellent état. Toujours protégé avec coque. Livré avec câble et adaptateur.",
        "photo": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80",
        "sell_score": 82, "breakdown": {"prix": 22, "photos": 20, "description": 15, "condition": 15, "titre": 15},
        "status": "sold", "age_days": 20, "sold_price": 450,
        "sold_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
    },
]


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    await db.items.delete_many({})
    for entry in SAMPLES:
        await db.items.insert_one(build(entry))
    count = await db.items.count_documents({})
    print(f"Seeded {count} items.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
