import type { SkinTone } from "@natsuneko-laboratory/react-native-emoji-verse";
import { atom } from "jotai";

export const emojiSkinToneAtom = atom<SkinTone>(0);
