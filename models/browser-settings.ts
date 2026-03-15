import AsyncStorage from "@react-native-async-storage/async-storage";
import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser";
import { Linking, Platform } from "react-native";

export type BrowserKey = "systemDefault" | "inApp" | "chrome" | "firefox" | "edge" | "brave" | "duckDuckGo";

export type BrowserDefinition = {
  key: BrowserKey;
  displayName: string;
  /** iOS URL scheme for canOpenURL check */
  iosScheme: string | null;
  /** Android URL scheme for canOpenURL check */
  androidScheme: string | null;
  /** Always available (no install check needed) */
  alwaysAvailable: boolean;
};

export const BROWSERS: BrowserDefinition[] = [
  {
    key: "systemDefault",
    displayName: "デフォルトブラウザー",
    iosScheme: null,
    androidScheme: null,
    alwaysAvailable: true,
  },
  {
    key: "inApp",
    displayName: "In-App ブラウザー",
    iosScheme: null,
    androidScheme: null,
    alwaysAvailable: true,
  },
  {
    key: "chrome",
    displayName: "Chrome",
    iosScheme: "googlechrome://",
    androidScheme: "googlechrome://",
    alwaysAvailable: false,
  },
  {
    key: "firefox",
    displayName: "Firefox",
    iosScheme: "firefox://",
    androidScheme: "firefox://",
    alwaysAvailable: false,
  },
  {
    key: "edge",
    displayName: "Microsoft Edge",
    iosScheme: "microsoft-edge-https://",
    androidScheme: "microsoft-edge-https://",
    alwaysAvailable: false,
  },
  {
    key: "brave",
    displayName: "Brave",
    iosScheme: "brave://",
    androidScheme: "brave://",
    alwaysAvailable: false,
  },
  {
    key: "duckDuckGo",
    displayName: "DuckDuckGo",
    iosScheme: "ddgQuickLink://",
    androidScheme: "ddgQuickLink://",
    alwaysAvailable: false,
  },
];

const STORAGE_KEY = "selected_browser";

export async function loadSelectedBrowser(): Promise<BrowserKey> {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  if (value && BROWSERS.some((b) => b.key === value)) {
    return value as BrowserKey;
  }
  return "systemDefault";
}

export async function saveSelectedBrowser(browser: BrowserKey): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, browser);
}

export async function getInstalledBrowsers(): Promise<BrowserDefinition[]> {
  const results = await Promise.all(
    BROWSERS.map(async (browser) => {
      if (browser.alwaysAvailable) return browser;

      const scheme = Platform.OS === "ios" ? browser.iosScheme : browser.androidScheme;
      if (!scheme) return null;

      try {
        const canOpen = await Linking.canOpenURL(scheme);
        return canOpen ? browser : null;
      } catch {
        return null;
      }
    }),
  );

  return results.filter((b): b is BrowserDefinition => b !== null);
}

/**
 * Open a URL using the user's selected browser.
 */
export async function openUrlWithBrowser(url: string, browserKey?: BrowserKey): Promise<void> {
  const selected = browserKey ?? (await loadSelectedBrowser());

  switch (selected) {
    case "inApp": {
      await openBrowserAsync(url, {
        presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
      });
      return;
    }
    case "chrome": {
      const scheme = url.startsWith("https://") ? "googlechromes://" : "googlechrome://";
      const withoutScheme = url.replace(/^https?:\/\//, "");
      await Linking.openURL(`${scheme}${withoutScheme}`);
      return;
    }
    case "firefox": {
      const encoded = encodeURIComponent(url);
      await Linking.openURL(`firefox://open-url?url=${encoded}`);
      return;
    }
    case "edge": {
      const withoutScheme = url.replace(/^https?:\/\//, "");
      await Linking.openURL(`microsoft-edge-https://${withoutScheme}`);
      return;
    }
    case "brave": {
      const encoded = encodeURIComponent(url);
      await Linking.openURL(`brave://open-url?url=${encoded}`);
      return;
    }
    case "duckDuckGo": {
      const withoutScheme = url.replace(/^https?:\/\//, "");
      await Linking.openURL(`ddgQuickLink://${withoutScheme}`);
      return;
    }
    case "systemDefault":
    default: {
      await Linking.openURL(url);
      return;
    }
  }
}
