import { fr } from "./fr";
import { en } from "./en";

export const dictionaries = { fr, en } as const;
export type Locale = keyof typeof dictionaries;
export const SUPPORTED_LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

// TranslationKey is a dotted path into the dictionary tree, resolved at runtime.
export type Dict = typeof fr;

function get(obj: any, path: string): any {
  return path.split(".").reduce((o, p) => (o && o[p] !== undefined ? o[p] : undefined), obj);
}

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const dict = dictionaries[locale] || dictionaries.fr;
  let str: any = get(dict, key);
  if (typeof str !== "string") str = get(dictionaries.fr, key);
  if (typeof str !== "string") return key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = (str as string).replaceAll(`{${k}}`, String(v));
    }
  }
  return str as string;
}
