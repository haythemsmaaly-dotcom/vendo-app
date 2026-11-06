import Constants from 'expo-constants';

const rawUrl = process.env.EXPO_PUBLIC_BACKEND_URL
  || (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_BACKEND_URL
  || '';

export const API_BASE = `${rawUrl}/api`;

let authToken: string | null = null;
export function setAuthToken(token: string | null) { authToken = token; }
function authHeaders(extra: Record<string,string> = {}) { return authToken ? { ...extra, Authorization: `Bearer ${authToken}` } : extra; }

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export type Strategy = {
  key: string;
  label: string;
  price: number;
  explanation: string;
};

export type ListingT = {
  title: string;
  description: string;
  category: string;
  keywords: string[];
  condition: string;
  price: number;
};

export type SellPlanT = {
  mode: string;
  start_price: number;
  adjusted_price: number;
  minimum_price: number;
  target_date: string;
  adjustment_days: number;
};

export type Item = {
  id: string;
  photo: string;
  photos: string[];
  name: string;
  brand?: string;
  model?: string;
  category: string;
  condition: string;
  condition_reasons?: string[];
  confidence: number;
  missing_info: string[];
  photo_coach: string[];
  market_low: number;
  market_high: number;
  strategies: Strategy[];
  selected_strategy: string;
  listing: ListingT;
  sell_score: number;
  sell_score_breakdown: Record<string, number>;
  sell_plan: SellPlanT;
  status: string;
  created_at: string;
  sold_price?: number | null;
  sold_at?: string | null;
  seller_id?: string | null;
  seller_name?: string | null;
  location_label?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  views_count?: number;
  favorites_count?: number;
};

export type User = { id: string; email: string; display_name: string; location_label?: string | null; created_at: string; };
export type AuthResponse = { token: string; user: User };
export type MarketplaceItem = Item & { seller_id?: string | null; seller_name?: string | null; location_label?: string | null; published_at?: string | null; views_count?: number; favorites_count?: number; };
export type InboxMessage = { id: string; listing_id: string; listing_title: string; buyer_id: string; buyer_name: string; seller_id: string; message: string; created_at: string; read: boolean; };

export type AnalyzedItem = {
  name: string;
  brand: string;
  model?: string | null;
  category: string;
  condition: string;
  condition_reasons?: string[];
  confidence: number;
  missing_info: string[];
  photo_coach: string[];
  market_low: number;
  market_high: number;
  keywords: string[];
  description: string;
};

export type WalletItem = {
  id: string; user_id: string; title: string; description: string; photo_url: string;
  value_low: number; value_high: number; currency: string; category?: string | null; condition?: string | null; created_at: string;
};
export type WalletSummary = { count: number; total_low: number; total_high: number; currency: string };

export type CoachTip = { type: 'photo' | 'price' | 'description' | 'title'; title: string; body: string };
export type CoachInput = { title: string; description: string; price: number; category: string; photo_count: number; value_low?: number; value_high?: number; locale: string };

export const api = {
  coachTips: (input: CoachInput) => fetch(`${API_BASE}/coach/tips`, { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(input) }).then(r => j<{ tips: CoachTip[]; limited: boolean }>(r)),
  walletAdd: (item: Omit<WalletItem, 'id' | 'user_id' | 'created_at'>) => fetch(`${API_BASE}/wallet`, { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(item) }).then(r => j<WalletItem>(r)),
  walletList: () => fetch(`${API_BASE}/wallet`, { headers: authHeaders() }).then(r => j<WalletItem[]>(r)),
  walletSummary: () => fetch(`${API_BASE}/wallet/summary`, { headers: authHeaders() }).then(r => j<WalletSummary>(r)),
  walletGet: (id: string) => fetch(`${API_BASE}/wallet/${id}`, { headers: authHeaders() }).then(r => j<WalletItem>(r)),
  walletRemove: (id: string) => fetch(`${API_BASE}/wallet/${id}`, { method: 'DELETE', headers: authHeaders() }).then(r => j<{ ok: boolean }>(r)),
  list: () => fetch(`${API_BASE}/items`, { headers: authHeaders() }).then(r => j<Item[]>(r)),
  get: (id: string) => fetch(`${API_BASE}/items/${id}`, { headers: authHeaders() }).then(r => j<Item>(r)),
  create: (item: Item) =>
    fetch(`${API_BASE}/items`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(item),
    }).then(r => j<Item>(r)),
  update: (id: string, patch: Partial<Item>) =>
    fetch(`${API_BASE}/items/${id}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(patch),
    }).then(r => j<Item>(r)),
  remove: (id: string) =>
    fetch(`${API_BASE}/items/${id}`, { method: 'DELETE', headers: authHeaders() }).then(r => j<{ ok: boolean }>(r)),
  stats: () =>
    fetch(`${API_BASE}/stats`, { headers: authHeaders() }).then(r =>
      j<{
        total_items: number;
        total_potential: number;
        items_sold: number;
        total_earned: number;
        average_sale_price: number;
      }>(r),
    ),
  uploadPhotos: (photos: string[]) => fetch(`${API_BASE}/uploads/photos`, { method: 'POST', headers: authHeaders({ 'Content-Type':'application/json' }), body: JSON.stringify({ photos }) }).then(r => j<{photos:string[]}>(r)),
  uploadStatus: () => fetch(`${API_BASE}/uploads/status`).then(r => j<{provider:string;configured:boolean}>(r)),
  register: (email: string, password: string, display_name: string, location_label?: string) =>
    fetch(`${API_BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, display_name, location_label }) }).then(r => j<AuthResponse>(r)),
  login: (email: string, password: string) =>
    fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }).then(r => j<AuthResponse>(r)),
  me: () => fetch(`${API_BASE}/auth/me`, { headers: authHeaders() }).then(r => j<User>(r)),
  deleteAccount: () => fetch(`${API_BASE}/auth/account`, { method: 'DELETE', headers: authHeaders() }).then(r => j<{ok:boolean}>(r)),
  marketplace: (q = '', category = '') => fetch(`${API_BASE}/marketplace?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}`).then(r => j<MarketplaceItem[]>(r)),
  marketplaceGet: (id: string) => fetch(`${API_BASE}/marketplace/${id}`).then(r => j<MarketplaceItem>(r)),
  publish: (id: string, patch: any) => fetch(`${API_BASE}/marketplace/${id}/publish`, { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(patch) }).then(r => j<Item>(r)),
  unpublish: (id: string) => fetch(`${API_BASE}/marketplace/${id}/unpublish`, { method: 'POST', headers: authHeaders() }).then(r => j<Item>(r)),
  markMarketplaceSold: (id: string) => fetch(`${API_BASE}/marketplace/${id}/sold`, { method: 'POST', headers: authHeaders() }).then(r => j<Item>(r)),
  toggleFavorite: (id: string) => fetch(`${API_BASE}/favorites/${id}`, { method: 'POST', headers: authHeaders() }).then(r => j<{favorited:boolean}>(r)),
  favorites: () => fetch(`${API_BASE}/favorites`, { headers: authHeaders() }).then(r => j<MarketplaceItem[]>(r)),
  report: (listing_id: string, reason: string, description?: string) => fetch(`${API_BASE}/reports`, { method: 'POST', headers: authHeaders({ 'Content-Type':'application/json' }), body: JSON.stringify({ listing_id, reason, description }) }).then(r => j<any>(r)),
  sendMessage: (listing_id: string, message: string) => fetch(`${API_BASE}/messages`, { method: 'POST', headers: authHeaders({ 'Content-Type':'application/json' }), body: JSON.stringify({ listing_id, message }) }).then(r => j<any>(r)),
  inbox: () => fetch(`${API_BASE}/messages/inbox`, { headers: authHeaders() }).then(r => j<InboxMessage[]>(r)),
  myListings: () => fetch(`${API_BASE}/my/listings`, { headers: authHeaders() }).then(r => j<MarketplaceItem[]>(r)),
  analyze: (photos: string[], locale?: string) =>
    fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ photos, locale: locale || 'fr' }),
    }).then(r => j<AnalyzedItem>(r)),
};
