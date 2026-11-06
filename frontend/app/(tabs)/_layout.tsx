import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { theme } from "@/src/theme";
import { useSettings } from "@/src/i18n/SettingsContext";

function TabIcon({ name, color, focused }: { name: any; color: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useSettings();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: theme.color.lime,
        tabBarInactiveTintColor: theme.color.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: { paddingTop: 6 },
        tabBarButton: (props) => (
          <Pressable
            {...(props as any)}
            android_ripple={null}
            onPress={(e) => {
              Haptics.selectionAsync();
              props.onPress?.(e as any);
            }}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "home" : "home-outline"} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scanner",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.scanCta, focused && styles.scanCtaActive]} testID="scan-tab-cta">
              <Ionicons name="scan" size={26} color={theme.color.onLime} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: "Marketplace",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "storefront" : "storefront-outline"} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="items"
        options={{
          title: "Mes objets",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "grid" : "grid-outline"} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t("wallet.tab"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "wallet" : "wallet-outline"} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "person" : "person-outline"} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.color.bg2,
    borderTopColor: theme.color.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 84,
    paddingBottom: 20,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: theme.font.textSemi,
    letterSpacing: 0.2,
  },
  iconWrap: {
    width: 40, height: 32,
    alignItems: "center", justifyContent: "center",
    borderRadius: 12,
  },
  iconWrapActive: {
    backgroundColor: theme.color.limeSoft,
  },
  scanCta: {
    width: 54, height: 54,
    borderRadius: 27,
    backgroundColor: theme.color.lime,
    alignItems: "center", justifyContent: "center",
    marginTop: -18,
    boxShadow: "0px 4px 12px rgba(212,255,63,0.4)",
  },
  scanCtaActive: {
    backgroundColor: theme.color.limeDark,
  },
});
