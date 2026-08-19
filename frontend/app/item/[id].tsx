import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, useWindowDimensions, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolation,
  FadeIn, FadeInDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { theme, formatEUR, conditionColor, statusLabel } from "@/src/theme";
import { api, Item } from "@/src/api";
import SellScoreRing from "@/src/components/SellScoreRing";
import Sparkline from "@/src/components/Sparkline";
import PressableScale from "@/src/components/PressableScale";
import Skeleton from "@/src/components/Skeleton";
import { computeSellPlan, computeSellScore } from "@/src/catalog";
import { useSettings } from "@/src/i18n/SettingsContext";
import { useAuth } from "@/src/auth";
import { MARKETPLACES, copyListingToClipboard, openMarketplace, shareListingNative } from "@/src/marketplace";

const HERO_H = 380;

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, settings } = useSettings();
  const { user } = useAuth();
  const { width: W } = useWindowDimensions();
  const [item, setItem] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [planMode, setPlanMode] = useState<"quick" | "balanced" | "best">("balanced");
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [copiedToast, setCopiedToast] = useState(false);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; },
  });

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

  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-200, 0, HERO_H], [-80, 0, HERO_H * 0.4], Extrapolation.CLAMP) },
      { scale: interpolate(scrollY.value, [-200, 0], [1.35, 1], Extrapolation.CLAMP) },
    ],
  }));
  const heroContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HERO_H * 0.5], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [0, HERO_H * 0.5], [0, -20], Extrapolation.CLAMP) }],
  }));

  const currentPhoto = item?.photos?.[activePhotoIdx] || item?.photo || "";

  const setStrategy = async (key: string) => {
    if (!item) return;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
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
    try { Haptics.selectionAsync(); } catch {}
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
      const saved = await api.update(item.id, { listing: newListing, sell_score: score.total });
      setItem(saved);
      setEditMode(false);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch (e) { console.warn(e); }
    finally { setSaving(false); }
  };

  const markReady = async () => {
    if (!item) return;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
    try {
      const saved = await api.update(item.id, { status: item.status === "ready" ? "draft" : "ready" });
      setItem(saved);
    } catch {}
  };

  const removeItem = async () => {
    if (!item) return;
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
    try {
      await api.remove(item.id);
      router.replace("/(tabs)/items");
    } catch {}
  };

  if (!item) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={{ paddingHorizontal: 24, paddingTop: 24, gap: 14 }}>
          <Skeleton height={HERO_H - 60} radius={0} />
          <Skeleton width={"70%"} height={28} radius={8} />
          <Skeleton width={"90%"} height={16} radius={6} />
          <Skeleton height={120} radius={20} />
          <Skeleton height={160} radius={20} />
        </View>
      </SafeAreaView>
    );
  }

  const CARD_W = W - 48;

  // Generate a synthetic market sparkline for each strategy (visually satisfying)
  const spark = (base: number, key: string) => {
    const seed = key === "fast" ? [3,4,3,2,1,2,3,4] : key === "smart" ? [2,3,3,4,3,4,5,4] : [1,2,3,4,4,5,6,5];
    return seed.map(v => base * (1 + v * 0.02));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.color.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero with parallax */}
        <View style={styles.heroWrap}>
          <Animated.View style={[styles.heroImgWrap, heroStyle]}>
            <Image source={{ uri: currentPhoto }} style={styles.hero} contentFit="cover" transition={280} />
          </Animated.View>
          <LinearGradient
            colors={["transparent", "rgba(10,10,10,0.4)", theme.color.bg]}
            locations={[0, 0.6, 1]}
            style={[StyleSheet.absoluteFillObject, { pointerEvents: "none" }] as any}
          />
          <SafeAreaView edges={["top"]} style={styles.heroTop}>
            <PressableScale testID="detail-back" hapticStyle="selection" onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={20} color={theme.color.text} />
            </PressableScale>
            <View style={styles.confidenceBadge}>
              <Ionicons name="sparkles" size={12} color={theme.color.lime} />
              <Text style={styles.confidenceTxt}>IA · {item.confidence}%</Text>
            </View>
            <PressableScale testID="detail-delete" hapticStyle="medium" onPress={removeItem} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={18} color={theme.color.text} />
            </PressableScale>
          </SafeAreaView>
          <Animated.View style={[styles.heroBottom, heroContentStyle]}>
            {item.brand && <Text style={styles.brand}>{item.brand.toUpperCase()}</Text>}
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
            </View>
          </Animated.View>
        </View>

        {/* Thumbnails row if multiple photos */}
        {item.photos.length > 1 && (
          <Animated.View entering={FadeIn.duration(320)} style={styles.thumbsRow}>
            {item.photos.map((p, i) => (
              <PressableScale
                key={p + i}
                testID={`thumb-${i}`}
                hapticStyle="selection"
                onPress={() => setActivePhotoIdx(i)}
                style={[styles.thumb, activePhotoIdx === i && styles.thumbActive]}
              >
                <Image source={{ uri: p }} style={styles.thumbImg} contentFit="cover" transition={180} />
              </PressableScale>
            ))}
          </Animated.View>
        )}

        {/* Sell Score card */}
        <Animated.View entering={FadeInDown.duration(360)} style={styles.section}>
          <View style={styles.scoreCard}>
            <SellScoreRing score={item.sell_score} size={110} delay={200} duration={1100} />
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
        </Animated.View>

        {/* Sell Score breakdown */}
        <Animated.View entering={FadeInDown.duration(360).delay(80)} style={styles.section}>
          <Text style={styles.sectionTitle}>Ce qui compte</Text>
          <View style={styles.breakdownCard}>
            {Object.entries(item.sell_score_breakdown || {}).map(([k, v], i) => (
              <Animated.View key={k} entering={FadeInDown.duration(280).delay(120 + i * 60)} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{k[0].toUpperCase() + k.slice(1)}</Text>
                <View style={styles.breakdownBarWrap}>
                  <View style={[styles.breakdownBar, { width: `${(v / 25) * 100}%`, backgroundColor: v >= 20 ? theme.color.lime : v >= 10 ? theme.color.warning : theme.color.error }]} />
                </View>
                <Text style={styles.breakdownVal}>{v}</Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Price strategies — horizontal snap carousel with sparklines */}
        <Animated.View entering={FadeInDown.duration(360).delay(120)} style={styles.section}>
          <Text style={styles.sectionTitle}>Stratégie de prix</Text>
          <Text style={styles.sectionSub}>
            Marché estimé par l{"\u2019"}IA : {formatEUR(item.market_low)} – {formatEUR(item.market_high)}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_W + 12}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16, gap: 12 }}
          >
            {item.strategies.map((s, i) => {
              const active = item.selected_strategy === s.key;
              const color = s.key === "fast" ? theme.color.warning : s.key === "max" ? theme.color.success : theme.color.lime;
              return (
                <PressableScale
                  key={s.key}
                  testID={`strategy-${s.key}`}
                  hapticStyle="medium"
                  onPress={() => setStrategy(s.key)}
                  scaleTo={0.975}
                  style={[styles.stratCard, { width: CARD_W }, active && styles.stratCardActive]}
                >
                  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                    <Sparkline data={spark(s.price, s.key)} width={CARD_W} height={168} color={active ? theme.color.onLime : color} fillOpacity={active ? 0.15 : 0.12} />
                  </View>
                  <View style={styles.stratHeader}>
                    <View style={[styles.stratTag, active && { borderColor: theme.color.onLime, backgroundColor: "rgba(10,10,10,0.15)" }]}>
                      <Text style={[styles.stratTagTxt, active && { color: theme.color.onLime }]}>
                        {s.key === "fast" ? "RAPIDE" : s.key === "smart" ? "OPTIMAL" : "PREMIUM"}
                      </Text>
                    </View>
                    {active && (
                      <View style={styles.checkMark}>
                        <Ionicons name="checkmark" size={12} color={active ? theme.color.lime : theme.color.onLime} />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.stratLabel, active && { color: theme.color.onLime }]}>{s.label}</Text>
                  <Text style={[styles.stratPrice, active && { color: theme.color.onLime }]}>{formatEUR(s.price)}</Text>
                  <Text style={[styles.stratExpl, active && { color: "rgba(10,10,10,0.72)" }]} numberOfLines={2}>
                    {s.explanation}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Listing generator */}
        <Animated.View entering={FadeInDown.duration(360).delay(160)} style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Annonce générée</Text>
            <PressableScale
              testID="edit-listing-btn"
              hapticStyle="medium"
              onPress={() => (editMode ? saveEdits() : setEditMode(true))}
              style={styles.smallBtn}
            >
              <Text style={styles.smallBtnTxt}>{saving ? "…" : editMode ? "Enregistrer" : "Modifier"}</Text>
            </PressableScale>
          </View>

          <View style={styles.listCard}>
            <FieldLabel>Titre</FieldLabel>
            {editMode ? (
              <TextInput value={draftTitle} onChangeText={setDraftTitle} style={styles.input} placeholderTextColor={theme.color.textFaint} testID="input-title" />
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
              <TextInput value={draftPrice} onChangeText={setDraftPrice} keyboardType="numeric" style={styles.input} testID="input-price" />
            ) : (
              <Text style={[styles.fieldValue, { color: theme.color.lime, fontSize: 20, fontFamily: theme.font.displayBold }]}>
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
        </Animated.View>

        {/* Condition reasons (from AI) */}
        {item.condition_reasons && item.condition_reasons.length > 0 && (
          <Animated.View entering={FadeInDown.duration(360).delay(180)} style={styles.section}>
            <Text style={styles.sectionTitle}>Ce que Vendo voit</Text>
            <Text style={styles.sectionSub}>Analyse visuelle de l{"\u2019"}état.</Text>
            <View style={styles.conditionCard}>
              {item.condition_reasons.map((r, i) => (
                <View key={i} style={styles.conditionRow}>
                  <View style={[styles.condDot2, { backgroundColor: conditionColor(item.condition) }]} />
                  <Text style={styles.conditionTxt}>{r}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Photo coach */}
        {item.photo_coach.length > 0 && (
          <Animated.View entering={FadeInDown.duration(360).delay(200)} style={styles.section}>
            <Text style={styles.sectionTitle}>Coach photos IA</Text>
            <Text style={styles.sectionSub}>Ajoutez ces clichés pour augmenter votre Sell Score.</Text>
            <View style={{ gap: 8, marginTop: 12 }}>
              {item.photo_coach.map((tip, i) => (
                <Animated.View key={i} entering={FadeInDown.duration(280).delay(240 + i * 60)} style={styles.coachRow}>
                  <View style={styles.coachIcon}>
                    <Ionicons name="camera" size={14} color={theme.color.lime} />
                  </View>
                  <Text style={styles.coachTxt}>{tip}</Text>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Missing info */}
        {item.missing_info.length > 0 && (
          <Animated.View entering={FadeInDown.duration(360).delay(240)} style={styles.section}>
            <Text style={styles.sectionTitle}>Informations manquantes</Text>
            <View style={styles.missingCard}>
              {item.missing_info.map((m, i) => (
                <View key={i} style={styles.missingRow}>
                  <Ionicons name="alert-circle" size={16} color={theme.color.warning} />
                  <Text style={styles.missingTxt}>{m}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Sell plan */}
        <Animated.View entering={FadeInDown.duration(360).delay(280)} style={styles.section}>
          <Text style={styles.sectionTitle}>Plan de vente</Text>
          <Text style={styles.sectionSub}>Choisissez votre approche.</Text>
          <View style={styles.planPicker}>
            {(["quick", "balanced", "best"] as const).map(m => {
              const active = planMode === m;
              const labels: any = { quick: "Rapide", balanced: "Équilibré", best: "Meilleur prix" };
              return (
                <PressableScale
                  key={m}
                  testID={`plan-${m}`}
                  hapticStyle="selection"
                  onPress={() => pickPlan(m)}
                  style={[styles.planTab, active && styles.planTabActive]}
                >
                  <Text style={[styles.planTabTxt, active && { color: theme.color.onLime }]}>{labels[m]}</Text>
                </PressableScale>
              );
            })}
          </View>
          <View style={styles.planCard}>
            <PlanRow label="Prix de départ" value={formatEUR(item.sell_plan.start_price)} />
            <PlanRow label={`Ajustement après ${item.sell_plan.adjustment_days}j`} value={formatEUR(item.sell_plan.adjusted_price)} />
            <PlanRow label="Prix minimum" value={formatEUR(item.sell_plan.minimum_price)} muted />
            <PlanRow label="Date cible" value={new Date(item.sell_plan.target_date).toLocaleDateString("fr-FR")} muted />
          </View>
        </Animated.View>

        {/* Vendo Marketplace primary CTA */}
        <Animated.View entering={FadeInDown.duration(360).delay(290)} style={styles.section}>
          <View style={styles.vendoSellCard}>
            <View style={styles.vendoSellIcon}><Ionicons name="storefront" size={22} color={theme.color.onLime} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vendoSellTitle}>Sell on Vendo</Text>
              <Text style={styles.vendoSellSub}>Review this AI-prepared listing and publish it to the Vendo Marketplace.</Text>
            </View>
          </View>
          <PressableScale
            testID="sell-on-vendo-btn"
            hapticStyle="heavy"
            onPress={() => user ? router.push(`/sell/${item.id}`) : router.push('/auth')}
            style={styles.sellOnVendo}
          >
            <Ionicons name="flash" size={19} color={theme.color.onLime} />
            <Text style={styles.sellOnVendoTxt}>{item.status === "listed" ? "Manage Vendo listing" : "Sell on Vendo"}</Text>
          </PressableScale>
        </Animated.View>

        {/* Marketplace share — Phase 8 (compliant: prepare + copy + open) */}
        <Animated.View entering={FadeInDown.duration(360).delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>{t("detail.share")}</Text>
          <Text style={styles.sectionSub}>{t("detail.shareSubtitle")}</Text>
          <View style={{ marginTop: 12, gap: 8 }}>
            <PressableScale
              testID="copy-listing-btn"
              hapticStyle="medium"
              onPress={async () => {
                const ok = await copyListingToClipboard(item);
                if (ok) {
                  setCopiedToast(true);
                  setTimeout(() => setCopiedToast(false), 1400);
                }
              }}
              style={styles.copyRow}
            >
              <Ionicons name="copy-outline" size={18} color={theme.color.lime} />
              <Text style={styles.copyTxt}>{copiedToast ? t("detail.listingCopied") : t("detail.copyListing")}</Text>
              {copiedToast && <Ionicons name="checkmark-circle" size={16} color={theme.color.lime} />}
            </PressableScale>
          </View>
          <View style={styles.mpGrid}>
            {settings.marketplaces.map((mpId) => {
              const mp = MARKETPLACES[mpId];
              if (!mp) return null;
              return (
                <PressableScale
                  key={mpId}
                  testID={`mp-open-${mpId}`}
                  hapticStyle="medium"
                  onPress={async () => {
                    // Compliant flow: copy first, then open the marketplace's own form.
                    await copyListingToClipboard(item);
                    await openMarketplace(mp);
                    setCopiedToast(true);
                    setTimeout(() => setCopiedToast(false), 1400);
                  }}
                  style={styles.mpCard}
                >
                  <View style={styles.mpIcon}>
                    <Ionicons name="storefront-outline" size={18} color={theme.color.text} />
                  </View>
                  <Text style={styles.mpName} numberOfLines={1}>{mp.name}</Text>
                  <Ionicons name="open-outline" size={14} color={theme.color.textMuted} />
                </PressableScale>
              );
            })}
          </View>
          <PressableScale
            testID="native-share-btn"
            hapticStyle="selection"
            onPress={() => shareListingNative(item)}
            style={styles.nativeShare}
          >
            <Ionicons name="share-outline" size={18} color={theme.color.text} />
            <Text style={styles.nativeShareTxt}>{t("common.share")}</Text>
          </PressableScale>
        </Animated.View>

        {/* Publish CTA */}
        <Animated.View entering={FadeInDown.duration(360).delay(320)} style={{ paddingHorizontal: 24, marginTop: 20 }}>
          <PressableScale
            testID="publish-btn"
            hapticStyle="heavy"
            onPress={markReady}
            style={[styles.publish, item.status === "ready" && { backgroundColor: theme.color.success }]}
          >
            <Ionicons name={item.status === "ready" ? "checkmark-circle" : "rocket"} size={20} color={theme.color.onLime} />
            <Text style={styles.publishTxt}>
              {item.status === "ready" ? "Prêt à publier · Marquer brouillon" : "Marquer comme prêt à publier"}
            </Text>
          </PressableScale>
          <Text style={styles.statusHint}>Statut actuel : {statusLabel(item.status)}</Text>
        </Animated.View>
      </Animated.ScrollView>
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
  heroWrap: { height: HERO_H, position: "relative", overflow: "hidden" },
  heroImgWrap: { position: "absolute", left: 0, right: 0, top: 0, height: HERO_H },
  hero: { width: "100%", height: "100%" },
  heroTop: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 8,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(10,10,10,0.55)",
    borderWidth: 1, borderColor: theme.color.border,
    alignItems: "center", justifyContent: "center",
  },
  confidenceBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, height: 30, borderRadius: 999,
    backgroundColor: "rgba(212,255,63,0.18)",
    borderWidth: 1, borderColor: theme.color.lime,
  },
  confidenceTxt: { color: theme.color.lime, fontSize: 12, fontFamily: theme.font.textBold },
  heroBottom: { position: "absolute", bottom: 20, left: 24, right: 24, gap: 6 },
  brand: {
    color: theme.color.textMuted, fontSize: 11, letterSpacing: 2,
    fontFamily: theme.font.textBold,
  },
  title: {
    color: theme.color.text, fontSize: 32,
    fontFamily: theme.font.displayBold,
    letterSpacing: -0.8,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, height: 26 },
  pillTxt: { color: theme.color.text, fontSize: 12, fontFamily: theme.font.textSemi },
  pillGhost: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, height: 26, borderRadius: 999,
    backgroundColor: "rgba(10,10,10,0.55)", borderWidth: 1, borderColor: theme.color.border,
  },
  pillGhostTxt: { color: theme.color.textMuted, fontSize: 12, fontFamily: theme.font.textSemi },
  dot: { width: 6, height: 6, borderRadius: 3 },
  thumbsRow: {
    flexDirection: "row", gap: 8, paddingHorizontal: 24, marginTop: -20, marginBottom: 4,
  },
  thumb: {
    width: 56, height: 56, borderRadius: 12, overflow: "hidden",
    borderWidth: 2, borderColor: "transparent",
    backgroundColor: theme.color.surface,
  },
  thumbActive: { borderColor: theme.color.lime },
  thumbImg: { width: "100%", height: "100%" },
  section: { paddingHorizontal: 24, marginTop: 24 },
  sectionTitle: { color: theme.color.text, fontSize: 18, fontFamily: theme.font.displayBold, letterSpacing: -0.4 },
  sectionSub: { color: theme.color.textMuted, fontSize: 13, marginTop: 4, fontFamily: theme.font.text },
  scoreCard: {
    flexDirection: "row", gap: 18, padding: 18, borderRadius: 24,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border,
    alignItems: "center",
  },
  scoreTitle: { color: theme.color.text, fontSize: 16, fontFamily: theme.font.textBold },
  scoreDesc: { color: theme.color.textMuted, fontSize: 12, lineHeight: 17, fontFamily: theme.font.text },
  priceBig: {
    marginTop: 4, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.color.border,
  },
  priceLabel: {
    color: theme.color.textMuted, fontSize: 11, letterSpacing: 0.8,
    textTransform: "uppercase", fontFamily: theme.font.textBold,
  },
  priceValue: {
    color: theme.color.lime, fontSize: 22, fontFamily: theme.font.displayBold,
    letterSpacing: -0.5, marginTop: 2,
  },
  breakdownCard: {
    marginTop: 12, padding: 16, borderRadius: 20,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border, gap: 12,
  },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  breakdownLabel: { width: 90, color: theme.color.textMuted, fontSize: 12, fontFamily: theme.font.textSemi },
  breakdownBarWrap: { flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.color.surface2, overflow: "hidden" },
  breakdownBar: { height: "100%", borderRadius: 3 },
  breakdownVal: { color: theme.color.text, fontSize: 12, fontFamily: theme.font.textBold, width: 24, textAlign: "right" },
  stratCard: {
    height: 168, borderRadius: 24, padding: 20, overflow: "hidden",
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border,
    justifyContent: "space-between",
  },
  stratCardActive: { backgroundColor: theme.color.lime, borderColor: theme.color.lime },
  stratHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stratTag: {
    alignSelf: "flex-start", paddingHorizontal: 10, height: 22, borderRadius: 999,
    borderWidth: 1, borderColor: theme.color.border,
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center", justifyContent: "center",
  },
  stratTagTxt: { color: theme.color.textMuted, fontSize: 10, letterSpacing: 1.5, fontFamily: theme.font.textBold },
  stratLabel: { color: theme.color.text, fontSize: 18, fontFamily: theme.font.textBold, marginTop: 4 },
  stratPrice: { color: theme.color.text, fontSize: 32, fontFamily: theme.font.displayBold, letterSpacing: -0.8 },
  stratExpl: { color: theme.color.textMuted, fontSize: 12, lineHeight: 17, fontFamily: theme.font.text },
  checkMark: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: theme.color.onLime, alignItems: "center", justifyContent: "center",
  },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  smallBtn: {
    paddingHorizontal: 14, height: 32, borderRadius: 16,
    backgroundColor: theme.color.lime, alignItems: "center", justifyContent: "center",
  },
  smallBtnTxt: { color: theme.color.onLime, fontSize: 12, fontFamily: theme.font.textBold },
  listCard: {
    marginTop: 12, padding: 18, borderRadius: 20,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border,
  },
  fieldLabel: {
    color: theme.color.textMuted, fontSize: 11, letterSpacing: 1.4,
    textTransform: "uppercase", fontFamily: theme.font.textBold, marginTop: 12, marginBottom: 6,
  },
  fieldValue: { color: theme.color.text, fontSize: 14, lineHeight: 20, fontFamily: theme.font.text },
  input: {
    color: theme.color.text, fontSize: 14, lineHeight: 20,
    backgroundColor: theme.color.bg, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: theme.color.border,
    fontFamily: theme.font.text,
  },
  kwWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  kw: {
    paddingHorizontal: 10, height: 26, borderRadius: 999,
    backgroundColor: theme.color.surface2, alignItems: "center", justifyContent: "center",
  },
  kwTxt: { color: theme.color.textMuted, fontSize: 11, fontFamily: theme.font.textSemi },
  coachRow: {
    padding: 14, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border,
  },
  coachIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: theme.color.limeSoft, alignItems: "center", justifyContent: "center",
  },
  coachTxt: { flex: 1, color: theme.color.text, fontSize: 13, fontFamily: theme.font.text },
  missingCard: {
    marginTop: 12, padding: 14, borderRadius: 16,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border, gap: 10,
  },
  missingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  missingTxt: { color: theme.color.text, fontSize: 13, fontFamily: theme.font.text },
  conditionCard: {
    marginTop: 12, padding: 16, borderRadius: 20,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border, gap: 10,
  },
  conditionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  condDot2: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  conditionTxt: { flex: 1, color: theme.color.text, fontSize: 13, lineHeight: 19, fontFamily: theme.font.text },
  planPicker: {
    flexDirection: "row", gap: 6, marginTop: 12,
    padding: 4, backgroundColor: theme.color.surface, borderRadius: 14,
    borderWidth: 1, borderColor: theme.color.border,
  },
  planTab: { flex: 1, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  planTabActive: { backgroundColor: theme.color.lime },
  planTabTxt: { color: theme.color.textMuted, fontSize: 13, fontFamily: theme.font.textSemi },
  planCard: {
    marginTop: 12, padding: 18, borderRadius: 20,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border, gap: 12,
  },
  planRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planLabel: { color: theme.color.textMuted, fontSize: 13, fontFamily: theme.font.text },
  planValue: { color: theme.color.text, fontSize: 15, fontFamily: theme.font.textBold },
  publish: {
    height: 60, borderRadius: 18, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: theme.color.lime,
  },
  publishTxt: { color: theme.color.onLime, fontSize: 15, fontFamily: theme.font.textBold },
  statusHint: { color: theme.color.textMuted, fontSize: 12, textAlign: "center", marginTop: 10, fontFamily: theme.font.text },

  // Marketplace share section
  copyRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14,
    backgroundColor: theme.color.limeSoft,
    borderWidth: 1, borderColor: "rgba(212,255,63,0.35)",
  },
  copyTxt: { flex: 1, color: theme.color.lime, fontSize: 14, fontFamily: theme.font.textSemi },
  mpGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  mpCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, height: 52, borderRadius: 14,
    backgroundColor: theme.color.surface,
    borderWidth: 1, borderColor: theme.color.border,
    minWidth: "48%", flexGrow: 1,
  },
  mpIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: theme.color.surface2,
    alignItems: "center", justifyContent: "center",
  },
  mpName: { flex: 1, color: theme.color.text, fontSize: 14, fontFamily: theme.font.textSemi },
  nativeShare: {
    marginTop: 12, height: 46, borderRadius: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: theme.color.surface,
    borderWidth: 1, borderColor: theme.color.border,
  },
  nativeShareTxt: { color: theme.color.text, fontSize: 14, fontFamily: theme.font.textSemi },
  vendoSellCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 18, backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border },
  vendoSellIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.color.lime, alignItems: "center", justifyContent: "center" },
  vendoSellTitle: { color: theme.color.text, fontSize: 16, fontFamily: theme.font.textBold },
  vendoSellSub: { color: theme.color.textMuted, fontSize: 12, lineHeight: 17, fontFamily: theme.font.text, marginTop: 3 },
  sellOnVendo: { marginTop: 10, height: 58, borderRadius: 18, backgroundColor: theme.color.lime, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  sellOnVendoTxt: { color: theme.color.onLime, fontSize: 15, fontFamily: theme.font.textBold },
});
