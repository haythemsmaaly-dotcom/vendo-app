import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import { theme } from "@/src/theme";
import { api, WalletItem, WalletSummary } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useSettings } from "@/src/i18n/SettingsContext";
import PressableScale from "@/src/components/PressableScale";
import EmptyState from "@/src/components/EmptyState";
import AnimatedNumber from "@/src/components/AnimatedNumber";

export default function WalletScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, formatMoney, settings } = useSettings();
  const [items, setItems] = useState<WalletItem[]>([]);
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setError(false);
    try {
      const [list, sum] = await Promise.all([api.walletList(), api.walletSummary()]);
      setItems(list);
      setSummary(sum);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(settings.locale === "en" ? "en-GB" : "fr-FR"); } catch { return ""; }
  };

  const header = (
    <View>
      <Text style={styles.h1}>{t("wallet.title")}</Text>
      <Text style={styles.subtle}>{t("wallet.subtitle")}</Text>
      {summary && items.length > 0 && (
        <View style={styles.totalCard} testID="wallet-total-card">
          <Text style={styles.totalLabel}>{t("wallet.totalLabel")}</Text>
          <AnimatedNumber
            value={summary.total_low}
            format={formatMoney}
            style={styles.totalValue}
            testID="wallet-total-value"
          />
          <Text style={styles.totalRange}>
            {formatMoney(summary.total_low)} – {formatMoney(summary.total_high)}
          </Text>
          <View style={styles.countPill}>
            <Ionicons name="cube-outline" size={14} color={theme.color.lime} />
            <Text style={styles.countTxt} testID="wallet-count">{summary.count === 1 ? t("wallet.itemOne") : t("wallet.itemsCount", { n: summary.count })}</Text>
          </View>
          <Text style={styles.disclaimer}>{t("wallet.disclaimer")}</Text>
        </View>
      )}
    </View>
  );

  let body: React.ReactNode = null;
  if (!user) {
    body = (
      <EmptyState
        icon="lock-closed-outline"
        title={t("wallet.signInTitle")}
        subtitle={t("wallet.signInSub")}
        ctaLabel={t("wallet.signIn")}
        onCta={() => router.push("/auth")}
        testID="wallet-signin"
      />
    );
  } else if (loading) {
    body = <ActivityIndicator color={theme.color.lime} style={{ marginTop: 40 }} testID="wallet-loading" />;
  } else if (error) {
    body = (
      <EmptyState
        icon="cloud-offline-outline"
        title={t("wallet.loadError")}
        ctaLabel={t("common.retry")}
        onCta={() => { setLoading(true); load(); }}
        testID="wallet-error"
      />
    );
  } else if (items.length === 0) {
    body = (
      <EmptyState
        icon="wallet-outline"
        title={t("wallet.emptyTitle")}
        subtitle={t("wallet.emptySub")}
        ctaLabel={t("wallet.scanFirst")}
        onCta={() => router.push("/(tabs)/scan")}
        testID="wallet-empty"
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={body ? [] : items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={<View style={{ padding: 24, paddingBottom: 8 }}>{header}</View>}
        ListEmptyComponent={body as any}
        refreshControl={user ? (
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.color.lime} />
        ) : undefined}
        renderItem={({ item }) => (
          <PressableScale
            testID={`wallet-item-${item.id}`}
            hapticStyle="selection"
            onPress={() => router.push(`/wallet/${item.id}`)}
            style={styles.row}
          >
            <Image source={{ uri: item.photo_url }} style={styles.thumb} contentFit="cover" transition={200} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.rowValue}>{formatMoney(item.value_low)} – {formatMoney(item.value_high)}</Text>
              <Text style={styles.rowDate}>{t("wallet.added", { date: formatDate(item.created_at) })}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.color.textMuted} />
          </PressableScale>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  h1: { color: theme.color.text, fontSize: 30, fontFamily: theme.font.displayBold, letterSpacing: -1 },
  subtle: { color: theme.color.textMuted, fontSize: 14, fontFamily: theme.font.text, marginTop: 6, marginBottom: 16 },
  totalCard: {
    padding: 20, borderRadius: 24, backgroundColor: theme.color.surface,
    borderWidth: 1, borderColor: theme.color.border, marginBottom: 8,
  },
  totalLabel: {
    color: theme.color.textMuted, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase",
    fontFamily: theme.font.textBold,
  },
  totalValue: { color: theme.color.lime, fontSize: 44, fontFamily: theme.font.displayBold, letterSpacing: -1.5, marginTop: 6 },
  totalRange: { color: theme.color.textMuted, fontSize: 13, fontFamily: theme.font.text, marginTop: 2 },
  countPill: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    marginTop: 14, paddingHorizontal: 12, height: 30, borderRadius: 999, backgroundColor: theme.color.limeSoft,
  },
  countTxt: { color: theme.color.lime, fontSize: 12, fontFamily: theme.font.textSemi },
  disclaimer: { color: theme.color.textFaint, fontSize: 11, fontFamily: theme.font.text, marginTop: 12 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 14,
    marginHorizontal: 24, marginTop: 10, padding: 12, borderRadius: 18,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border,
  },
  thumb: { width: 64, height: 64, borderRadius: 14, backgroundColor: theme.color.surface2 },
  rowTitle: { color: theme.color.text, fontSize: 15, fontFamily: theme.font.textSemi },
  rowValue: { color: theme.color.lime, fontSize: 14, fontFamily: theme.font.textBold, marginTop: 4 },
  rowDate: { color: theme.color.textFaint, fontSize: 11, fontFamily: theme.font.text, marginTop: 2 },
});
