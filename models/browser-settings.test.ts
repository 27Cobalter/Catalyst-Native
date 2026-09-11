import { resetAsyncStorageMock } from "@/test/helpers/async-storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCustomTabsSupportingBrowsersAsync, openBrowserAsync } from "expo-web-browser";
import { Linking, Platform } from "react-native";
import { getInstalledBrowsers, loadSelectedBrowser, openUrlWithBrowser, saveSelectedBrowser } from "./browser-settings";

jest.mock("@react-native-async-storage/async-storage");
jest.mock("expo-web-browser", () => ({
  getCustomTabsSupportingBrowsersAsync: jest.fn(),
  openBrowserAsync: jest.fn(),
  WebBrowserPresentationStyle: { AUTOMATIC: "automatic" },
}));

jest.spyOn(Linking, "openURL").mockResolvedValue(true);

const URL = "https://catalyst.natsuneko.com/status/123";
const EXTERNAL_URL = "https://docs.natsuneko.com/";

const setPlatform = (os: "ios" | "android") => {
  Object.defineProperty(Platform, "OS", { value: os, configurable: true });
};

const mockCustomTabs = (result: {
  browserPackages?: string[];
  servicePackages?: string[];
  defaultBrowserPackage?: string;
  preferredBrowserPackage?: string;
}) => {
  jest.mocked(getCustomTabsSupportingBrowsersAsync).mockResolvedValue({
    browserPackages: [],
    servicePackages: [],
    ...result,
  });
};

afterEach(() => {
  setPlatform("ios");
});

describe("browser settings storage", () => {
  beforeEach(() => {
    resetAsyncStorageMock();
  });

  it("未保存時のデフォルトは systemDefault", async () => {
    expect(await loadSelectedBrowser()).toBe("systemDefault");
  });

  it("保存/読込が往復する", async () => {
    await saveSelectedBrowser("chrome");
    expect(await loadSelectedBrowser()).toBe("chrome");
  });

  it("未知の値が保存されていた場合は systemDefault にフォールバックする", async () => {
    await AsyncStorage.setItem("selected_browser", "netscape-navigator");

    expect(await loadSelectedBrowser()).toBe("systemDefault");
  });
});

describe("openUrlWithBrowser (iOS)", () => {
  beforeEach(() => {
    resetAsyncStorageMock();
    jest.clearAllMocks();
    jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    setPlatform("ios");
  });

  it("systemDefault は Linking.openURL をそのまま呼ぶ", async () => {
    await openUrlWithBrowser(URL, "systemDefault");

    expect(Linking.openURL).toHaveBeenCalledWith(URL);
  });

  it("inApp は expo-web-browser の openBrowserAsync を使う", async () => {
    await openUrlWithBrowser(URL, "inApp");

    expect(openBrowserAsync).toHaveBeenCalledWith(URL, expect.objectContaining({ presentationStyle: "automatic" }));
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it("chrome は https スキームを googlechromes:// に変換する", async () => {
    await openUrlWithBrowser(URL, "chrome");

    expect(Linking.openURL).toHaveBeenCalledWith("googlechromes://catalyst.natsuneko.com/status/123");
  });

  it("chrome は http スキームを googlechrome:// に変換する", async () => {
    await openUrlWithBrowser("http://example.com/foo", "chrome");

    expect(Linking.openURL).toHaveBeenCalledWith("googlechrome://example.com/foo");
  });

  it("firefox は URL 全体を encode してカスタムスキームに渡す", async () => {
    await openUrlWithBrowser(URL, "firefox");

    expect(Linking.openURL).toHaveBeenCalledWith(`firefox://open-url?url=${encodeURIComponent(URL)}`);
  });

  it("edge はスキームを除去して microsoft-edge-https:// を付与する", async () => {
    await openUrlWithBrowser(URL, "edge");

    expect(Linking.openURL).toHaveBeenCalledWith("microsoft-edge-https://catalyst.natsuneko.com/status/123");
  });

  it("brave は URL 全体を encode する", async () => {
    await openUrlWithBrowser(URL, "brave");

    expect(Linking.openURL).toHaveBeenCalledWith(`brave://open-url?url=${encodeURIComponent(URL)}`);
  });

  it("duckDuckGo はスキームを除去してカスタムスキームを付与する", async () => {
    await openUrlWithBrowser(URL, "duckDuckGo");

    expect(Linking.openURL).toHaveBeenCalledWith("ddgQuickLink://catalyst.natsuneko.com/status/123");
  });

  it("browserKey 省略時は保存済みの選択ブラウザーを使う", async () => {
    await saveSelectedBrowser("inApp");

    await openUrlWithBrowser(URL);

    expect(openBrowserAsync).toHaveBeenCalled();
  });
});

describe("openUrlWithBrowser (Android)", () => {
  beforeEach(() => {
    resetAsyncStorageMock();
    jest.clearAllMocks();
    jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    setPlatform("android");
    mockCustomTabs({
      browserPackages: ["com.android.chrome"],
      servicePackages: ["com.android.chrome", "com.microsoft.emmx"],
      defaultBrowserPackage: "com.android.chrome",
      preferredBrowserPackage: "com.android.chrome",
    });
  });

  it("systemDefault + 外部 URL は従来どおり Linking.openURL で通常タブに渡す", async () => {
    await openUrlWithBrowser(EXTERNAL_URL, "systemDefault");

    expect(Linking.openURL).toHaveBeenCalledWith(EXTERNAL_URL);
    expect(openBrowserAsync).not.toHaveBeenCalled();
  });

  it("systemDefault + Catalyst の URL は既定ブラウザーをパッケージ指定して開く", async () => {
    await openUrlWithBrowser(URL, "systemDefault");

    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(openBrowserAsync).toHaveBeenCalledWith(
      URL,
      expect.objectContaining({ browserPackage: "com.android.chrome" }),
    );
  });

  it("inApp は preferredBrowserPackage を指定して App Link ループを避ける", async () => {
    mockCustomTabs({
      defaultBrowserPackage: "com.android.chrome",
      preferredBrowserPackage: "com.microsoft.emmx",
    });

    await openUrlWithBrowser(URL, "inApp");

    expect(openBrowserAsync).toHaveBeenCalledWith(
      URL,
      expect.objectContaining({ browserPackage: "com.microsoft.emmx" }),
    );
  });

  it("個別ブラウザーは iOS のスキームではなくパッケージ名で開く", async () => {
    await openUrlWithBrowser(URL, "edge");

    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(openBrowserAsync).toHaveBeenCalledWith(
      URL,
      expect.objectContaining({ browserPackage: "com.microsoft.emmx" }),
    );
  });

  it("外部 URL でも個別ブラウザー指定ならそのブラウザーで開く", async () => {
    await openUrlWithBrowser(EXTERNAL_URL, "chrome");

    expect(openBrowserAsync).toHaveBeenCalledWith(
      EXTERNAL_URL,
      expect.objectContaining({ browserPackage: "com.android.chrome" }),
    );
  });

  it("選択中のブラウザーが未インストールなら既定ブラウザーにフォールバックする", async () => {
    await openUrlWithBrowser(URL, "brave");

    expect(openBrowserAsync).toHaveBeenCalledWith(
      URL,
      expect.objectContaining({ browserPackage: "com.android.chrome" }),
    );
  });

  it("ブラウザーの列挙に失敗しても例外にしない", async () => {
    jest.mocked(getCustomTabsSupportingBrowsersAsync).mockRejectedValue(new Error("no activity"));

    await openUrlWithBrowser(URL, "systemDefault");

    expect(openBrowserAsync).toHaveBeenCalledWith(URL, expect.objectContaining({ browserPackage: undefined }));
  });
});

describe("getInstalledBrowsers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Android では Custom Tabs のパッケージ一覧からインストール済みを判定する", async () => {
    setPlatform("android");
    mockCustomTabs({
      browserPackages: ["com.android.chrome"],
      servicePackages: ["com.brave.browser"],
    });

    const browsers = await getInstalledBrowsers();

    expect(browsers.map((b) => b.key)).toEqual(["systemDefault", "inApp", "chrome", "brave"]);
  });

  it("iOS では canOpenURL でインストール済みを判定する", async () => {
    setPlatform("ios");
    jest.spyOn(Linking, "canOpenURL").mockImplementation(async (url) => url === "firefox://");

    const browsers = await getInstalledBrowsers();

    expect(browsers.map((b) => b.key)).toEqual(["systemDefault", "inApp", "firefox"]);
  });
});
