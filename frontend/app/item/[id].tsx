import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { theme, formatEUR, conditionColor, statusLabel } from "@/src/theme";
import { api, Item } from "@/src/api";
import SellScoreRing from "@/src/components/SellScoreRing";
import { computeSellPlan, computeSellScore } from "@/src/catalog";

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [planMode, setPlanMode] = useState<"quick" | "balanced" | "best">("balanced");

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const it = await api.get(id);
      setItem(it);
      setDraftTitle(it.listing.title);
      setDraftDesc(it.listing.description);
      setDraftPrice(String(it.listing.price));
      setPlanMode((it.sell_plan.mode as any) || "balanced");
    } catch (e) { console.warn(e); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const setStrategy = async (key: string) => {
    if (!item) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const strat = item.strategies.find(s => s.key === key);
    if (!strat) return;
    const newPrice = strat.price;
    const updatedListing = { ...item.listing, price: newPrice };
    setDraftPrice(String(newPrice));
    const optimistic = { ...item, selected_strategy: key, listing: updatedListing };
    setItem(optimistic);
    try {
      const saved = await api.update(item.id, { selected_strategy: key, listing: updatedListing });
      setItem(saved);
    } catch { setItem(item); }
  };

  const pickPlan = async (mode: "quick" | "balanced" | "best") => {
    if (!item) return;
    Haptics.selectionAsync();
    setPlanMode(mode);
    const plan = computeSellPlan(mode, item.listing.price, item.market_low);
    try {
      const saved = await api.update(item.id, { sell_plan: plan });
      setItem(saved);
    } catch (e) { console.warn(e); }
  };

  const saveEdits = async () => {
    if (!item) return;
    setSaving(true);
    const price = parseFloat(draftPrice.replace(",", ".")) || item.listing.price;
    const newListing = { ...item.listing, title: draftTitle, description: draftDesc, price };
    const score = computeSellScore({
      hasTitle: draftTitle.trim().length > 3,
      hasDescription: draftDesc.trim().length > 20,
      photos: item.photos.length || 1,
      hasCondition: !!item.condition,
      priceInRange: price >= item.market_low && price <= item.market_high * 1.05,
    });
    try {
      const saved = await api.update(item.id, {
        listing: newListing,
        sell_score: score.total,
      });
      setItem(saved);
      setEditMode(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) { console.warn(e); }
    finally { setSaving(false); }
  };

  const markReady = async () => {
    if (!item) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const saved = await api.update(item.id, { status: item.status === "ready" ? "draft" : "ready" });
      setItem(saved);
    } catch {}
  };

  const removeItem = async () => {
    if (!item) return;
    try {
      await api.remove(item.id);
      router.replace("/(tabs)/items");
    } catch {}
  };

  if (!item) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={theme.color.lime} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.color.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.safe}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: item.photo }} style={styles.hero} contentFit="cover" />
          <LinearGradient
            colors={["transparent", "rgba(10,10,10,0.4)", theme.color.bg]}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFillObject as any}
          />
          <SafeAreaView edges={["top"]} style={styles.heroTop}>
            <Pressable testID="detail-back" onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={20} color={theme.color.text} />
            </Pressable>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable testID="detail-delete" onPress={removeItem} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={18} color={theme.color.text} />
              </Pressable>
            </View>
          </SafeAreaView>
          <View style={styles.heroBottom}>
            {item.brand && <Text style={styles.brand}>{item.brand}</Text>}
            <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.pill, { borderColor: conditionColor(item.condition) }]}>
                <View style={[styles.dot, { backgroundColor: conditionColor(item.condition) }]} />
                <Text style={styles.pillTxt}>{item.condition}</Text>
              </View>
              <View style={styles.pillGhost}>
                <Ionicons name="pricetag-outline" size={12} color={theme.color.textMuted} />
                <Text style={styles.pillGhostTxt}>{item.category}</Text>
              </View>
              <View style={styles.pillGhost}>
                <Ionicons name="sparkles" size={12} color={theme.color.lime} />
                <Text style={[styles.pillGhostTxt, { color: theme.color.lime }]}>{item.confidence}% IA</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sell Score + summary */}
        <View style={styles.section}>
          <View style={styles.scoreCard}>
            <SellScoreRing score={item.sell_score} size={110} />
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={styles.scoreTitle}>Sell Score</Text>
              <Text style={styles.scoreDesc}>
                {item.sell_score >= 80 ? "Excellent ! Votre annonce est très optimisée."
                : item.sell_score >= 60 ? "Bonne annonce. Quelques améliorations possibles."
                : "À optimiser. Suivez les recommandations ci-dessous."}
              </Text>
              <View style={styles.priceBig}>
                <Text style={styles.priceLabel}>Prix recommandé</Text>
                <Text style={styles.priceValue}>{formatEUR(item.listing.price)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sell Score breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ce qui compte</Text>
          <View style={styles.breakdownCard}>
            {Object.entries(item.sell_score_breakdown || {}).map(([k, v]) => (
              <View key={k} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{k[0].toUpperCase() + k.slice(1)}</Text>
                <View style={styles.breakdownBarWrap}>
                  <View style={[styles.breakdownBar, { width: `${(v / 25) * 100}%`, backgroundColor: v >= 20 ? theme.color.lime : v >= 10 ? theme.color.warning : theme.color.error }]} />
                </View>
                <Text style={styles.breakdownVal}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Price strategies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stratégie de prix</Text>
          <Text style={styles.sectionSub}>
            Marché : {formatEUR(item.market_low)} – {formatEUR(item.market_high)}
          </Text>
          <View style={{ gap: 10, marginTop: 12 }}>
            {item.strategies.map(s => {
              const active = item.selected_strategy === s.key;
              return (
                <Pressable
                  key={s.key}
                  testID={`strategy-${s.key}`}
                  onPress={() => setStrategy(s.key)}
                  style={[styles.stratCard, active && styles.stratCardActive]}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={[styles.stratLabel, active && { color: theme.color.onLime }]}>{s.label}</Text>
                      {active && (
                        <View style={styles.checkMark}>
                          <Ionicons name="checkmark" size={12} color={theme.color.lime} />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.stratExpl, active && { color: "rgba(10,10,10,0.75)" }]}>
                      {s.explanation}
                    </Text>
                  </View>
                  <Text style={[styles.stratPrice, active && { color: theme.color.onLime }]}>
                    {formatEUR(s.price)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Listing generator */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Annonce générée</Text>
            <Pressable
              testID="edit-listing-btn"
              onPress={() => (editMode ? saveEdits() : setEditMode(true))}
              style={styles.smallBtn}
            >
              {saving ? <ActivityIndicator size="small" color={theme.color.onLime} /> :
                <Text style={styles.smallBtnTxt}>{editMode ? "Enregistrer" : "Modifier"}</Text>}
            </Pressable>
          </View>

          <View style={styles.listCard}>
            <FieldLabel>Titre</FieldLabel>
            {editMode ? (
              <TextInput
                value={draftTitle}
                onChangeText={setDraftTitle}
                style={styles.input}
                placeholderTextColor={theme.color.textFaint}
                testID="input-title"
              />
            ) : (
              <Text style={styles.fieldValue}>{item.listing.title}</Text>
            )}

            <FieldLabel>Description</FieldLabel>
            {editMode ? (
              <TextInput
                value={draftDesc}
                onChangeText={setDraftDesc}
                style={[styles.input, { height: 120, textAlignVertical: "top" }]}
                multiline
                testID="input-desc"
              />
            ) : (
              <Text style={styles.fieldValue}>{item.listing.description}</Text>
            )}

            <FieldLabel>Prix</FieldLabel>
            {editMode ? (
              <TextInput
                value={draftPrice}
                onChangeText={setDraftPrice}
                keyboardType="numeric"
                style={styles.input}
                testID="input-price"
              />
            ) : (
              <Text style={[styles.fieldValue, { color: theme.color.lime, fontSize: 20, fontWeight: "700" }]}>
                {formatEUR(item.listing.price)}
              </Text>
            )}

            <FieldLabel>Mots-clés</FieldLabel>
            <View style={styles.kwWrap}>
              {item.listing.keywords.map(k => (
                <View key={k} style={styles.kw}>
                  <Text style={styles.kwTxt}>#{k}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Photo coach */}
        {item.photo_coach.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coach photos IA</Text>
            <Text style={styles.sectionSub}>Ajoutez ces clichés pour augmenter votre Sell Score.</Text>
            <View style={{ gap: 8, marginTop: 12 }}>
              {item.photo_coach.map((tip, i) => (
                <View key={i} style={styles.coachRow}>
                  <View style={styles.coachIcon}>
                    <Ionicons name="camera" size={14} color={theme.color.lime} />
                  </View>
                  <Text style={styles.coachTxt}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Missing info */}
        {item.missing_info.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations manquantes</Text>
            <View style={styles.missingCard}>
              {item.missing_info.map((m, i) => (
                <View key={i} style={styles.missingRow}>
                  <Ionicons name="alert-circle" size={16} color={theme.color.warning} />
                  <Text style={styles.missingTxt}>{m}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Sell plan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plan de vente</Text>
          <Text style={styles.sectionSub}>Choisissez votre approche.</Text>
          <View style={styles.planPicker}>
            {(["quick", "balanced", "best"] as const).map(m => {
              const active = planMode === m;
              const labels: any = { quick: "Rapide", balanced: "Équilibré", best: "Meilleur prix" };
              return (
                <Pressable
                  key={m}
                  testID={`plan-${m}`}
                  onPress={() => pickPlan(m)}
                  style={[styles.planTab, active && styles.planTabActive]}
                >
                  <Text style={[styles.planTabTxt, active && { color: theme.color.onLime }]}>{labels[m]}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.planCard}>
            <PlanRow label="Prix de départ" value={formatEUR(item.sell_plan.start_price)} />
            <PlanRow label={`Ajustement après ${item.sell_plan.adjustment_days}j`} value={formatEUR(item.sell_plan.adjusted_price)} />
            <PlanRow label="Prix minimum" value={formatEUR(item.sell_plan.minimum_price)} muted />
            <PlanRow label="Date cible" value={new Date(item.sell_plan.target_date).toLocaleDateString("fr-FR")} muted />
          </View>
        </View>

        {/* Publish CTA */}
        <View style={{ paddingHorizontal: 24, marginTop: 20 }}>
          <Pressable
            testID="publish-btn"
            onPress={markReady}
            style={({ pressed }) => [styles.publish, item.status === "ready" && { backgroundColor: theme.color.success }, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name={item.status === "ready" ? "checkmark-circle" : "rocket"} size={20} color={theme.color.onLime} />
            <Text style={styles.publishTxt}>
              {item.status === "ready" ? "Prêt à publier · Marquer brouillon" : "Marquer comme prêt à publier"}
            </Text>
          </Pressable>
          <Text style={styles.statusHint}>Statut actuel : {statusLabel(item.status)}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}
function PlanRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.planRow}>
      <Text style={styles.planLabel}>{label}</Text>
      <Text style={[styles.planValue, muted && { color: theme.color.textMuted }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  heroWrap: { height: 380, position: "relative" },
  hero: { width: "100%", height: "100%" },
  heroTop: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 8,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(10,10,10,0.55)",
    borderWidth: 1, borderColor: theme.color.border,
    alignItems: "center", justifyContent: "center",
  },
  heroBottom: { position: "absolute", bottom: 20, left: 24, right: 24, gap: 6 },
  brand: { color: theme.color.textMuted, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontWeight: "700" },
  title: { color: theme.color.text, fontSize: 32, fontWeight: "700", letterSpacing: -1 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, height: 26 },
  pillTxt: { color: theme.color.text, fontSize: 12, fontWeight: "600" },
  pillGhost: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, height: 26, borderRadius: 999,
    backgroundColor: "rgba(10,10,10,0.55)", borderWidth: 1, borderColor: theme.color.border,
  },
  pillGhostTxt: { color: theme.color.textMuted, fontSize: 12, fontWeight: "600" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  section: { paddingHorizontal: 24, marginTop: 24 },
  sectionTitle: { color: theme.color.text, fontSize: 18, fontWeight: "700", letterSpacing: -0.4 },
  sectionSub: { color: theme.color.textMuted, fontSize: 13, marginTop: 4 },
  scoreCard: {
    flexDirection: "row", gap: 18, padding: 18, borderRadius: 24,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border,
    alignItems: "center",
  },
  scoreTitle: { color: theme.color.text, fontSize: 16, fontWeight: "700" },
  scoreDesc: { color: theme.color.textMuted, fontSize: 12, lineHeight: 17 },
  priceBig: {
    marginTop: 4, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.color.border,
  },
  priceLabel: { color: theme.color.textMuted, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", fontWeight: "600" },
  priceValue: { color: theme.color.lime, fontSize: 22, fontWeight: "700", letterSpacing: -0.5, marginTop: 2 },
  breakdownCard: {
    marginTop: 12, padding: 16, borderRadius: 20,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border, gap: 12,
  },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  breakdownLabel: { width: 90, color: theme.color.textMuted, fontSize: 12, fontWeight: "600" },
  breakdownBarWrap: {
    flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.color.surface2, overflow: "hidden",
  },
  breakdownBar: { height: "100%", borderRadius: 3 },
  breakdownVal: { color: theme.color.text, fontSize: 12, fontWeight: "700", width: 24, textAlign: "right" },
  stratCard: {
    padding: 16, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border,
  },
  stratCardActive: { backgroundColor: theme.color.lime, borderColor: theme.color.lime },
  stratLabel: { color: theme.color.text, fontSize: 15, fontWeight: "700" },
  stratExpl: { color: theme.color.textMuted, fontSize: 12, lineHeight: 17 },
  stratPrice: { color: theme.color.text, fontSize: 20, fontWeight: "700", letterSpacing: -0.4 },
  checkMark: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: theme.color.onLime,
    alignItems: "center", justifyContent: "center",
  },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  smallBtn: {
    paddingHorizontal: 14, height: 32, borderRadius: 16,
    backgroundColor: theme.color.lime, alignItems: "center", justifyContent: "center",
  },
  smallBtnTxt: { color: theme.color.onLime, fontSize: 12, fontWeight: "700" },
  listCard: {
    marginTop: 12, padding: 18, borderRadius: 20,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border,
  },
  fieldLabel: {
    color: theme.color.textMuted, fontSize: 11, letterSpacing: 1.2,
    textTransform: "uppercase", fontWeight: "700", marginTop: 12, marginBottom: 6,
  },
  fieldValue: { color: theme.color.text, fontSize: 14, lineHeight: 20 },
  input: {
    color: theme.color.text, fontSize: 14, lineHeight: 20,
    backgroundColor: theme.color.bg, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: theme.color.border,
  },
  kwWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  kw: {
    paddingHorizontal: 10, height: 26, borderRadius: 999,
    backgroundColor: theme.color.surface2,
    alignItems: "center", justifyContent: "center",
  },
  kwTxt: { color: theme.color.textMuted, fontSize: 11, fontWeight: "600" },
  coachRow: {
    padding: 14, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border,
  },
  coachIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: theme.color.limeSoft,
    alignItems: "center", justifyContent: "center",
  },
  coachTxt: { flex: 1, color: theme.color.text, fontSize: 13 },
  missingCard: {
    marginTop: 12, padding: 14, borderRadius: 16,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border, gap: 10,
  },
  missingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  missingTxt: { color: theme.color.text, fontSize: 13 },
  planPicker: {
    flexDirection: "row", gap: 6, marginTop: 12,
    padding: 4, backgroundColor: theme.color.surface, borderRadius: 14,
    borderWidth: 1, borderColor: theme.color.border,
  },
  planTab: { flex: 1, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  planTabActive: { backgroundColor: theme.color.lime },
  planTabTxt: { color: theme.color.textMuted, fontSize: 13, fontWeight: "600" },
  planCard: {
    marginTop: 12, padding: 18, borderRadius: 20,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border, gap: 12,
  },
  planRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planLabel: { color: theme.color.textMuted, fontSize: 13 },
  planValue: { color: theme.color.text, fontSize: 15, fontWeight: "700" },
  publish: {
    height: 60, borderRadius: 18, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: theme.color.lime,
  },
  publishTxt: { color: theme.color.onLime, fontSize: 15, fontWeight: "700" },
  statusHint: { color: theme.color.textMuted, fontSize: 12, textAlign: "center", marginTop: 10 },
});
