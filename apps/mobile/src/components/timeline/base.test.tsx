import { clearReactionCachesAtom, reactionCacheAtomFamily } from "@/models/atoms/reactions";
import { act, render, waitFor } from "@testing-library/react-native";
import { getDefaultStore } from "jotai";
import React from "react";
import type { TimelineHandle, TimelineStatusItem } from "./base";
import { TimelineBase } from "./base";

type CapturedProps = {
  data: TimelineStatusItem[];
  refreshControl: { props: { refreshing: boolean; onRefresh: () => void } };
  onEndReached: () => void;
  ListEmptyComponent?: React.ComponentType;
};

let mockCaptured: CapturedProps | null = null;
let mockCapturedScrollToOffset: jest.Mock;

// jest.mock のファクトリはトップレベル import をそのまま参照できない
// (out-of-scope variable の制約) ため、ここでは require を使う
jest.mock("@shopify/flash-list", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactActual = require("react");
  return {
    FlashList: ReactActual.forwardRef((props: CapturedProps, ref: React.Ref<unknown>) => {
      mockCaptured = props;
      ReactActual.useImperativeHandle(ref, () => ({ scrollToOffset: mockCapturedScrollToOffset }));
      return null;
    }),
  };
});

const mockBulkReactions = jest.fn();
jest.mock("@/models/atoms/credential", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { atom } = require("jotai");
  return {
    clientAtom: atom({
      catalyst: { v1: { statuses: { reactions: { create: (...args: unknown[]) => mockBulkReactions(...args) } } } },
    }),
  };
});

jest.mock("./status", () => ({ TimelineStatus: () => null }));
jest.mock("./advertisement", () => ({ TimelineAdvertisement: () => null }));
jest.mock("./placeholder", () => ({ TimelinePlaceholder: () => null }));

const item = (id: string, cursor = id) => ({ id, cursor }) as unknown as TimelineStatusItem;
const reaction = (count: number) => ({
  name: "kawaii",
  symbol: "kawaii",
  url: "https://example.com/kawaii.png",
  count,
});
const getCachedReactions = (id: string) => getDefaultStore().get(reactionCacheAtomFamily(id));

describe("TimelineBase", () => {
  beforeEach(() => {
    mockCaptured = null;
    mockCapturedScrollToOffset = jest.fn();
    mockBulkReactions.mockReset();
    mockBulkReactions.mockResolvedValue({ data: { reactions: {} } });
  });

  afterEach(() => {
    getDefaultStore().set(clearReactionCachesAtom);
  });

  it("初回マウント時に fetcher を呼び、取得結果を data として渡す", async () => {
    const fetcher = jest.fn().mockResolvedValue([item("1"), item("2")]);

    await render(<TimelineBase fetcher={fetcher} />);

    await waitFor(() => {
      expect(mockCaptured?.data).toEqual([item("1"), item("2")]);
    });
    expect(fetcher).toHaveBeenCalledWith(null, null);
  });

  it("pull-to-refresh で新着アイテムを先頭にマージする", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce([item("2"), item("1")])
      .mockResolvedValueOnce([item("3")]);

    await render(<TimelineBase fetcher={fetcher} />);
    await waitFor(() => expect(mockCaptured?.data).toEqual([item("2"), item("1")]));

    await act(async () => {
      await mockCaptured?.refreshControl.props.onRefresh();
    });

    await waitFor(() => {
      expect(mockCaptured?.data).toEqual([item("3"), item("2"), item("1")]);
    });
    expect(fetcher).toHaveBeenLastCalledWith("2", null);
  });

  it("onRefresh コールバックを最後に呼ぶ", async () => {
    const fetcher = jest.fn().mockResolvedValue([]);
    const onRefresh = jest.fn();

    await render(<TimelineBase fetcher={fetcher} onRefresh={onRefresh} />);
    await waitFor(() => expect(mockCaptured).not.toBeNull());

    await act(async () => {
      await mockCaptured?.refreshControl.props.onRefresh();
    });

    expect(onRefresh).toHaveBeenCalled();
  });

  it("末尾到達 (onEndReached) で古いアイテムを末尾にマージする", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce([item("2"), item("1")])
      .mockResolvedValueOnce([item("0")]);

    await render(<TimelineBase fetcher={fetcher} />);
    await waitFor(() => expect(mockCaptured?.data).toEqual([item("2"), item("1")]));

    await act(async () => {
      await mockCaptured?.onEndReached();
    });

    await waitFor(() => {
      expect(mockCaptured?.data).toEqual([item("2"), item("1"), item("0")]);
    });
    expect(fetcher).toHaveBeenLastCalledWith(null, "1");
  });

  it("refresh と追加読込でステータスの cursor を使う", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce([item("2", "newer-cursor"), item("1", "older-cursor")])
      .mockResolvedValueOnce([item("3")])
      .mockResolvedValueOnce([item("0")]);

    await render(<TimelineBase fetcher={fetcher} />);
    await waitFor(() => expect(mockCaptured?.data).toHaveLength(2));

    await act(async () => {
      await mockCaptured?.refreshControl.props.onRefresh();
    });
    expect(fetcher).toHaveBeenLastCalledWith("newer-cursor", null);

    await act(async () => {
      await mockCaptured?.onEndReached();
    });
    expect(fetcher).toHaveBeenLastCalledWith(null, "older-cursor");
  });

  it("fetcher が空配列を返したら以降の onEndReached を無視する (hasMore=false)", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce([item("1")])
      .mockResolvedValueOnce([]);

    await render(<TimelineBase fetcher={fetcher} />);
    await waitFor(() => expect(mockCaptured?.data).toEqual([item("1")]));

    await act(async () => {
      await mockCaptured?.onEndReached();
    });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

    await act(async () => {
      await mockCaptured?.onEndReached();
    });

    // 3 回目は呼ばれない (hasMore が false のためガードされる)
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("fetcher が既知の ID しか返さなければ hasMore を false にする (無限ループ防止)", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce([item("1")])
      .mockResolvedValueOnce([item("1")]); // 既に取得済みの ID のみ

    await render(<TimelineBase fetcher={fetcher} />);
    await waitFor(() => expect(mockCaptured?.data).toEqual([item("1")]));

    await act(async () => {
      await mockCaptured?.onEndReached();
    });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

    await act(async () => {
      await mockCaptured?.onEndReached();
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("取得した投稿のリアクションで、すでにあるキャッシュだけを入れ直す", async () => {
    getDefaultStore().set(reactionCacheAtomFamily("cache-1"), { kawaii: reaction(1) });
    getDefaultStore().set(reactionCacheAtomFamily("cache-3"), { kawaii: reaction(1) });
    const statuses = [
      { id: "cache-1", reactions: { kawaii: reaction(2) }, visitor: { reactions: ["kawaii"] } },
      { id: "cache-2", reactions: { kawaii: reaction(3) }, visitor: {} },
      // v1.0 の API は visitor を返さないので、自分が付けたかどうかが分からない
      { id: "cache-3", reactions: { kawaii: reaction(4) } },
    ];
    const fetcher = jest.fn().mockResolvedValue(statuses as unknown as TimelineStatusItem[]);

    await render(<TimelineBase fetcher={fetcher} />);

    await waitFor(() => {
      expect(getCachedReactions("cache-1")).toEqual({ kawaii: { ...reaction(2), hasSelfReaction: true } });
    });
    // キャッシュが無い投稿は status の値がそのまま出るので、書かない
    expect(getCachedReactions("cache-2")).toBeNull();
    expect(getCachedReactions("cache-3")).toEqual({ kawaii: reaction(1) });
  });

  it("pull-to-refresh で読み込み済みの投稿のリアクションを取り直し、共有キャッシュに書く", async () => {
    const ad = { id: "advertisement:x:0", advertisement: true } as unknown as TimelineStatusItem;
    const locked = { id: "refresh-locked", locked: true } as unknown as TimelineStatusItem;
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce([item("refresh-2"), ad, locked, item("refresh-1")])
      .mockResolvedValueOnce([]);
    const fresh = { kawaii: { ...reaction(5), hasSelfReaction: true } };
    mockBulkReactions.mockResolvedValue({ data: { reactions: { "refresh-2": fresh, "refresh-1": {} } } });

    await render(<TimelineBase fetcher={fetcher} />);
    await waitFor(() => expect(mockCaptured?.data).toHaveLength(4));

    await act(async () => {
      await mockCaptured?.refreshControl.props.onRefresh();
    });

    // 広告と合言葉付きの投稿は除き、1 回のリクエストでまとめて取る
    expect(mockBulkReactions).toHaveBeenCalledTimes(1);
    expect(mockBulkReactions).toHaveBeenCalledWith({ body: { ids: ["refresh-2", "refresh-1"] }, throwOnError: true });
    await waitFor(() => expect(getCachedReactions("refresh-2")).toEqual(fresh));
    expect(getCachedReactions("refresh-1")).toEqual({});
  });

  it("リアクションを取り直せなくても新着はマージする", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce([item("fail-1")])
      .mockResolvedValueOnce([item("fail-2")]);
    mockBulkReactions.mockRejectedValue(new Error("network"));

    await render(<TimelineBase fetcher={fetcher} />);
    await waitFor(() => expect(mockCaptured?.data).toEqual([item("fail-1")]));

    await act(async () => {
      await mockCaptured?.refreshControl.props.onRefresh();
    });

    await waitFor(() => expect(mockCaptured?.data).toEqual([item("fail-2"), item("fail-1")]));
    expect(getCachedReactions("fail-1")).toBeNull();
  });

  it("scrollToTop ハンドルで FlashList の scrollToOffset を呼ぶ", async () => {
    const fetcher = jest.fn().mockResolvedValue([]);
    const ref = React.createRef<TimelineHandle>();

    await render(<TimelineBase fetcher={fetcher} ref={ref} />);
    await waitFor(() => expect(mockCaptured).not.toBeNull());

    ref.current?.scrollToTop();

    expect(mockCapturedScrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: true });
  });
});
