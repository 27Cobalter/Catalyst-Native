import type { EmojiPickerTab } from "@natsuneko-laboratory/react-native-emoji-verse";
import { atom } from "jotai";

/**
 * 絵文字ピッカーで、直前にタブを押して移った先のタブと、そのときの投稿など。
 * 同じ投稿でピッカーを開き直したときだけ、このタブから始める
 */
export const emojiPickerTabAtom = atom<{ contextId: string; tab: EmojiPickerTab } | null>(null);
