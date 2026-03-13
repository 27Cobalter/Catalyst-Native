// polyfills
import "react-native-get-random-values";

// imports
import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { accountAtom } from "@/models/atoms/account";
import * as Credential from "@/models/credential";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import * as Sentry from "@sentry/react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useSetAtom } from "jotai";
import { useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import "react-native-reanimated";

// import "@/global.css";

Sentry.init({
  dsn: "https://6d7c270e3a7bb56c0a746319d7e885d5@o4504564074348544.ingest.us.sentry.io/4510957726793728",

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,
  integrations: [Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(drawer)",
};

export default Sentry.wrap(function RootLayout() {
  const colorScheme = useColorScheme();
  const [isLoaded, setIsLoaded] = useState(false);
  const setAccount = useSetAtom(accountAtom);

  useAsyncOneTimeEffect(async () => {
    try {
      const { credential, isLoggedIn } = await Credential.init();

      setAccount(isLoggedIn ? { user: Credential.currentUser()!, credential } : null);
    } finally {
      setIsLoaded(true);
      await SplashScreen.hideAsync();
    }
  });

  if (!isLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(drawer)" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="status/[id]" options={{ title: "投稿", headerBackTitle: "戻る" }} />
          <Stack.Screen name="user/[screenName]" options={{ headerShown: false }} />
          <Stack.Screen name="authorize" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ title: "設定とプライバシー", headerBackTitle: "戻る" }} />
          <Stack.Screen name="settings/account" options={{ title: "アカウント", headerBackTitle: "戻る" }} />
          <Stack.Screen name="settings/notifications" options={{ title: "通知", headerBackTitle: "戻る" }} />
          <Stack.Screen name="settings/display" options={{ title: "表示", headerBackTitle: "戻る" }} />
          <Stack.Screen
            name="settings/accessibility"
            options={{ title: "アクセシビリティ", headerBackTitle: "戻る" }}
          />
          <Stack.Screen name="settings/legal" options={{ title: "法的情報", headerBackTitle: "戻る" }} />
          <Stack.Screen
            name="settings/legal/licenses"
            options={{ title: "オープンソースソフトウェア", headerBackTitle: "戻る" }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
});
