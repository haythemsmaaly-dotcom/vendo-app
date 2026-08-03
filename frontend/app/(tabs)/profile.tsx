import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { theme, formatEUR } from "@/src/theme";
import { api } from "@/src/api";

export default function ProfileScreen() {
  const [stats, setStats] = useState<{ total_items: number; items_sold: number; total_earned: number; average_sale_price: number; total_potential: number } | null>(null);
  const [notifs, setNotifs] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);

  const load = useCallback(async () => {
    try { setStats(await api.stats()); } catch (e) { console.warn(e); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>A</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Alex</Text>
            <Text style={styles.sub}>Vendeur depuis mai 2026</Text>
          </View>
          <Pressable style={styles.settingsBtn} testID="profile-settings-btn">
            <Ionicons name="settings-outline" size={20} color={theme.color.text} />
          </Pressable>
        </View>

        <View style={styles.statsWrap} testID="stats-grid">
          <StatCell label="Total gagné" value={formatEUR(stats?.total_earned ?? 0)} accent testID="stat-earned" />
          <View style={styles.statsRow}>
            <StatCell label="Objets vendus" value={String(stats?.items_sold ?? 0)} testID="stat-sold" />
            <View style={styles.statDivider} />
            <StatCell label="Prix moyen" value={formatEUR(stats?.average_sale_price ?? 0)} testID="stat-avg" />
          </View>
          <View style={styles.statsRow}>
            <StatCell label="En attente" value={String(stats?.total_items ?? 0)} testID="stat-total" />
            <View style={styles.statDivider} />
            <StatCell label="Potentiel" value={formatEUR(stats?.total_potential ?? 0)} testID="stat-potential" />
          </View>
        </View>

        <Section title="Préférences">
          <ToggleRow icon="notifications-outline" label="Notifications" value={notifs} onChange={setNotifs} testID="pref-notifs" />
          <ToggleRow icon="trending-up-outline" label="Alertes prix marché" value={priceAlerts} onChange={setPriceAlerts} testID="pref-price" />
        </Section>

        <Section title="Compte">
          <LinkRow icon="person-outline" label="Informations personnelles" testID="acc-info" />
          <LinkRow icon="card-outline" label="Méthodes de paiement" testID="acc-pay" />
          <LinkRow icon="shield-checkmark-outline" label="Confidentialité" testID="acc-priv" />
        </Section>

        <Section title="Support">
          <LinkRow icon="help-circle-outline" label="Centre d'aide" testID="sup-help" />
          <LinkRow icon="chatbubble-ellipses-outline" label="Nous contacter" testID="sup-contact" />
          <LinkRow icon="star-outline" label="Noter Vendo" testID="sup-rate" />
        </Section>

        <Pressable style={styles.logout} testID="logout-btn">
          <Text style={styles.logoutTxt}>Se déconnecter</Text>
        </Pressable>

        <Text style={styles.version}>Vendo · v1.0 · Beta</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCell({ label, value, accent, testID }: { label: string; value: string; accent?: boolean; testID?: string }) {
  return (
    <View style={[styles.statCell, accent && styles.statCellAccent]} testID={testID}>
      <Text style={[styles.statLabel, accent && { color: "rgba(10,10,10,0.7)" }]}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: theme.color.onLime }]}>{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function ToggleRow({ icon, label, value, onChange, testID }: any) {
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={18} color={theme.color.text} /></View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.color.lime, false: theme.color.surface2 }}
        thumbColor={value ? theme.color.onLime : theme.color.textMuted}
      />
    </View>
  );
}

function LinkRow({ icon, label, testID }: any) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]} testID={testID}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={18} color={theme.color.text} /></View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={theme.color.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  header: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: theme.color.lime,
    alignItems: "center", justifyContent: "center",
  },
  avatarTxt: { color: theme.color.onLime, fontSize: 22, fontWeight: "700" },
  name: { color: theme.color.text, fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  sub: { color: theme.color.textMuted, fontSize: 13, marginTop: 2 },
  settingsBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.color.surface,
    borderWidth: 1, borderColor: theme.color.border,
    alignItems: "center", justifyContent: "center",
  },
  statsWrap: { paddingHorizontal: 24, gap: 12 },
  statsRow: { flexDirection: "row", backgroundColor: theme.color.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.color.border },
  statDivider: { width: 1, backgroundColor: theme.color.border },
  statCell: { flex: 1, padding: 20 },
  statCellAccent: { backgroundColor: theme.color.lime, borderRadius: 20 },
  statLabel: { color: theme.color.textMuted, fontSize: 12, letterSpacing: 0.4, fontWeight: "600", textTransform: "uppercase" },
  statValue: { color: theme.color.text, fontSize: 26, fontWeight: "700", letterSpacing: -0.5, marginTop: 6 },
  section: { marginTop: 28, paddingHorizontal: 24 },
  sectionTitle: {
    color: theme.color.textMuted, fontSize: 12, letterSpacing: 1.2, fontWeight: "700",
    textTransform: "uppercase", marginBottom: 10, paddingLeft: 4,
  },
  sectionBody: {
    backgroundColor: theme.color.surface, borderRadius: 20,
    borderWidth: 1, borderColor: theme.color.border, overflow: "hidden",
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.color.border,
  },
  rowIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: theme.color.surface2,
    alignItems: "center", justifyContent: "center",
  },
  rowLabel: { flex: 1, color: theme.color.text, fontSize: 15, fontWeight: "500" },
  logout: {
    marginHorizontal: 24, marginTop: 24, height: 54, borderRadius: 16,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border,
    alignItems: "center", justifyContent: "center",
  },
  logoutTxt: { color: theme.color.error, fontSize: 15, fontWeight: "600" },
  version: { color: theme.color.textFaint, fontSize: 11, textAlign: "center", marginTop: 20 },
});
