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


## V1.1 — Current implemented state (post-continuation)
The app has moved well beyond the original V1 mock. Now delivered & verified:
- **Real AI vision:** `/api/analyze` uses Gemini via the Emergent LLM key (not mocked). Returns name/brand/model/category/condition + reasons, confidence, market range, keywords, description (FR/EN by locale).
- **Authentication:** email/password with bcrypt + JWT (30-day). Persistent `AUTH_SECRET` in env (required in production). Session persists across reloads via cross-platform secure storage wrapper (Keychain on native, AsyncStorage on web).
- **Marketplace (compliant):** publish/unpublish/mark-sold, public feed, favorites, buyer→seller messages/inbox, reports. Share = copy listing + open marketplace web form (no auto-posting/scraping).
- **i18n:** FR + EN dictionaries; `t()` plumbed across Home / My Items / Scan / Item detail / Profile / Onboarding / Region. Language switch is live.
- **Currency:** configurable per user (EUR/GBP/USD/CHF/CAD). `formatMoney()` converts stored EUR amounts via a static rate table + Intl formatting.
- **Image storage:** base64 in dev; Cloudinary integration coded server-side (`/api/uploads/photos`), pending credentials to enable persistent HTTPS URLs for marketplace photos.

## Testing status (this cycle)
- Backend regression: 48/48 passed (auth, items+ownership, marketplace, favorites, messages, reports, uploads, AI vision, stats).
- Frontend regression: all critical flows passed on web (boot/no-blank-screen, session persistence, i18n FR↔EN, currency switching, scan→analyze→detail, filters, logout).

## Known non-blockers / later enhancements
- Real market pricing (eBay/SerpAPI) intentionally deferred — market range stays an AI estimate labeled as such.
- Item-detail price EDIT input edits the underlying EUR base value (display is converted).
- NL/DE/ES/IT translations not shipped (only FR/EN).

## My VENDO Wallet (June 2026)
- Personal inventory (not real money). Collection `wallet_items` (user_id, title, description, photo_url, value_low, value_high, currency=EUR base, category, condition, created_at).
- Endpoints (auth, owner-only): POST/GET /api/wallet, GET /api/wallet/summary, GET/DELETE /api/wallet/{id}. Account deletion removes wallet items.
- Frontend: Wallet tab app/(tabs)/wallet.tsx, detail app/wallet/[id].tsx, "Save to My Wallet" on scan results; "List on VENDO" creates a draft item and opens /sell/[id].

## Selling Coach (June 2026)
- POST /api/coach/tips (auth): Gemini 3 Flash, JSON-only, validated 3-4 tips {type,title,body}; 10 calls/user/hour via `coach_calls`; failure/limit -> empty list (card hides). Account deletion clears coach_calls.
- Component src/components/SellingCoach.tsx shown on scan results and sell form (/sell/[id]); loads on mount + Refresh button.

## Legal pages (June 2026)
- Public HTML (no login) from backend/legal_pages.py: /api/privacy, /api/terms, /api/delete-account. In-app copies in src/legal.ts via src/components/LegalScreen.tsx (app/legal/*). Links in Profile + sign-up screen.
