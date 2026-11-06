import { resetSecureStoreMock } from "@/test/helpers/secure-store";
import type { EmojiCategory } from "@natsuneko-laboratory/react-native-emoji-verse";
import {
  type FrequencyItem,
  getRecentItems,
  recordUnicodeUsage,
  recordUrlUsage,
  toRecentEmojis,
} from "./frequency-manager";

jest.mock("expo-secure-store");

describe("emoji frequency manager", () => {
  beforeEach(() => {
    resetSecureStoreMock();
  });

  it("初期状態では空配列を返す", async () => {
    expect(await getRecentItems()).toEqual([]);
  });

  it("Unicode 絵文字の使用を記録すると先頭に追加される", async () => {
    await recordUnicodeUsage("😀");

    const items = await getRecentItems();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: "unicode", value: "😀", id: "😀" });
  });

  it("カスタム絵文字 (URL) の使用を id/url で記録する", async () => {
    await recordUrlUsage("custom-1", "https://example.com/e.png");

    const items = await getRecentItems();
    expect(items[0]).toMatchObject({
      type: "url",
      value: "https://example.com/e.png",
      id: "custom-1",
    });
  });

  it("同じ絵文字を再度使うと重複せず先頭に移動する", async () => {
    await recordUnicodeUsage("😀");
    await recordUnicodeUsage("😂");
    await recordUnicodeUsage("😀");

    const items = await getRecentItems();
    expect(items.map((i) => i.id)).toEqual(["😀", "😂"]);
  });

  it("最大件数 (30件) を超えたら古いものから切り捨てる", async () => {
    for (let i = 0; i < 35; i++) {
      await recordUnicodeUsage(`emoji-${i}`);
    }

    const items = await getRecentItems();
    expect(items).toHaveLength(30);
    // 直近に使ったものが先頭、最も古い5件 (emoji-0〜emoji-4) が切り捨てられている
    expect(items[0].id).toBe("emoji-34");
    expect(items.some((i) => i.id === "emoji-0")).toBe(false);
  });
});

describe("toRecentEmojis", () => {
  const history = (type: FrequencyItem["type"], id: string, value = id): FrequencyItem => ({
    type,
    id,
    value,
    timestamp: 0,
    count: 1,
  });

  const categories: EmojiCategory[] = [
    {
      id: "user-custom",
      title: "マイリアクション",
      icon: "star-plus",
      emojis: [
        {
          id: ":neko:",
          type: { kind: "url", url: "https://example.com/neko-v2.png", customReactionId: "cr-1" },
          keywords: ["ねこ", "neko"],
        },
      ],
    },
    {
      id: "catalyst",
      title: "Catalyst",
      icon: "star",
      emojis: [{ id: "kawaii", type: { kind: "url", url: "https://example.com/kawaii.png" }, keywords: ["かわいい"] }],
    },
    {
      id: "people",
      title: "People",
      icon: "smile",
      emojis: [{ id: "👍", type: { kind: "unicode", emoji: "👍" }, keywords: ["thumbs up"], variants: ["👍🏻", "👍🏽"] }],
    },
  ];

  it("肌の色を付けた Unicode 絵文字は履歴の値のまま並べる", () => {
    expect(toRecentEmojis([history("unicode", "👍🏽")], categories)).toEqual([
      { id: "👍🏽", type: { kind: "unicode", emoji: "👍🏽" }, keywords: [] },
    ]);
  });

  it("カテゴリにある Unicode 絵文字は肌の色のバリエーションを引き継ぐ", () => {
    expect(toRecentEmojis([history("unicode", "👍")], categories)).toEqual([
      { id: "👍", type: { kind: "unicode", emoji: "👍" }, keywords: [], variants: ["👍🏻", "👍🏽"] },
    ]);
  });

  it("カスタムリアクションはカテゴリから customReactionId と最新の画像を引き直す", () => {
    expect(
      toRecentEmojis(
        [
          history("url", ":neko:", "https://example.com/neko-v1.png"),
          history("url", "kawaii", "https://example.com/kawaii.png"),
        ],
        categories,
      ),
    ).toEqual([
      {
        id: ":neko:",
        type: { kind: "url", url: "https://example.com/neko-v2.png", customReactionId: "cr-1" },
        keywords: [],
      },
      { id: "kawaii", type: { kind: "url", url: "https://example.com/kawaii.png" }, keywords: [] },
    ]);
  });

  it("カテゴリにないカスタムリアクションは除く", () => {
    expect(toRecentEmojis([history("url", ":deleted:", "https://example.com/deleted.png")], categories)).toEqual([]);
  });
});
