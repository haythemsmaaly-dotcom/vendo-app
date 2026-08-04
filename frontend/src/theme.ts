export const theme = {
  color: {
    bg: '#0A0A0A',
    bg2: '#111111',
    surface: '#1A1A1A',
    surface2: '#262626',
    text: '#FFFFFF',
    textMuted: '#A3A3A3',
    textFaint: '#666666',
    border: '#262626',
    borderStrong: '#333333',
    divider: '#1F1F1F',
    lime: '#D4FF3F',
    limeDark: '#B1E600',
    limeSoft: '#2D3A08',
    onLime: '#0A0A0A',
    success: '#4ADE80',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
  },
  space: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
  },
  radius: { sm: 8, md: 16, lg: 24, pill: 999 },
  font: {
    // Display / numbers / prices
    displayMedium: 'SpaceGrotesk-Medium',
    displayBold: 'SpaceGrotesk-Bold',
    // Text / body
    text: 'Inter-Regular',
    textMedium: 'Inter-Medium',
    textSemi: 'Inter-SemiBold',
    textBold: 'Inter-Bold',
  },
  size: {
    xs: 11, sm: 13, base: 15, lg: 17, xl: 20, xxl: 26, xxxl: 34, mega: 48, hero: 60,
  },
  motion: {
    fast: 180,
    base: 260,
    slow: 420,
    score: 900,
  },
};

export const conditionColor = (c: string) => {
  const k = c.toLowerCase();
  if (k.includes('neuf')) return theme.color.success;
  if (k.includes('très')) return theme.color.success;
  if (k.includes('bon')) return theme.color.lime;
  if (k.includes('correct')) return theme.color.warning;
  return theme.color.error;
};

export const statusLabel = (s: string) => {
  switch (s) {
    case 'draft': return 'Brouillon';
    case 'ready': return 'Prêt à vendre';
    case 'listed': return 'En vente';
    case 'sold': return 'Vendu';
    default: return s;
  }
};

export const statusColor = (s: string) => {
  switch (s) {
    case 'ready': return theme.color.lime;
    case 'listed': return theme.color.info;
    case 'sold': return theme.color.success;
    default: return theme.color.textMuted;
  }
};

export const formatEUR = (n: number) =>
  `${Math.round(n).toLocaleString('fr-FR')} €`;
