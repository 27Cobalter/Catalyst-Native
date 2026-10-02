import {
  CATEGORY_TITLES_JA,
  type EmojiCategoryType,
  useEmojiCategories,
} from "@natsuneko-laboratory/react-native-emoji-verse";
import emojiData from "@natsuneko-laboratory/react-native-emoji-verse/data/16.0";

// リアクション・ステッカーでは人物と旗の絵文字は扱わない
const EXCLUDED_CATEGORIES: EmojiCategoryType[] = ["flags", "smileys_and_people"];

// 16.0 のデータだけを静的に import してバンドルサイズを抑える
export function useDefaultCategories() {
  return useEmojiCategories(emojiData, { titles: CATEGORY_TITLES_JA, exclude: EXCLUDED_CATEGORIES });
}
