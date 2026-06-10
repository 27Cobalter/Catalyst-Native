import type { CatalystReaction } from "@natsuneko-laboratory/catalyst-sdk";
import { atom } from "jotai";
import { atomFamily } from "jotai/utils";

// Per-status reaction cache. null = not yet overridden (fall back to server data).
export const reactionCacheAtomFamily = atomFamily((_statusId: string) =>
  atom<Record<string, CatalystReaction> | null>(null),
);
