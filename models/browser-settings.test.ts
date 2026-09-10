import { resetAsyncStorageMock } from "@/test/helpers/async-storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ExternalBrowser from "@/modules/external-browser/src/ExternalBrowserModule";
import { getCustomTabsSupportingBrowsersAsync, openBrowserAsync } from "expo-web-browser";
import { Linking, Platform } from "react-native";
import { getInstalledBrowsers, loadSelectedBrowser, openUrlWithBrowser, saveSelectedBrowser } from "./browser-settings";

jest.mock("@react-native-async-storage/async-storage");
jest.mock("@/modules/external-browser/src/ExternalBrowserModule", () => ({
  __esModule: true,
  default: { openUrl: jest.fn() },
}));
jest.mock("expo-web-browser", () => ({
  getCustomTabsSupportingBrowsersAsync: jest.fn(),
  openBrowserAsync: jest.fn(),
  WebBrowserPresentationStyle: { AUTOMATIC: "automatic" },
}));

const mockedGetCustomTabsSupportingBrowsersAsync = getCustomTabsSupportingBrowsersAsync as jest.Mock;
const mockedOpenUrl = ExternalBrowser!.openUrl as jest.Mock;

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
      // 既定では固有スキームは解決できない端末とみなす (Chrome しか無い端末を想定)
      jest.spyOn(Linking, "canOpenURL").mockResolvedValue(false);
      // 既定ではネイティブモジュールが使えないビルドとして扱い、フォールバック側を検証する
      mockedOpenUrl.mockResolvedValue(false);
      mockedGetCustomTabsSupportingBrowsersAsync.mockResolvedValue({
        defaultBrowserPackage: "com.android.chrome",
        preferredBrowserPackage: "com.android.chrome",
        // Android 12 以降の実機に合わせ、Web intent 側は既定ブラウザーしか返さない状況を再現する
        browserPackages: ["com.android.chrome"],
        servicePackages: ["com.android.chrome", "org.mozilla.firefox", "com.microsoft.emmx"],
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

    // パッケージを固定した intent が使えるなら、どのブラウザーでも通常タブで開ける
    it("ネイティブモジュールが使えるときはブラウザーアプリを直接開く", async () => {
      mockedOpenUrl.mockResolvedValue(true);

      await openUrlWithBrowser(URL, "chrome");

      expect(mockedOpenUrl).toHaveBeenCalledWith(URL, "com.android.chrome");
      expect(openBrowserAsync).not.toHaveBeenCalled();
      expect(Linking.openURL).not.toHaveBeenCalled();
    });

    it("inApp はネイティブモジュールが使えても Custom Tabs で開く", async () => {
      mockedOpenUrl.mockResolvedValue(true);

      await openUrlWithBrowser(URL, "inApp");

      expect(mockedOpenUrl).not.toHaveBeenCalled();
      expect(openBrowserAsync).toHaveBeenCalled();
    });

    // Edge は microsoft-edge-https:// で URL ごと渡せるので、Custom Tabs ではなく通常タブで開ける
    it("固有スキームが使えるブラウザーはそのスキームで開く", async () => {
      jest.spyOn(Linking, "canOpenURL").mockResolvedValue(true);

      await openUrlWithBrowser(URL, "edge");

      expect(Linking.openURL).toHaveBeenCalledWith("microsoft-edge-https://catalyst.natsuneko.com/status/123");
      expect(openBrowserAsync).not.toHaveBeenCalled();
    });

    it("固有スキームが解決できない端末では Custom Tabs にフォールバックする", async () => {
      await openUrlWithBrowser(URL, "edge");

      expect(Linking.openURL).not.toHaveBeenCalled();
      expect(openBrowserAsync).toHaveBeenCalledWith(
        URL,
        expect.objectContaining({ browserPackage: "com.microsoft.emmx" }),
      );
    });

    // Android の Chrome は googlechrome:// に URL を渡しても about:blank が開くだけなので使わない
    it("chrome はスキームを使わず常に Custom Tabs で開く", async () => {
      jest.spyOn(Linking, "canOpenURL").mockResolvedValue(true);

      await openUrlWithBrowser(URL, "chrome");

      expect(Linking.openURL).not.toHaveBeenCalled();
      expect(openBrowserAsync).toHaveBeenCalledWith(
        URL,
        expect.objectContaining({ browserPackage: "com.android.chrome" }),
      );
    });

    it("inApp はアプリと同じタスクで開く (最近使ったアプリに並べない)", async () => {
      await openUrlWithBrowser(URL, "inApp");

      expect(openBrowserAsync).toHaveBeenCalledWith(URL, expect.objectContaining({ showInRecents: false }));
    });

    // パッケージ未指定の Custom Tabs は暗黙 ACTION_VIEW になり App Link で自分自身に戻ってしまうので、
    // パッケージが判らないときはブラウザーに限定した intent を使う
    it("ブラウザーの列挙に失敗したらブラウザー限定の intent で開く", async () => {
      mockedGetCustomTabsSupportingBrowsersAsync.mockRejectedValue(new Error("unavailable"));
      mockedOpenUrl.mockResolvedValue(true);

      await openUrlWithBrowser(URL, "systemDefault");

      expect(mockedOpenUrl).toHaveBeenLastCalledWith(URL, null);
      expect(openBrowserAsync).not.toHaveBeenCalled();
    });

    it("ブラウザーの列挙に失敗し、ネイティブモジュールも使えなければ Custom Tabs に任せる", async () => {
      mockedGetCustomTabsSupportingBrowsersAsync.mockRejectedValue(new Error("unavailable"));

      await openUrlWithBrowser(URL, "systemDefault");

      expect(openBrowserAsync).toHaveBeenCalledWith(URL, expect.objectContaining({ browserPackage: undefined }));
    });

    it("getInstalledBrowsers はインストール済みのパッケージから選択肢を作る", async () => {
      const installed = await getInstalledBrowsers();

      expect(installed.map((b) => b.key)).toEqual(["systemDefault", "inApp", "chrome", "firefox", "edge"]);
    });

    it("Custom Tabs サービスしか返さないブラウザーのパッケージも使う", async () => {
      await openUrlWithBrowser(URL, "firefox");

      expect(openBrowserAsync).toHaveBeenCalledWith(
        URL,
        expect.objectContaining({ browserPackage: "org.mozilla.firefox" }),
      );
    });

    // Android 12 以降は Web intent の解決に既定ブラウザーしか返らないことがあり、
    // インストール済みでも Custom Tabs の一覧に出てこないブラウザーがある
    it("Custom Tabs の一覧に出ないブラウザーでも固有スキームが解決できれば選択肢に出す", async () => {
      mockedGetCustomTabsSupportingBrowsersAsync.mockResolvedValue({
        defaultBrowserPackage: "com.android.chrome",
        preferredBrowserPackage: "com.android.chrome",
        browserPackages: ["com.android.chrome"],
        servicePackages: ["com.android.chrome"],
      });
      jest
        .spyOn(Linking, "canOpenURL")
        .mockImplementation(async (url: string) => url.startsWith("microsoft-edge-https://"));

      const installed = await getInstalledBrowsers();

      expect(installed.map((b) => b.key)).toEqual(["systemDefault", "inApp", "chrome", "edge"]);
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
