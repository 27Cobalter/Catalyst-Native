import { getEmojiImageSource, getRemoteEmojiImageUrl, isBundledEmoji } from "@/lib/emoji";
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

// EmojiPickerView は画像を { uri } でしか渡せないため、バンドル済みの絵文字は uri に Twemoji のキーを入れて引く
// (カスタム絵文字の画像は URL のまま渡ってくる)
function EmojiImage({ source, style }: EmojiImageProps) {
  return (
    <Image
      source={isBundledEmoji(source.uri) ? getEmojiImageSource(source.uri) : source}
      style={style}
      contentFit="contain"
      loading="lazy"
    />
  );
}

function getEmojiImageUrl(emoji: string) {
  const key = emojiToTwemojiKey(emoji);
  return isBundledEmoji(key) ? key : getRemoteEmojiImageUrl(key);
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
