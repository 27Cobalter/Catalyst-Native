import { isSelfHandledAppLink } from "@/lib/app-links";
import ExternalBrowser from "@/modules/external-browser/src/ExternalBrowserModule";
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
  servicePackages: string[];
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
    return { browserPackages: [], servicePackages: [] };
  }
}

/**
 * インストールされているブラウザーのパッケージ名。
 *
 * Android 12 以降、http/https の intent 解決には既定ブラウザーしか返らないことがあり、
 * `browserPackages` だけではインストール済みのブラウザーを取りこぼす (実機で Edge / Firefox が欠けた)。
 * Custom Tabs サービスの一覧 (`servicePackages`) はこの影響を受けないため、両方を使う。
 */
function getAndroidBrowserPackages(browsers: AndroidBrowsers): string[] {
  return [...new Set([...browsers.servicePackages, ...browsers.browserPackages])];
}

/**
 * そのブラウザー専用の URL スキームに変換する。対応するスキームが無ければ null。
 * iOS と、Android でスキームが実際に解決できる場合の両方で使う。
 */
function toBrowserSchemeUrl(browser: BrowserKey, url: string): string | null {
  const withoutScheme = url.replace(/^https?:\/\//, "");
  const encoded = encodeURIComponent(url);

  switch (browser) {
    case "chrome":
      return url.startsWith("https://") ? `googlechromes://${withoutScheme}` : `googlechrome://${withoutScheme}`;
    case "firefox":
      return `firefox://open-url?url=${encoded}`;
    case "edge":
      return `microsoft-edge-https://${withoutScheme}`;
    case "brave":
      return `brave://open-url?url=${encoded}`;
    case "duckDuckGo":
      return `ddgQuickLink://${withoutScheme}`;
    default:
      return null;
  }
}

/**
 * Android で「そのブラウザーの通常タブ」を開けるスキームを持ちうるブラウザー。
 *
 * Chrome を除外しているのは、Android の Chrome が受け付けるのは `googlechrome://` (末尾 s 無し) で、
 * かつそれに URL を渡しても about:blank が開くだけで目的のページに飛べないため。
 * 加えて Edge も `googlechrome://` を宣言しており、解決先が Chrome とは限らない。
 *
 * 実際に開けるかどうかは端末ごとに違うため、最終判定は canOpenURL に任せている。
 */
const ANDROID_SCHEME_BROWSERS: BrowserKey[] = ["edge", "firefox", "brave", "duckDuckGo"];

async function canOpenUrl(url: string): Promise<boolean> {
  try {
    return await Linking.canOpenURL(url);
  } catch {
    return false;
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
  const installed = getAndroidBrowserPackages(browsers);
  const definition = BROWSERS.find((browser) => browser.key === selected);
  const selectedPackage = definition?.androidPackages.find((pkg) => installed.includes(pkg));
  if (selectedPackage) {
    return selectedPackage;
  }

  // 選択されたブラウザーが見つからない場合と systemDefault / inApp のフォールバック
  return selected === "inApp"
    ? (browsers.preferredBrowserPackage ?? browsers.defaultBrowserPackage ?? installed[0])
    : (browsers.defaultBrowserPackage ?? browsers.preferredBrowserPackage ?? installed[0]);
}

/** パッケージを固定した ACTION_VIEW でブラウザーアプリを開く。起動できなければ false */
async function openInBrowserApp(url: string, browserPackage: string | undefined): Promise<boolean> {
  if (!ExternalBrowser || !browserPackage) {
    return false;
  }

  try {
    return await ExternalBrowser.openUrl(url, browserPackage);
  } catch {
    return false;
  }
}

/**
 * ブラウザーだけを解決対象にした ACTION_VIEW で開く。起動できなければ false。
 *
 * ブラウザーの列挙に失敗してパッケージが判らないときの手段。
 * パッケージを指定しないまま Custom Tabs を開くと暗黙の ACTION_VIEW になり、
 * 検証済み App Link を持つ Catalyst 自身に解決されてしまう (「ブラウザで開く」が無反応になる) ため、
 * ネイティブ側で intent の selector をブラウザーに限定してもらう。
 */
async function openInAnyBrowser(url: string): Promise<boolean> {
  if (!ExternalBrowser) {
    return false;
  }

  try {
    return await ExternalBrowser.openUrl(url, null);
  } catch {
    return false;
  }
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

  if (selected !== "inApp") {
    // パッケージを固定した intent なら、そのブラウザーの通常タブで開ける
    if (await openInBrowserApp(url, browserPackage)) {
      return;
    }

    // ネイティブモジュールを含まないビルド向けのフォールバック。
    // 固有スキームを持つブラウザー (Edge など) はスキーム経由でも通常タブで開ける
    if (ANDROID_SCHEME_BROWSERS.includes(selected)) {
      const schemeUrl = toBrowserSchemeUrl(selected, url);

      if (schemeUrl && (await canOpenUrl(schemeUrl))) {
        await Linking.openURL(schemeUrl);
        return;
      }
    }
  }

  // ブラウザーの列挙に失敗したときはパッケージが判らない。
  // そのまま Custom Tabs に渡すと暗黙の ACTION_VIEW になり App Link で自分自身に戻るため、
  // ブラウザーに限定した intent を先に試す
  if (!browserPackage && (await openInAnyBrowser(url))) {
    return;
  }

  // 最終フォールバック。パッケージを固定しないと App Link で自分自身に戻るため必ず指定する
  await openBrowserAsync(url, {
    browserPackage,
    // ブラウザーとして開く場合は、アプリとは別に最近使ったアプリへ並べる
    showInRecents: selected !== "inApp",
    presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
  });
}

export async function getInstalledBrowsers(): Promise<BrowserDefinition[]> {
  if (Platform.OS === "android") {
    // Android のブラウザーは iOS のようなカスタムスキームを持つとは限らないため、
    // まず Custom Tabs を扱えるパッケージが入っているかどうかで判定する。
    //
    // インストール判定には Custom Tabs サービスの一覧も使う (getAndroidBrowserPackages を参照)。
    // それでも拾えないブラウザーは、固有スキームが解決できるかどうかで判定する。
    const installed = getAndroidBrowserPackages(await getAndroidBrowsers());

    const results = await Promise.all(
      BROWSERS.map(async (browser) => {
        if (browser.alwaysAvailable) return browser;
        if (browser.androidPackages.some((pkg) => installed.includes(pkg))) return browser;

        const schemeUrl = ANDROID_SCHEME_BROWSERS.includes(browser.key)
          ? toBrowserSchemeUrl(browser.key, "https://example.com")
          : null;

        return schemeUrl && (await canOpenUrl(schemeUrl)) ? browser : null;
      }),
    );

    return results.filter((b): b is BrowserDefinition => b !== null);
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
    case "systemDefault": {
      await Linking.openURL(url);
      return;
    }
    default: {
      await Linking.openURL(toBrowserSchemeUrl(selected, url) ?? url);
      return;
    }
  }
}
