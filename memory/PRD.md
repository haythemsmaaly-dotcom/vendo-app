# Vendo — PRD (V1.0)

## Vision
Vendo is an AI-powered personal resale assistant. It helps people turn unwanted items into cash with the least possible effort. **Vendo is NOT a marketplace** — it prepares & optimizes listings that users publish on existing marketplaces.

## V1 Core Flow
Photo → Identify → Condition → Price → Listing → Sell Score → Sell Plan

## Feature Set (V1 Delivered)
- **Accueil (Home):** Greeting, "Vos gains potentiels" hero total, primary "Scanner un objet" CTA, "Trouver des objets à vendre" secondary CTA, "À optimiser" section (items with sell score < 70), horizontal recent items rail.
- **Scanner:** Camera / gallery / sample-image picker → preview grid (up to 3 photos) → analyzing animation with lime scanline & progress steps → success screen → detail navigation.
- **Détail objet:** Hero image with gradient scrim, brand/name/condition/category/AI-confidence pills, circular Sell Score ring (0–100), score breakdown bars, three price strategy cards (Vente rapide / Prix intelligent / Prix maximum) — selectable and updates price, editable listing (title / description / price / keywords / category / condition), Coach Photos IA tips, missing info list, Sell Plan picker (Rapide / Équilibré / Meilleur prix) with start/adjusted/minimum prices & target date, "Marquer prêt à publier" CTA.
- **Mes objets:** Filter chip row (Tout / Brouillons / Prêts / En vente / Vendus), list rows with photo/name/brand/category/price/condition/status/sell-score.
- **Profil:** Avatar & greeting, stats grid (Total gagné, Objets vendus, Prix moyen, En attente, Potentiel), preferences toggles, account & support sections, logout, version.

## Tech Stack
- **Frontend:** Expo SDK 54, expo-router (tabs), expo-image-picker, expo-camera, react-native-svg (Sell Score ring), react-native-reanimated (scanline & pulse), @gorhom/bottom-sheet, expo-linear-gradient, expo-haptics.
- **Backend:** FastAPI + Motor (MongoDB async). CRUD on `/api/items`, `/api/stats`.
- **Storage:** MongoDB (id, photo/photos base64 or URL, name, brand, model, category, condition, confidence, missing_info, photo_coach, market range, strategies, selected_strategy, listing, sell_score & breakdown, sell_plan, status, created_at, sold_price/at).

## Mock AI (V1)
Client-side simulation only. `src/catalog.ts` maps any scanned photo to a random catalog entry (Jordan, Sony XM5, Rolex, Perfecto, iPhone). Price strategies, sell plan and sell score are computed deterministically from the entry data. Ready to swap to Gemini / GPT vision in V2.

## Design System
Near-black `#0A0A0A` canvas, surface `#1A1A1A`, electric-lime `#D4FF3F` surgical accent, white text with muted grays, rounded 16–24px corners, generous 24px gutter, subtle Reanimated micro-interactions.

## Not in V1
Real AI vision, marketplace integrations, payments, chat, social feed, authentication.

## Business Enhancement Hooks (for V2)
- **Sell Score gating:** Suggest "Vendo Pro" (paid) for score booster (rewrite listing, price re-analysis, market-heat reports).
- **Marketplace publishing:** Deep-link into Vinted / Leboncoin / eBay with clipboard-filled listing.
- **Success revenue share:** Optional 1–2% fee when Vendo tracks a completed sale from a Vendo-prepared listing.
