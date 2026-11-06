import React, { useState } from "react";
import { ScrollView, Text, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/src/theme";
import { dictionaries } from "@/src/i18n";
import { useSettings } from "@/src/i18n/SettingsContext";
import PressableScale from "@/src/components/PressableScale";

export default function HelpCenter() {
  const r = useRouter();
  const { t, settings } = useSettings();
  const items = (dictionaries[settings.locale] || dictionaries.fr).help.items;
  const [open, setOpen] = useState<number | null>(0);
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.head}>
        <PressableScale testID="help-back" onPress={() => (r.canGoBack() ? r.back() : r.replace("/(tabs)"))} style={s.circle}>
          <Ionicons name="arrow-back" size={20} color={theme.color.text} />
        </PressableScale>
        <Text style={s.headTxt}>{t("help.title")}</Text>
        <View style={{ width: 42 }} />
      </View>
      <ScrollView contentContainerStyle={s.body}>
        {items.map((it, i) => (
          <PressableScale key={i} testID={`help-item-${i}`} hapticStyle="selection" onPress={() => setOpen(open === i ? null : i)} style={s.card}>
            <View style={s.qRow}>
              <Text style={s.q}>{it.q}</Text>
              <Ionicons name={open === i ? "remove" : "add"} size={20} color={theme.color.lime} />
            </View>
            {open === i && <Text style={s.a}>{it.a}</Text>}
          </PressableScale>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  head: { height: 64, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  circle: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border, alignItems: "center", justifyContent: "center" },
  headTxt: { color: theme.color.text, fontFamily: theme.font.displayBold, fontSize: 19 },
  body: { padding: 20, paddingBottom: 70, gap: 10 },
  card: { padding: 16, borderRadius: 18, backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border },
  qRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 28 },
  q: { flex: 1, color: theme.color.text, fontFamily: theme.font.textSemi, fontSize: 15 },
  a: { color: theme.color.textMuted, fontFamily: theme.font.text, fontSize: 14, lineHeight: 21, marginTop: 10 },
});
