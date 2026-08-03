// Mock AI catalog — used to simulate identification results in V1.
// Each entry contains a full item template ready to be inserted via API.

export type CatalogEntry = {
  name: string;
  brand: string;
  model?: string;
  category: string;
  condition: string;
  confidence: number;
  missing_info: string[];
  photo_coach: string[];
  market_low: number;
  market_high: number;
  keywords: string[];
  description: string;
  fallbackPhoto: string;
};

export const CATALOG: CatalogEntry[] = [
  {
    name: 'Air Jordan 1 High',
    brand: 'Nike',
    model: 'Air Jordan 1 Retro High OG',
    category: 'Sneakers',
    condition: 'Très bon',
    confidence: 92,
    missing_info: ['Taille exacte', 'Boîte d\'origine ?'],
    photo_coach: [
      'Prenez une photo de l\'étiquette de taille.',
      'Montrez la semelle en gros plan.',
      'Photographiez toute rayure ou usure.',
    ],
    market_low: 180,
    market_high: 320,
    keywords: ['jordan', 'nike', 'sneakers', 'rétro', 'baskets', 'streetwear'],
    description:
      'Paire de Nike Air Jordan 1 High en très bon état. Peu portées, cuir souple, aucun défaut majeur. Idéales pour collectionneur ou usage quotidien. Vendues sans boîte.',
    fallbackPhoto: 'https://images.unsplash.com/photo-1644426059269-36535c7c00fc?crop=entropy&cs=srgb&fm=jpg&w=800&q=80',
  },
  {
    name: 'Rolex Submariner',
    brand: 'Rolex',
    model: 'Submariner Date',
    category: 'Montres',
    condition: 'Bon',
    confidence: 88,
    missing_info: ['Numéro de série', 'Certificat d\'authenticité'],
    photo_coach: [
      'Photographiez le numéro de série.',
      'Gros plan sur le cadran.',
      'Montrez le bracelet et le fermoir.',
    ],
    market_low: 8500,
    market_high: 12500,
    keywords: ['rolex', 'montre luxe', 'submariner', 'automatique', 'suisse'],
    description:
      'Rolex Submariner en très bel état, révisée récemment. Mouvement automatique parfaitement fonctionnel. Petites micro-rayures d\'usage sur le bracelet.',
    fallbackPhoto: 'https://images.unsplash.com/photo-1639006570490-79c0c53f1080?crop=entropy&cs=srgb&fm=jpg&w=800&q=80',
  },
  {
    name: 'Sony WH-1000XM5',
    brand: 'Sony',
    model: 'WH-1000XM5',
    category: 'Audio',
    condition: 'Neuf',
    confidence: 96,
    missing_info: ['Facture d\'achat ?'],
    photo_coach: [
      'Photo de la boîte et des accessoires.',
      'Gros plan sur les coussinets.',
    ],
    market_low: 220,
    market_high: 340,
    keywords: ['casque', 'audio', 'sony', 'noise cancelling', 'sans fil'],
    description:
      'Casque Sony WH-1000XM5 comme neuf, très peu utilisé. Réduction de bruit exceptionnelle, autonomie 30h. Livré avec câble USB-C et jack.',
    fallbackPhoto: 'https://images.pexels.com/photos/18254091/pexels-photo-18254091.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    name: 'Veste en cuir vintage',
    brand: 'Schott',
    model: 'Perfecto 618',
    category: 'Vêtements',
    condition: 'Bon',
    confidence: 74,
    missing_info: ['Taille', 'Année de fabrication'],
    photo_coach: [
      'Photographiez l\'étiquette intérieure.',
      'Montrez les coutures et le col.',
      'Gros plan sur toute usure du cuir.',
    ],
    market_low: 180,
    market_high: 420,
    keywords: ['veste cuir', 'perfecto', 'vintage', 'schott', 'biker'],
    description:
      'Veste en cuir noir style Perfecto, vintage authentique. Cuir souple, patine unique. Quelques marques d\'usage qui ajoutent au caractère.',
    fallbackPhoto: 'https://images.pexels.com/photos/10958906/pexels-photo-10958906.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    name: 'iPhone 14 Pro',
    brand: 'Apple',
    model: 'iPhone 14 Pro 256GB',
    category: 'Téléphones',
    condition: 'Très bon',
    confidence: 94,
    missing_info: ['Capacité de la batterie', 'Boîte d\'origine ?'],
    photo_coach: [
      'Capture d\'écran des paramètres batterie.',
      'Photo de l\'IMEI.',
      'Montrez le châssis en gros plan.',
    ],
    market_low: 620,
    market_high: 850,
    keywords: ['iphone', 'apple', 'smartphone', 'pro', '256gb'],
    description:
      'iPhone 14 Pro 256Go en très bon état. Écran impeccable, batterie à 91%. Toujours utilisé avec coque et verre trempé. Débloqué tous opérateurs.',
    fallbackPhoto: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=800&q=80',
  },
];

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function computePriceStrategies(low: number, high: number) {
  const fast = Math.round(low * 0.95);
  const smart = Math.round((low + high) / 2);
  const max = Math.round(high * 1.02);
  return [
    {
      key: 'fast',
      label: 'Vente rapide',
      price: fast,
      explanation: 'Prix agressif pour vendre en moins de 7 jours. Idéal si vous manquez de temps.',
    },
    {
      key: 'smart',
      label: 'Prix intelligent',
      price: smart,
      explanation: 'Le meilleur rapport rapidité / valeur selon le marché actuel.',
    },
    {
      key: 'max',
      label: 'Prix maximum',
      price: max,
      explanation: 'Prix ambitieux pour maximiser vos gains. Demande plus de patience.',
    },
  ];
}

export function computeSellPlan(mode: 'quick' | 'balanced' | 'best', smartPrice: number, low: number) {
  const today = new Date();
  const target = new Date(today);
  if (mode === 'quick') target.setDate(target.getDate() + 7);
  else if (mode === 'best') target.setDate(target.getDate() + 30);
  else target.setDate(target.getDate() + 14);

  const start = mode === 'quick' ? Math.round(smartPrice * 0.95)
    : mode === 'best' ? Math.round(smartPrice * 1.15)
    : smartPrice;
  const adjusted = Math.round(start * 0.92);
  const minimum = Math.round(low * 0.9);
  return {
    mode,
    start_price: start,
    adjusted_price: adjusted,
    minimum_price: minimum,
    target_date: target.toISOString().slice(0, 10),
    adjustment_days: mode === 'quick' ? 3 : mode === 'best' ? 10 : 7,
  };
}

export function computeSellScore(params: {
  hasTitle: boolean;
  hasDescription: boolean;
  photos: number;
  hasCondition: boolean;
  priceInRange: boolean;
}) {
  const breakdown = {
    prix: params.priceInRange ? 25 : 12,
    photos: Math.min(25, params.photos * 10),
    description: params.hasDescription ? 20 : 5,
    condition: params.hasCondition ? 15 : 5,
    titre: params.hasTitle ? 15 : 5,
  };
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { total: Math.min(100, total), breakdown };
}
