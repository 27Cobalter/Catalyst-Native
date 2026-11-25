import { getReactionKey } from "@/lib/reactions";
import { accountAtom } from "@/models/atoms/account";
import { getReactionCacheScope, reactionCacheAtomFamily } from "@/models/atoms/reactions";
import { beginReactionRequest } from "@/models/reaction-freshness";
import type { CatalystReaction } from "@/models/sdk-types";
import {
  applyReactionStreamingEvent,
  registerLocalReactionMutation,
  useStreamingReactions,
  type ReactionStreamingEvent,
} from "@/models/streaming";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useEffect } from "react";
import { Alert } from "react-native";

type Reactions = Record<string, CatalystReaction>;

const increment = (current: Reactions, key: string, symbol: string, url?: string, customReactionId?: string) => ({
  ...current,
  [key]: {
    ...current[key],
    symbol,
    url: url ?? current[key]?.url,
    customReactionId: customReactionId ?? current[key]?.customReactionId,
    count: (current[key]?.count ?? 0) + 1,
    hasSelfReaction: true,
  },
});

const decrement = (current: Reactions, key: string) => ({
  ...current,
  [key]: { ...current[key], count: Math.max(0, (current[key]?.count ?? 0) - 1), hasSelfReaction: false },
});

// 投稿のリアクションを、TL と投稿詳細で共有するキャッシュ越しに表示・操作する。
// キャッシュが無いあいだは baseReactions (投稿に付いてくる値) を出す
export const useStatusReactions = (statusId: string | undefined, baseReactions: Reactions) => {
  const account = useAtomValue(accountAtom);
  const { subscribe, unsubscribe } = useStreamingReactions();
  const [cachedReactions, setCachedReactions] = useAtom(reactionCacheAtomFamily(statusId ?? ""));

  const handleStreamingReaction = useCallback(
    (event: ReactionStreamingEvent) => {
      if (!statusId) return;
      setCachedReactions((prev) =>
        applyReactionStreamingEvent(prev ?? baseReactions, event, getReactionCacheScope(statusId)),
      );
    },
    [baseReactions, setCachedReactions, statusId],
  );

  useEffect(() => {
    if (!statusId) return;

    subscribe(statusId, handleStreamingReaction);
    return () => {
      unsubscribe(statusId, handleStreamingReaction);
    };
  }, [handleStreamingReaction, statusId, subscribe, unsubscribe]);

  const mutate = useCallback(
    async (type: ReactionStreamingEvent["type"], symbol: string, url?: string, customReactionId?: string) => {
      const client = account?.credential.client;
      if (!client || !statusId) return;

      const key = getReactionKey(symbol, customReactionId);
      const isIncrement = type === "reaction:increment";
      const apply = (add: boolean) =>
        setCachedReactions((prev) => {
          const current = prev ?? baseReactions;
          return add ? increment(current, key, symbol, url, customReactionId) : decrement(current, key);
        });

      apply(isIncrement);
      const rollbackLocalMutation = registerLocalReactionMutation(statusId, type, symbol, customReactionId);
      const endRequest = beginReactionRequest(statusId);
      try {
        const reactions = client.catalyst.v1.status.id.reactions;
        if (customReactionId) {
          const options = { path: { id: statusId, customReactionId }, throwOnError: true } as const;
          await (isIncrement
            ? reactions.custom.customReactionId.create(options)
            : reactions.custom.customReactionId.delete(options));
        } else {
          const options = { path: { id: statusId, symbol }, throwOnError: true } as const;
          await (isIncrement ? reactions.symbol.create(options) : reactions.symbol.delete(options));
        }
      } catch {
        rollbackLocalMutation();
        // 送信中にほかの変化 (ストリーミングや別のリアクション) が当たっていても消さないよう、逆向きに当てて戻す
        apply(!isIncrement);
        Alert.alert("エラー", isIncrement ? "リアクションに失敗しました" : "リアクションの取り消しに失敗しました");
      } finally {
        endRequest();
      }
    },
    [account, baseReactions, setCachedReactions, statusId],
  );

  const react = useCallback(
    (symbol: string, url?: string, customReactionId?: string) =>
      mutate("reaction:increment", symbol, url, customReactionId),
    [mutate],
  );

  const unreact = useCallback(
    (symbol: string, customReactionId?: string) => mutate("reaction:decrement", symbol, undefined, customReactionId),
    [mutate],
  );

  return { reactions: cachedReactions ?? baseReactions, react, unreact };
};
