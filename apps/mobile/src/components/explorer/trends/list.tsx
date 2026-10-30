import {
  CatalystBadge,
  CatalystBadgeText,
  CatalystEmptyState,
  CatalystSkeleton,
  CatalystText,
  type CatalystBadgeTone,
} from "@/components/design-system";
import { catalystBadgeTextTone } from "@/components/design-system/shared";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { clientAtom } from "@/models/atoms/credential";
import type { RichTrendingItemResponse } from "@natsuneko-laboratory/catalyst-sdk";
import { FlashList, FlashListRef, ListRenderItem } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { Minus, Sparkles, TrendingDown, TrendingUp, TrendingUpDown } from "lucide-react-native";
import { memo, useCallback, useImperativeHandle, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { withUniwind } from "uniwind";

type TimelineHandle = {
  scrollToTop: () => void;
};

type Movement = RichTrendingItemResponse["movement"];

// Web 版のトレンドカードと同じ文言・色の対応にする
const MOVEMENTS = {
  up: { label: "上昇", tone: "success", Icon: withUniwind(TrendingUp) },
  down: { label: "下降", tone: "danger", Icon: withUniwind(TrendingDown) },
  same: { label: "維持", tone: "neutral", Icon: withUniwind(Minus) },
  new: { label: "新規", tone: "warning", Icon: withUniwind(Sparkles) },
} satisfies Record<Movement, { label: string; tone: CatalystBadgeTone; Icon: unknown }>;

const UniTrendingUpDownIcon = withUniwind(TrendingUpDown);

const TrendCard = memo(({ trend }: { trend: RichTrendingItemResponse }) => {
  const router = useRouter();
  const { label, tone, Icon } = MOVEMENTS[trend.movement];

  return (
    <Pressable
      className="mx-3 mb-3 rounded-xl border border-light-divider bg-light-surface p-4 active:opacity-80 dark:border-dark-divider dark:bg-dark-surface"
      onPress={() => router.push(`/search/${encodeURIComponent(trend.tag)}`)}
    >
      <View className="mb-3 flex-row items-center justify-between gap-3">
        <CatalystText variant="mono" tone="muted" className="uppercase tracking-widest">
          #{trend.rank} Trending
        </CatalystText>
        <CatalystBadge tone={tone} className="gap-1">
          <Icon size={12} className={catalystBadgeTextTone[tone]} />
          <CatalystBadgeText>{label}</CatalystBadgeText>
        </CatalystBadge>
      </View>
      <CatalystText className="text-xl font-semibold">{trend.tag}</CatalystText>
      {trend.previousRank ? (
        <CatalystText tone="muted" className="mt-2">
          前回 #{trend.previousRank}
        </CatalystText>
      ) : null}
    </Pressable>
  );
});
TrendCard.displayName = "TrendCard";

const TrendListPlaceholder = () => {
  return (
    <View accessibilityLabel="トレンドを読み込み中" accessibilityRole="progressbar" className="flex-1">
      {Array.from({ length: 4 }, (_, index) => (
        <View
          key={index}
          className="mx-3 mb-3 gap-3 rounded-xl border border-light-divider p-4 dark:border-dark-divider"
        >
          <CatalystSkeleton className="h-3 w-24 rounded-full" />
          <CatalystSkeleton className="h-5 w-2/5 rounded-full" />
          <CatalystSkeleton className="h-3 w-16 rounded-full" />
        </View>
      ))}
    </View>
  );
};

const TrendsEmptyResult = () => {
  return (
    <CatalystEmptyState
      icon={<UniTrendingUpDownIcon />}
      title="トレンドはまだありません"
      description="投稿が増えると、ここに注目されているタグが表示されます。"
    />
  );
};

type Props = {
  ref?: React.Ref<TimelineHandle>;
};

export const TrendList = ({ ref }: Props) => {
  const client = useAtomValue(clientAtom);
  const [trends, setTrends] = useState<RichTrendingItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const list = useRef<FlashListRef<RichTrendingItemResponse>>(null);

  const fetchTrends = useCallback(async () => {
    if (!client) return;

    const { data } = await client.catalyst.v1.trend.get({ query: { format: "rich" }, throwOnError: true });
    // format=rich を指定しているので文字列は返らないはずだが、型の上では混ざりうるので除く
    setTrends((data ?? []).filter((w): w is RichTrendingItemResponse => typeof w !== "string"));
  }, [client]);

  useAsyncEffect(async () => {
    setIsLoading(true);
    try {
      await fetchTrends();
    } finally {
      setIsLoading(false);
    }
  }, [fetchTrends]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchTrends();
    } catch (e) {
      // 失敗したら前のトレンドを出したままにする
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchTrends]);

  const onRender = useCallback<ListRenderItem<RichTrendingItemResponse>>(({ item }) => {
    return <TrendCard trend={item} />;
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      scrollToTop: () => {
        list.current?.scrollToOffset({ offset: 0, animated: true });
      },
    }),
    [],
  );

  return (
    <FlashList
      ref={list}
      data={trends}
      keyExtractor={(w) => w.tag}
      renderItem={onRender}
      ListHeaderComponent={<View className="h-4" />}
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      ListEmptyComponent={isLoading ? TrendListPlaceholder : TrendsEmptyResult}
      ListEmptyComponentStyle={{ minHeight: "80%" }}
    />
  );
};
