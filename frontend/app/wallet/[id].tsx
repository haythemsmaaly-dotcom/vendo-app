import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { theme } from "@/src/theme";
import { api, WalletItem } from "@/src/api";
import { useSettings } from "@/src/i18n/SettingsContext";
import { computePriceStrategies, computeSellPlan, computeSellScore } from "@/src/catalog";
import PressableScale from "@/src/components/PressableScale";
import EmptyState from "@/src/components/EmptyState";

export default function WalletDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, formatMoney } = useSettings();
  const [item, setItem] = useState<WalletItem | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<"" | "list" | "remove">("");
  const [actionError, setActionError] = useState("");

  const load = () => {
    if (!id) return;
    setLoadError(false);
    api.walletGet(id).then(setItem).catch(() => setLoadError(true));
  };
  useEffect(load, [id]);

  // Creates a draft from the saved item and opens the existing listing form, pre-filled.
  const listOnVendo = async () => {
    if (!item) return;
    setBusy("list"); setActionError("");
    try {
      const strategies = computePriceStrategies(item.value_low, item.value_high);
      const smart = strategies.find((s) => s.key === "smart")!.price;
      const score = computeSellScore({ hasTitle: true, hasDescription: !!item.description, photos: 1, hasCondition: !!item.condition, priceInRange: true });
      const draft: any = {
        id: "", photo: item.photo_url, photos: [item.photo_url], name: item.title,
        category: item.category || "Other", condition: item.condition || "Bon",
        confidence: 80, market_low: item.value_low, market_high: item.value_high,
        strategies, selected_strategy: "smart",
        listing: { title: item.title, description: item.description, category: item.category || "Other", keywords: [], condition: item.condition || "Bon", price: smart },
        sell_score: score.total, sell_score_breakdown: score.breakdown,
        sell_plan: computeSellPlan("balanced", smart, item.value_low), status: "draft",
      };
      const created = await api.create(draft);
      router.push(`/sell/${created.id}`);
    } catch {
      setActionError(t("wallet.actionError"));
    } finally {
      setBusy("");
    }
  };

  const doRemove = async () => {
    if (!item) return;
    setBusy("remove"); setActionError("");
    try {
      await api.walletRemove(item.id);
      router.back();
    } catch {
      setActionError(t("wallet.actionError"));
      setBusy("");
    }
  };

  const remove = () => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(t("wallet.removeConfirm"))) doRemove();
      return;
    }
    Alert.alert(t("wallet.remove"), t("wallet.removeConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("wallet.remove"), style: "destructive", onPress: doRemove },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.top}>
        <PressableScale testID="wallet-detail-back" onPress={() => router.back()} style={s.circle}>
          <Ionicons name="arrow-back" size={20} color={theme.color.text} />
        </PressableScale>
        <Text style={s.topTitle}>{t("wallet.title")}</Text>
        <View style={{ width: 42 }} />
      </View>

      {loadError ? (
        <EmptyState icon="alert-circle-outline" title={t("wallet.notFound")} ctaLabel={t("common.retry")} onCta={load} testID="wallet-detail-error" />
      ) : !item ? (
        <ActivityIndicator color={theme.color.lime} style={{ marginTop: 40 }} testID="wallet-detail-loading" />
      ) : (
        <ScrollView contentContainerStyle={s.wrap}>
          <Image source={{ uri: item.photo_url }} style={s.photo} contentFit="cover" transition={240} />
          <Text style={s.title} testID="wallet-detail-title">{item.title}</Text>
          {!!item.description && <Text style={s.desc}>{item.description}</Text>}

          <View style={s.valueCard}>
            <Text style={s.valueLabel}>{t("wallet.estimated")}</Text>
            <Text style={s.value}>{formatMoney(item.value_low)} – {formatMoney(item.value_high)}</Text>
            <Text style={s.disclaimer}>{t("wallet.disclaimer")}</Text>
          </View>

          {!!actionError && <Text style={s.err}>{actionError}</Text>}

          <PressableScale testID="wallet-list-btn" hapticStyle="heavy" onPress={listOnVendo} disabled={!!busy} style={s.primary}>
            {busy === "list" ? <ActivityIndicator color={theme.color.onLime} /> : <Ionicons name="storefront" size={18} color={theme.color.onLime} />}
            <Text style={s.primaryTxt}>{busy === "list" ? t("wallet.preparing") : t("wallet.listOnVendo")}</Text>
          </PressableScale>
          <PressableScale testID="wallet-remove-btn" hapticStyle="medium" onPress={remove} disabled={!!busy} style={s.secondary}>
            {busy === "remove" ? <ActivityIndicator color={theme.color.error} /> : <Ionicons name="trash-outline" size={18} color={theme.color.error} />}
            <Text style={s.secondaryTxt}>{t("wallet.remove")}</Text>
          </PressableScale>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 10 },
  circle: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border, alignItems: "center", justifyContent: "center" },
  topTitle: { color: theme.color.text, fontFamily: theme.font.displayBold, fontSize: 18 },
  wrap: { padding: 20, paddingBottom: 60 },
  photo: { width: "100%", aspectRatio: 1, borderRadius: 24, backgroundColor: theme.color.surface },
  title: { color: theme.color.text, fontSize: 26, fontFamily: theme.font.displayBold, letterSpacing: -0.6, marginTop: 20 },
  desc: { color: theme.color.textMuted, fontSize: 14, lineHeight: 21, fontFamily: theme.font.text, marginTop: 10 },
  valueCard: { marginTop: 20, padding: 18, borderRadius: 20, backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border },
  valueLabel: { color: theme.color.textMuted, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", fontFamily: theme.font.textBold },
  value: { color: theme.color.lime, fontSize: 28, fontFamily: theme.font.displayBold, letterSpacing: -0.8, marginTop: 6 },
  disclaimer: { color: theme.color.textFaint, fontSize: 11, fontFamily: theme.font.text, marginTop: 10 },
  err: { color: theme.color.error, fontSize: 13, marginTop: 14, textAlign: "center", fontFamily: theme.font.text },
  primary: { marginTop: 20, height: 58, borderRadius: 18, backgroundColor: theme.color.lime, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  primaryTxt: { color: theme.color.onLime, fontSize: 16, fontFamily: theme.font.textBold },
  secondary: { marginTop: 12, height: 56, borderRadius: 18, backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  secondaryTxt: { color: theme.color.error, fontSize: 15, fontFamily: theme.font.textSemi },
});
