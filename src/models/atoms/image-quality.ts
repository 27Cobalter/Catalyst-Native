import { atom } from "jotai";
import type { TimelineImageQuality } from "../image-quality-settings";

export const timelineImageQualityAtom = atom<TimelineImageQuality>("low");
export const timelineWifiUpgradeAtom = atom<boolean>(false);
