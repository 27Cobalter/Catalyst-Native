import { emojiSkinToneAtom } from "@/models/atoms/emoji-skin-tone";
import { saveEmojiSkinTone } from "@/models/emoji-skin-tone-settings";
import {
  EmojiPickerView as BaseEmojiPickerView,
  type EmojiImageProps,
  type EmojiPickerViewProps,
  emojiToTwemojiKey,
  type SkinTone,
} from "@natsuneko-laboratory/react-native-emoji-verse";
import { Image } from "expo-image";
import { useAtom } from "jotai";
import { useCallback } from "react";

function EmojiImage({ source, style }: EmojiImageProps) {
  return <Image source={source} style={style} contentFit="contain" loading="lazy" />;
}

function getEmojiImageUrl(emoji: string) {
  return `https://static.natsuneko.com/images/reactions/${emojiToTwemojiKey(emoji)}.png`;
}

/** Catalyst の絵文字画像・文言・肌の色の設定を EmojiPickerView / EmojiPickerSheet に渡すための props */
export function useEmojiPickerDefaults() {
  const [skinTone, setSkinTone] = useAtom(emojiSkinToneAtom);

  const onSkinToneChange = useCallback(
    (tone: SkinTone) => {
      setSkinTone(tone);
      saveEmojiSkinTone(tone).catch(() => {});
    },
    [setSkinTone],
  );

  return {
    getEmojiImageUrl,
    ImageComponent: EmojiImage,
    searchPlaceholder: "絵文字を検索",
    skinTone,
    onSkinToneChange,
  } satisfies Partial<EmojiPickerViewProps>;
}

export function EmojiPickerView(props: EmojiPickerViewProps) {
  return <BaseEmojiPickerView {...useEmojiPickerDefaults()} {...props} />;
}
