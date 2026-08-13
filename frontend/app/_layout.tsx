import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { LogBox, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useFonts } from "expo-font";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { theme } from "@/src/theme";
import { storage } from "@/src/utils/storage";
import { SettingsProvider } from "@/src/i18n/SettingsContext";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [iconsLoaded, iconsErr] = useIconFonts();
  const [textFontsLoaded, textFontsErr] = useFonts({
    "SpaceGrotesk-Medium": require("../assets/fonts/SpaceGrotesk-Medium.ttf"),
    "SpaceGrotesk-Bold": require("../assets/fonts/SpaceGrotesk-Bold.ttf"),
    "Inter-Regular": require("../assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("../assets/fonts/Inter-Medium.ttf"),
    "Inter-SemiBold": require("../assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Bold": require("../assets/fonts/Inter-Bold.ttf"),
  });

  const router = useRouter();
  const segments = useSegments();
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  const fontsReady = (iconsLoaded || iconsErr) && (textFontsLoaded || textFontsErr);
  const ready = fontsReady && onboardingChecked;

  // Check onboarding flag once fonts ready; redirect if first launch
  useEffect(() => {
    if (!fontsReady) return;
    let cancelled = false;
    (async () => {
      const done = await storage.getItem<boolean>("vendo.onboarding.done", false);
      if (cancelled) return;
      const inOnboarding = segments[0] === "onboarding";
      if (!done && !inOnboarding) {
        router.replace("/onboarding");
      }
      setOnboardingChecked(true);
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontsReady]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <SettingsProvider>
        <BottomSheetModalProvider>
          <View style={{ flex: 1, backgroundColor: theme.color.bg }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.color.bg },
                animation: "fade",
              }}
            >
              <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
              <Stack.Screen
                name="onboarding"
                options={{ animation: "fade", gestureEnabled: false }}
              />
              <Stack.Screen
                name="item/[id]"
                options={{ animation: "slide_from_right", animationDuration: 260 }}
              />
              <Stack.Screen
                name="settings/region"
                options={{ animation: "slide_from_right", animationDuration: 260, presentation: "modal" }}
              />
            </Stack>
          </View>
        </BottomSheetModalProvider>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}
