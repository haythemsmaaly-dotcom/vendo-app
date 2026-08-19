import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, RefreshControl, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

import { theme, formatEUR, statusLabel, statusColor, conditionColor } from "@/src/theme";
import { api, Item } from "@/src/api";
import PressableScale from "@/src/components/PressableScale";
import Skeleton from "@/src/components/Skeleton";
import EmptyState from "@/src/components/EmptyState";

const FILTERS = [
  { key: "all", label: "Tout" },
  { key: "draft", label: "Brouillons" },
  { key: "ready", label: "Prêts" },
  { key: "listed", label: "En vente" },
  { key: "sold", label: "Vendus" },
];

export default function ItemsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await api.list()); } catch (e) { console.warn(e); setItems([]); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const loading = items === null;
  const filtered = !loading ? (filter === "all" ? items! : items!.filter(i => i.status === filter)) : [];

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Animated.View entering={FadeInDown.duration(320)} style={styles.header}>
        <View>
          <Text style={styles.h1}>Mes objets</Text>
          <Text style={styles.sub}>
            {loading ? "Chargement…" : `${items!.length} objet${items!.length > 1 ? "s" : ""} au total`}
          </Text>
        </View>
        <PressableScale
          testID="items-add-btn"
          hapticStyle="medium"
          onPress={() => router.push("/(tabs)/scan")}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={22} color={theme.color.onLime} />
        </PressableScale>
      </Animated.View>

      <View style={styles.chipRowWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <PressableScale
                key={f.key}
                testID={`filter-chip-${f.key}`}
                hapticStyle="selection"
                onPress={() => setFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{f.label}</Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 24, paddingTop: 8, gap: 12 }}>
          {[0,1,2,3].map(i => (
            <View key={i} style={styles.skRow}>
              <Skeleton width={68} height={68} radius={14} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton height={16} radius={4} />
                <Skeleton width={"60%"} height={12} radius={4} />
                <Skeleton width={"40%"} height={12} radius={4} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.lime} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={() => (
            <EmptyState
              testID="items-empty"
              icon="cube-outline"
              title={filter === "sold" ? "Aucune vente encore" : "Aucun objet ici"}
              subtitle={filter === "sold" ? "Publiez vos annonces pour commencer." : "Le premier scan est le plus excitant."}
              ctaLabel="Scanner un objet"
              onCta={() => router.push("/(tabs)/scan")}
            />
          )}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(280).delay(index * 40)}>
              <PressableScale
                testID={`item-row-${item.id}`}
                hapticStyle="medium"
                onPress={() => router.push(`/item/${item.id}`)}
                style={styles.row}
              >
                <Image source={{ uri: item.photo }} style={styles.thumb} contentFit="cover" transition={220} />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.rowTop}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.price}>{formatEUR(item.listing.price)}</Text>
                  </View>
                  <Text style={styles.cat} numberOfLines={1}>
                    {item.brand ? `${item.brand} · ` : ""}{item.category}
                  </Text>
                  <View style={styles.rowBottom}>
                    <View style={[styles.pill, { borderColor: conditionColor(item.condition) }]}>
                      <View style={[styles.dot, { backgroundColor: conditionColor(item.condition) }]} />
                      <Text style={styles.pillTxt}>{item.condition}</Text>
                    </View>
                    <View style={[styles.pill, { borderColor: statusColor(item.status) }]}>
                      <Text style={[styles.pillTxt, { color: statusColor(item.status) }]}>
                        {statusLabel(item.status)}
                      </Text>
                    </View>
                    <View style={styles.scoreMini}>
                      <Ionicons name="flash" size={11} color={theme.color.lime} />
                      <Text style={styles.scoreMiniTxt}>{item.sell_score}</Text>
                    </View>
                  </View>
                </View>
              </PressableScale>
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  header: {
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8,
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
  },
  h1: { color: theme.color.text, fontSize: 32, fontFamily: theme.font.displayBold, letterSpacing: -1 },
  sub: { color: theme.color.textMuted, fontSize: 13, marginTop: 4, fontFamily: theme.font.text },
  addBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.color.lime,
    alignItems: "center", justifyContent: "center",
  },
  chipRowWrap: { height: 56, marginTop: 8 },
  chipRow: { paddingHorizontal: 24, gap: 8, alignItems: "center", height: 56 },
  chip: {
    height: 36, paddingHorizontal: 16, borderRadius: 999,
    backgroundColor: theme.color.surface,
    borderWidth: 1, borderColor: theme.color.border,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: { backgroundColor: theme.color.lime, borderColor: theme.color.lime },
  chipTxt: { color: theme.color.textMuted, fontSize: 13, fontFamily: theme.font.textSemi },
  chipTxtActive: { color: theme.color.onLime },
  row: {
    flexDirection: "row", gap: 14, padding: 14,
    backgroundColor: theme.color.surface, borderRadius: 20,
    borderWidth: 1, borderColor: theme.color.border,
  },
  thumb: { width: 68, height: 68, borderRadius: 14, backgroundColor: theme.color.surface2 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { color: theme.color.text, fontSize: 16, fontFamily: theme.font.textSemi, flex: 1, marginRight: 8 },
  price: { color: theme.color.lime, fontSize: 16, fontFamily: theme.font.displayBold },
  cat: { color: theme.color.textMuted, fontSize: 12, fontFamily: theme.font.text },
  rowBottom: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  pill: {
    height: 24, paddingHorizontal: 10, borderRadius: 999,
    borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6,
  },
  pillTxt: { color: theme.color.text, fontSize: 11, fontFamily: theme.font.textSemi },
  dot: { width: 6, height: 6, borderRadius: 3 },
  scoreMini: {
    flexDirection: "row", alignItems: "center", gap: 4,
    marginLeft: "auto",
    paddingHorizontal: 10, height: 24, borderRadius: 999,
    backgroundColor: theme.color.limeSoft,
  },
  scoreMiniTxt: { color: theme.color.lime, fontSize: 11, fontFamily: theme.font.textBold },
  skRow: {
    flexDirection: "row", gap: 14, padding: 14, borderRadius: 20,
    backgroundColor: theme.color.surface,
    borderWidth: 1, borderColor: theme.color.border, alignItems: "center",
  },
});
