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

const mockedGetCustomTabsSupportingBrowsersAsync = getCustomTabsSupportingBrowsersAsync as jest.Mock;

jest.spyOn(Linking, "openURL").mockResolvedValue(true);

const URL = "https://catalyst.natsuneko.com/status/123";

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

describe("openUrlWithBrowser", () => {
  beforeEach(() => {
    resetAsyncStorageMock();
    jest.clearAllMocks();
    jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  });

  it("systemDefault は Linking.openURL をそのまま呼ぶ", async () => {
    await openUrlWithBrowser(URL, "systemDefault");

    expect(Linking.openURL).toHaveBeenCalledWith(URL);
  });

  describe("Android", () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, "OS", "android");
      mockedGetCustomTabsSupportingBrowsersAsync.mockResolvedValue({
        defaultBrowserPackage: "com.android.chrome",
        preferredBrowserPackage: "com.android.chrome",
        browserPackages: ["com.android.chrome", "org.mozilla.firefox"],
        servicePackages: ["com.android.chrome"],
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    // パッケージを指定しないと Custom Tabs の intent が暗黙 ACTION_VIEW のままになり、
    // 検証済み App Link を持つ Catalyst 自身に解決されてしまう
    it.each(["systemDefault", "inApp", "chrome"] as const)(
      "%s は必ずブラウザーのパッケージを指定して開く",
      async (browser) => {
        await openUrlWithBrowser(URL, browser);

        expect(Linking.openURL).not.toHaveBeenCalled();
        expect(openBrowserAsync).toHaveBeenCalledWith(
          URL,
          expect.objectContaining({ browserPackage: expect.any(String) }),
        );
      },
    );

    it("systemDefault は自アプリが引き受けない URL を Linking.openURL に任せる", async () => {
      const external = "https://example.com/status/123";

      await openUrlWithBrowser(external, "systemDefault");

      expect(Linking.openURL).toHaveBeenCalledWith(external);
      expect(openBrowserAsync).not.toHaveBeenCalled();
    });

    it("明示的に選択されたブラウザーのパッケージを使う", async () => {
      await openUrlWithBrowser(URL, "firefox");

      expect(openBrowserAsync).toHaveBeenCalledWith(
        URL,
        expect.objectContaining({ browserPackage: "org.mozilla.firefox" }),
      );
    });

    it("選択されたブラウザーが未インストールなら既定ブラウザーにフォールバックする", async () => {
      await openUrlWithBrowser(URL, "brave");

      expect(openBrowserAsync).toHaveBeenCalledWith(
        URL,
        expect.objectContaining({ browserPackage: "com.android.chrome" }),
      );
    });

    it("inApp はアプリと同じタスクで開く (最近使ったアプリに並べない)", async () => {
      await openUrlWithBrowser(URL, "inApp");

      expect(openBrowserAsync).toHaveBeenCalledWith(URL, expect.objectContaining({ showInRecents: false }));
    });

    it("ブラウザーの列挙に失敗しても落ちない", async () => {
      mockedGetCustomTabsSupportingBrowsersAsync.mockRejectedValue(new Error("unavailable"));

      await openUrlWithBrowser(URL, "systemDefault");

      expect(openBrowserAsync).toHaveBeenCalledWith(URL, expect.objectContaining({ browserPackage: undefined }));
    });

    it("getInstalledBrowsers はインストール済みのパッケージから選択肢を作る", async () => {
      const installed = await getInstalledBrowsers();

      expect(installed.map((b) => b.key)).toEqual(["systemDefault", "inApp", "chrome", "firefox"]);
      expect(Linking.canOpenURL).not.toHaveBeenCalled();
    });
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

    expect(Linking.openURL).toHaveBeenCalledWith(
      `firefox://open-url?url=${encodeURIComponent(URL)}`,
    );
  });

  it("edge はスキームを除去して microsoft-edge-https:// を付与する", async () => {
    await openUrlWithBrowser(URL, "edge");

    expect(Linking.openURL).toHaveBeenCalledWith(
      "microsoft-edge-https://catalyst.natsuneko.com/status/123",
    );
  });

  it("brave は URL 全体を encode する", async () => {
    await openUrlWithBrowser(URL, "brave");

    expect(Linking.openURL).toHaveBeenCalledWith(`brave://open-url?url=${encodeURIComponent(URL)}`);
  });

  it("duckDuckGo はスキームを除去してカスタムスキームを付与する", async () => {
    await openUrlWithBrowser(URL, "duckDuckGo");

    expect(Linking.openURL).toHaveBeenCalledWith(
      "ddgQuickLink://catalyst.natsuneko.com/status/123",
    );
  });

  it("browserKey 省略時は保存済みの選択ブラウザーを使う", async () => {
    await saveSelectedBrowser("inApp");

    await openUrlWithBrowser(URL);

    expect(openBrowserAsync).toHaveBeenCalled();
  });
});
