import React, { useCallback, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Dimensions, ScrollView, NativeScrollEvent, NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { theme } from "@/src/theme";
import { storage } from "@/src/utils/storage";
import PressableScale from "@/src/components/PressableScale";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    icon: "camera" as const,
    tag: "01",
    title: "Photographiez-le",
    body: "Prenez 1 à 3 photos de l'objet que vous voulez vendre. C'est tout ce qu'on demande.",
  },
  {
    icon: "sparkles" as const,
    tag: "02",
    title: "Vendo l'identifie",
    body: "Notre IA reconnaît le produit, la marque, le modèle et évalue son état à partir de vos photos.",
  },
  {
    icon: "trending-up" as const,
    tag: "03",
    title: "Connaissez sa valeur",
    body: "Comprenez le marché, choisissez votre prix et publiez une annonce prête à vendre.",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goTo = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
    setIdx(i);
    try { Haptics.selectionAsync(); } catch {}
  };

  const finish = useCallback(async () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    await storage.setItem("vendo.onboarding.done", true);
    router.replace("/(tabs)");
  }, [router]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== idx) setIdx(i);
  };

  const isLast = idx === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Top bar: skip */}
      <View style={styles.top}>
        <View style={styles.wordmark}>
          <View style={styles.wordDot} />
          <Text style={styles.wordTxt}>VENDO</Text>
        </View>
        <PressableScale
          testID="onboarding-skip"
          accessibilityRole="button"
          accessibilityLabel="Passer l'introduction"
          hapticStyle="selection"
          onPress={finish}
          hitSlop={8}
          style={styles.skipBtn}
        >
          <Text style={styles.skipTxt}>Passer</Text>
        </PressableScale>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <Animated.View
              key={`icon-${idx === i ? "active" : "idle"}-${i}`}
              entering={FadeIn.duration(320)}
              style={styles.artWrap}
            >
              <LinearGradient
                colors={["rgba(212,255,63,0.14)", "rgba(212,255,63,0.02)"]}
                style={styles.artGlow}
              />
              <View style={styles.artCircle}>
                <Ionicons name={s.icon} size={64} color={theme.color.lime} />
              </View>
              <View style={styles.artRing1} />
              <View style={styles.artRing2} />
            </Animated.View>

            <View style={styles.copy}>
              <Animated.Text
                entering={FadeInUp.duration(360).delay(80)}
                style={styles.tag}
              >
                {s.tag} · {SLIDES.length.toString().padStart(2, "0")}
              </Animated.Text>
              <Animated.Text
                entering={FadeInUp.duration(420).delay(140)}
                style={styles.title}
                accessibilityRole="header"
              >
                {s.title}
              </Animated.Text>
              <Animated.Text
                entering={FadeInUp.duration(420).delay(220)}
                style={styles.body}
              >
                {s.body}
              </Animated.Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots} testID="onboarding-dots">
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === idx && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <View style={styles.ctaWrap}>
        <Animated.View entering={FadeInDown.duration(320)} key={`cta-${idx}`}>
          <PressableScale
            testID={isLast ? "onboarding-start" : "onboarding-next"}
            hapticStyle="medium"
            accessibilityRole="button"
            accessibilityLabel={isLast ? "Commencer à scanner" : "Continuer"}
            onPress={() => (isLast ? finish() : goTo(idx + 1))}
            style={styles.cta}
          >
            <LinearGradient
              colors={[theme.color.lime, theme.color.limeDark]}
              style={StyleSheet.absoluteFillObject as any}
            />
            <Text style={styles.ctaTxt}>{isLast ? "Commencer à scanner" : "Continuer"}</Text>
            <Ionicons
              name={isLast ? "scan" : "arrow-forward"}
              size={20}
              color={theme.color.onLime}
            />
          </PressableScale>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  top: {
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  wordmark: { flexDirection: "row", alignItems: "center", gap: 8 },
  wordDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.color.lime },
  wordTxt: {
    color: theme.color.text, fontSize: 13, letterSpacing: 3,
    fontFamily: theme.font.displayBold,
  },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  skipTxt: { color: theme.color.textMuted, fontSize: 13, fontFamily: theme.font.textSemi },

  slide: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  artWrap: {
    width: 240, height: 240, alignItems: "center", justifyContent: "center",
    marginBottom: 48,
  },
  artGlow: {
    position: "absolute", width: 300, height: 300, borderRadius: 150,
  },
  artCircle: {
    width: 132, height: 132, borderRadius: 66,
    backgroundColor: theme.color.surface,
    borderWidth: 1, borderColor: theme.color.border,
    alignItems: "center", justifyContent: "center",
  },
  artRing1: {
    position: "absolute", width: 180, height: 180, borderRadius: 90,
    borderWidth: 1, borderColor: "rgba(212,255,63,0.18)",
  },
  artRing2: {
    position: "absolute", width: 224, height: 224, borderRadius: 112,
    borderWidth: 1, borderColor: "rgba(212,255,63,0.08)",
  },
  copy: { alignItems: "center", paddingHorizontal: 8 },
  tag: {
    color: theme.color.lime, fontSize: 12, letterSpacing: 2.4,
    fontFamily: theme.font.displayBold, marginBottom: 12,
  },
  title: {
    color: theme.color.text, fontSize: 34, letterSpacing: -1,
    fontFamily: theme.font.displayBold, textAlign: "center",
    marginBottom: 14,
  },
  body: {
    color: theme.color.textMuted, fontSize: 15, lineHeight: 22,
    fontFamily: theme.font.text, textAlign: "center",
    maxWidth: 320,
  },

  dots: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: theme.color.surface2,
  },
  dotActive: {
    width: 24, backgroundColor: theme.color.lime,
  },

  ctaWrap: { paddingHorizontal: 24, paddingBottom: 12 },
  cta: {
    height: 60, borderRadius: 18, overflow: "hidden",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  ctaTxt: {
    color: theme.color.onLime, fontSize: 16,
    fontFamily: theme.font.textBold,
  },
});
