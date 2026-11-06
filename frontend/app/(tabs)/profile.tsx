import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Switch, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { theme } from "@/src/theme";
import { api } from "@/src/api";
import { storage } from "@/src/utils/storage";
import { useSettings, SUPPORTED_LOCALES } from "@/src/i18n/SettingsContext";
import PressableScale from "@/src/components/PressableScale";
import Skeleton from "@/src/components/Skeleton";
import AnimatedNumber from "@/src/components/AnimatedNumber";
import { useAuth } from "@/src/auth";

export default function ProfileScreen() {
  const router = useRouter();
  const { t, formatMoney, settings } = useSettings();
  const { user, signOut } = useAuth();
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
  const currentLocale = SUPPORTED_LOCALES.find(l => l.code === settings.locale);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(320)} style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{(user?.display_name || "V")[0]?.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.display_name || "Vendo guest"}</Text>
            <Text style={styles.sub}>{user ? user.email : "Sign in to publish on Marketplace"}</Text>
          </View>
          <PressableScale style={styles.settingsBtn} testID="profile-settings-btn" hapticStyle="selection" accessibilityLabel={t("profile.settingsBtn")}>
            <Ionicons name="settings-outline" size={20} color={theme.color.text} />
          </PressableScale>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(360).delay(60)} style={styles.statsWrap} testID="stats-grid">
          <View style={styles.statCellAccent} testID="stat-earned">
            <Text style={[styles.statLabel, { color: "rgba(10,10,10,0.7)" }]}>{t("profile.stats.earned")}</Text>
            {loading ? <Skeleton width={140} height={30} radius={8} style={{ marginTop: 8, backgroundColor: 'rgba(10,10,10,0.15)' }} /> : (
              <AnimatedNumber
                value={stats?.total_earned ?? 0}
                duration={900}
                format={(n) => formatMoney(n)}
                style={[styles.statValue, { color: theme.color.onLime }] as any}
              />
            )}
          </View>
          <View style={styles.statsRow}>
            <StatCell label={t("profile.stats.sold")} value={loading ? undefined : String(stats!.items_sold)} testID="stat-sold" />
            <View style={styles.statDivider} />
            <StatCell label={t("profile.stats.avg")} value={loading ? undefined : formatMoney(stats!.average_sale_price)} testID="stat-avg" />
          </View>
          <View style={styles.statsRow}>
            <StatCell label={t("profile.stats.total")} value={loading ? undefined : String(stats!.total_items)} testID="stat-total" />
            <View style={styles.statDivider} />
            <StatCell label={t("profile.stats.potential")} value={loading ? undefined : formatMoney(stats!.total_potential)} testID="stat-potential" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(360).delay(120)}>
          <Section title={t("profile.regionSection")}>
            <LinkRow
              icon="language-outline"
              label={t("profile.language")}
              value={`${currentLocale?.flag || ""} ${currentLocale?.label || ""}`}
              testID="region-language-link"
              onPress={() => router.push("/settings/region")}
            />
            <LinkRow
              icon="flag-outline"
              label={t("profile.country")}
              value={t(`countries.${settings.country}`)}
              testID="region-country-link"
              onPress={() => router.push("/settings/region")}
            />
            <LinkRow
              icon="cash-outline"
              label={t("profile.currency")}
              value={settings.currency}
              testID="region-currency-link"
              onPress={() => router.push("/settings/region")}
            />
          </Section>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(360).delay(140)}>
          <Section title={t("profile.preferences")}>
            <ToggleRow icon="notifications-outline" label={t("profile.notifs")} value={notifs} onChange={setNotifs} testID="pref-notifs" />
            <ToggleRow icon="trending-up-outline" label={t("profile.priceAlerts")} value={priceAlerts} onChange={setPriceAlerts} testID="pref-price" />
          </Section>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(360).delay(200)}>
          <Section title={t("profile.account")}>
            <LinkRow icon="person-outline" label={user ? "Account" : "Sign in / Create account"} value={user?.display_name} testID="acc-info" onPress={() => router.push("/auth")} />
            <LinkRow icon="chatbubble-ellipses-outline" label="Marketplace messages" testID="acc-inbox" onPress={() => router.push("/inbox")} />
            <LinkRow icon="heart-outline" label="Saved marketplace items" testID="acc-favorites" onPress={() => router.push("/favorites")} />
            <LinkRow icon="card-outline" label={t("profile.accPay")} testID="acc-pay" />
            <LinkRow icon="shield-checkmark-outline" label="Privacy Policy" testID="acc-priv" onPress={() => router.push("/legal/privacy")} />
            <LinkRow icon="document-text-outline" label="Terms of Use" testID="acc-terms" onPress={() => router.push("/legal/terms")} />
            <LinkRow icon="trash-outline" label="Account deletion" testID="acc-delete-info" onPress={() => router.push("/legal/delete-account")} />
          </Section>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(360).delay(260)}>
          <Section title={t("profile.support")}>
            <LinkRow icon="help-circle-outline" label={t("profile.supHelp")} testID="sup-help" />
            <LinkRow icon="chatbubble-ellipses-outline" label={t("profile.supContact")} testID="sup-contact" />
            <LinkRow icon="star-outline" label={t("profile.supRate")} testID="sup-rate" />
            <LinkRow
              icon="play-circle-outline"
              label={t("profile.replayOnboarding")}
              testID="sup-replay-onboarding"
              onPress={replayOnboarding}
            />
          </Section>
        </Animated.View>

        <PressableScale style={styles.logout} hapticStyle="medium" testID="logout-btn" accessibilityLabel={user ? "Sign out" : "Sign in"} onPress={async () => { if (user) await signOut(); else router.push("/auth"); }}>
          <Text style={styles.logoutTxt}>{user ? "Sign out" : "Sign in"}</Text>
        </PressableScale>


        {user && (
          <PressableScale style={styles.deleteAccount} hapticStyle="medium" testID="delete-account-btn" onPress={() => Alert.alert(
            "Delete Vendo account?",
            "This permanently removes your account, listings, favorites and marketplace messages.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: async () => { try { await api.deleteAccount(); await signOut(); } catch (e: any) { Alert.alert("Could not delete account", e?.message || "Try again"); } } },
            ],
          )}>
            <Text style={styles.deleteAccountTxt}>Delete account & data</Text>
          </PressableScale>
        )}
        <Text style={styles.version}>{t("profile.version")}</Text>
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

function LinkRow({ icon, label, value, testID, onPress }: any) {
  return (
    <PressableScale style={styles.row} hapticStyle="selection" testID={testID} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={18} color={theme.color.text} /></View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
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
  rowValue: { color: theme.color.textMuted, fontSize: 13, fontFamily: theme.font.text, maxWidth: 140 },
  logout: {
    marginHorizontal: 24, marginTop: 24, height: 54, borderRadius: 16,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border,
    alignItems: "center", justifyContent: "center",
  },
  logoutTxt: { color: theme.color.error, fontSize: 15, fontFamily: theme.font.textSemi },
  deleteAccount: { marginHorizontal: 24, marginTop: 12, height: 50, borderRadius: 16, borderWidth: 1, borderColor: "rgba(248,113,113,0.25)", alignItems: "center", justifyContent: "center" },
  deleteAccountTxt: { color: theme.color.error, fontSize: 13, fontFamily: theme.font.textSemi },
  version: {
    color: theme.color.textFaint, fontSize: 11, textAlign: "center", marginTop: 20,
    fontFamily: theme.font.text,
  },
});
