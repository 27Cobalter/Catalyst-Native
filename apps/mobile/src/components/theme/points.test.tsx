import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { createStore, Provider } from "jotai";

import ThemePointsScreen from "@/app/theme/points";
import { abs } from "@/lib/dayjs";
import { accountAtom } from "@/models/atoms/account";
import { openUrlWithBrowser } from "@/models/browser-settings";
import type { PointLedgerResponse } from "@natsuneko-laboratory/catalyst-sdk";

// app/ の下に置くとルートとして読まれるので、画面のテストはここに置く

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("lucide-react-native", () => new Proxy({}, { get: () => () => null }));
jest.mock("expo-image", () => ({ Image: () => null }));
jest.mock("@/models/browser-settings", () => ({ openUrlWithBrowser: jest.fn(() => Promise.resolve()) }));
jest.mock("react-native-toast-message", () => ({ show: jest.fn() }));
// design-system の index 経由で読まれる reanimated は jest 環境で初期化できないので、使わない部品ごと差し替える
jest.mock("@/components/design-system/switch", () => ({ CatalystSwitch: () => null }));
jest.mock("@/components/design-system/tabs", () => ({ CatalystTabs: () => null, usePagerGestures: () => ({}) }));
// FlashList は jest ではレイアウトが無く行を描かないので、ヘッダー・行・空表示をそのまま並べる
type MockListProps = {
  data: unknown[];
  renderItem: (info: { item: unknown }) => React.ReactNode;
  ListHeaderComponent?: React.ReactNode;
  ListEmptyComponent?: React.ReactNode;
  onEndReached?: () => void;
  refreshControl?: React.ReactElement<{ onRefresh: () => void }>;
};
jest.mock("@shopify/flash-list", () => {
  const { View } = jest.requireActual("react-native");
  return {
    FlashList: ({ data, renderItem, ListHeaderComponent, ListEmptyComponent, onEndReached, refreshControl }: MockListProps) => (
      <View testID="points-list" onEndReached={onEndReached} onRefresh={refreshControl?.props.onRefresh}>
        {ListHeaderComponent}
        {data.length === 0
          ? ListEmptyComponent
          : data.map((item, index) => <View key={index}>{renderItem({ item })}</View>)}
      </View>
    ),
  };
});

const balance = {
  balance: 24,
  totalEarned: 26,
  totalRedeemed: 0,
  streak: { current: 1, longest: 4, nextBonus: { name: "2週連続達成", weeksRemaining: 1, bonusPoints: 1 } },
};

const CREATED_AT = "2026-10-26T07:09:00+09:00";

const entry = (id: string, overrides: Partial<PointLedgerResponse> = {}): PointLedgerResponse => ({
  id,
  amount: 1,
  reason: "earned",
  balanceAfter: 24,
  source: { type: "catalyst_weekly_theme", label: `お題 ${id}`, href: `/themes/theme-${id}` },
  createdAt: CREATED_AT,
  ...overrides,
});

type Page = { items: PointLedgerResponse[]; nextCursor: string | null };

// Error を渡すと、その回のリクエストを失敗させる
const renderScreen = async (pages: (Page | Error)[], balanceResult: unknown = balance) => {
  const history = jest.fn();
  pages.forEach((page) =>
    page instanceof Error ? history.mockRejectedValueOnce(page) : history.mockResolvedValueOnce({ data: page }),
  );
  const get = jest.fn();
  if (balanceResult instanceof Error) get.mockRejectedValue(balanceResult);
  else get.mockResolvedValue({ data: balanceResult });
  const client = { giftia: { v1: { points: { get, history: { get: history } } } } };
  const store = createStore();
  store.set(accountAtom, { user: { id: "me" }, credential: { client, accessToken: "token" } } as never);

  await render(
    <Provider store={store}>
      <ThemePointsScreen />
    </Provider>,
  );
  await act(async () => {});

  return { history };
};

beforeEach(() => {
  mockPush.mockClear();
  jest.mocked(openUrlWithBrowser).mockClear();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("ThemePointsScreen", () => {
  it("残高・連続参加・履歴を出す", async () => {
    await renderScreen([
      {
        items: [
          entry("1"),
          entry("2", { amount: -1, reason: "earned_revoked" }),
          entry("3", { source: { type: "catalyst_weekly_theme_streak", label: "4週連続達成", href: null }, amount: 2 }),
        ],
        nextCursor: null,
      },
    ]);

    expect(screen.getByText("24 pt")).toBeTruthy();
    expect(screen.getByText("累計獲得 26 pt ・ 累計交換 0 pt")).toBeTruthy();
    expect(screen.getByText("1 週連続")).toBeTruthy();
    expect(screen.getByText("次のボーナスまであと1週（+1pt）")).toBeTruthy();
    expect(screen.getByText("お題 1")).toBeTruthy();
    expect(screen.getByText("-1 pt")).toBeTruthy();
    expect(screen.getByText("+2 pt")).toBeTruthy();
    // 表示は端末のタイムゾーンによるので、期待する文字列も同じ関数で作る
    expect(screen.getAllByText(abs(CREATED_AT))).toHaveLength(3);
  });

  it("お題の履歴を押すとお題の画面を開き、リンクの無い履歴は押せない", async () => {
    await renderScreen([
      {
        items: [
          entry("1"),
          entry("2", { source: { type: "catalyst_weekly_theme_streak", label: "継続達成", href: null } }),
        ],
        nextCursor: null,
      },
    ]);

    await fireEvent.press(screen.getByText("お題 1"));
    expect(mockPush).toHaveBeenCalledWith("/theme/theme-1");

    await fireEvent.press(screen.getByText("継続達成"));
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("アプリに画面の無いリンクは Web 版で開く", async () => {
    await renderScreen([
      {
        items: [entry("1", { source: { type: "redemption", label: "交換", href: "/themes/points/redemptions/r1" } })],
        nextCursor: null,
      },
    ]);

    await fireEvent.press(screen.getByText("交換"));
    expect(mockPush).not.toHaveBeenCalled();
    expect(openUrlWithBrowser).toHaveBeenCalledWith("https://catalyst.natsuneko.com/themes/points/redemptions/r1");
  });

  it("お題のリンクにクエリや末尾の / が付いていてもアプリで開き、壊れたリンクでは何もしない", async () => {
    await renderScreen([
      {
        items: [
          entry("1", { source: { type: "catalyst_weekly_theme", label: "クエリ付き", href: "/themes/theme-1?ref=points" } }),
          entry("2", { source: { type: "catalyst_weekly_theme", label: "末尾スラッシュ", href: "/themes/theme-2/" } }),
          entry("3", { source: { type: "catalyst_weekly_theme", label: "壊れたリンク", href: "http://[bad" } }),
        ],
        nextCursor: null,
      },
    ]);

    await fireEvent.press(screen.getByText("クエリ付き"));
    await fireEvent.press(screen.getByText("末尾スラッシュ"));
    await fireEvent.press(screen.getByText("壊れたリンク"));
    expect(mockPush.mock.calls).toEqual([["/theme/theme-1"], ["/theme/theme-2"]]);
    expect(openUrlWithBrowser).not.toHaveBeenCalled();
  });

  it("履歴だけ読み込めなかったときも残高は出す", async () => {
    await renderScreen([new Error("history")]);

    expect(screen.getByText("24 pt")).toBeTruthy();
    expect(screen.getByText("履歴を読み込めませんでした")).toBeTruthy();
  });

  it("どちらも読み込めなかったときは再読み込みできる", async () => {
    const { history } = await renderScreen([new Error("history"), { items: [entry("1")], nextCursor: null }], new Error("balance"));

    expect(screen.getByText("お題ポイントを読み込めませんでした")).toBeTruthy();
    await fireEvent.press(screen.getByText("再読み込み"));
    await act(async () => {});

    expect(history).toHaveBeenCalledTimes(2);
    expect(screen.getByText("お題 1")).toBeTruthy();
  });

  it("交換は Web 版のポイントページを開く", async () => {
    await renderScreen([{ items: [], nextCursor: null }]);

    expect(screen.getByText("まだ履歴がありません")).toBeTruthy();
    await fireEvent.press(screen.getByText("Web 版で開く"));
    expect(openUrlWithBrowser).toHaveBeenCalledWith("https://catalyst.natsuneko.com/themes/points");
  });

  it("続きの読み込みが続けて呼ばれても、同じページを二重に読み込まない", async () => {
    const { history } = await renderScreen([
      { items: [entry("1")], nextCursor: "c1" },
      { items: [entry("2")], nextCursor: null },
    ]);

    await act(async () => {
      const { onEndReached } = screen.getByTestId("points-list").props;
      onEndReached();
      onEndReached();
    });

    expect(history).toHaveBeenCalledTimes(2);
  });

  it("引っぱって更新に失敗しても、前の履歴の続きを読み込める", async () => {
    const { history } = await renderScreen([
      { items: [entry("1")], nextCursor: "c1" },
      new Error("refresh"),
      { items: [entry("2")], nextCursor: null },
    ]);

    await act(async () => {
      await screen.getByTestId("points-list").props.onRefresh();
    });
    await act(async () => {
      await screen.getByTestId("points-list").props.onEndReached();
    });

    expect(history).toHaveBeenLastCalledWith({ query: { cursor: "c1" }, throwOnError: true });
    expect(screen.getByText("お題 2")).toBeTruthy();
  });

  it("続きの読み込み中に更新したら、古い続きは捨てて新しい cursor から読み込める", async () => {
    const { history } = await renderScreen([{ items: [entry("1")], nextCursor: "c1" }]);
    let resolveStale: (value: unknown) => void = () => {};
    history
      .mockImplementationOnce(() => new Promise((resolve) => (resolveStale = resolve)))
      .mockResolvedValueOnce({ data: { items: [entry("3")], nextCursor: "c3" } })
      .mockResolvedValueOnce({ data: { items: [entry("4")], nextCursor: null } });
    const list = () => screen.getByTestId("points-list").props;

    await act(async () => {
      list().onEndReached();
    });
    await act(async () => {
      await list().onRefresh();
    });
    await act(async () => {
      await list().onEndReached();
    });
    await act(async () => {
      resolveStale({ data: { items: [entry("2")], nextCursor: "c2" } });
    });

    expect(history).toHaveBeenLastCalledWith({ query: { cursor: "c3" }, throwOnError: true });
    expect(screen.getByText("お題 4")).toBeTruthy();
    expect(screen.queryByText("お題 2")).toBeNull();
  });

  it("末尾まで来たら続きの履歴を読み込む", async () => {
    const { history } = await renderScreen([
      { items: [entry("1")], nextCursor: "c1" },
      { items: [entry("1"), entry("2")], nextCursor: null },
    ]);

    await act(async () => {
      screen.getByTestId("points-list").props.onEndReached();
    });

    expect(history).toHaveBeenLastCalledWith({ query: { cursor: "c1" }, throwOnError: true });
    expect(screen.getByText("お題 2")).toBeTruthy();
    expect(screen.getAllByText("お題 1")).toHaveLength(1);
  });
});
