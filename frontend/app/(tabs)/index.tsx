import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";

import { theme, formatEUR, conditionColor } from "@/src/theme";
import { api, Item } from "@/src/api";

export default function HomeScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [stats, setStats] = useState<{ total_potential: number; items_sold: number; total_earned: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [it, st] = await Promise.all([api.list(), api.stats()]);
      setItems(it);
      setStats(st);
    } catch (e) { console.warn(e); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => { load(); }, [load]);

  const attention = items.filter(i => i.sell_score < 70 && i.status !== "sold").slice(0, 3);
  const recent = items.slice(0, 6);

  const hour = new Date().getHours();
  const greeting = hour < 6 ? "Bonne nuit" : hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

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
        <View style={styles.header} testID="home-header">
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>Alex</Text>
          </View>
          <Pressable style={styles.avatar} onPress={() => router.push("/(tabs)/profile")}>
            <Text style={styles.avatarText}>A</Text>
          </Pressable>
        </View>

        {/* Hero potential cash */}
        <View style={styles.hero} testID="potential-hero">
          <Text style={styles.heroLabel}>Vos gains potentiels</Text>
          <Text style={styles.heroAmount} testID="potential-amount">
            {formatEUR(stats?.total_potential ?? 0)}
          </Text>
          <View style={styles.heroRow}>
            <View style={styles.heroPill}>
              <Ionicons name="cube-outline" size={13} color={theme.color.textMuted} />
              <Text style={styles.heroPillTxt}>{items.length} objets</Text>
            </View>
            <View style={styles.heroPill}>
              <Ionicons name="trending-up" size={13} color={theme.color.lime} />
              <Text style={[styles.heroPillTxt, { color: theme.color.lime }]}>
                +{formatEUR(stats?.total_earned ?? 0)} gagnés
              </Text>
            </View>
          </View>
        </View>

        {/* Primary CTA */}
        <Pressable
          testID="scan-primary-cta"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/(tabs)/scan");
          }}
          style={({ pressed }) => [styles.primaryCta, pressed && { opacity: 0.9 }]}
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
              <Text style={styles.ctaTitle}>Scanner un objet</Text>
              <Text style={styles.ctaSub}>Prenez une photo, on s'occupe du reste</Text>
            </View>
            <Ionicons name="arrow-forward" size={22} color={theme.color.onLime} />
          </View>
        </Pressable>

        {/* Secondary CTA */}
        <Pressable
          testID="find-things-cta"
          onPress={() => router.push("/(tabs)/scan")}
          style={styles.secondaryCta}
        >
          <Ionicons name="search" size={20} color={theme.color.text} />
          <View style={{ flex: 1 }}>
            <Text style={styles.secondaryTitle}>Trouver des objets à vendre</Text>
            <Text style={styles.secondarySub}>Inspecter votre placard, cave, garage</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.color.textMuted} />
        </Pressable>

        {/* Attention section */}
        {attention.length > 0 && (
          <View style={styles.section} testID="attention-section">
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>À optimiser</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>{attention.length}</Text>
              </View>
            </View>
            {attention.map(it => (
              <Pressable
                key={it.id}
                testID={`attention-row-${it.id}`}
                onPress={() => router.push(`/item/${it.id}`)}
                style={styles.attentionRow}
              >
                <Image source={{ uri: it.photo }} style={styles.attentionImg} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.attentionName} numberOfLines={1}>{it.name}</Text>
                  <Text style={styles.attentionHint}>{it.photo_coach[0] || "Complétez l'annonce"}</Text>
                </View>
                <View style={styles.scorePill}>
                  <Text style={styles.scorePillTxt}>{it.sell_score}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Recent */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Objets récents</Text>
            <Pressable onPress={() => router.push("/(tabs)/items")}>
              <Text style={styles.link}>Tout voir</Text>
            </Pressable>
          </View>
          {recent.length === 0 ? (
            <View style={styles.emptyState} testID="empty-state">
              <View style={styles.emptyIcon}>
                <Ionicons name="camera-outline" size={28} color={theme.color.lime} />
              </View>
              <Text style={styles.emptyTitle}>Aucun objet encore</Text>
              <Text style={styles.emptySub}>Scannez votre premier objet pour découvrir sa valeur.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 24 }}>
              {recent.map(it => (
                <Pressable
                  key={it.id}
                  testID={`recent-card-${it.id}`}
                  onPress={() => router.push(`/item/${it.id}`)}
                  style={styles.recentCard}
                >
                  <Image source={{ uri: it.photo }} style={styles.recentImg} contentFit="cover" />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.85)"]}
                    style={styles.recentGradient}
                  />
                  <View style={styles.recentBody}>
                    <Text style={styles.recentName} numberOfLines={1}>{it.name}</Text>
                    <View style={styles.recentRow}>
                      <Text style={styles.recentPrice}>{formatEUR(it.listing.price)}</Text>
                      <View style={[styles.condDot, { backgroundColor: conditionColor(it.condition) }]} />
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
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
  greeting: { color: theme.color.textMuted, fontSize: 15 },
  name: { color: theme.color.text, fontSize: 26, fontWeight: "700", letterSpacing: -0.5 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.color.surface,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: theme.color.border,
  },
  avatarText: { color: theme.color.text, fontSize: 17, fontWeight: "600" },
  hero: {
    marginHorizontal: 24, marginTop: 8, marginBottom: 20,
    paddingVertical: 4,
  },
  heroLabel: {
    color: theme.color.textMuted, fontSize: 12,
    letterSpacing: 1.4, textTransform: "uppercase", fontWeight: "600",
  },
  heroAmount: {
    color: theme.color.text, fontSize: 56, fontWeight: "700",
    letterSpacing: -2, marginTop: 6, marginBottom: 14,
  },
  heroRow: { flexDirection: "row", gap: 8 },
  heroPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: theme.color.surface, borderRadius: 999,
    borderWidth: 1, borderColor: theme.color.border,
  },
  heroPillTxt: { color: theme.color.textMuted, fontSize: 12, fontWeight: "600" },
  primaryCta: {
    marginHorizontal: 24, marginBottom: 12,
    height: 84, borderRadius: 24, overflow: "hidden",
  },
  ctaContent: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 20,
  },
  ctaIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "rgba(10,10,10,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  ctaTitle: { color: theme.color.onLime, fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  ctaSub: { color: "rgba(10,10,10,0.7)", fontSize: 13, marginTop: 2 },
  secondaryCta: {
    marginHorizontal: 24, marginBottom: 8,
    height: 72, borderRadius: 20,
    backgroundColor: theme.color.surface,
    borderWidth: 1, borderColor: theme.color.border,
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 20,
  },
  secondaryTitle: { color: theme.color.text, fontSize: 15, fontWeight: "600" },
  secondarySub: { color: theme.color.textMuted, fontSize: 12, marginTop: 2 },
  section: { marginTop: 28 },
  sectionHead: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 24, marginBottom: 12,
  },
  sectionTitle: { color: theme.color.text, fontSize: 20, fontWeight: "700", letterSpacing: -0.4 },
  badge: {
    minWidth: 24, height: 24, paddingHorizontal: 8, borderRadius: 12,
    backgroundColor: theme.color.limeSoft,
    alignItems: "center", justifyContent: "center",
  },
  badgeTxt: { color: theme.color.lime, fontSize: 12, fontWeight: "700" },
  link: { color: theme.color.lime, fontSize: 13, fontWeight: "600" },
  attentionRow: {
    marginHorizontal: 24, marginBottom: 10,
    padding: 12, borderRadius: 16,
    backgroundColor: theme.color.surface,
    borderWidth: 1, borderColor: theme.color.border,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  attentionImg: { width: 48, height: 48, borderRadius: 12, backgroundColor: theme.color.surface2 },
  attentionName: { color: theme.color.text, fontSize: 15, fontWeight: "600" },
  attentionHint: { color: theme.color.textMuted, fontSize: 12, marginTop: 2 },
  scorePill: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.color.bg,
    borderWidth: 2, borderColor: theme.color.warning,
    alignItems: "center", justifyContent: "center",
  },
  scorePillTxt: { color: theme.color.warning, fontSize: 13, fontWeight: "700" },
  emptyState: {
    marginHorizontal: 24, paddingVertical: 40, alignItems: "center",
    backgroundColor: theme.color.surface, borderRadius: 20,
    borderWidth: 1, borderColor: theme.color.border,
  },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.color.limeSoft,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  emptyTitle: { color: theme.color.text, fontSize: 16, fontWeight: "600" },
  emptySub: { color: theme.color.textMuted, fontSize: 13, textAlign: "center", marginTop: 4, paddingHorizontal: 24 },
  recentCard: {
    width: 160, height: 200, borderRadius: 20, overflow: "hidden",
    backgroundColor: theme.color.surface, marginLeft: 24,
  },
  recentImg: { width: "100%", height: "100%" },
  recentGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "60%" },
  recentBody: { position: "absolute", left: 12, right: 12, bottom: 12 },
  recentName: { color: theme.color.text, fontSize: 14, fontWeight: "600" },
  recentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  recentPrice: { color: theme.color.lime, fontSize: 15, fontWeight: "700" },
  condDot: { width: 8, height: 8, borderRadius: 4 },
});
