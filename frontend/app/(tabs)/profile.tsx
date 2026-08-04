import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { theme, formatEUR } from "@/src/theme";
import { api } from "@/src/api";
import { storage } from "@/src/utils/storage";
import PressableScale from "@/src/components/PressableScale";
import Skeleton from "@/src/components/Skeleton";
import AnimatedNumber from "@/src/components/AnimatedNumber";

export default function ProfileScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<{ total_items: number; items_sold: number; total_earned: number; average_sale_price: number; total_potential: number } | null>(null);
  const [notifs, setNotifs] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);

  const load = useCallback(async () => {
    try { setStats(await api.stats()); } catch (e) { console.warn(e); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const replayOnboarding = useCallback(async () => {
    await storage.setItem("vendo.onboarding.done", false);
    router.replace("/onboarding");
  }, [router]);

  const loading = !stats;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(320)} style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>A</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Alex</Text>
            <Text style={styles.sub}>Vendeur depuis mai 2026</Text>
          </View>
          <PressableScale style={styles.settingsBtn} testID="profile-settings-btn" hapticStyle="selection">
            <Ionicons name="settings-outline" size={20} color={theme.color.text} />
          </PressableScale>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(360).delay(60)} style={styles.statsWrap} testID="stats-grid">
          <View style={styles.statCellAccent} testID="stat-earned">
            <Text style={[styles.statLabel, { color: "rgba(10,10,10,0.7)" }]}>Total gagné</Text>
            {loading ? <Skeleton width={140} height={30} radius={8} style={{ marginTop: 8, backgroundColor: 'rgba(10,10,10,0.15)' }} /> : (
              <AnimatedNumber
                value={stats?.total_earned ?? 0}
                duration={900}
                format={(n) => formatEUR(n)}
                style={[styles.statValue, { color: theme.color.onLime }] as any}
              />
            )}
          </View>
          <View style={styles.statsRow}>
            <StatCell label="Objets vendus" value={loading ? undefined : String(stats!.items_sold)} testID="stat-sold" />
            <View style={styles.statDivider} />
            <StatCell label="Prix moyen" value={loading ? undefined : formatEUR(stats!.average_sale_price)} testID="stat-avg" />
          </View>
          <View style={styles.statsRow}>
            <StatCell label="En attente" value={loading ? undefined : String(stats!.total_items)} testID="stat-total" />
            <View style={styles.statDivider} />
            <StatCell label="Potentiel" value={loading ? undefined : formatEUR(stats!.total_potential)} testID="stat-potential" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(360).delay(140)}>
          <Section title="Préférences">
            <ToggleRow icon="notifications-outline" label="Notifications" value={notifs} onChange={setNotifs} testID="pref-notifs" />
            <ToggleRow icon="trending-up-outline" label="Alertes prix marché" value={priceAlerts} onChange={setPriceAlerts} testID="pref-price" />
          </Section>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(360).delay(200)}>
          <Section title="Compte">
            <LinkRow icon="person-outline" label="Informations personnelles" testID="acc-info" />
            <LinkRow icon="card-outline" label="Méthodes de paiement" testID="acc-pay" />
            <LinkRow icon="shield-checkmark-outline" label="Confidentialité" testID="acc-priv" />
          </Section>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(360).delay(260)}>
          <Section title="Support">
            <LinkRow icon="help-circle-outline" label="Centre d'aide" testID="sup-help" />
            <LinkRow icon="chatbubble-ellipses-outline" label="Nous contacter" testID="sup-contact" />
            <LinkRow icon="star-outline" label="Noter Vendo" testID="sup-rate" />
            <LinkRow
              icon="play-circle-outline"
              label="Revoir le tutoriel"
              testID="sup-replay-onboarding"
              onPress={replayOnboarding}
            />
          </Section>
        </Animated.View>

        <PressableScale style={styles.logout} hapticStyle="medium" testID="logout-btn">
          <Text style={styles.logoutTxt}>Se déconnecter</Text>
        </PressableScale>

        <Text style={styles.version}>Vendo · v1.0 · Beta</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCell({ label, value, testID }: { label: string; value?: string; testID?: string }) {
  return (
    <View style={styles.statCell} testID={testID}>
      <Text style={styles.statLabel}>{label}</Text>
      {value === undefined ? (
        <Skeleton width={80} height={22} radius={6} style={{ marginTop: 8 }} />
      ) : (
        <Text style={styles.statValue}>{value}</Text>
      )}
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
        onValueChange={(v) => { onChange(v); }}
        trackColor={{ true: theme.color.lime, false: theme.color.surface2 }}
        thumbColor={value ? theme.color.onLime : theme.color.textMuted}
      />
    </View>
  );
}

function LinkRow({ icon, label, testID, onPress }: any) {
  return (
    <PressableScale style={styles.row} hapticStyle="selection" testID={testID} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={18} color={theme.color.text} /></View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={theme.color.textMuted} />
    </PressableScale>
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
  avatarTxt: { color: theme.color.onLime, fontSize: 22, fontFamily: theme.font.displayBold },
  name: { color: theme.color.text, fontSize: 22, fontFamily: theme.font.displayBold, letterSpacing: -0.5 },
  sub: { color: theme.color.textMuted, fontSize: 13, marginTop: 2, fontFamily: theme.font.text },
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
  statCellAccent: { backgroundColor: theme.color.lime, borderRadius: 20, padding: 20 },
  statLabel: {
    color: theme.color.textMuted, fontSize: 12, letterSpacing: 0.6,
    fontFamily: theme.font.textBold, textTransform: "uppercase",
  },
  statValue: {
    color: theme.color.text, fontSize: 26, fontFamily: theme.font.displayBold,
    letterSpacing: -0.6, marginTop: 6,
  },
  section: { marginTop: 28, paddingHorizontal: 24 },
  sectionTitle: {
    color: theme.color.textMuted, fontSize: 12, letterSpacing: 1.4, fontFamily: theme.font.textBold,
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
  rowLabel: { flex: 1, color: theme.color.text, fontSize: 15, fontFamily: theme.font.textMedium },
  logout: {
    marginHorizontal: 24, marginTop: 24, height: 54, borderRadius: 16,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border,
    alignItems: "center", justifyContent: "center",
  },
  logoutTxt: { color: theme.color.error, fontSize: 15, fontFamily: theme.font.textSemi },
  version: {
    color: theme.color.textFaint, fontSize: 11, textAlign: "center", marginTop: 20,
    fontFamily: theme.font.text,
  },
});
