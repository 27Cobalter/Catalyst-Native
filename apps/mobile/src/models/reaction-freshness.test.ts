import {
  beginReactionRequest,
  canApplyFetchedReactions,
  markReactionsFetched,
  reactionClock,
  whenReactionRequestsSettled,
} from "./reaction-freshness";

describe("canApplyFetchedReactions", () => {
  it("自分のリアクションを送っていなければ上書きしてよい", () => {
    expect(canApplyFetchedReactions("fresh-1", reactionClock())).toBe(true);
  });

  it("自分のリアクションを送信中は上書きしない", () => {
    const endRequest = beginReactionRequest("fresh-2");
    expect(canApplyFetchedReactions("fresh-2", reactionClock())).toBe(false);

    endRequest();
    expect(canApplyFetchedReactions("fresh-2", reactionClock() + 1)).toBe(true);
  });

  it("送信が終わる前に始めた取得の結果は上書きしない", () => {
    const requestedAt = reactionClock();
    const endRequest = beginReactionRequest("fresh-3");
    endRequest();

    expect(canApplyFetchedReactions("fresh-3", requestedAt)).toBe(false);
  });
});

describe("whenReactionRequestsSettled", () => {
  it("送信が終わるまで待つ", async () => {
    const endRequest = beginReactionRequest("settle-1");
    const settled = jest.fn();
    const promise = whenReactionRequestsSettled("settle-1").then(settled);

    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();

    endRequest();
    await promise;
    expect(settled).toHaveBeenCalled();
  });
});

describe("markReactionsFetched", () => {
  it("後から届いた古い取得の結果は上書きしない", () => {
    markReactionsFetched("fetched-1", 2000);

    expect(canApplyFetchedReactions("fetched-1", 1000)).toBe(false);
    expect(canApplyFetchedReactions("fetched-1", 3000)).toBe(true);
  });
});
