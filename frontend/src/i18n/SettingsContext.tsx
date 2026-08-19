import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as Localization from "expo-localization";
import { storage } from "@/src/utils/storage";
import { translate, Locale, SUPPORTED_LOCALES } from "@/src/i18n";

export type CurrencyCode = "EUR" | "GBP" | "USD" | "CHF" | "CAD";
export type CountryCode = "fr" | "be" | "ch" | "lu" | "ca" | "gb" | "us" | "de" | "es" | "it" | "nl";
export type MarketplaceId = "vinted" | "leboncoin" | "ebay" | "facebook" | "depop";

export type Settings = {
  locale: Locale;
  country: CountryCode;
  currency: CurrencyCode;
  marketplaces: MarketplaceId[];
};

const STORAGE_KEY = "vendo.settings";

const COUNTRY_CURRENCY: Record<CountryCode, CurrencyCode> = {
  fr: "EUR", be: "EUR", ch: "CHF", lu: "EUR", ca: "CAD",
  gb: "GBP", us: "USD", de: "EUR", es: "EUR", it: "EUR", nl: "EUR",
};

function detectDefaults(): Settings {
  // Best-effort detection from device locale, not from IP.
  let locale: Locale = "fr";
  try {
    const langs = Localization.getLocales?.() || [];
    const preferred = langs[0]?.languageCode?.toLowerCase();
    if (preferred === "en") locale = "en";
    else if (preferred === "fr") locale = "fr";
    // If user's device is another language, default to en for now (only 2 langs shipped).
    else locale = "en";
  } catch {}
  return {
    locale,
    country: locale === "en" ? "gb" : "fr",
    currency: locale === "en" ? "GBP" : "EUR",
    marketplaces: locale === "en" ? ["ebay", "facebook", "depop"] : ["vinted", "leboncoin", "ebay"],
  };
}

type Ctx = {
  settings: Settings;
  ready: boolean;
  setLocale: (l: Locale) => Promise<void>;
  setCountry: (c: CountryCode) => Promise<void>;
  setCurrency: (c: CurrencyCode) => Promise<void>;
  setMarketplaces: (m: MarketplaceId[]) => Promise<void>;
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatMoney: (n: number) => string;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => detectDefaults());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<any>(STORAGE_KEY, null as any);
      if (saved && typeof saved === "object") {
        setSettings((prev) => ({ ...prev, ...saved }));
      }
      setReady(true);
    })();
  }, []);

  const persist = useCallback(async (next: Settings) => {
    setSettings(next);
    await storage.setItem(STORAGE_KEY, next as any);
  }, []);

  const setLocale = useCallback(async (l: Locale) => {
    await persist({ ...settings, locale: l });
  }, [settings, persist]);

  const setCountry = useCallback(async (c: CountryCode) => {
    // Auto-align currency and default marketplaces to country when user hasn't touched them.
    const currency = COUNTRY_CURRENCY[c] || settings.currency;
    await persist({ ...settings, country: c, currency });
  }, [settings, persist]);

  const setCurrency = useCallback(async (c: CurrencyCode) => {
    await persist({ ...settings, currency: c });
  }, [settings, persist]);

  const setMarketplaces = useCallback(async (m: MarketplaceId[]) => {
    await persist({ ...settings, marketplaces: m });
  }, [settings, persist]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(settings.locale, key, vars),
    [settings.locale],
  );

  const formatMoney = useCallback((n: number) => {
    const localeTag = settings.locale === "en" ? "en-GB" : "fr-FR";
    try {
      return new Intl.NumberFormat(localeTag, {
        style: "currency",
        currency: settings.currency,
        maximumFractionDigits: 0,
      }).format(Math.round(n));
    } catch {
      return `${Math.round(n)} ${settings.currency}`;
    }
  }, [settings.locale, settings.currency]);

  const value = useMemo<Ctx>(() => ({
    settings, ready, setLocale, setCountry, setCurrency, setMarketplaces, t, formatMoney,
  }), [settings, ready, setLocale, setCountry, setCurrency, setMarketplaces, t, formatMoney]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

export function useT() {
  return useSettings().t;
}

export { SUPPORTED_LOCALES };
