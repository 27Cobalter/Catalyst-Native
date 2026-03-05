// polyfills
import "react-native-get-random-values";

// imports
import { useColorScheme } from "@/hooks/use-color-scheme";
import { accountAtom } from "@/models/atoms/account";
import * as Credential from "@/models/credential";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import * as Sentry from "@sentry/react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useSetAtom } from "jotai";
import { useState } from "react";

import "react-native-reanimated";

import { useAsyncOneTimeEffect } from "@/hooks/useAsyncOneTimeEffect";
import "../globals.css";

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
  anchor: "(tabs)",
};

export default Sentry.wrap(function RootLayout() {
  const colorScheme = useColorScheme();
  const [isLoaded, setIsLoaded] = useState(false);
  const setAccount = useSetAtom(accountAtom);

  useAsyncOneTimeEffect(async () => {
    const { credential, isLoggedIn } = await Credential.init();

    setAccount(isLoggedIn ? { user: Credential.currentUser()!, credential } : null);
    setIsLoaded(true);
    await SplashScreen.hideAsync();
  });

  if (!isLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="authorize" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
});
