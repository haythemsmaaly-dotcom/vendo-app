import Constants from 'expo-constants';

const rawUrl = process.env.EXPO_PUBLIC_BACKEND_URL
  || (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_BACKEND_URL
  || '';

export const API_BASE = `${rawUrl}/api`;

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
};

export type AnalyzedItem = {
  name: string;
  brand: string;
  model?: string | null;
  category: string;
  condition: string;
  confidence: number;
  missing_info: string[];
  photo_coach: string[];
  market_low: number;
  market_high: number;
  keywords: string[];
  description: string;
};

export const api = {
  list: () => fetch(`${API_BASE}/items`).then(r => j<Item[]>(r)),
  get: (id: string) => fetch(`${API_BASE}/items/${id}`).then(r => j<Item>(r)),
  create: (item: Item) =>
    fetch(`${API_BASE}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    }).then(r => j<Item>(r)),
  update: (id: string, patch: Partial<Item>) =>
    fetch(`${API_BASE}/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(r => j<Item>(r)),
  remove: (id: string) =>
    fetch(`${API_BASE}/items/${id}`, { method: 'DELETE' }).then(r => j<{ ok: boolean }>(r)),
  stats: () =>
    fetch(`${API_BASE}/stats`).then(r =>
      j<{
        total_items: number;
        total_potential: number;
        items_sold: number;
        total_earned: number;
        average_sale_price: number;
      }>(r),
    ),
  analyze: (photos: string[]) =>
    fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos }),
    }).then(r => j<AnalyzedItem>(r)),
};
