import { getAppPathFromUrl, getInAppPathFromUrl, isSelfHandledAppLink } from "./app-links";

describe("getAppPathFromUrl", () => {
  it.each([
    ["https://catalyst.natsuneko.com/status/123", "/status/123"],
    ["https://catalyst.natsuneko.com/ja/album/123", "/album/123"],
    ["https://catalyst.natsuneko.com/en/smart-album/123?from=share", "/smart-album/123?from=share"],
    ["https://catalyst.natsuneko.com/themes/weekly", "/theme/weekly"],
    ["https://catalyst.natsuneko.com/@natsuneko", "/user/natsuneko"],
  ])("Catalyst の公開 URL %s をアプリのルート %s に変換する", (url, expected) => {
    expect(getAppPathFromUrl(url)).toBe(expected);
  });

  it("カスタムスキームの認証 URL は変更しない", () => {
    const url = "com.natsuneko.catalyst://authorize?code=code";

    expect(getAppPathFromUrl(url)).toBe(url);
  });

  it("別ドメインの URL は変更しない", () => {
    const url = "https://example.com/status/123";

    expect(getAppPathFromUrl(url)).toBe(url);
  });

  it("App Link に登録していないパスの URL は変更しない", () => {
    const url = "https://catalyst.natsuneko.com/terms";

    expect(getAppPathFromUrl(url)).toBe(url);
  });

  it("壊れた URL は変更しない", () => {
    expect(getAppPathFromUrl("not a url")).toBe("not a url");
  });
});

describe("getInAppPathFromUrl", () => {
  it.each([
    ["https://catalyst.natsuneko.com/status/123", "/status/123"],
    ["https://catalyst.natsuneko.com/ja/@natsuneko", "/user/natsuneko"],
  ])("アプリが引き受ける URL %s はルート %s を返す", (url, expected) => {
    expect(getInAppPathFromUrl(url)).toBe(expected);
  });

  it.each([
    // intent filter に登録していないパスなので、アプリ内には遷移させない
    "https://catalyst.natsuneko.com/terms",
    "https://example.com/status/123",
    "com.natsuneko.catalyst://authorize?code=code",
    "not a url",
  ])("アプリが引き受けない %s は null を返す", (url) => {
    expect(getInAppPathFromUrl(url)).toBeNull();
  });
});

describe("isSelfHandledAppLink", () => {
  it("App Link として登録済みの URL は true", () => {
    expect(isSelfHandledAppLink("https://catalyst.natsuneko.com/status/123")).toBe(true);
  });

  it("登録していないパスは false", () => {
    expect(isSelfHandledAppLink("https://catalyst.natsuneko.com/terms")).toBe(false);
  });

  it("別ドメインは false", () => {
    expect(isSelfHandledAppLink("https://example.com/status/123")).toBe(false);
  });
});
