"""Public, login-free legal pages (served under /api so they work on the deployed domain)."""
import html

NAME = "Haythem ben Ismain"
CITY = "Rotterdam"
EMAIL = "haythemsmaaly@gmail.com"
UPDATED = "June 2026"

PRIVACY = {
    "title": "VENDO Privacy Policy",
    "intro": f"Last updated {UPDATED}. Controller: {NAME}, {CITY}, Netherlands. Contact: {EMAIL}.",
    "sections": [
        ("1. What we collect", "Account data (name or username, email, password stored securely, language and currency settings); content you add (photos, listing titles, descriptions, prices, Wallet items, messages, favorites); technical data (device type, app version, crash information)."),
        ("2. Why we use it", "To run your account, listings, Wallet and messages (contract); to keep VENDO safe, handle reports and prevent fraud (legitimate interest); to improve the app (legitimate interest)."),
        ("3. AI processing", "Photos and item details you scan are sent to Google Gemini to identify items and suggest values, listing text and selling tips. Values are estimates, not guaranteed prices."),
        ("4. Service providers", "Emergent (hosting), MongoDB (database), Cloudinary (image storage), Google (AI)."),
        ("5. Who sees your data", "Listings are public. Messages are visible only to the people in the conversation. We do not sell your data."),
        ("6. Storage and transfers", "We keep data while your account exists. Some providers may process data outside the EEA under safeguards such as standard contractual clauses."),
        ("7. Your rights", f"Access, correct, export or delete your data, and object to or restrict processing. Delete your account in the app (this also deletes your Wallet items) or email {EMAIL}. You can complain to the Dutch Data Protection Authority (Autoriteit Persoonsgegevens)."),
        ("8. Children", "VENDO is not for anyone under 18."),
        ("9. Changes", "We will update this page and its date when the policy changes."),
    ],
}

TERMS = {
    "title": "VENDO Terms of Use",
    "intro": f"Last updated {UPDATED}.",
    "sections": [
        ("1. Eligibility", "You must be 18 or older and provide accurate information."),
        ("2. What VENDO is", "A platform where users list and discover secondhand items. VENDO is not a party to sales between users. Buyers and sellers are responsible for their own deals."),
        ("3. Estimates", "AI valuations and Selling Coach tips are suggestions only, with no guarantee of price or sale."),
        ("4. Your content", "You own your content and allow VENDO to display it in the app. You confirm you have the right to sell each item and use each photo."),
        ("5. Prohibited", "Illegal, stolen, counterfeit or dangerous items, scams, harassment, spam and fake listings."),
        ("6. Reports and removal", "We may remove content or suspend accounts that break these rules. Users can report content in the app."),
        ("7. Fees", "VENDO takes no commission at launch. We will announce clearly if this changes."),
        ("8. Liability", "VENDO is provided as it is. To the extent the law allows, we are not liable for disputes between users or losses from relying on estimates. This does not limit your mandatory consumer rights."),
        ("9. Law", "Dutch law applies, without limiting your rights as a consumer in your own country."),
        ("10. Contact", EMAIL),
    ],
}

DELETE_ACCOUNT = {
    "title": "Delete your VENDO account",
    "intro": "You can delete your VENDO account and its data at any time.",
    "sections": [
        ("In the app", "Open VENDO, go to Profile > Delete account & data, and confirm. Your account, listings, Wallet items, favorites and messages are deleted."),
        ("By email", f"If you cannot access the app, email {EMAIL} from the address linked to your account and ask for deletion. We will confirm once it is done."),
        ("What is deleted", "Your account details, listings, photo references, Wallet items, favorites, messages and reports you made. Some data may be kept for a short time where the law requires it."),
    ],
}

PAGES = {"privacy": PRIVACY, "terms": TERMS, "delete-account": DELETE_ACCOUNT}


def render(doc: dict) -> str:
    e = html.escape
    body = "".join(f"<h2>{e(h)}</h2><p>{e(p)}</p>" for h, p in doc["sections"])
    links = '<a href="/api/privacy">Privacy</a> · <a href="/api/terms">Terms</a> · <a href="/api/delete-account">Delete account</a>'
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{e(doc['title'])}</title>
<style>
body{{margin:0;background:#0A0A0A;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.6}}
main{{max-width:720px;margin:0 auto;padding:32px 20px 64px}}
.brand{{color:#D4FF3F;font-weight:700;letter-spacing:3px;font-size:13px}}
h1{{font-size:30px;line-height:1.2;margin:12px 0 8px}}
.meta{{color:#A3A3A3;font-size:14px;margin-bottom:24px}}
section{{background:#1A1A1A;border:1px solid #262626;border-radius:20px;padding:8px 20px 16px}}
h2{{font-size:17px;margin:20px 0 4px;color:#D4FF3F}}
p{{color:#D4D4D4;font-size:15px;margin:0}}
nav{{margin-top:28px;font-size:14px;color:#666}} a{{color:#D4FF3F}}
</style></head><body><main><div class="brand">● VENDO</div><h1>{e(doc['title'])}</h1>
<div class="meta">{e(doc['intro'])}</div><section>{body}</section><nav>{links}</nav></main></body></html>"""
