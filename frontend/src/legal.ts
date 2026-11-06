// In-app copy of the public legal pages (served by the backend at /api/privacy, /api/terms, /api/delete-account).
// Keep in sync with backend/legal_pages.py.
const EMAIL = "haythemsmaaly@gmail.com";
const UPDATED = "June 2026";

export type LegalDoc = { title: string; intro: string; sections: [string, string][] };

export const PRIVACY: LegalDoc = {
  title: "VENDO Privacy Policy",
  intro: `Last updated ${UPDATED}. Controller: Haythem ben Ismain, Rotterdam, Netherlands. Contact: ${EMAIL}.`,
  sections: [
    ["1. What we collect", "Account data (name or username, email, password stored securely, language and currency settings); content you add (photos, listing titles, descriptions, prices, Wallet items, messages, favorites); technical data (device type, app version, crash information)."],
    ["2. Why we use it", "To run your account, listings, Wallet and messages (contract); to keep VENDO safe, handle reports and prevent fraud (legitimate interest); to improve the app (legitimate interest)."],
    ["3. AI processing", "Photos and item details you scan are sent to Google Gemini to identify items and suggest values, listing text and selling tips. Values are estimates, not guaranteed prices."],
    ["4. Service providers", "Emergent (hosting), MongoDB (database), Cloudinary (image storage), Google (AI)."],
    ["5. Who sees your data", "Listings are public. Messages are visible only to the people in the conversation. We do not sell your data."],
    ["6. Storage and transfers", "We keep data while your account exists. Some providers may process data outside the EEA under safeguards such as standard contractual clauses."],
    ["7. Your rights", `Access, correct, export or delete your data, and object to or restrict processing. Delete your account in the app (this also deletes your Wallet items) or email ${EMAIL}. You can complain to the Dutch Data Protection Authority (Autoriteit Persoonsgegevens).`],
    ["8. Children", "VENDO is not for anyone under 18."],
    ["9. Changes", "We will update this page and its date when the policy changes."],
  ],
};

export const TERMS: LegalDoc = {
  title: "VENDO Terms of Use",
  intro: `Last updated ${UPDATED}.`,
  sections: [
    ["1. Eligibility", "You must be 18 or older and provide accurate information."],
    ["2. What VENDO is", "A platform where users list and discover secondhand items. VENDO is not a party to sales between users. Buyers and sellers are responsible for their own deals."],
    ["3. Estimates", "AI valuations and Selling Coach tips are suggestions only, with no guarantee of price or sale."],
    ["4. Your content", "You own your content and allow VENDO to display it in the app. You confirm you have the right to sell each item and use each photo."],
    ["5. Prohibited", "Illegal, stolen, counterfeit or dangerous items, scams, harassment, spam and fake listings."],
    ["6. Reports and removal", "We may remove content or suspend accounts that break these rules. Users can report content in the app."],
    ["7. Fees", "VENDO takes no commission at launch. We will announce clearly if this changes."],
    ["8. Liability", "VENDO is provided as it is. To the extent the law allows, we are not liable for disputes between users or losses from relying on estimates. This does not limit your mandatory consumer rights."],
    ["9. Law", "Dutch law applies, without limiting your rights as a consumer in your own country."],
    ["10. Contact", EMAIL],
  ],
};

export const DELETE_ACCOUNT: LegalDoc = {
  title: "Delete your VENDO account",
  intro: "You can delete your VENDO account and its data at any time.",
  sections: [
    ["In the app", "Open VENDO, go to Profile > Delete account & data, and confirm. Your account, listings, Wallet items, favorites and messages are deleted."],
    ["By email", `If you cannot access the app, email ${EMAIL} from the address linked to your account and ask for deletion. We will confirm once it is done.`],
    ["What is deleted", "Your account details, listings, photo references, Wallet items, favorites, messages and reports you made. Some data may be kept for a short time where the law requires it."],
  ],
};
