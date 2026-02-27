import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import "../globals.css";

import { useColorScheme } from "@/hooks/use-color-scheme";
import * as Sentry from "@sentry/react-native";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    async function prepare() {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // setIsLoaded(true);
      //await SplashScreen.hideAsync();
    }

    prepare();
  }, []);

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
});
