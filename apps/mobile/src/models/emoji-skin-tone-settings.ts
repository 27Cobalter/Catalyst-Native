import AsyncStorage from "@react-native-async-storage/async-storage";
import { SKIN_TONES, type SkinTone } from "@natsuneko-laboratory/react-native-emoji-verse";

const STORAGE_KEY = "emoji_skin_tone";

export async function loadEmojiSkinTone(): Promise<SkinTone> {
  const value = Number(await AsyncStorage.getItem(STORAGE_KEY));
  return SKIN_TONES.find((tone) => tone === value) ?? 0;
}

export async function saveEmojiSkinTone(tone: SkinTone): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, String(tone));
}
