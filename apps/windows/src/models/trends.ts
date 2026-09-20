import { atom } from "jotai";
import { CatalystTrend } from "./sdk-types";

export const trendsAtom = atom<CatalystTrend[]>([]);
