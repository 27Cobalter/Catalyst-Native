import { useAssets } from "expo-asset";
import { readAsStringAsync } from "expo-file-system/legacy";
import { useEffect, useState } from "react";
import type { EmojiCategory, EmojiCategoryType, EmojiItem } from "./types";
import { CATEGORY_META, CATEGORY_ORDER, mapGroupToCategory } from "./types";

interface ParsedEmoji {
  emoji: string;
  name: string;
  group: string;
}

function parseEmojiTestData(content: string): Map<string, ParsedEmoji[]> {
  const result = new Map<string, ParsedEmoji[]>();
  let currentGroup = "";

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("# group:")) {
      currentGroup = trimmed.replace("# group:", "").trim();
      continue;
    }

    if (trimmed.startsWith("#")) continue;
    if (!trimmed.includes(";") || !trimmed.includes("#")) continue;

    const [, statusAndComment] = trimmed.split(";");
    if (!statusAndComment) continue;

    const [status, ...commentParts] = statusAndComment.split("#");
    if (status.trim() !== "fully-qualified") continue;

    const comment = commentParts.join("#").trim();
    const parts = comment.split(" ");
    if (parts.length < 3) continue;

    const emoji = parts[0];
    const name = parts.slice(2).join(" ");

    if (!result.has(currentGroup)) {
      result.set(currentGroup, []);
    }
    result.get(currentGroup)!.push({ emoji, name, group: currentGroup });
  }

  return result;
}

let cachedCategories: EmojiCategory[] | null = null;

function buildCategories(content: string): EmojiCategory[] {
  const parsedData = parseEmojiTestData(content);
  const categoryMap = new Map<string, EmojiItem[]>();

  for (const [group, emojis] of parsedData) {
    const categoryId = mapGroupToCategory(group);
    if (!categoryId) continue;

    const items = emojis.map(
      (e): EmojiItem => ({
        id: e.emoji,
        type: { kind: "unicode", emoji: e.emoji },
        keywords: [e.name],
      }),
    );

    const existing = categoryMap.get(categoryId) ?? [];
    categoryMap.set(categoryId, [...existing, ...items]);
  }

  return CATEGORY_ORDER.filter((type) => categoryMap.has(type)).map(
    (type): EmojiCategory => ({
      id: type,
      title: CATEGORY_META[type].title,
      icon: CATEGORY_META[type].icon,
      emojis: categoryMap.get(type)!,
    }),
  );
}

export function useDefaultCategories(): {
  categories: EmojiCategory[];
  isLoading: boolean;
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const [assets] = useAssets([require("@/assets/images/emoji-test.txt")]);
  const [categories, setCategories] = useState<EmojiCategory[]>(
    cachedCategories ?? [],
  );
  const [isLoading, setIsLoading] = useState(cachedCategories === null);

  useEffect(() => {
    if (cachedCategories) return;
    if (!assets || assets.length === 0) return;

    const asset = assets[0];
    const load = async () => {
      try {
        if (!asset.localUri) {
          await asset.downloadAsync();
        }
        const content = await readAsStringAsync(asset.localUri!);
        cachedCategories = buildCategories(content);
        setCategories(cachedCategories);
      } catch (e) {
        console.error("Failed to load emoji data:", e);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [assets]);

  return { categories, isLoading };
}

export function getFilteredCategories(
  exclude: EmojiCategoryType[],
  categories: EmojiCategory[],
): EmojiCategory[] {
  return categories.filter((c) => !exclude.includes(c.id as EmojiCategoryType));
}
