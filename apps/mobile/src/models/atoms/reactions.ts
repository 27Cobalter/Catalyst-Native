import { getStatusReactions } from "@/lib/reactions";
import { canApplyFetchedReactions, markReactionsFetched } from "@/models/reaction-freshness";
import type { CatalystReaction, CatalystStatus, CatalystStatusV1_1, CatalystStatusV1_2 } from "@/models/sdk-types";
import { atom, type Getter, type Setter } from "jotai";
import { atomFamily } from "jotai-family";

type Reactions = Record<string, CatalystReaction>;

// Per-status reaction cache. null = not yet overridden (fall back to server data).
// TL と投稿詳細で共有する
export const reactionCacheAtomFamily = atomFamily((_statusId: string) => atom<Reactions | null>(null));

// 取得を始めた後に自分のリアクションが変わった投稿は書かない
const writeFetchedReactions = (
  get: Getter,
  set: Setter,
  statusId: string,
  reactions: () => Reactions,
  requestedAt: number,
  createMissing: boolean,
) => {
  const cache = reactionCacheAtomFamily(statusId);
  if (!createMissing && get(cache) === null) return;
  if (!canApplyFetchedReactions(statusId, requestedAt)) return;

  markReactionsFetched(statusId, requestedAt);
  set(cache, reactions());
};

// サーバーから取ってきたリアクションをキャッシュに書く
export const applyFetchedReactionsAtom = atom(
  null,
  (get, set, { entries, requestedAt }: { entries: Iterable<readonly [string, Reactions]>; requestedAt: number }) => {
    for (const [statusId, reactions] of entries) {
      writeFetchedReactions(get, set, statusId, () => reactions, requestedAt, true);
    }
  },
);

type FetchedStatus = CatalystStatus | CatalystStatusV1_1 | CatalystStatusV1_2;

// 一覧で取ってきた投稿のリアクションを、ほかの画面で上書きされている同じ投稿のキャッシュへ反映する。
// キャッシュが無い投稿は status prop の値が出るので書かない。広告、合言葉付きの投稿 (本文などを抜いて届く)、
// visitor が無い投稿 (v1.0 の API。自分が付けたかどうかが分からない) は使わない
export const applyFetchedStatusesAtom = atom(
  null,
  (get, set, { statuses, requestedAt }: { statuses: readonly FetchedStatus[]; requestedAt: number }) => {
    for (const status of statuses) {
      if ("advertisement" in status && status.advertisement) continue;
      if ("locked" in status && status.locked) continue;
      if (!("visitor" in status) || !("reactions" in status)) continue;

      writeFetchedReactions(get, set, status.id, () => getStatusReactions(status), requestedAt, false);
    }
  },
);

// 自分が付けたかどうかはアカウントごとに違うので、アカウントを切り替えたら捨てる
export const clearReactionCachesAtom = atom(null, (_get, set) => {
  for (const statusId of reactionCacheAtomFamily.getParams()) {
    set(reactionCacheAtomFamily(statusId), null);
  }
});

// 同じ投稿を TL と詳細画面の両方で購読していても、ストリーミングのイベントをキャッシュへ 1 回だけ当てるための scope
export const getReactionCacheScope = (statusId: string) => `reaction-cache:${statusId}`;
