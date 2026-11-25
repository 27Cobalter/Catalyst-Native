// サーバーから取ってきたリアクションで、表示中の値を上書きしてよいかを決める。
// 自分のリアクションを送信中の投稿や、取得を始めた後に送信が終わった投稿を上書きすると、自分の変化が消える。
// 後から届いた古い取得の結果で、新しい取得の結果を上書きしないようにもする
const pendingRequests = new Map<string, number>();
const updatedAt = new Map<string, number>();
const settleWaiters = new Map<string, (() => void)[]>();

// 端末の時刻が戻っても前後を取り違えないよう、単調に増える時計を使う
export const reactionClock = () => performance.now();

// 自分のリアクションの送信を始める。返した関数を、送信が終わったら (失敗しても) 呼ぶ
export const beginReactionRequest = (statusId: string) => {
  pendingRequests.set(statusId, (pendingRequests.get(statusId) ?? 0) + 1);

  return () => {
    const count = (pendingRequests.get(statusId) ?? 1) - 1;
    updatedAt.set(statusId, reactionClock());
    if (count > 0) {
      pendingRequests.set(statusId, count);
      return;
    }

    pendingRequests.delete(statusId);
    settleWaiters.get(statusId)?.forEach((resolve) => resolve());
    settleWaiters.delete(statusId);
  };
};

// 自分のリアクションの送信がすべて終わるのを待つ
export const whenReactionRequestsSettled = (statusId: string) =>
  new Promise<void>((resolve) => {
    if (!pendingRequests.has(statusId)) {
      resolve();
      return;
    }
    settleWaiters.set(statusId, [...(settleWaiters.get(statusId) ?? []), resolve]);
  });

// requestedAt: 取得のリクエストを送った時刻 (reactionClock)
export const canApplyFetchedReactions = (statusId: string, requestedAt: number) =>
  !pendingRequests.has(statusId) && requestedAt > (updatedAt.get(statusId) ?? -Infinity);

// 取得の結果を表示に使ったことを記録する
export const markReactionsFetched = (statusId: string, requestedAt: number) => {
  updatedAt.set(statusId, requestedAt);
};
