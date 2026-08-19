import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

import { theme } from "@/src/theme";
import PressableScale from "@/src/components/PressableScale";
import { useSettings, SUPPORTED_LOCALES } from "@/src/i18n/SettingsContext";
import type { CountryCode, CurrencyCode, MarketplaceId } from "@/src/i18n/SettingsContext";

const COUNTRIES: { code: CountryCode; flag: string }[] = [
  { code: "fr", flag: "🇫🇷" }, { code: "be", flag: "🇧🇪" }, { code: "ch", flag: "🇨🇭" }, { code: "lu", flag: "🇱🇺" },
  { code: "gb", flag: "🇬🇧" }, { code: "us", flag: "🇺🇸" }, { code: "de", flag: "🇩🇪" },
  { code: "es", flag: "🇪🇸" }, { code: "it", flag: "🇮🇹" }, { code: "nl", flag: "🇳🇱" }, { code: "ca", flag: "🇨🇦" },
];

const CURRENCIES: CurrencyCode[] = ["EUR", "GBP", "USD", "CHF", "CAD"];

const MARKETPLACES: { id: MarketplaceId; name: string }[] = [
  { id: "vinted", name: "Vinted" },
  { id: "leboncoin", name: "Leboncoin" },
  { id: "ebay", name: "eBay" },
  { id: "facebook", name: "Facebook Marketplace" },
  { id: "depop", name: "Depop" },
];

export default function RegionSettings() {
  const router = useRouter();
  const { settings, setLocale, setCountry, setCurrency, setMarketplaces, t } = useSettings();

  const toggleMarketplace = (id: MarketplaceId) => {
    const next = settings.marketplaces.includes(id)
      ? settings.marketplaces.filter((m) => m !== id)
      : [...settings.marketplaces, id];
    setMarketplaces(next);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.iconBtn} hapticStyle="selection" testID="region-back" accessibilityLabel={t("common.back")}>
          <Ionicons name="chevron-back" size={22} color={theme.color.text} />
        </PressableScale>
        <Text style={styles.headerTitle}>{t("profile.regionSection")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 24, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        {/* Language */}
        <Animated.View entering={FadeInDown.duration(320)}>
          <Text style={styles.sectionTitle}>{t("profile.language")}</Text>
          <View style={styles.card}>
            {SUPPORTED_LOCALES.map((l) => {
              const active = settings.locale === l.code;
              return (
                <PressableScale
                  key={l.code}
                  testID={`lang-${l.code}`}
                  hapticStyle="selection"
                  onPress={() => setLocale(l.code)}
                  style={[styles.row, active && styles.rowActive]}
                >
                  <Text style={styles.flag}>{l.flag}</Text>
                  <Text style={[styles.rowLabel, active && { color: theme.color.onLime }]}>{l.label}</Text>
                  {active && <Ionicons name="checkmark-circle" size={20} color={theme.color.onLime} />}
                </PressableScale>
              );
            })}
          </View>
          <Text style={styles.hint}>Nederlands, Deutsch, Español, Italiano — bientôt.</Text>
        </Animated.View>

        {/* Country */}
        <Animated.View entering={FadeInDown.duration(320).delay(60)} style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>{t("profile.country")}</Text>
          <View style={styles.card}>
            {COUNTRIES.map((c) => {
              const active = settings.country === c.code;
              return (
                <PressableScale
                  key={c.code}
                  testID={`country-${c.code}`}
                  hapticStyle="selection"
                  onPress={() => setCountry(c.code)}
                  style={[styles.row, active && styles.rowActive]}
                >
                  <Text style={styles.flag}>{c.flag}</Text>
                  <Text style={[styles.rowLabel, active && { color: theme.color.onLime }]}>
                    {t(`countries.${c.code}`)}
                  </Text>
                  {active && <Ionicons name="checkmark-circle" size={20} color={theme.color.onLime} />}
                </PressableScale>
              );
            })}
          </View>
        </Animated.View>

        {/* Currency */}
        <Animated.View entering={FadeInDown.duration(320).delay(120)} style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>{t("profile.currency")}</Text>
          <View style={styles.card}>
            {CURRENCIES.map((c) => {
              const active = settings.currency === c;
              return (
                <PressableScale
                  key={c}
                  testID={`cur-${c}`}
                  hapticStyle="selection"
                  onPress={() => setCurrency(c)}
                  style={[styles.row, active && styles.rowActive]}
                >
                  <Text style={styles.currency}>{c}</Text>
                  <Text style={[styles.rowLabel, active && { color: theme.color.onLime }]}>
                    {t(`currencies.${c}`)}
                  </Text>
                  {active && <Ionicons name="checkmark-circle" size={20} color={theme.color.onLime} />}
                </PressableScale>
              );
            })}
          </View>
        </Animated.View>

        {/* Marketplaces */}
        <Animated.View entering={FadeInDown.duration(320).delay(180)} style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>{t("profile.marketplaces")}</Text>
          <View style={styles.card}>
            {MARKETPLACES.map((m) => {
              const active = settings.marketplaces.includes(m.id);
              return (
                <PressableScale
                  key={m.id}
                  testID={`mp-${m.id}`}
                  hapticStyle="selection"
                  onPress={() => toggleMarketplace(m.id)}
                  style={styles.row}
                >
                  <View style={[styles.mpDot, active && { backgroundColor: theme.color.lime, borderColor: theme.color.lime }]}>
                    {active && <Ionicons name="checkmark" size={12} color={theme.color.onLime} />}
                  </View>
                  <Text style={styles.rowLabel}>{m.name}</Text>
                </PressableScale>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.color.surface,
    borderWidth: 1, borderColor: theme.color.border,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { color: theme.color.text, fontSize: 17, fontFamily: theme.font.textSemi },
  sectionTitle: {
    color: theme.color.textMuted, fontSize: 12, letterSpacing: 1.4,
    fontFamily: theme.font.textBold, textTransform: "uppercase",
    marginBottom: 10, paddingLeft: 4,
  },
  card: {
    backgroundColor: theme.color.surface,
    borderWidth: 1, borderColor: theme.color.border,
    borderRadius: 20, overflow: "hidden",
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.color.border,
  },
  rowActive: { backgroundColor: theme.color.lime },
  rowLabel: { flex: 1, color: theme.color.text, fontSize: 15, fontFamily: theme.font.textMedium },
  flag: { fontSize: 22 },
  currency: {
    width: 44, color: theme.color.text, fontFamily: theme.font.displayBold,
    fontSize: 14, letterSpacing: 1,
  },
  hint: {
    color: theme.color.textFaint, fontSize: 12, marginTop: 8, paddingLeft: 4,
    fontFamily: theme.font.text,
  },
  mpDot: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: theme.color.border,
    alignItems: "center", justifyContent: "center",
  },
});
