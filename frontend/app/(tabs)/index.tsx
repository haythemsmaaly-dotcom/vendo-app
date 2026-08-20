import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { theme, conditionColor } from "@/src/theme";
import { api, Item } from "@/src/api";
import { useSettings } from "@/src/i18n/SettingsContext";
import { useAuth } from "@/src/auth";
import PressableScale from "@/src/components/PressableScale";
import AnimatedNumber from "@/src/components/AnimatedNumber";
import Skeleton from "@/src/components/Skeleton";
import EmptyState from "@/src/components/EmptyState";

export default function HomeScreen() {
  const router = useRouter();
  const { t, formatMoney } = useSettings();
  const { user } = useAuth();
  const [items, setItems] = useState<Item[] | null>(null);
  const [stats, setStats] = useState<{ total_potential: number; items_sold: number; total_earned: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [it, st] = await Promise.all([api.list(), api.stats()]);
      setItems(it);
      setStats(st);
    } catch (e) { console.warn(e); setItems([]); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [load]);

  const loading = items === null || stats === null;
  const attention = (items || []).filter(i => i.sell_score < 70 && i.status !== "sold").slice(0, 3);
  const recent = (items || []).slice(0, 6);

  const hour = new Date().getHours();
  const greeting = hour < 6 ? t("greeting.night") : hour < 12 ? t("greeting.morning") : hour < 18 ? t("greeting.afternoon") : t("greeting.evening");
  const displayName = user?.display_name?.trim() || "Vendo";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.lime} />}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(360)} style={styles.header} testID="home-header">
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{displayName}</Text>
          </View>
          <PressableScale
            style={styles.avatar}
            onPress={() => router.push("/(tabs)/profile")}
            hapticStyle="selection"
          >
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </PressableScale>
        </Animated.View>

        {/* Hero potential cash */}
        <Animated.View entering={FadeInDown.duration(420).delay(60)} style={styles.hero} testID="potential-hero">
          <Text style={styles.heroLabel}>{t("home.potentialCash")}</Text>
          {loading ? (
            <View style={{ marginTop: 8, marginBottom: 14 }}>
              <Skeleton width={220} height={56} radius={12} />
            </View>
          ) : (
            <AnimatedNumber
              value={stats?.total_potential ?? 0}
              duration={1100}
              format={(n) => formatMoney(n)}
              style={styles.heroAmount as any}
              testID="potential-amount"
            />
          )}
          <View style={styles.heroRow}>
            <View style={styles.heroPill}>
              <Ionicons name="cube-outline" size={13} color={theme.color.textMuted} />
              <Text style={styles.heroPillTxt}>{t((items?.length ?? 0) === 1 ? "home.itemsCount" : "home.itemsCountPlural", { count: items?.length ?? 0 })}</Text>
            </View>
            <View style={styles.heroPill}>
              <Ionicons name="trending-up" size={13} color={theme.color.lime} />
              <Text style={[styles.heroPillTxt, { color: theme.color.lime }]}>
                {t("home.earned", { amount: formatMoney(stats?.total_earned ?? 0) })}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Primary CTA */}
        <Animated.View entering={FadeInDown.duration(420).delay(120)}>
          <PressableScale
            testID="scan-primary-cta"
            hapticStyle="medium"
            accessibilityRole="button"
            accessibilityLabel={t("home.scanTitle")}
            onPress={() => router.push("/(tabs)/scan")}
            style={styles.primaryCta}
          >
            <LinearGradient
              colors={[theme.color.lime, theme.color.limeDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject as any}
            />
            <View style={styles.ctaContent}>
              <View style={styles.ctaIcon}>
                <Ionicons name="scan" size={26} color={theme.color.onLime} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>{t("home.scanTitle")}</Text>
                <Text style={styles.ctaSub}>{t("home.scanSub")}</Text>
              </View>
              <Ionicons name="arrow-forward" size={22} color={theme.color.onLime} />
            </View>
          </PressableScale>
        </Animated.View>

        {/* Secondary CTA */}
        <Animated.View entering={FadeInDown.duration(420).delay(180)}>
          <PressableScale
            testID="find-things-cta"
            onPress={() => router.push("/(tabs)/scan")}
            style={styles.secondaryCta}
          >
            <Ionicons name="search" size={20} color={theme.color.text} />
            <View style={{ flex: 1 }}>
              <Text style={styles.secondaryTitle}>{t("home.findTitle")}</Text>
              <Text style={styles.secondarySub}>{t("home.findSub")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.color.textMuted} />
          </PressableScale>
        </Animated.View>

        {/* Loading skeletons */}
        {loading && (
          <View style={{ marginTop: 28, paddingHorizontal: 24, gap: 12 }}>
            <Skeleton width={140} height={20} radius={6} />
            <Skeleton height={72} radius={16} />
            <Skeleton height={72} radius={16} />
          </View>
        )}

        {/* Attention section */}
        {!loading && attention.length > 0 && (
          <Animated.View entering={FadeIn.duration(360).delay(240)} style={styles.section} testID="attention-section">
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{t("home.attention")}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>{attention.length}</Text>
              </View>
            </View>
            {attention.map((it, i) => (
              <Animated.View key={it.id} entering={FadeInDown.duration(320).delay(280 + i * 60)}>
                <PressableScale
                  testID={`attention-row-${it.id}`}
                  hapticStyle="medium"
                  onPress={() => router.push(`/item/${it.id}`)}
                  style={styles.attentionRow}
                >
                  <Image source={{ uri: it.photo }} style={styles.attentionImg} contentFit="cover" transition={220} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attentionName} numberOfLines={1}>{it.name}</Text>
                    <Text style={styles.attentionHint} numberOfLines={1}>{it.photo_coach[0] || t("detail.missing")}</Text>
                  </View>
                  <View style={styles.scorePill}>
                    <Text style={styles.scorePillTxt}>{it.sell_score}</Text>
                  </View>
                </PressableScale>
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {/* Recent */}
        {!loading && (
          <Animated.View entering={FadeIn.duration(360).delay(320)} style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{t("home.recent")}</Text>
              <PressableScale onPress={() => router.push("/(tabs)/items")} hapticStyle="selection" style={{ padding: 6 }}>
                <Text style={styles.link}>{t("common.seeAll")}</Text>
              </PressableScale>
            </View>
            {recent.length === 0 ? (
              <EmptyState
                testID="empty-state"
                icon="sparkles-outline"
                title={t("home.emptyTitle")}
                subtitle={t("home.emptySub")}
                ctaLabel={t("home.scanTitle")}
                onCta={() => router.push("/(tabs)/scan")}
              />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 24 }}>
                {recent.map((it, i) => (
                  <Animated.View key={it.id} entering={FadeInDown.duration(320).delay(360 + i * 50)}>
                    <PressableScale
                      testID={`recent-card-${it.id}`}
                      hapticStyle="medium"
                      onPress={() => router.push(`/item/${it.id}`)}
                      style={styles.recentCard}
                    >
                      <Image source={{ uri: it.photo }} style={styles.recentImg} contentFit="cover" transition={260} />
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.85)"]}
                        style={styles.recentGradient}
                      />
                      <View style={styles.recentBody}>
                        <Text style={styles.recentName} numberOfLines={1}>{it.name}</Text>
                        <View style={styles.recentRow}>
                          <Text style={styles.recentPrice}>{formatMoney(it.listing.price)}</Text>
                          <View style={[styles.condDot, { backgroundColor: conditionColor(it.condition) }]} />
                        </View>
                      </View>
                    </PressableScale>
                  </Animated.View>
                ))}
              </ScrollView>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16,
  },
  greeting: { color: theme.color.textMuted, fontSize: 15, fontFamily: theme.font.text },
  name: { color: theme.color.text, fontSize: 26, fontFamily: theme.font.displayBold, letterSpacing: -0.6 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.color.surface,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: theme.color.border,
  },
  avatarText: { color: theme.color.text, fontSize: 17, fontFamily: theme.font.textSemi },
  hero: { marginHorizontal: 24, marginTop: 8, marginBottom: 20 },
  heroLabel: {
    color: theme.color.textMuted, fontSize: 12,
    letterSpacing: 1.6, textTransform: "uppercase",
    fontFamily: theme.font.textSemi,
  },
  heroAmount: {
    color: theme.color.text, fontSize: 56,
    fontFamily: theme.font.displayBold,
    letterSpacing: -2, marginTop: 6, marginBottom: 14,
  },
  heroRow: { flexDirection: "row", gap: 8 },
  heroPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: theme.color.surface, borderRadius: 999,
    borderWidth: 1, borderColor: theme.color.border,
  },
  heroPillTxt: { color: theme.color.textMuted, fontSize: 12, fontFamily: theme.font.textSemi },
  primaryCta: {
    marginHorizontal: 24, marginBottom: 12,
    height: 84, borderRadius: 24, overflow: "hidden",
  },
  ctaContent: { flex: 1, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20 },
  ctaIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "rgba(10,10,10,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  ctaTitle: { color: theme.color.onLime, fontSize: 18, fontFamily: theme.font.displayBold, letterSpacing: -0.3 },
  ctaSub: { color: "rgba(10,10,10,0.7)", fontSize: 13, marginTop: 2, fontFamily: theme.font.text },
  secondaryCta: {
    marginHorizontal: 24, marginBottom: 8,
    height: 72, borderRadius: 20,
    backgroundColor: theme.color.surface,
    borderWidth: 1, borderColor: theme.color.border,
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 20,
  },
  secondaryTitle: { color: theme.color.text, fontSize: 15, fontFamily: theme.font.textSemi },
  secondarySub: { color: theme.color.textMuted, fontSize: 12, marginTop: 2, fontFamily: theme.font.text },
  section: { marginTop: 28 },
  sectionHead: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 24, marginBottom: 12,
  },
  sectionTitle: { color: theme.color.text, fontSize: 20, fontFamily: theme.font.displayBold, letterSpacing: -0.4 },
  badge: {
    minWidth: 24, height: 24, paddingHorizontal: 8, borderRadius: 12,
    backgroundColor: theme.color.limeSoft,
    alignItems: "center", justifyContent: "center",
  },
  badgeTxt: { color: theme.color.lime, fontSize: 12, fontFamily: theme.font.textBold },
  link: { color: theme.color.lime, fontSize: 13, fontFamily: theme.font.textSemi },
  attentionRow: {
    marginHorizontal: 24, marginBottom: 10,
    padding: 12, borderRadius: 16,
    backgroundColor: theme.color.surface,
    borderWidth: 1, borderColor: theme.color.border,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  attentionImg: { width: 48, height: 48, borderRadius: 12, backgroundColor: theme.color.surface2 },
  attentionName: { color: theme.color.text, fontSize: 15, fontFamily: theme.font.textSemi },
  attentionHint: { color: theme.color.textMuted, fontSize: 12, marginTop: 2, fontFamily: theme.font.text },
  scorePill: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.color.bg,
    borderWidth: 2, borderColor: theme.color.warning,
    alignItems: "center", justifyContent: "center",
  },
  scorePillTxt: { color: theme.color.warning, fontSize: 13, fontFamily: theme.font.textBold },
  recentCard: {
    width: 160, height: 200, borderRadius: 20, overflow: "hidden",
    backgroundColor: theme.color.surface, marginLeft: 24,
  },
  recentImg: { width: "100%", height: "100%" },
  recentGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "60%" },
  recentBody: { position: "absolute", left: 12, right: 12, bottom: 12 },
  recentName: { color: theme.color.text, fontSize: 14, fontFamily: theme.font.textSemi },
  recentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  recentPrice: { color: theme.color.lime, fontSize: 15, fontFamily: theme.font.displayBold },
  condDot: { width: 8, height: 8, borderRadius: 4 },
});
