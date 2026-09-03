import type { CatalystReaction } from "@/models/sdk-types";

const CUSTOM_REACTION_KEY_PREFIX = "custom:";

export const isCustomReactionKey = (key: string) => key.startsWith(CUSTOM_REACTION_KEY_PREFIX);

export const getReactionKey = (symbol: string, customReactionId?: string) =>
  customReactionId ? `${CUSTOM_REACTION_KEY_PREFIX}${customReactionId}` : symbol;

export const getCustomReactionId = (key: string, reaction: CatalystReaction) =>
  reaction.customReactionId ?? (isCustomReactionKey(key) ? key.slice(CUSTOM_REACTION_KEY_PREFIX.length) : undefined);

export const getReactionClipboardValue = ({
  symbol,
  customReactionId,
  ownCustomReactionIds,
}: {
  symbol: string;
  customReactionId?: string;
  ownCustomReactionIds: ReadonlySet<string>;
}) => {
  if (!customReactionId) return symbol;
  if (ownCustomReactionIds.has(customReactionId)) {
    return symbol.startsWith(":") ? symbol : `:${symbol}:`;
  }
  return customReactionId;
};
