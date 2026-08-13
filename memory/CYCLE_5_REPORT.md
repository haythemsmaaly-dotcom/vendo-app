# Vendo — Cycle 5 report (Phases 1, 2, 5, 8, 9-foundation, 10, 11 delivered)

## Files changed / created
### Backend
- **`server.py`** — Split `VISION_SYSTEM_PROMPT` into `VISION_SYSTEM_PROMPT_FR` + `VISION_SYSTEM_PROMPT_EN`. `/api/analyze` now accepts optional `locale` param (`"fr"` default). `condition_reasons` field added to `AnalyzedItem` and `Item` models. Condition values accepted in both languages.

### Frontend
- **New**: `app/onboarding.tsx`, `app/settings/region.tsx`
- **New**: `src/i18n/index.ts`, `src/i18n/fr.ts`, `src/i18n/en.ts`, `src/i18n/SettingsContext.tsx`
- **New**: `src/marketplace.ts` (compliant share/copy/open helpers)
- **Modified**: `_layout.tsx` (SettingsProvider wired, first-launch onboarding gate, settings/region route), `(tabs)/profile.tsx` (i18n + Region & langue section + replay onboarding), `(tabs)/scan.tsx` (locale passed to /api/analyze), `item/[id].tsx` (Marketplace share section), `(tabs)/_layout.tsx` (shadow*→boxShadow), `theme.ts` (font tokens), `api.ts` (analyze locale + AnalyzedItem.condition_reasons).
- **Assets**: Space Grotesk + Inter TTFs already installed in cycle 4.

## What was delivered
1. **Phase 1** — 3-screen first-launch onboarding, Skip, dots indicator, "Continue"/"Start scanning" CTA, replay from Profile > Support.
2. **Phase 2** — Cleanup: shadow* → boxShadow; Reanimated `entering + transform` conflict fixed (pulseStyle wrapped).
3. **Phase 3-4** — Design & real AI vision preserved unchanged.
4. **Phase 5** — Enhanced condition analysis: `condition_reasons[]` returned by the AI (visible-only), displayed as "Ce que Vendo voit" / "What Vendo sees" section on the detail page.
5. **Phase 7** — Listing generation was already complete; now locale-aware (FR/EN description + keywords).
6. **Phase 8** — Marketplace share (compliant): "Copy listing", "Open in Vinted/Leboncoin/eBay/Facebook/Depop" (auto-selects the user's preferred marketplaces), native `Share.share()`. **No auto-posting, no scraping.**
7. **Phase 9 foundation** — i18n architecture with `translate()`, `useT()`, `useSettings()`. FR + EN dictionaries complete for onboarding, profile, region settings, detail-share section, marketplace strings.
8. **Phase 10** — Settings screen for Language (FR/EN), Country (11 countries), Currency (5 currencies, auto-aligned to country), Preferred marketplaces (multi-select).
9. **Phase 11** — Basic accessibility: `accessibilityRole`, `accessibilityLabel`, `hitSlop` on tap targets, on Home/Scan/Onboarding/Profile/Region CTAs.
10. **Phase 12** — Sell Score preserved; market values now honestly labeled "estimé par l'IA / AI-estimated" in UI.

## Tests performed & passed
- Backend `pytest` **11/11** including new `TestLocale` (EN/FR) + `TestItemsRegression`.
- Frontend testing agent: onboarding renders, region screen navigations, profile stats formatted by locale, item detail marketplace share (copy + open web form), no console errors.
- Manual: Air Jordan photo → FR ("Neuf") + EN ("New") outputs verified with real Gemini 3 Flash calls.

## Marketplace limitations (Phase 8 — honest report)
| Marketplace | Public listing API | Vendo approach |
|---|---|---|
| **Vinted** | ❌ None | Copy to clipboard + open web listing form |
| **Leboncoin** | ❌ None | Copy to clipboard + open web listing form |
| **eBay** | ✅ Sell API exists (POST /sell/inventory/v1/inventory_item) | Currently: copy + open web. **Full integration = another cycle** — requires dev account + user OAuth + business seller account + inventory taxonomy. No cost from eBay itself. |
| **Facebook Marketplace** | ❌ None | Copy + open web |
| **Depop** | ❌ None | Copy + open web |

**No costs incurred, nothing was scraped, no ToS violated.**

## AI limitations
- Vision AI uses **Gemini 3 Flash** via Emergent LLM key (~0.0001 €/scan).
- Confidence scoring and market range are **AI estimates**, NOT live marketplace data. Labeled as such in the UI.
- `condition_reasons` visible-only rule enforced by the prompt.

## Costs so far
- Emergent LLM key only. **No new paid APIs, no new subscriptions.**

## STOP report — Phase 6 (real market pricing)
Cannot be truly done without either:
- **Option A — eBay Browse/Marketplace Insights API** (free tier: 5 000 calls/day). Requires:
  - Your eBay developer account (~10 min to create at https://developer.ebay.com/)
  - App ID + Cert ID + Dev ID
  - Server-side OAuth (client_credentials flow for Browse)
- **Option B — SerpAPI Google Shopping** (~50 €/mo for 5 000 searches).
- **Option C — Priceapi.com** (~99 €/mo).

If you want Phase 6 done, tell me which option and provide credentials. Until then, market ranges remain honest AI estimates labeled as such.

## Not done in this cycle (candidates for the next)
- NL / DE / ES / IT translations (~10-15 credits each for full strings).
- Home / Items / Scan screens still show hard-coded FR strings (i18n architecture in place, only ~30 strings left to plumb through `t()`).
- Currency conversion of stored EUR values into user's currency (item prices currently stay in EUR because the AI outputs EUR — could convert with a hardcoded rate table or ExchangeRate-API).
- Full eBay Sell API integration (Phase 8-B, no cost but 1 dedicated cycle).
- Phase 6 depending on your API choice above.

## What still needs before Vendo is launch-ready
1. Complete i18n plumbing on the 3 remaining tab screens (~1 cycle).
2. Real camera testing on iOS/Android build (Expo Go supports it but full permissions dialog only appears on a real build).
3. Terms of Service + Privacy Policy pages (legal requirement for App Store / Play Store).
4. Icon & splash-screen final assets (currently defaults).
5. Backup: connect the repo to your own GitHub via the "Save to GitHub" button in the top-right of the Emergent panel — do this **before** the next cycle so you always have a rollback point off-platform.
