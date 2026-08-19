# Vendo Marketplace Beta — Build Report

## What this build adds

### Accounts & security
- Real email/password accounts backed by MongoDB.
- Passwords hashed with bcrypt.
- Signed JWT sessions stored on-device with Expo SecureStore.
- Marketplace listing ownership is checked server-side.
- Private inventory is scoped to the signed-in seller.
- Published listings remain publicly browseable through dedicated marketplace endpoints.
- In-app account deletion removes the user's account, listings, favorites, marketplace messages and related reports.

### Vendo Marketplace
- New fifth tab: **Marketplace**.
- Two-column marketplace feed.
- Search and category filtering.
- Public listing/product page.
- Seller asking price clearly separated from **Vendo AI estimate**.
- Seller display name, approximate location, condition and view count.
- **Sell on Vendo** review/publish flow from an analyzed item.
- Seller can edit, unpublish and mark a listing sold.
- Sold/unpublished items disappear from active marketplace browse results.

### Buyer interactions
- Authenticated favorites, persisted server-side.
- Saved listings screen.
- Real database-backed buyer inquiry form.
- Seller inbox.
- Listing reports stored server-side.

### Image architecture
- Optional production Cloudinary upload endpoint.
- Signed backend uploads; Cloudinary secret never belongs in the mobile app.
- Validates image count, format and maximum size.
- New scans attempt Cloudinary persistence after AI analysis when Cloudinary is configured.
- Development fallback remains base64 so the project still works before Cloudinary credentials are added.

### Launch/product work
- App display name changed to **Vendo** and URL scheme to `vendo`.
- EAS build configuration added.
- Privacy notice screen added.
- Beta terms screen added.
- Profile now exposes account, inbox, favorites, privacy, terms, sign-out and account deletion.
- Existing AI recognition, condition analysis, Sell Score, onboarding, FR/EN foundation, region/currency settings and external marketplace sharing are preserved.

## Backend endpoints added

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `DELETE /api/auth/account`
- `GET /api/uploads/status`
- `POST /api/uploads/photos`
- `GET /api/marketplace`
- `GET /api/marketplace/{id}`
- `POST /api/marketplace/{id}/publish`
- `POST /api/marketplace/{id}/unpublish`
- `POST /api/marketplace/{id}/sold`
- `POST /api/favorites/{id}`
- `GET /api/favorites`
- `POST /api/reports`
- `POST /api/messages`
- `GET /api/messages/inbox`
- `GET /api/my/listings`

## Security changes

- `/api/analyze` now requires authentication to reduce abuse of the paid AI service.
- Authenticated inventory creation binds new items to the user.
- Owned item updates/deletes require the matching authenticated seller.
- Private inventories/stats are user-scoped.
- Marketplace write operations verify ownership on the server.
- CORS is configurable via `CORS_ORIGINS`.
- Mongo indexes added for users, marketplace browse, seller listings, favorites, messages and reports.

## Validation completed in this build environment

- `python -m py_compile backend/server.py` passes.
- All 38 TypeScript/TSX source files parse successfully through TypeScript's compiler/transpiler.
- JSON/app configuration validates.

Full runtime tests could not be executed in this sandbox because the original project dependencies (`motor`, `bcrypt`, Expo packages, MongoDB) are not installed here and internet package installation is blocked. Run the existing backend tests and Expo lint after restoring/installing dependencies in Emergent or your local environment.

## Required configuration before public beta

Create `backend/.env` from `backend/.env.example` and set:

- `MONGO_URL`
- `DB_NAME`
- `AUTH_SECRET` — long random secret; required so sessions survive backend restarts
- `EMERGENT_LLM_KEY` (or replace the vision provider before leaving Emergent infrastructure)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- production `CORS_ORIGINS` for web deployments

For Cloudinary, do not put `CLOUDINARY_API_SECRET` in Expo or any `EXPO_PUBLIC_*` variable.

## Important launch limitations

1. **Cloudinary must be configured before a serious public marketplace launch.** Without it, the app deliberately falls back to base64 image storage for development compatibility.
2. **Vision AI currently depends on `EMERGENT_LLM_KEY`.** If your Emergent service/credits no longer provide this key/API, migrate the AI endpoint to your own supported vision provider before public launch.
3. The included Privacy and Terms screens are product templates, not final legal documents. Add the real legal entity, support contact, jurisdictions, processors and required consumer disclosures.
4. Marketplace payments are intentionally not built. Vendo currently connects buyer and seller via inquiries; it does not provide escrow, buyer protection, shipping, payouts or refunds.
5. Real market price data is still not implemented. AI price ranges are explicitly labeled estimates.

## Recommended release sequence

1. Configure production MongoDB, stable `AUTH_SECRET`, Cloudinary and AI provider.
2. Install frontend/backend dependencies.
3. Run backend test suite and Expo lint/type checks.
4. Test on two real accounts/devices: seller and buyer.
5. Test publish → browse → favorite → inquiry → inbox → sold/unpublish → account deletion.
6. Replace privacy/terms templates with reviewed final text.
7. Generate EAS internal preview builds and test native camera/haptics/deep links.
8. Submit only after the above passes.
