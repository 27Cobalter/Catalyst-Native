import type { CatalystReaction } from "@/models/sdk-types";
import { getCustomReactionId, getReactionClipboardValue, getReactionKey, isCustomReactionKey } from "./reactions";

describe("isCustomReactionKey", () => {
  it("custom: プレフィックスを持つキーを判定する", () => {
    expect(isCustomReactionKey("custom:abc123")).toBe(true);
  });

  it("プレフィックスが無ければ false", () => {
    expect(isCustomReactionKey("👍")).toBe(false);
  });
});

describe("getReactionKey", () => {
  it("customReactionId が無ければ symbol をそのまま返す", () => {
    expect(getReactionKey("👍")).toBe("👍");
  });

  it("customReactionId があれば custom: プレフィックス付きで返す", () => {
    expect(getReactionKey("👍", "abc123")).toBe("custom:abc123");
  });
});

describe("getCustomReactionId", () => {
  it("reaction.customReactionId を優先する", () => {
    const reaction = { customReactionId: "from-reaction" } as CatalystReaction;
    expect(getCustomReactionId("custom:from-key", reaction)).toBe("from-reaction");
  });

  it("reaction に無ければ custom: キーから抽出する", () => {
    const reaction = {} as CatalystReaction;
    expect(getCustomReactionId("custom:from-key", reaction)).toBe("from-key");
  });

  it("どちらにも無ければ undefined", () => {
    const reaction = {} as CatalystReaction;
    expect(getCustomReactionId("👍", reaction)).toBeUndefined();
  });
});

describe("getReactionClipboardValue", () => {
  it("公式リアクションは symbol を返す", () => {
    expect(getReactionClipboardValue({ symbol: "heart", ownCustomReactionIds: new Set() })).toBe("heart");
  });

  it("自分のカスタムリアクションは symbol を返す", () => {
    expect(
      getReactionClipboardValue({
        symbol: ":kawaii:",
        customReactionId: "custom-1",
        ownCustomReactionIds: new Set(["custom-1"]),
      }),
    ).toBe(":kawaii:");
  });

  it("自分のカスタムリアクションの symbol にコロンがなければ補う", () => {
    expect(
      getReactionClipboardValue({
        symbol: "kawaii",
        customReactionId: "custom-1",
        ownCustomReactionIds: new Set(["custom-1"]),
      }),
    ).toBe(":kawaii:");
  });

  it("他人のカスタムリアクションは id を返す", () => {
    expect(
      getReactionClipboardValue({
        symbol: ":kawaii:",
        customReactionId: "custom-2",
        ownCustomReactionIds: new Set(["custom-1"]),
      }),
    ).toBe("custom-2");
  });
});
