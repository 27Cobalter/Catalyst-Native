import { openUrlWithBrowser } from "@/models/browser-settings";
import { router } from "expo-router";
import { openLink } from "./open-link";

jest.mock("@/models/browser-settings", () => ({
  openUrlWithBrowser: jest.fn(),
}));

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

describe("openLink", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ["https://catalyst.natsuneko.com/status/123", "/status/123"],
    ["https://catalyst.natsuneko.com/ja/@natsuneko", "/user/natsuneko"],
  ])("アプリが引き受ける %s はアプリ内で遷移する", async (url, expected) => {
    await openLink(url);

    expect(router.push).toHaveBeenCalledWith(expected);
    expect(openUrlWithBrowser).not.toHaveBeenCalled();
  });

  it.each([
    "https://example.com/status/123",
    // App Link に登録していない Catalyst のページはアプリ内に対応するルートがない
    "https://catalyst.natsuneko.com/terms",
    // App Link のプレフィックスには一致するが、アプリに画面が無い Web 専用ページ
    "https://catalyst.natsuneko.com/status/123/likes",
  ])("アプリが引き受けない %s はブラウザーで開く", async (url) => {
    await openLink(url);

    expect(openUrlWithBrowser).toHaveBeenCalledWith(url);
    expect(router.push).not.toHaveBeenCalled();
  });
});
