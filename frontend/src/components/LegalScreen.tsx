import React from "react";
import { ScrollView, Text, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "../theme";
import { LegalDoc } from "../legal";
import PressableScale from "./PressableScale";

export default function LegalScreen({ doc, header }: { doc: LegalDoc; header: string }) {
  const r = useRouter();
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.head}>
        <PressableScale testID="legal-back" onPress={() => (r.canGoBack() ? r.back() : r.replace("/(tabs)"))} style={s.circle}>
          <Ionicons name="arrow-back" size={20} color={theme.color.text} />
        </PressableScale>
        <Text style={s.headTxt}>{header}</Text>
        <View style={{ width: 42 }} />
      </View>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.title}>{doc.title}</Text>
        <Text style={s.meta}>{doc.intro}</Text>
        {doc.sections.map(([h, p]) => (
          <View key={h}>
            <Text style={s.h}>{h}</Text>
            <Text style={s.p}>{p}</Text>
          </View>
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
  body: { padding: 24, paddingBottom: 70 },
  title: { color: theme.color.text, fontFamily: theme.font.displayBold, fontSize: 30, letterSpacing: -0.8 },
  meta: { color: theme.color.textMuted, fontFamily: theme.font.text, fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 8 },
  h: { color: theme.color.lime, fontFamily: theme.font.textBold, fontSize: 16, marginTop: 20, marginBottom: 6 },
  p: { color: theme.color.textMuted, fontFamily: theme.font.text, fontSize: 14, lineHeight: 21 },
});
