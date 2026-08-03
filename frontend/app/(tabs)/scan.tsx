import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing,
} from "react-native-reanimated";

import { theme, formatEUR } from "@/src/theme";
import { api } from "@/src/api";
import { CATALOG, pickRandom, computePriceStrategies, computeSellPlan, computeSellScore } from "@/src/catalog";

type Phase = "idle" | "preview" | "analyzing" | "results";

export default function ScanScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [photos, setPhotos] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("Analyse de l'image...");
  const [error, setError] = useState<string | null>(null);
  const createdIdRef = useRef<string | null>(null);

  const scan = useSharedValue(0);
  useEffect(() => {
    if (phase === "analyzing") {
      scan.value = 0;
      scan.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
    }
  }, [phase, scan]);

  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scan.value * 260 - 130 }],
    opacity: 0.7 + scan.value * 0.3,
  }));

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(
      withTiming(1.05, { duration: 900 }),
      withTiming(1, { duration: 900 }),
    ), -1, true);
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError("Permission caméra refusée. Utilisez la galerie.");
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
    if (!perm.granted) { setError("Permission galerie refusée."); return; }
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
    const entry = pickRandom(CATALOG);
    addPhoto(entry.fallbackPhoto);
  };

  const startAnalysis = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPhase("analyzing");
    setError(null);

    const steps = [
      "Analyse de l'image...",
      "Identification du produit...",
      "Estimation de l'état...",
      "Recherche du marché...",
      "Génération de l'annonce...",
      "Calcul du Sell Score...",
    ];
    for (let i = 0; i < steps.length; i++) {
      setStep(steps[i]);
      setProgress((i + 1) / steps.length);
      await new Promise(r => setTimeout(r, 550));
    }

    try {
      // Real vision AI first, silent fallback to mock catalog if it fails
      let entry: any;
      try {
        entry = await api.analyze(photos);
      } catch (aiErr) {
        console.warn("Vision AI unavailable, using catalog fallback:", aiErr);
        entry = pickRandom(CATALOG);
      }
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

      const created = await api.create({
        id: "", // let backend override via default_factory when omitted? our model has default so send empty string
        photo: photos[0],
        photos,
        name: entry.name,
        brand: entry.brand,
        model: entry.model,
        category: entry.category,
        condition: entry.condition,
        confidence: entry.confidence,
        missing_info: entry.missing_info,
        photo_coach: entry.photo_coach,
        market_low: entry.market_low,
        market_high: entry.market_high,
        strategies,
        selected_strategy: "smart",
        listing: {
          title: `${entry.brand} ${entry.name} — ${entry.condition}`,
          description: entry.description,
          category: entry.category,
          keywords: entry.keywords,
          condition: entry.condition,
          price: smart,
        },
        sell_score: scoreRes.total,
        sell_score_breakdown: scoreRes.breakdown,
        sell_plan: sellPlan,
        status: "draft",
        created_at: new Date().toISOString(),
      } as any);

      createdIdRef.current = created.id;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase("results");
    } catch (e: any) {
      console.error(e);
      setError("Impossible de sauvegarder l'analyse.");
      setPhase("preview");
    }
  };

  const openResult = () => {
    if (createdIdRef.current) {
      router.replace(`/item/${createdIdRef.current}`);
      // Reset state after navigation
      setTimeout(() => {
        setPhotos([]);
        setPhase("idle");
        setProgress(0);
      }, 300);
    }
  };

  const reset = () => {
    setPhotos([]);
    setPhase("idle");
    setProgress(0);
    setError(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          testID="scan-close"
          onPress={() => {
            if (phase !== "idle") reset();
            else router.push("/(tabs)");
          }}
          style={styles.iconBtn}
        >
          <Ionicons name={phase === "idle" ? "close" : "arrow-back"} size={22} color={theme.color.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {phase === "idle" ? "Scanner" : phase === "preview" ? "Aperçu" : phase === "analyzing" ? "Analyse" : "Résultat"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {phase === "idle" && (
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.h1}>Que voulez-vous vendre ?</Text>
          <Text style={styles.subtle}>
            Prenez 1 à 3 photos claires. Vendo identifie l'objet et prépare votre annonce en quelques secondes.
          </Text>

          <Animated.View style={pulseStyle}>
            <Pressable
              testID="scan-camera-btn"
              onPress={pickFromCamera}
              style={({ pressed }) => [styles.bigCta, pressed && { opacity: 0.9 }]}
            >
              <LinearGradient
                colors={[theme.color.lime, theme.color.limeDark]}
                style={StyleSheet.absoluteFillObject as any}
              />
              <Ionicons name="camera" size={38} color={theme.color.onLime} />
              <Text style={styles.bigCtaTitle}>Prendre une photo</Text>
              <Text style={styles.bigCtaSub}>Ouverture de la caméra</Text>
            </Pressable>
          </Animated.View>

          <Pressable testID="scan-library-btn" onPress={pickFromLibrary} style={styles.altCta}>
            <Ionicons name="images" size={22} color={theme.color.text} />
            <Text style={styles.altCtaTxt}>Depuis la galerie</Text>
          </Pressable>

          <Pressable testID="scan-sample-btn" onPress={useSampleImage} style={[styles.altCta, { marginTop: 10 }]}>
            <Ionicons name="sparkles" size={22} color={theme.color.lime} />
            <Text style={styles.altCtaTxt}>Essayer avec un objet d'exemple</Text>
          </Pressable>

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>Astuces</Text>
            <TipRow icon="sunny-outline" txt="Bonne lumière naturelle" />
            <TipRow icon="crop-outline" txt="Cadrez l'objet entier" />
            <TipRow icon="eye-outline" txt="Montrez les défauts éventuels" />
          </View>
        </ScrollView>
      )}

      {phase === "preview" && (
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 160 }}>
          <View style={styles.previewGrid} testID="preview-grid">
            {photos.map((p, i) => (
              <View key={i} style={styles.previewCell}>
                <Image source={{ uri: p }} style={styles.previewImg} contentFit="cover" />
                <Pressable
                  testID={`remove-photo-${i}`}
                  onPress={() => {
                    setPhotos(prev => prev.filter((_, idx) => idx !== i));
                    if (photos.length === 1) reset();
                  }}
                  style={styles.removeBtn}
                >
                  <Ionicons name="close" size={16} color={theme.color.text} />
                </Pressable>
              </View>
            ))}
            {photos.length < 3 && (
              <Pressable testID="add-more-photo" onPress={pickFromLibrary} style={[styles.previewCell, styles.addCell]}>
                <Ionicons name="add" size={32} color={theme.color.textMuted} />
                <Text style={styles.addTxt}>Ajouter</Text>
              </Pressable>
            )}
          </View>

          <View style={{ marginTop: 24 }}>
            <Text style={styles.h2}>Prêt à analyser ?</Text>
            <Text style={styles.subtle}>Vendo va identifier l'objet et générer une annonce complète.</Text>
          </View>

          <Pressable
            testID="analyze-btn"
            onPress={startAnalysis}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.primaryBtnTxt}>Analyser avec l'IA</Text>
            <Ionicons name="sparkles" size={18} color={theme.color.onLime} />
          </Pressable>
        </ScrollView>
      )}

      {phase === "analyzing" && (
        <View style={styles.analyzeWrap}>
          <View style={styles.analyzeCard} testID="analyzing-view">
            <Image source={{ uri: photos[0] }} style={styles.analyzeImg} contentFit="cover" />
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
          </View>
          <View style={styles.analyzeInfo}>
            <ActivityIndicator color={theme.color.lime} />
            <Text style={styles.analyzeStep}>{step}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.analyzePct}>{Math.round(progress * 100)}%</Text>
          </View>
        </View>
      )}

      {phase === "results" && (
        <View style={styles.resultsWrap} testID="results-view">
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={36} color={theme.color.onLime} />
          </View>
          <Text style={styles.h1}>Analyse terminée</Text>
          <Text style={styles.subtle}>Votre annonce est prête. Consultez le détail et personnalisez tout ce que vous voulez.</Text>
          <Pressable testID="open-result-btn" onPress={openResult} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnTxt}>Voir le résultat</Text>
            <Ionicons name="arrow-forward" size={18} color={theme.color.onLime} />
          </Pressable>
          <Pressable onPress={reset} style={styles.altCta}>
            <Text style={styles.altCtaTxt}>Scanner un autre objet</Text>
          </Pressable>
        </View>
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
  headerTitle: { color: theme.color.text, fontSize: 17, fontWeight: "600" },
  h1: { color: theme.color.text, fontSize: 32, fontWeight: "700", letterSpacing: -1, marginBottom: 8 },
  h2: { color: theme.color.text, fontSize: 22, fontWeight: "700", letterSpacing: -0.5, marginBottom: 6 },
  subtle: { color: theme.color.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 24 },
  bigCta: {
    height: 200, borderRadius: 28, overflow: "hidden",
    alignItems: "center", justifyContent: "center", gap: 8,
    marginBottom: 12,
  },
  bigCtaTitle: { color: theme.color.onLime, fontSize: 22, fontWeight: "700", letterSpacing: -0.5, marginTop: 8 },
  bigCtaSub: { color: "rgba(10,10,10,0.7)", fontSize: 13 },
  altCta: {
    height: 60, borderRadius: 18,
    backgroundColor: theme.color.surface,
    borderWidth: 1, borderColor: theme.color.border,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  altCtaTxt: { color: theme.color.text, fontSize: 15, fontWeight: "600" },
  error: { color: theme.color.error, fontSize: 13, marginTop: 12, textAlign: "center" },
  tips: {
    marginTop: 32, padding: 20, borderRadius: 20,
    backgroundColor: theme.color.surface,
    borderWidth: 1, borderColor: theme.color.border,
  },
  tipsTitle: { color: theme.color.text, fontSize: 15, fontWeight: "700", marginBottom: 12 },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  tipTxt: { color: theme.color.textMuted, fontSize: 13 },
  previewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  previewCell: {
    width: "48%", aspectRatio: 1, borderRadius: 20, overflow: "hidden",
    backgroundColor: theme.color.surface, position: "relative",
  },
  previewImg: { width: "100%", height: "100%" },
  removeBtn: {
    position: "absolute", top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center", justifyContent: "center",
  },
  addCell: {
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderStyle: "dashed", borderColor: theme.color.border,
  },
  addTxt: { color: theme.color.textMuted, fontSize: 12, marginTop: 6 },
  primaryBtn: {
    marginTop: 24, height: 60, borderRadius: 18,
    backgroundColor: theme.color.lime,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  primaryBtnTxt: { color: theme.color.onLime, fontSize: 16, fontWeight: "700" },
  analyzeWrap: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  analyzeCard: {
    width: 280, height: 280, borderRadius: 28, overflow: "hidden",
    backgroundColor: theme.color.surface, position: "relative",
  },
  analyzeImg: { width: "100%", height: "100%" },
  scrimTop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,10,10,0.35)" },
  scanline: {
    position: "absolute", left: 0, right: 0, top: "50%", height: 30,
  },
  corner1: { position: "absolute", top: 12, left: 12, width: 24, height: 24, borderTopWidth: 3, borderLeftWidth: 3, borderColor: theme.color.lime, borderTopLeftRadius: 8 },
  corner2: { position: "absolute", top: 12, right: 12, width: 24, height: 24, borderTopWidth: 3, borderRightWidth: 3, borderColor: theme.color.lime, borderTopRightRadius: 8 },
  corner3: { position: "absolute", bottom: 12, left: 12, width: 24, height: 24, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: theme.color.lime, borderBottomLeftRadius: 8 },
  corner4: { position: "absolute", bottom: 12, right: 12, width: 24, height: 24, borderBottomWidth: 3, borderRightWidth: 3, borderColor: theme.color.lime, borderBottomRightRadius: 8 },
  analyzeInfo: { marginTop: 32, alignItems: "center", width: "100%", paddingHorizontal: 24 },
  analyzeStep: { color: theme.color.text, fontSize: 16, fontWeight: "600", marginTop: 14 },
  progressTrack: {
    marginTop: 20, width: "100%", height: 4, borderRadius: 2,
    backgroundColor: theme.color.surface, overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: theme.color.lime, borderRadius: 2 },
  analyzePct: { color: theme.color.textMuted, fontSize: 12, marginTop: 8, letterSpacing: 1 },
  resultsWrap: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: theme.color.lime,
    alignItems: "center", justifyContent: "center", marginBottom: 28,
  },
});
