import type { CatalystReaction, CatalystStatus, CatalystStatusV1_1, CatalystStatusV1_2 } from "@/models/sdk-types";

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

type StatusWithReactions = {
  reactions?: Record<string, CatalystReaction>;
  visitor?: {
    reactions?: string[];
  };
};

// 投稿に付いてくるリアクションに、自分が付けたかどうかとカスタムリアクションの ID を足す
export const getStatusReactions = (
  status: CatalystStatus | CatalystStatusV1_1 | CatalystStatusV1_2,
): Record<string, CatalystReaction> => {
  const s = status as StatusWithReactions;
  const vr = s.visitor?.reactions ?? [];
  return Object.fromEntries(
    Object.entries(s.reactions ?? {}).map(([key, reaction]) => [
      key,
      {
        ...reaction,
        customReactionId: getCustomReactionId(key, reaction),
        hasSelfReaction: vr.includes(key),
      },
    ]),
  );
};
