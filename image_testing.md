## TEST AGENT PROMPT – IMAGE INTEGRATION RULES

Follow these rules exactly when testing the /api/analyze image endpoint.

**Image Handling Rules**
- Always use base64-encoded images (data URI: `data:image/jpeg;base64,...` or raw base64) for all tests.
- Accepted formats: JPEG, PNG, WEBP only.
- Do not use SVG, BMP, HEIC or other formats.
- Do not upload blank, solid-color, or uniform-variance images.
- Every image must contain real visual features — objects, edges, textures, shadows.
- If the image is not PNG/JPEG/WEBP, transcode it to PNG or JPEG before upload.
- Always re-detect and update the MIME after transformations.
- If animated (GIF, APNG, WEBP animation), extract the first frame only.
- Resize large images to reasonable bounds (max ~1024px longest side).

**Endpoint under test**
- `POST /api/analyze`
- Request body: `{ "photos": ["data:image/jpeg;base64,...", ...] }` (1–3 images)
- Response: JSON with `name, brand, model, category, condition, confidence, missing_info, photo_coach, market_low, market_high, keywords, description`

**Suggested test images**
- A recognizable product photo from a public URL (Unsplash / Pexels). Download, resize to 800px, JPEG re-encode, then base64.
- Also test the fallback path by sending an obviously non-product image (a blank white square would break rules — use a landscape photo) to see that the endpoint still returns a valid schema (either from LLM or fallback).
