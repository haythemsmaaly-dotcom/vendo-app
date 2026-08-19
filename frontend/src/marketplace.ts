import { Linking, Platform, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import type { MarketplaceId, CountryCode } from "@/src/i18n/SettingsContext";
import type { Item } from "@/src/api";

export type MarketplaceInfo = {
  id: MarketplaceId;
  name: string;
  supportsWeb: boolean;
  supportsApp: boolean;
  requiresManualPost: boolean; // true = no public post API, user must paste
  webNewListingUrl?: string;    // deep link that opens the "new listing" flow on web
  appScheme?: string;           // fallback attempt to open the app
  availableIn: CountryCode[];
  compliance: string;           // short explanation of the compliance approach we take
};

// NOTE: Only what each marketplace publicly supports. We do NOT bypass restrictions,
// we do NOT scrape, we do NOT post automatically. We prepare the listing (title +
// description + price) and hand it to the user via clipboard + the marketplace's own
// UI, respecting each platform's terms of service.
export const MARKETPLACES: Record<MarketplaceId, MarketplaceInfo> = {
  vinted: {
    id: "vinted",
    name: "Vinted",
    supportsWeb: true,
    supportsApp: true,
    requiresManualPost: true, // Vinted has NO public listing API
    webNewListingUrl: "https://www.vinted.fr/items/new",
    appScheme: "vinted://",
    availableIn: ["fr", "be", "lu", "de", "es", "it", "nl", "gb", "us"],
    compliance: "Vinted ne propose pas d'API publique de publication. Vendo copie l'annonce dans votre presse-papier et ouvre Vinted, où vous collez le contenu vous-même.",
  },
  leboncoin: {
    id: "leboncoin",
    name: "Leboncoin",
    supportsWeb: true,
    supportsApp: true,
    requiresManualPost: true, // No public API
    webNewListingUrl: "https://www.leboncoin.fr/ai",
    appScheme: "leboncoin://",
    availableIn: ["fr"],
    compliance: "Leboncoin ne propose pas d'API publique de publication. Vendo copie l'annonce et vous ouvre le formulaire officiel.",
  },
  ebay: {
    id: "ebay",
    name: "eBay",
    supportsWeb: true,
    supportsApp: true,
    // eBay HAS a Sell API but it requires: dev account + OAuth + business/seller account + inventory setup.
    // We keep the compliant, no-cost path here for V1. See rapport for the full-integration option.
    requiresManualPost: true,
    webNewListingUrl: "https://www.ebay.com/sell/create",
    appScheme: "ebay://",
    availableIn: ["fr", "gb", "us", "de", "it", "es", "be", "ch", "ca", "nl"],
    compliance: "eBay propose une Sell API officielle mais nécessite un compte développeur + OAuth utilisateur. Vendo utilise pour l'instant l'approche presse-papier + ouverture du formulaire officiel.",
  },
  facebook: {
    id: "facebook",
    name: "Facebook Marketplace",
    supportsWeb: true,
    supportsApp: true,
    requiresManualPost: true,
    webNewListingUrl: "https://www.facebook.com/marketplace/create/item",
    appScheme: "fb://marketplace",
    availableIn: ["fr", "gb", "us", "de", "it", "es", "be", "ch", "ca", "nl", "lu"],
    compliance: "Facebook Marketplace n'expose aucune API publique de publication tierce.",
  },
  depop: {
    id: "depop",
    name: "Depop",
    supportsWeb: true,
    supportsApp: true,
    requiresManualPost: true,
    webNewListingUrl: "https://www.depop.com/sell/",
    appScheme: "depop://",
    availableIn: ["gb", "us", "it", "fr", "es", "de", "nl"],
    compliance: "Depop n'expose pas d'API publique de publication.",
  },
};

export function formatListingText(item: Item): string {
  const l = item.listing;
  const kw = (l.keywords || []).map((k) => `#${k}`).join(" ");
  return [
    l.title,
    "",
    l.description,
    "",
    `État : ${l.condition}`,
    `Prix : ${Math.round(l.price)} €`,
    "",
    kw,
  ].filter(Boolean).join("\n");
}

export async function copyListingToClipboard(item: Item): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(formatListingText(item));
    return true;
  } catch {
    return false;
  }
}

export async function shareListingNative(item: Item): Promise<void> {
  try {
    await Share.share({
      title: item.listing.title,
      message: formatListingText(item),
    });
  } catch {}
}

export async function openMarketplace(mp: MarketplaceInfo): Promise<"app" | "web" | "failed"> {
  // Try native scheme first (opens the marketplace app if installed).
  if (mp.appScheme && Platform.OS !== "web") {
    try {
      const canOpen = await Linking.canOpenURL(mp.appScheme);
      if (canOpen) {
        await Linking.openURL(mp.appScheme);
        return "app";
      }
    } catch {}
  }
  // Fallback to the web listing form (opens in browser / in-app browser).
  if (mp.webNewListingUrl) {
    try {
      await Linking.openURL(mp.webNewListingUrl);
      return "web";
    } catch {}
  }
  return "failed";
}
