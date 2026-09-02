import { getAppPathFromUrl } from "./app-links";

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

  it("壊れた URL は変更しない", () => {
    expect(getAppPathFromUrl("not a url")).toBe("not a url");
  });
});
