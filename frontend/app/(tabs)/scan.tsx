import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing, FadeIn, FadeInDown, FadeOut,
} from "react-native-reanimated";

import { theme, conditionColor } from "@/src/theme";
import { api, Item, AnalyzedItem } from "@/src/api";
import { CATALOG, pickRandom, computePriceStrategies, computeSellPlan, computeSellScore } from "@/src/catalog";
import { useSettings } from "@/src/i18n/SettingsContext";
import { dictionaries } from "@/src/i18n";
import { useAuth } from "@/src/auth";
import PressableScale from "@/src/components/PressableScale";
import SellScoreRing from "@/src/components/SellScoreRing";

type Phase = "idle" | "preview" | "analyzing" | "results" | "error";

export default function ScanScreen() {
  const router = useRouter();
  const { settings, t, formatMoney } = useSettings();
  const { user } = useAuth();
  const PROGRESS_STEPS = (dictionaries[settings.locale]?.scan?.steps || dictionaries.fr.scan.steps) as unknown as string[];
  const [phase, setPhase] = useState<Phase>("idle");
  const [photos, setPhotos] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string>("");
  const [previewItem, setPreviewItem] = useState<Item | null>(null);
  const createdIdRef = useRef<string | null>(null);

  // Scanline animation
  const scan = useSharedValue(0);
  useEffect(() => {
    if (phase === "analyzing") {
      scan.value = 0;
      scan.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true);
    }
  }, [phase, scan]);

  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scan.value * 260 - 130 }],
    opacity: 0.65 + scan.value * 0.35,
  }));

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(
      withTiming(1.04, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
    ), -1, true);
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const sampleEntryRef = useRef<any>(null);

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError(t("scan.permCamera"));
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.7, base64: true, allowsEditing: false,
    });
    if (!res.canceled && res.assets[0]) {
      const uri = res.assets[0].base64
        ? `data:image/jpeg;base64,${res.assets[0].base64}`
        : res.assets[0].uri;
      addPhoto(uri);
    }
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError(t("scan.permGallery")); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7, base64: true, allowsMultipleSelection: true, selectionLimit: 3,
    });
    if (!res.canceled) {
      const uris = res.assets.map(a => a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri);
      setPhotos(prev => [...prev, ...uris].slice(0, 3));
      setPhase("preview");
    }
  };

  const addPhoto = (uri: string) => {
    setPhotos(prev => {
      const next = [...prev, uri].slice(0, 3);
      return next;
    });
    setPhase("preview");
  };

  const useSampleImage = () => {
    // Local demo: bypasses real AI and produces a full sample item.
    // This is the ONLY place the mock catalog is still used deliberately.
    const entry = pickRandom(CATALOG);
    sampleEntryRef.current = entry;
    setPhotos([entry.fallbackPhoto]);
    setPhase("preview");
  };

  const buildAndCreateItem = async (entry: AnalyzedItem | any, isSample: boolean) => {
    const strategies = computePriceStrategies(entry.market_low, entry.market_high);
    const smart = strategies.find(s => s.key === "smart")!.price;
    const sellPlan = computeSellPlan("balanced", smart, entry.market_low);
    const scoreRes = computeSellScore({
      hasTitle: true,
      hasDescription: true,
      photos: photos.length,
      hasCondition: true,
      priceInRange: true,
    });

    let persistedPhotos = photos;
    if (!isSample && photos.some((p) => p.startsWith("data:image/"))) {
      try {
        const uploaded = await api.uploadPhotos(photos);
        if (uploaded.photos?.length) persistedPhotos = uploaded.photos;
      } catch {
        // Development fallback: keep base64 until Cloudinary is configured.
        // Public launch should configure CLOUDINARY_* env vars.
      }
    }

    const payload: any = {
      id: "",
      photo: persistedPhotos[0],
      photos: persistedPhotos,
      name: entry.name,
      brand: entry.brand,
      model: entry.model || null,
      category: entry.category,
      condition: entry.condition,
      condition_reasons: entry.condition_reasons || [],
      confidence: entry.confidence,
      missing_info: entry.missing_info || [],
      photo_coach: entry.photo_coach || [],
      market_low: entry.market_low,
      market_high: entry.market_high,
      strategies,
      selected_strategy: "smart",
      listing: {
        title: `${entry.brand} ${entry.name} — ${entry.condition}`,
        description: entry.description,
        category: entry.category,
        keywords: entry.keywords || [],
        condition: entry.condition,
        price: smart,
      },
      sell_score: scoreRes.total,
      sell_score_breakdown: scoreRes.breakdown,
      sell_plan: sellPlan,
      status: "draft",
      created_at: new Date().toISOString(),
    };

    return await api.create(payload);
  };

  // Detect whether a photo is a real base64 data-URI (needed for real AI)
  const hasBase64Photo = (arr: string[]) => arr.some(p => p.startsWith("data:image/"));

  const startAnalysis = async () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
    setPhase("analyzing");
    setError(null);
    setStepIdx(0);
    setProgress(0);
    createdIdRef.current = null;
    setPreviewItem(null);

    // Live progress: cycle through steps while the real call is in flight
    let cancelled = false;
    const totalSteps = PROGRESS_STEPS.length;
    let currentStep = 0;
    const stepTick = setInterval(() => {
      if (cancelled) return;
      currentStep = Math.min(currentStep + 1, totalSteps - 1);
      setStepIdx(currentStep);
      setProgress((currentStep + 1) / totalSteps * 0.85); // reserve 15% for save
    }, 900);

    const sampleMode = !hasBase64Photo(photos);

    if (!sampleMode && !user) {
      cancelled = true;
      clearInterval(stepTick);
      setPhase("preview");
      setError("Sign in to use Vendo AI and publish securely.");
      router.push("/auth");
      return;
    }

    try {
      let entry: AnalyzedItem | any;

      if (sampleMode) {
        // Demo image path: use catalog directly. Give a bit of "analyzing" time.
        await new Promise(r => setTimeout(r, 2600));
        // Reuse the entry picked when the sample photo was inserted so photo ↔ metadata match.
        entry = sampleEntryRef.current || pickRandom(CATALOG);
        sampleEntryRef.current = null;
      } else {
        // REAL AI. No silent fallback: any failure surfaces to the user.
        entry = await api.analyze(photos, settings.locale);
      }

      cancelled = true; clearInterval(stepTick);
      setStepIdx(totalSteps - 1);
      setProgress(0.95);

      const created = await buildAndCreateItem(entry, sampleMode);
      createdIdRef.current = created.id;
      setPreviewItem(created);
      setProgress(1);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      setPhase("results");
    } catch (e: any) {
      cancelled = true; clearInterval(stepTick);
      console.warn("Analyse échouée:", e);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      const msg = String(e?.message || "");
      if (msg.includes("400")) {
        setErrorTitle(t("scan.errorTitle.invalid"));
        setError(t("scan.errorBody.invalid"));
      } else if (msg.includes("502") || msg.includes("Vision")) {
        setErrorTitle(t("scan.errorTitle.unknown"));
        setError(t("scan.errorBody.unknown"));
      } else {
        setErrorTitle(t("scan.errorTitle.generic"));
        setError(t("scan.errorBody.generic"));
      }
      setPhase("error");
    }
  };

  const openResult = () => {
    if (createdIdRef.current) {
      const id = createdIdRef.current;
      router.push(`/item/${id}`);
      setTimeout(() => {
        setPhotos([]);
        setPhase("idle");
        setProgress(0);
        setPreviewItem(null);
      }, 400);
    }
  };

  const reset = () => {
    setPhotos([]);
    setPhase("idle");
    setProgress(0);
    setError(null);
    setPreviewItem(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <PressableScale
          testID="scan-close"
          hapticStyle="selection"
          onPress={() => {
            if (phase !== "idle") reset();
            else router.push("/(tabs)");
          }}
          style={styles.iconBtn}
        >
          <Ionicons name={phase === "idle" ? "close" : "arrow-back"} size={22} color={theme.color.text} />
        </PressableScale>
        <Text style={styles.headerTitle}>
          {phase === "idle" ? t("scan.header.idle")
            : phase === "preview" ? t("scan.header.preview")
            : phase === "analyzing" ? t("scan.header.analyzing")
            : phase === "error" ? t("scan.header.error")
            : t("scan.header.results")}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {phase === "idle" && (
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          <Animated.Text entering={FadeInDown.duration(360)} style={styles.h1}>{t("scan.title")}</Animated.Text>
          <Animated.Text entering={FadeInDown.duration(360).delay(60)} style={styles.subtle}>
            {t("scan.intro")}
          </Animated.Text>

          <Animated.View entering={FadeInDown.duration(420).delay(120)}>
            <Animated.View style={pulseStyle}>
              <PressableScale
                testID="scan-camera-btn"
                hapticStyle="heavy"
                accessibilityRole="button"
                accessibilityLabel={t("scan.camera")}
                onPress={pickFromCamera}
                style={styles.bigCta}
              >
                <LinearGradient
                  colors={[theme.color.lime, theme.color.limeDark]}
                  style={StyleSheet.absoluteFillObject as any}
                />
                <Ionicons name="camera" size={38} color={theme.color.onLime} />
                <Text style={styles.bigCtaTitle}>{t("scan.camera")}</Text>
                <Text style={styles.bigCtaSub}>{t("scan.cameraSub")}</Text>
              </PressableScale>
            </Animated.View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(360).delay(180)}>
            <PressableScale testID="scan-library-btn" hapticStyle="selection" onPress={pickFromLibrary} style={styles.altCta}>
              <Ionicons name="images" size={22} color={theme.color.text} />
              <Text style={styles.altCtaTxt}>{t("scan.library")}</Text>
            </PressableScale>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(360).delay(240)}>
            <PressableScale testID="scan-sample-btn" hapticStyle="selection" onPress={useSampleImage} style={[styles.altCta, { marginTop: 10 }]}>
              <Ionicons name="sparkles" size={22} color={theme.color.lime} />
              <Text style={styles.altCtaTxt}>{t("scan.sample")}</Text>
            </PressableScale>
          </Animated.View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Animated.View entering={FadeIn.duration(500).delay(300)} style={styles.tips}>
            <Text style={styles.tipsTitle}>{t("scan.tipsTitle")}</Text>
            <TipRow icon="sunny-outline" txt={t("scan.tipLight")} />
            <TipRow icon="crop-outline" txt={t("scan.tipFrame")} />
            <TipRow icon="eye-outline" txt={t("scan.tipDefects")} />
          </Animated.View>
        </ScrollView>
      )}

      {phase === "preview" && (
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 160 }}>
          <Animated.View entering={FadeIn.duration(320)} style={styles.previewGrid} testID="preview-grid">
            {photos.map((p, i) => (
              <Animated.View
                key={p + i}
                entering={FadeInDown.duration(280).delay(i * 50)}
                style={styles.previewCell}
              >
                <Image source={{ uri: p }} style={styles.previewImg} contentFit="cover" transition={220} />
                <PressableScale
                  testID={`remove-photo-${i}`}
                  hapticStyle="light"
                  onPress={() => {
                    setPhotos(prev => prev.filter((_, idx) => idx !== i));
                    if (photos.length === 1) reset();
                  }}
                  style={styles.removeBtn}
                >
                  <Ionicons name="close" size={16} color={theme.color.text} />
                </PressableScale>
              </Animated.View>
            ))}
            {photos.length < 3 && (
              <PressableScale
                testID="add-more-photo"
                hapticStyle="selection"
                onPress={pickFromLibrary}
                style={[styles.previewCell, styles.addCell]}
              >
                <Ionicons name="add" size={32} color={theme.color.textMuted} />
                <Text style={styles.addTxt}>{t("scan.add")}</Text>
              </PressableScale>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(360).delay(80)} style={{ marginTop: 24 }}>
            <Text style={styles.h2}>{t("scan.previewTitle")}</Text>
            <Text style={styles.subtle}>{t("scan.previewSub")}</Text>
          </Animated.View>

          <PressableScale
            testID="analyze-btn"
            hapticStyle="heavy"
            onPress={startAnalysis}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnTxt}>{t("scan.analyzeCta")}</Text>
            <Ionicons name="sparkles" size={18} color={theme.color.onLime} />
          </PressableScale>
        </ScrollView>
      )}

      {phase === "analyzing" && (
        <View style={styles.analyzeWrap}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.analyzeCard} testID="analyzing-view">
            <Image source={{ uri: photos[0] }} style={styles.analyzeImg} contentFit="cover" transition={280} />
            <View style={styles.scrimTop} />
            <Animated.View style={[styles.scanline, scanStyle]}>
              <LinearGradient
                colors={["transparent", theme.color.lime, "transparent"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
            <View style={styles.corner1} />
            <View style={styles.corner2} />
            <View style={styles.corner3} />
            <View style={styles.corner4} />
          </Animated.View>
          <View style={styles.analyzeInfo}>
            <Animated.Text
              key={`step-${stepIdx}`}
              entering={FadeInDown.duration(260)}
              exiting={FadeOut.duration(160)}
              style={styles.analyzeStep}
              testID="analyze-step-text"
            >
              {PROGRESS_STEPS[stepIdx]}
            </Animated.Text>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[styles.progressFill, { width: `${progress * 100}%` }]}
              />
              <View style={[styles.progressGlow, { left: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.analyzePct}>{Math.round(progress * 100)}%</Text>
          </View>
        </View>
      )}

      {phase === "error" && (
        <Animated.View entering={FadeIn.duration(320)} style={styles.errorWrap} testID="error-view">
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle" size={40} color={theme.color.error} />
          </View>
          <Text style={styles.h1}>{errorTitle}</Text>
          <Text style={[styles.subtle, { textAlign: "center" }]}>{error}</Text>
          <PressableScale
            testID="retry-btn"
            hapticStyle="medium"
            onPress={() => { setPhase("preview"); setError(null); }}
            style={styles.primaryBtn}
          >
            <Ionicons name="refresh" size={18} color={theme.color.onLime} />
            <Text style={styles.primaryBtnTxt}>{t("common.retry")}</Text>
          </PressableScale>
          <PressableScale
            testID="error-back-btn"
            hapticStyle="selection"
            onPress={reset}
            style={[styles.altCta, { marginTop: 12 }]}
          >
            <Text style={styles.altCtaTxt}>{t("scan.resetBtn")}</Text>
          </PressableScale>
        </Animated.View>
      )}

      {phase === "results" && previewItem && (
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeIn.duration(360)} style={styles.resultHero} testID="results-view">
            <Image source={{ uri: previewItem.photo }} style={styles.resultImg} contentFit="cover" transition={360} />
            <LinearGradient
              colors={["transparent", "rgba(10,10,10,0.9)", theme.color.bg]}
              locations={[0, 0.55, 1]}
              style={StyleSheet.absoluteFillObject as any}
            />
            <Animated.View entering={FadeIn.duration(320).delay(200)} style={styles.confidenceBadge}>
              <Ionicons name="sparkles" size={12} color={theme.color.lime} />
              <Text style={styles.confidenceTxt}>IA · {previewItem.confidence}%</Text>
            </Animated.View>
          </Animated.View>

          <View style={styles.resultBody}>
            <Animated.Text entering={FadeInDown.duration(360).delay(140)} style={styles.resultBrand}>
              {previewItem.brand?.toUpperCase()}
            </Animated.Text>
            <Animated.Text entering={FadeInDown.duration(360).delay(200)} style={styles.resultName} numberOfLines={2}>
              {previewItem.name}
            </Animated.Text>

            <Animated.View entering={FadeInDown.duration(360).delay(260)} style={styles.resultMetaRow}>
              <View style={[styles.pill, { borderColor: conditionColor(previewItem.condition) }]}>
                <View style={[styles.dot, { backgroundColor: conditionColor(previewItem.condition) }]} />
                <Text style={styles.pillTxt}>{previewItem.condition}</Text>
              </View>
              <View style={styles.pillGhost}>
                <Ionicons name="pricetag-outline" size={12} color={theme.color.textMuted} />
                <Text style={styles.pillGhostTxt}>{previewItem.category}</Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(400).delay(340)} style={styles.resultCard}>
              <View style={{ alignItems: "center" }}>
                <SellScoreRing score={previewItem.sell_score} size={110} delay={500} />
              </View>
              <View style={styles.resultPriceBlock}>
                <Text style={styles.resultPriceLabel}>{t("detail.recommendedPrice")}</Text>
                <Text style={styles.resultPriceValue}>{formatMoney(previewItem.listing.price)}</Text>
                <Text style={styles.resultRange}>
                  {t("detail.marketRange", { low: formatMoney(previewItem.market_low), high: formatMoney(previewItem.market_high) })}
                </Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(360).delay(420)}>
              <PressableScale
                testID="open-result-btn"
                hapticStyle="medium"
                onPress={openResult}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnTxt}>{t("common.seeDetail")}</Text>
                <Ionicons name="arrow-forward" size={18} color={theme.color.onLime} />
              </PressableScale>
              <PressableScale
                testID="scan-again-btn"
                hapticStyle="selection"
                onPress={reset}
                style={[styles.altCta, { marginTop: 12 }]}
              >
                <Text style={styles.altCtaTxt}>{t("common.scanAnother")}</Text>
              </PressableScale>
            </Animated.View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function TipRow({ icon, txt }: { icon: any; txt: string }) {
  return (
    <View style={styles.tipRow}>
      <Ionicons name={icon} size={16} color={theme.color.lime} />
      <Text style={styles.tipTxt}>{txt}</Text>
    </View>
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
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: theme.color.border,
  },
  headerTitle: { color: theme.color.text, fontSize: 17, fontFamily: theme.font.textSemi },
  h1: { color: theme.color.text, fontSize: 32, fontFamily: theme.font.displayBold, letterSpacing: -1, marginBottom: 8 },
  h2: { color: theme.color.text, fontSize: 22, fontFamily: theme.font.displayBold, letterSpacing: -0.5, marginBottom: 6 },
  subtle: { color: theme.color.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 24, fontFamily: theme.font.text },
  bigCta: {
    height: 200, borderRadius: 28, overflow: "hidden",
    alignItems: "center", justifyContent: "center", gap: 8,
    marginBottom: 12,
  },
  bigCtaTitle: { color: theme.color.onLime, fontSize: 22, fontFamily: theme.font.displayBold, letterSpacing: -0.5, marginTop: 8 },
  bigCtaSub: { color: "rgba(10,10,10,0.7)", fontSize: 13, fontFamily: theme.font.text },
  altCta: {
    height: 60, borderRadius: 18,
    backgroundColor: theme.color.surface,
    borderWidth: 1, borderColor: theme.color.border,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  altCtaTxt: { color: theme.color.text, fontSize: 15, fontFamily: theme.font.textSemi },
  error: { color: theme.color.error, fontSize: 13, marginTop: 12, textAlign: "center", fontFamily: theme.font.text },
  tips: {
    marginTop: 32, padding: 20, borderRadius: 20,
    backgroundColor: theme.color.surface,
    borderWidth: 1, borderColor: theme.color.border,
  },
  tipsTitle: { color: theme.color.text, fontSize: 15, fontFamily: theme.font.textBold, marginBottom: 12 },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  tipTxt: { color: theme.color.textMuted, fontSize: 13, fontFamily: theme.font.text },
  previewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  previewCell: {
    width: "48%", aspectRatio: 1, borderRadius: 20, overflow: "hidden",
    backgroundColor: theme.color.surface, position: "relative",
  },
  previewImg: { width: "100%", height: "100%" },
  removeBtn: {
    position: "absolute", top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center", justifyContent: "center",
  },
  addCell: {
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderStyle: "dashed", borderColor: theme.color.border,
  },
  addTxt: { color: theme.color.textMuted, fontSize: 12, marginTop: 6, fontFamily: theme.font.text },
  primaryBtn: {
    marginTop: 24, marginHorizontal: 0, height: 60, borderRadius: 18,
    backgroundColor: theme.color.lime,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  primaryBtnTxt: { color: theme.color.onLime, fontSize: 16, fontFamily: theme.font.textBold },
  analyzeWrap: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  analyzeCard: {
    width: 280, height: 280, borderRadius: 28, overflow: "hidden",
    backgroundColor: theme.color.surface, position: "relative",
  },
  analyzeImg: { width: "100%", height: "100%" },
  scrimTop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,10,10,0.35)" },
  scanline: { position: "absolute", left: 0, right: 0, top: "50%", height: 30 },
  corner1: { position: "absolute", top: 12, left: 12, width: 24, height: 24, borderTopWidth: 3, borderLeftWidth: 3, borderColor: theme.color.lime, borderTopLeftRadius: 8 },
  corner2: { position: "absolute", top: 12, right: 12, width: 24, height: 24, borderTopWidth: 3, borderRightWidth: 3, borderColor: theme.color.lime, borderTopRightRadius: 8 },
  corner3: { position: "absolute", bottom: 12, left: 12, width: 24, height: 24, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: theme.color.lime, borderBottomLeftRadius: 8 },
  corner4: { position: "absolute", bottom: 12, right: 12, width: 24, height: 24, borderBottomWidth: 3, borderRightWidth: 3, borderColor: theme.color.lime, borderBottomRightRadius: 8 },
  analyzeInfo: { marginTop: 32, alignItems: "center", width: "100%", paddingHorizontal: 24, minHeight: 100 },
  analyzeStep: {
    color: theme.color.text, fontSize: 16, fontFamily: theme.font.textSemi,
    marginTop: 6, textAlign: "center", minHeight: 22,
  },
  progressTrack: {
    marginTop: 24, width: "100%", height: 4, borderRadius: 2,
    backgroundColor: theme.color.surface, overflow: "visible",
    position: "relative",
  },
  progressFill: { height: 4, backgroundColor: theme.color.lime, borderRadius: 2 },
  progressGlow: {
    position: "absolute", top: -3, width: 10, height: 10, borderRadius: 5,
    backgroundColor: theme.color.lime,
    boxShadow: "0px 0px 6px rgba(212,255,63,0.8)",
    marginLeft: -5,
  },
  analyzePct: {
    color: theme.color.textMuted, fontSize: 12, marginTop: 8, letterSpacing: 1.2,
    fontFamily: theme.font.displayMedium,
  },
  errorWrap: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  errorIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(248,113,113,0.15)",
    borderWidth: 1, borderColor: "rgba(248,113,113,0.35)",
    alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  resultHero: {
    height: 320, position: "relative",
  },
  resultImg: { width: "100%", height: "100%" },
  confidenceBadge: {
    position: "absolute", top: 16, right: 20,
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, height: 30, borderRadius: 999,
    backgroundColor: "rgba(212,255,63,0.18)",
    borderWidth: 1, borderColor: theme.color.lime,
  },
  confidenceTxt: { color: theme.color.lime, fontSize: 12, fontFamily: theme.font.textBold },
  resultBody: { paddingHorizontal: 24, marginTop: -60 },
  resultBrand: {
    color: theme.color.textMuted, fontSize: 12, letterSpacing: 2,
    fontFamily: theme.font.textBold,
  },
  resultName: {
    color: theme.color.text, fontSize: 32,
    fontFamily: theme.font.displayBold,
    letterSpacing: -0.8, marginTop: 4,
  },
  resultMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, height: 26 },
  pillTxt: { color: theme.color.text, fontSize: 12, fontFamily: theme.font.textSemi },
  pillGhost: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, height: 26, borderRadius: 999,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border,
  },
  pillGhostTxt: { color: theme.color.textMuted, fontSize: 12, fontFamily: theme.font.textSemi },
  dot: { width: 6, height: 6, borderRadius: 3 },
  resultCard: {
    marginTop: 20, padding: 20, borderRadius: 24,
    flexDirection: "row", gap: 20, alignItems: "center",
    backgroundColor: theme.color.surface,
    borderWidth: 1, borderColor: theme.color.border,
  },
  resultPriceBlock: { flex: 1 },
  resultPriceLabel: {
    color: theme.color.textMuted, fontSize: 11, letterSpacing: 1.2,
    textTransform: "uppercase", fontFamily: theme.font.textBold,
  },
  resultPriceValue: {
    color: theme.color.lime, fontSize: 32,
    fontFamily: theme.font.displayBold,
    letterSpacing: -1, marginTop: 4,
  },
  resultRange: {
    color: theme.color.textMuted, fontSize: 12, marginTop: 8,
    fontFamily: theme.font.text,
  },
});
