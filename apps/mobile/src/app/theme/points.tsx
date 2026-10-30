import {
  CatalystButton,
  CatalystButtonIcon,
  CatalystButtonText,
  CatalystEmptyState,
  CatalystListItem,
  CatalystListItemContent,
  CatalystSurface,
  CatalystText,
} from "@/components/design-system";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { getAppPathFromUrl } from "@/lib/app-links";
import { abs } from "@/lib/dayjs";
import { cn } from "@/lib/utils";
import { clientAtom, credentialAtom } from "@/models/atoms/credential";
import { openUrlWithBrowser } from "@/models/browser-settings";
import type { PointBalanceResponse, PointLedgerResponse } from "@natsuneko-laboratory/catalyst-sdk";
import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { ChevronRight, Coins, ExternalLink } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, View } from "react-native";
import Toast from "react-native-toast-message";
import { withUniwind } from "uniwind";

const UniChevronRight = withUniwind(ChevronRight);
const UniCoins = withUniwind(Coins);
const UniExternalLink = withUniwind(ExternalLink);

const WEB_ORIGIN = "https://catalyst.natsuneko.com";
// 交換はアプリでは行わず、Web 版のポイントページへ案内する
const WEB_POINTS_URL = `${WEB_ORIGIN}/themes/points`;

// アプリに画面があるのはお題だけなので、それ以外 (交換の詳細など) のリンクは Web 版で開く
const THEME_PATH = /^\/theme\/[^/]+$/;

const openInBrowser = (url: string) => {
  openUrlWithBrowser(url).catch((e) => console.error(e));
};

const openLedgerLink = (router: ReturnType<typeof useRouter>, href: string) => {
  let url: string;
  try {
    // 台帳の href はサイト内のパスで返ることもあるので、Catalyst の URL として解決する
    url = new URL(href, WEB_ORIGIN).toString();
  } catch (e) {
    console.error(e);
    return;
  }
  // クエリや末尾の / が付いていてもお題として開けるよう、パスの部分だけで判定する
  const pathname = getAppPathFromUrl(url).split(/[?#]/)[0].replace(/\/$/, "");
  if (THEME_PATH.test(pathname) && pathname !== "/theme/points") {
    router.push(pathname as never);
  } else {
    openInBrowser(url);
  }
};

const formatAmount = (amount: number) => `${amount > 0 ? "+" : ""}${amount} pt`;

const amountTone = (amount: number) => (amount > 0 ? "success" : amount < 0 ? "danger" : "muted");

const HISTORY_EMPTY_TEXTS = {
  failed: { title: "履歴を読み込めませんでした", description: "下に引っぱると読み込み直せます" },
  empty: { title: "まだ履歴がありません", description: "お題に参加すると、ここにポイントの記録が並びます" },
};

const showLoadError = () =>
  Toast.show({ type: "error", text1: "読み込めませんでした", text2: "時間をおいてもう一度お試しください" });

const BalanceSection = ({ balance }: { balance: PointBalanceResponse | null }) => {
  const nextBonus = balance?.streak.nextBonus;

  return (
    <View className="gap-3 px-4 pt-4">
      <CatalystSurface radius="lg" className="gap-1 p-4">
        <CatalystText variant="caption" tone="muted">
          現在のポイント
        </CatalystText>
        <CatalystText className="text-3xl font-bold">
          {balance ? `${balance.balance} pt` : "-"}
        </CatalystText>
        {balance ? (
          <CatalystText variant="caption" tone="subtle">
            累計獲得 {balance.totalEarned} pt ・ 累計交換 {balance.totalRedeemed} pt
          </CatalystText>
        ) : null}
      </CatalystSurface>

      <CatalystSurface radius="lg" className="gap-1 p-4">
        <CatalystText variant="caption" tone="muted">
          連続参加
        </CatalystText>
        <CatalystText variant="title">{balance ? `${balance.streak.current} 週連続` : "-"}</CatalystText>
        {nextBonus ? (
          <CatalystText variant="caption" tone="subtle">
            次のボーナスまであと{nextBonus.weeksRemaining}週（+{nextBonus.bonusPoints}pt）
          </CatalystText>
        ) : null}
        {balance ? (
          <CatalystText variant="caption" tone="subtle">
            最長連続記録: {balance.streak.longest}週
          </CatalystText>
        ) : null}
      </CatalystSurface>

      <CatalystSurface radius="lg" className="gap-3 p-4">
        <View className="gap-1">
          <CatalystText variant="subtitle">ポイントを交換する</CatalystText>
          <CatalystText tone="muted">ポイントの交換は Web 版のお題ポイントページから行えます。</CatalystText>
        </View>
        <CatalystButton tone="secondary" onPress={() => openInBrowser(WEB_POINTS_URL)}>
          <CatalystButtonIcon>
            <UniExternalLink />
          </CatalystButtonIcon>
          <CatalystButtonText>Web 版で開く</CatalystButtonText>
        </CatalystButton>
      </CatalystSurface>

      <CatalystText variant="subtitle" className="pt-3">
        履歴
      </CatalystText>
    </View>
  );
};

const LedgerRow = ({ entry }: { entry: PointLedgerResponse }) => {
  const router = useRouter();
  const href = entry.source.href;

  return (
    <CatalystListItem
      disabled={!href}
      accessibilityRole={href ? "link" : "text"}
      onPress={() => href && openLedgerLink(router, href)}
    >
      <CatalystListItemContent>
        <CatalystText variant="label" numberOfLines={1}>
          {entry.source.label}
        </CatalystText>
        <CatalystText variant="caption" tone="subtle">
          {abs(entry.createdAt)}
        </CatalystText>
      </CatalystListItemContent>
      <CatalystText variant="label" tone={amountTone(entry.amount)}>
        {formatAmount(entry.amount)}
      </CatalystText>
      {/* リンクが無い行もシェブロンを透明にして置き、金額の右端を揃える */}
      <UniChevronRight
        size={17}
        className={cn("text-light-text-subtle dark:text-dark-text-subtle", !href && "opacity-0")}
      />
    </CatalystListItem>
  );
};

export default function ThemePointsScreen() {
  const client = useAtomValue(clientAtom);
  const credential = useAtomValue(credentialAtom);
  const [balance, setBalance] = useState<PointBalanceResponse | null>(null);
  const [entries, setEntries] = useState<PointLedgerResponse[]>([]);
  const [balanceFailed, setBalanceFailed] = useState(false);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // 描画に使わず、続きの読み込みを始める前にすぐ確かめたいものは ref で持つ
  const nextCursor = useRef<string | null>(null);
  const loadingMore = useRef(false);
  // 最初から読み直したら番号を進め、読み直す前に出した続きのリクエストが後から返ってきても結果を捨てる
  const requestId = useRef(0);
  // いま出している履歴と cursor を読み込んだときの番号。requestId と違う間は読み直しの途中なので、続きを読み込まない
  const shownId = useRef(0);
  const isLoggedIn = !!credential.accessToken;

  /** 読み込めたら true、どちらかに失敗したら false、より新しい読み込みに追い越されたら undefined を返す */
  const load = useCallback(async () => {
    const points = client?.giftia.v1.points;
    // ログアウトしたときも番号を進め、前のアカウントの読み込みが後から返ってきても捨てる
    const id = ++requestId.current;
    // 読み直しに追い越された続きの読み込みは結果を捨てるので、読み込み中の印もここで下ろす
    loadingMore.current = false;
    setIsLoadingMore(false);
    if (!points || !isLoggedIn) {
      setBalance(null);
      setEntries([]);
      nextCursor.current = null;
      shownId.current = id;
      return true;
    }
    // 片方だけ失敗しても、読めたほうは出す
    const [b, h] = await Promise.allSettled([
      points.get({ throwOnError: true }),
      points.history.get({ throwOnError: true }),
    ]);
    if (id !== requestId.current) return undefined;
    if (b.status === "fulfilled") setBalance(b.value.data);
    else console.error(b.reason);
    if (h.status === "fulfilled") {
      setEntries(h.value.data.items);
      nextCursor.current = h.value.data.nextCursor;
    } else {
      // 履歴が読めなかったときは前の履歴と cursor をそのまま残し、続きも読めるようにしておく
      console.error(h.reason);
    }
    shownId.current = id;
    setBalanceFailed(b.status === "rejected");
    setHistoryFailed(h.status === "rejected");
    return b.status === "fulfilled" && h.status === "fulfilled";
  }, [client, isLoggedIn]);

  const reload = useCallback(async () => {
    setLoading(true);
    // 追い越された読み込みが、新しい読み込みの途中で読み込み中の表示を消さないようにする
    if ((await load()) !== undefined) setLoading(false);
  }, [load]);

  useAsyncEffect(reload, [reload]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const ok = await load();
    setRefreshing(false);
    if (ok === false) showLoadError();
  }, [load]);

  const onLoadMore = useCallback(async () => {
    const points = client?.giftia.v1.points;
    const cursor = nextCursor.current;
    // FlashList は描画の前に何度も呼ぶことがあるので、state ではなく ref で二重に読み込まないようにする
    if (!points || !cursor || loadingMore.current || shownId.current !== requestId.current) return;
    const id = requestId.current;
    loadingMore.current = true;
    setIsLoadingMore(true);
    try {
      const { data } = await points.history.get({ query: { cursor }, throwOnError: true });
      if (id !== requestId.current) return;
      setEntries((previous) => {
        const ids = new Set(previous.map((e) => e.id));
        return [...previous, ...data.items.filter((item) => !ids.has(item.id))];
      });
      nextCursor.current = data.nextCursor;
    } catch (e) {
      console.error(e);
    } finally {
      // 読み直しに追い越されたときは、読み直しの側で印を下ろしているので触らない
      if (id === requestId.current) {
        loadingMore.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [client]);

  const renderItem = useCallback<ListRenderItem<PointLedgerResponse>>(({ item }) => <LedgerRow entry={item} />, []);

  if (!isLoggedIn) {
    return (
      <View className="flex-1 bg-light-background dark:bg-dark-background">
        <CatalystEmptyState icon={<UniCoins />} title="ログインするとお題ポイントを確認できます" />
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-light-background dark:bg-dark-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (balanceFailed && historyFailed && !balance && entries.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-light-background px-6 dark:bg-dark-background">
        <CatalystEmptyState
          className="h-auto"
          icon={<UniCoins />}
          title="お題ポイントを読み込めませんでした"
          description="時間をおいてもう一度お試しください"
        />
        <CatalystButton tone="secondary" onPress={reload}>
          <CatalystButtonText>再読み込み</CatalystButtonText>
        </CatalystButton>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <FlashList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={<BalanceSection balance={balance} />}
        ListEmptyComponent={
          // 既定の h-full だとヘッダーを含めた高さいっぱいに広がり、文字が画面の外に出るので h-auto にする
          <CatalystEmptyState
            icon={<UniCoins />}
            className="h-auto"
            {...HISTORY_EMPTY_TEXTS[historyFailed ? "failed" : "empty"]}
          />
        }
        ListFooterComponent={isLoadingMore ? <ActivityIndicator className="py-4" /> : <View className="h-8" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.75}
      />
    </View>
  );
}
