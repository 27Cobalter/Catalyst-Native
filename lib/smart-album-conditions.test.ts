import { conditionToHashtag, hashtagsToConditions, type SmartAlbumCondition } from "./smart-album-conditions";

describe("スマートアルバムのリアクション条件", () => {
  it("reaction: 条件をフォーム用の値に変換する", () => {
    expect(hashtagsToConditions(["reaction:heart", "-reaction::kawaii:"])).toEqual([
      {
        id: "reaction-init-0",
        type: "reaction",
        value: "heart",
        isExclude: false,
      },
      {
        id: "ex-reaction-init-1",
        type: "reaction",
        value: ":kawaii:",
        isExclude: true,
      },
    ]);
  });

  it("リアクション条件を API の hashtags 形式に変換する", () => {
    expect(
      conditionToHashtag({
        id: "reaction-1",
        type: "reaction",
        value: "custom-reaction-id",
        isExclude: false,
      } satisfies SmartAlbumCondition),
    ).toBe("reaction:custom-reaction-id");
  });
});
