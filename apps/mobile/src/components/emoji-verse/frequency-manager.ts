import type { EmojiCategory, EmojiItem } from "@natsuneko-laboratory/react-native-emoji-verse";
import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "emoji_frequency_v2";
const MAX_COUNT = 30;

type EmojiType = "unicode" | "url";

export interface FrequencyItem {
  type: EmojiType;
  value: string;
  id: string;
  timestamp: number;
  count: number;
}

async function getItems(): Promise<FrequencyItem[]> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FrequencyItem[];
  } catch {
    return [];
  }
}

async function saveItems(items: FrequencyItem[]): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(items));
}

export async function recordUnicodeUsage(emoji: string): Promise<void> {
  await recordUsage("unicode", emoji, emoji);
}

export async function recordUrlUsage(id: string, url: string): Promise<void> {
  await recordUsage("url", url, id);
}

async function recordUsage(
  type: EmojiType,
  value: string,
  id: string,
): Promise<void> {
  const items = await getItems();
  const existingIndex = items.findIndex((item) => item.id === id);

  if (existingIndex >= 0) {
    items.splice(existingIndex, 1);
  }

  items.unshift({ type, value, id, timestamp: Date.now(), count: 1 });

  if (items.length > MAX_COUNT) {
    items.length = MAX_COUNT;
  }

  await saveItems(items);
}

export async function getRecentItems(): Promise<FrequencyItem[]> {
  return getItems();
}

/**
 * 使用履歴を「最近使用」カテゴリの絵文字にする。
 * 履歴には customReactionId を残していないので、カスタムリアクションはピッカーに出しているカテゴリから id で引き直し、
 * 見つからないもの (削除・非表示になったものや、このピッカーでは出さないもの) は除く。
 * Unicode 絵文字もカテゴリにあればそれを使い、肌の色のバリエーションを引き継ぐ。
 * 検索で元のカテゴリの絵文字と二重に出ないよう、キーワードは持たせない
 */
export function toRecentEmojis(items: readonly FrequencyItem[], categories: readonly EmojiCategory[]): EmojiItem[] {
  const pickerEmojis = new Map<string, EmojiItem>();
  for (const category of categories) {
    for (const emoji of category.emojis) {
      if (!pickerEmojis.has(emoji.id)) pickerEmojis.set(emoji.id, emoji);
    }
  }

  return items.flatMap((item): EmojiItem[] => {
    const emoji = pickerEmojis.get(item.id);
    if (emoji) return [{ ...emoji, keywords: [] }];
    // 肌の色を付けた絵文字や、ピッカーにない絵文字は履歴の値のまま出す
    return item.type === "unicode" ? [{ id: item.value, type: { kind: "unicode", emoji: item.value }, keywords: [] }] : [];
  });
}
