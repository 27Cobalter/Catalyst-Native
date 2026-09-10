import { isSelfHandledAppLink } from "@/lib/app-links";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCustomTabsSupportingBrowsersAsync, openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser";
import { Linking, Platform } from "react-native";

export type BrowserKey = "systemDefault" | "inApp" | "chrome" | "firefox" | "edge" | "brave" | "duckDuckGo";

export type BrowserDefinition = {
  key: BrowserKey;
  displayName: string;
  /** iOS URL scheme for canOpenURL check */
  iosScheme: string | null;
  /**
   * Android のパッケージ名。
   * Android のブラウザーは iOS のようなカスタムスキームを持たないため、
   * インストール判定にも Custom Tabs の起動先指定にもパッケージ名を使う。
   */
  androidPackages: string[];
  /** Always available (no install check needed) */
  alwaysAvailable: boolean;
};

export const BROWSERS: BrowserDefinition[] = [
  {
    key: "systemDefault",
    displayName: "デフォルトブラウザー",
    iosScheme: null,
    androidPackages: [],
    alwaysAvailable: true,
  },
  {
    key: "inApp",
    displayName: "In-App ブラウザー",
    iosScheme: null,
    androidPackages: [],
    alwaysAvailable: true,
  },
  {
    key: "chrome",
    displayName: "Chrome",
    iosScheme: "googlechrome://",
    androidPackages: ["com.android.chrome", "com.chrome.beta", "com.chrome.dev", "com.chrome.canary"],
    alwaysAvailable: false,
  },
  {
    key: "firefox",
    displayName: "Firefox",
    iosScheme: "firefox://",
    androidPackages: ["org.mozilla.firefox", "org.mozilla.fenix", "org.mozilla.firefox_beta"],
    alwaysAvailable: false,
  },
  {
    key: "edge",
    displayName: "Microsoft Edge",
    iosScheme: "microsoft-edge-https://",
    androidPackages: ["com.microsoft.emmx"],
    alwaysAvailable: false,
  },
  {
    key: "brave",
    displayName: "Brave",
    iosScheme: "brave://",
    androidPackages: ["com.brave.browser", "com.brave.browser_beta", "com.brave.browser_nightly"],
    alwaysAvailable: false,
  },
  {
    key: "duckDuckGo",
    displayName: "DuckDuckGo",
    iosScheme: "ddgQuickLink://",
    androidPackages: ["com.duckduckgo.mobile.android"],
    alwaysAvailable: false,
  },
];

const STORAGE_KEY = "selected_browser";

type AndroidBrowsers = {
  defaultBrowserPackage?: string;
  preferredBrowserPackage?: string;
  browserPackages: string[];
};

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

async function getAndroidBrowsers(): Promise<AndroidBrowsers> {
  try {
    return await getCustomTabsSupportingBrowsersAsync();
  } catch {
    // ブラウザーの列挙に失敗した場合は端末任せにフォールバックする
    return { browserPackages: [] };
  }
}

/**
 * Android で URL を渡すブラウザーのパッケージ名を決める。
 *
 * パッケージを指定しないと Custom Tabs の intent が暗黙の ACTION_VIEW のままになり、
 * App Link を持つ Catalyst 自身に解決されてしまう (ブラウザに到達しない) ため、
 * ここでは必ず具体的なパッケージを選ぼうとする。
 */
function resolveAndroidBrowserPackage(selected: BrowserKey, browsers: AndroidBrowsers): string | undefined {
  const definition = BROWSERS.find((browser) => browser.key === selected);
  const selectedPackage = definition?.androidPackages.find((pkg) => browsers.browserPackages.includes(pkg));
  if (selectedPackage) {
    return selectedPackage;
  }

  // 選択されたブラウザーが見つからない場合と systemDefault / inApp のフォールバック
  return selected === "inApp"
    ? (browsers.preferredBrowserPackage ?? browsers.defaultBrowserPackage ?? browsers.browserPackages[0])
    : (browsers.defaultBrowserPackage ?? browsers.preferredBrowserPackage ?? browsers.browserPackages[0]);
}

async function openUrlOnAndroid(url: string, selected: BrowserKey): Promise<void> {
  // Catalyst 自身が引き受けない URL は OS の解決に任せる。
  // YouTube のリンクを YouTube アプリで開くといった、他アプリのディープリンクを潰さないため。
  if (selected === "systemDefault" && !isSelfHandledAppLink(url)) {
    await Linking.openURL(url);
    return;
  }

  const browsers = await getAndroidBrowsers();
  const browserPackage = resolveAndroidBrowserPackage(selected, browsers);

  await openBrowserAsync(url, {
    browserPackage,
    // ブラウザーとして開く場合は、アプリとは別に最近使ったアプリへ並べる
    showInRecents: selected !== "inApp",
    presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
  });
}

export async function getInstalledBrowsers(): Promise<BrowserDefinition[]> {
  if (Platform.OS === "android") {
    // Android のブラウザーはカスタムスキームを持たないため、
    // Custom Tabs を扱えるパッケージが入っているかどうかで判定する
    const { browserPackages } = await getAndroidBrowsers();

    return BROWSERS.filter(
      (browser) => browser.alwaysAvailable || browser.androidPackages.some((pkg) => browserPackages.includes(pkg)),
    );
  }

  const results = await Promise.all(
    BROWSERS.map(async (browser) => {
      if (browser.alwaysAvailable) return browser;
      if (!browser.iosScheme) return null;

      try {
        const canOpen = await Linking.canOpenURL(browser.iosScheme);
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

  // Android のブラウザーは iOS のカスタムスキームを解釈しないため、Custom Tabs に一本化する
  if (Platform.OS === "android") {
    await openUrlOnAndroid(url, selected);
    return;
  }

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
