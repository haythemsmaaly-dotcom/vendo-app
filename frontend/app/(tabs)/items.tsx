import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";

import { theme, formatEUR, statusLabel, statusColor, conditionColor } from "@/src/theme";
import { api, Item } from "@/src/api";

const FILTERS = [
  { key: "all", label: "Tout" },
  { key: "draft", label: "Brouillons" },
  { key: "ready", label: "Prêts" },
  { key: "listed", label: "En vente" },
  { key: "sold", label: "Vendus" },
];

export default function ItemsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await api.list()); } catch (e) { console.warn(e); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = filter === "all" ? items : items.filter(i => i.status === filter);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.h1}>Mes objets</Text>
          <Text style={styles.sub}>{items.length} objet{items.length > 1 ? "s" : ""} au total</Text>
        </View>
        <Pressable testID="items-add-btn" onPress={() => router.push("/(tabs)/scan")} style={styles.addBtn}>
          <Ionicons name="add" size={22} color={theme.color.onLime} />
        </Pressable>
      </View>

      <View style={styles.chipRowWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                testID={`filter-chip-${f.key}`}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.lime} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="cube-outline" size={30} color={theme.color.lime} />
            </View>
            <Text style={styles.emptyTitle}>Aucun objet</Text>
            <Text style={styles.emptySub}>Commencez par scanner un objet.</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable
            testID={`item-row-${item.id}`}
            onPress={() => router.push(`/item/${item.id}`)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
          >
            <Image source={{ uri: item.photo }} style={styles.thumb} contentFit="cover" />
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
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  header: {
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8,
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
  },
  h1: { color: theme.color.text, fontSize: 32, fontWeight: "700", letterSpacing: -1 },
  sub: { color: theme.color.textMuted, fontSize: 13, marginTop: 4 },
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
  chipTxt: { color: theme.color.textMuted, fontSize: 13, fontWeight: "600" },
  chipTxtActive: { color: theme.color.onLime },
  row: {
    flexDirection: "row", gap: 14, padding: 14,
    backgroundColor: theme.color.surface, borderRadius: 20,
    borderWidth: 1, borderColor: theme.color.border,
  },
  thumb: { width: 68, height: 68, borderRadius: 14, backgroundColor: theme.color.surface2 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { color: theme.color.text, fontSize: 16, fontWeight: "600", flex: 1, marginRight: 8 },
  price: { color: theme.color.lime, fontSize: 16, fontWeight: "700" },
  cat: { color: theme.color.textMuted, fontSize: 12 },
  rowBottom: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  pill: {
    height: 24, paddingHorizontal: 10, borderRadius: 999,
    borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6,
  },
  pillTxt: { color: theme.color.text, fontSize: 11, fontWeight: "600" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  scoreMini: {
    flexDirection: "row", alignItems: "center", gap: 4,
    marginLeft: "auto",
    paddingHorizontal: 10, height: 24, borderRadius: 999,
    backgroundColor: theme.color.limeSoft,
  },
  scoreMiniTxt: { color: theme.color.lime, fontSize: 11, fontWeight: "700" },
  empty: {
    marginTop: 40, padding: 32, alignItems: "center",
    backgroundColor: theme.color.surface, borderRadius: 24,
    borderWidth: 1, borderColor: theme.color.border,
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: theme.color.limeSoft,
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  emptyTitle: { color: theme.color.text, fontSize: 17, fontWeight: "600" },
  emptySub: { color: theme.color.textMuted, fontSize: 13, marginTop: 4 },
});
