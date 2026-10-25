import { emojis, type EmojiKey } from "@/lib/generated/emojis";
import type { ImageSource } from "expo-image";

/** Twemoji 形式のキー (`1f1e9-1f1ec`) の画像がアプリにバンドルされているか */
export const isBundledEmoji = (key: string): key is EmojiKey => Object.hasOwn(emojis, key);

export const getRemoteEmojiImageUrl = (key: string) => `https://static.natsuneko.com/images/reactions/${key}.png`;

/** バンドル済みの Twemoji 画像を返す。バンドルされていない絵文字はリモートの画像にフォールバックする */
export const getEmojiImageSource = (key: string): number | ImageSource =>
  isBundledEmoji(key) ? emojis[key] : { uri: getRemoteEmojiImageUrl(key) };
