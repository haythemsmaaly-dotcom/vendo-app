import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { theme } from "../theme";
import PressableScale from "./PressableScale";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
  testID?: string;
};

export default function EmptyState({ icon = "sparkles-outline", title, subtitle, ctaLabel, onCta, testID }: Props) {
  return (
    <Animated.View
      entering={FadeInDown.duration(360)}
      style={styles.wrap}
      testID={testID}
    >
      <View style={styles.iconWrap}>
        <View style={styles.iconBg}>
          <Ionicons name={icon} size={30} color={theme.color.lime} />
        </View>
        <View style={styles.iconHalo} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      {ctaLabel && onCta ? (
        <PressableScale hapticStyle="medium" onPress={onCta} style={styles.cta}>
          <Text style={styles.ctaTxt}>{ctaLabel}</Text>
        </PressableScale>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 24, paddingVertical: 40, paddingHorizontal: 24,
    alignItems: "center",
    backgroundColor: theme.color.surface,
    borderRadius: 24,
    borderWidth: 1, borderColor: theme.color.border,
  },
  iconWrap: {
    width: 80, height: 80, alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  iconBg: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: theme.color.limeSoft,
    alignItems: "center", justifyContent: "center",
    zIndex: 2,
  },
  iconHalo: {
    position: "absolute",
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 1, borderColor: theme.color.limeSoft,
    opacity: 0.6,
  },
  title: {
    color: theme.color.text, fontSize: 18, fontFamily: theme.font.displayBold,
    letterSpacing: -0.4, textAlign: "center",
  },
  sub: {
    color: theme.color.textMuted, fontSize: 14, fontFamily: theme.font.text,
    lineHeight: 20, textAlign: "center", marginTop: 8,
  },
  cta: {
    marginTop: 20,
    paddingHorizontal: 22, height: 46, borderRadius: 14,
    backgroundColor: theme.color.lime,
    alignItems: "center", justifyContent: "center",
  },
  ctaTxt: { color: theme.color.onLime, fontFamily: theme.font.textBold, fontSize: 14 },
});
