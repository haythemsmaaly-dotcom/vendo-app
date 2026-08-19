# Vendo Marketplace Launch Beta

This build adds a real Vendo-owned marketplace on top of the existing vision-AI resale flow.

## Included
- Email/password user accounts with JWT sessions stored securely on device
- Server-side seller ownership checks
- Sell on Vendo review/publish flow
- Dedicated Marketplace tab with search/category filters
- Public listing detail with multi-photo gallery
- Seller edit/unpublish/mark-sold controls
- Authenticated favorites
- Authenticated buyer inquiries + seller inbox
- Authenticated listing reports with structured reasons
- Account/data deletion
- Optional Cloudinary image storage; public publishing uploads local/base64 photos when configured
- Existing real vision AI, Sell Score, condition analysis, FR/EN settings and external marketplace handoff preserved
- Privacy/Terms screens and EAS build configuration

## Required before a public production deployment
1. Backend `.env`: set `ENVIRONMENT=production`, a persistent 48+ character `AUTH_SECRET`, MongoDB production URL/database, and the existing `EMERGENT_LLM_KEY` (or replace that integration with your chosen vision provider).
2. Configure Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`). New public listings with local/base64 photos will not publish when cloud storage is configured until those images are uploaded; the app handles this automatically in the Sell flow.
3. Set `EXPO_PUBLIC_BACKEND_URL` in the Expo/EAS production environment to the HTTPS backend URL.
4. Restrict `CORS_ORIGINS` for web production. Native apps do not rely on browser CORS, but the web build does.
5. Replace/review the included Privacy Notice and Terms with counsel appropriate to your launch countries and business model.
6. Run the backend test suite against the deployed staging backend, then test camera, auth, publish, marketplace, messaging, reports and account deletion on real iOS/Android devices.
7. Configure Apple/Google store metadata, signing and submission accounts. Store review time is outside the codebase.

## Important product limitation
Vendo's displayed market range is an **AI estimate**, not verified live comparable-sales data. The UI labels it accordingly. Real market-data integration is a separate feature.

## Authentication note
This standalone codebase uses a conventional email/password + bcrypt + signed JWT implementation rather than Emergent-managed Google Auth, so it remains portable outside Emergent. For a larger public launch, add email verification, password reset and optionally Sign in with Apple/Google.
