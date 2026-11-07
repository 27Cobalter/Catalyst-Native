import type { EmojiCategory, EmojiItem } from "@natsuneko-laboratory/react-native-emoji-verse";
import { renderHook } from "@testing-library/react-native";
import { matchPickerEmojis, useIntelligenceSearchProvider } from "./intelligence-search";

const unicode = (emoji: string): EmojiItem => ({ id: emoji, type: { kind: "unicode", emoji }, keywords: [] });

const categories: EmojiCategory[] = [
  {
    id: "custom",
    title: "Custom",
    icon: "star",
    emojis: [{ id: ":party:", type: { kind: "url", url: "https://example.com/party.png" }, keywords: ["party"] }],
  },
  { id: "travel", title: "Travel", icon: "plane", emojis: [unicode("🏖"), unicode("🍺")] },
  { id: "food", title: "Food", icon: "utensils", emojis: [unicode("🍺")] },
];

describe("matchPickerEmojis", () => {
  it("paimon の並び順のまま、ピッカーにある絵文字に置き換える", () => {
    expect(matchPickerEmojis([{ emoji: "🍺" }, { emoji: "🏖" }], categories)).toEqual([unicode("🍺"), unicode("🏖")]);
  });

  it("U+FE0F の有無が違っても同じ絵文字として扱う", () => {
    expect(matchPickerEmojis([{ emoji: "🏖️" }], categories)).toEqual([unicode("🏖")]);
  });

  it("ピッカーにない絵文字と、重複した絵文字は捨てる", () => {
    expect(matchPickerEmojis([{ emoji: "🧟" }, { emoji: "🍺" }, { emoji: "🍺" }], categories)).toEqual([unicode("🍺")]);
  });
});

describe("useIntelligenceSearchProvider", () => {
  const fetchMock = jest.fn();
  const { signal } = new AbortController();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it("探した結果を覚えておき、peek で待たずに返す", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ results: [{ emoji: "🍺" }] }) });
    const { result } = await renderHook(() => useIntelligenceSearchProvider(categories));

    expect(result.current.peek?.("乾杯")).toBeUndefined();
    await expect(result.current.search("乾杯", { signal })).resolves.toEqual({ items: [unicode("🍺")] });
    expect(result.current.peek?.("乾杯")).toEqual({ items: [unicode("🍺")] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("カテゴリが変わっても覚えた結果を使い、そのときのカテゴリの絵文字に置き換える", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ results: [{ emoji: "🍺" }] }) });
    const { result, rerender } = await renderHook(({ c }: { c: EmojiCategory[] }) => useIntelligenceSearchProvider(c), {
      initialProps: { c: categories },
    });
    await result.current.search("乾杯", { signal });

    const beer = { ...unicode("🍺"), keywords: ["beer"] };
    await rerender({ c: [{ id: "food", title: "Food", icon: "utensils", emojis: [beer] }] });

    expect(result.current.peek?.("乾杯")).toEqual({ items: [beer] });
  });

  it("制限されたときの結果は覚えない", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    const { result } = await renderHook(() => useIntelligenceSearchProvider(categories));

    await expect(result.current.search("乾杯", { signal })).resolves.toMatchObject({ items: [] });
    expect(result.current.peek?.("乾杯")).toBeUndefined();
  });
});
