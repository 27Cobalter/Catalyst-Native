import type { EmojiCategory, EmojiItem } from "@natsuneko-laboratory/react-native-emoji-verse";
import { matchPickerEmojis } from "./intelligence-search";

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
