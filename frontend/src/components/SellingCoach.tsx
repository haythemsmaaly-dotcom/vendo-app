import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";
import { api, CoachInput, CoachTip } from "../api";
import { useSettings } from "../i18n/SettingsContext";
import PressableScale from "./PressableScale";

const ICONS: Record<CoachTip["type"], keyof typeof Ionicons.glyphMap> = {
  photo: "camera-outline",
  price: "pricetag-outline",
  description: "document-text-outline",
  title: "text-outline",
};

type Props = { input: Omit<CoachInput, "locale">; testID?: string };

// Optional AI tips. Loads once on mount, then only on "Refresh". Hides itself on failure.
export default function SellingCoach({ input, testID = "selling-coach" }: Props) {
  const { t, settings } = useSettings();
  const [tips, setTips] = useState<CoachTip[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(input);
  inputRef.current = input;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.coachTips({ ...inputRef.current, locale: settings.locale });
      setTips(res.tips || []);
    } catch {
      setTips([]);
    } finally {
      setLoading(false);
    }
  }, [settings.locale]);

  useEffect(() => { load(); }, [load]);

  if (!loading && tips.length === 0) return null;

  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.head}>
        <Ionicons name="bulb" size={18} color={theme.color.lime} />
        <Text style={styles.title}>{t("coach.title")}</Text>
      </View>
      {loading ? (
        <View style={styles.loadingRow} testID={`${testID}-loading`}>
          <ActivityIndicator color={theme.color.lime} />
          <Text style={styles.body}>{t("coach.loading")}</Text>
        </View>
      ) : (
        tips.map((tip, i) => (
          <View key={i} style={styles.tip} testID={`${testID}-tip-${i}`}>
            <View style={styles.iconBg}>
              <Ionicons name={ICONS[tip.type] || "sparkles-outline"} size={16} color={theme.color.lime} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.body}>{tip.body}</Text>
            </View>
          </View>
        ))
      )}
      <Text style={styles.disclaimer}>{t("coach.disclaimer")}</Text>
      <PressableScale testID={`${testID}-refresh`} hapticStyle="selection" onPress={load} disabled={loading} style={[styles.refresh, loading && { opacity: 0.5 }]}>
        <Ionicons name="refresh" size={16} color={theme.color.text} />
        <Text style={styles.refreshTxt}>{t("coach.refresh")}</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 20, padding: 18, borderRadius: 22,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  title: { color: theme.color.text, fontSize: 17, fontFamily: theme.font.displayBold, letterSpacing: -0.3 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  tip: { flexDirection: "row", gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.color.divider },
  iconBg: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.color.limeSoft, alignItems: "center", justifyContent: "center" },
  tipTitle: { color: theme.color.text, fontSize: 14, fontFamily: theme.font.textSemi },
  body: { color: theme.color.textMuted, fontSize: 13, lineHeight: 18, fontFamily: theme.font.text, marginTop: 2 },
  disclaimer: { color: theme.color.textFaint, fontSize: 11, fontFamily: theme.font.text, marginTop: 12 },
  refresh: {
    marginTop: 12, height: 44, borderRadius: 14, borderWidth: 1, borderColor: theme.color.border,
    backgroundColor: theme.color.bg2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  refreshTxt: { color: theme.color.text, fontSize: 14, fontFamily: theme.font.textSemi },
});
