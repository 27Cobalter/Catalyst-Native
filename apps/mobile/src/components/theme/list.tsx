import { LIST_COLUMNS } from "@/lib/device-layout";
import { CatalystEmptyState, CatalystSkeleton } from "@/components/design-system";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { clientAtom } from "@/models/atoms/credential";
import type { CatalystWeeklyTheme } from "@/models/sdk-types";
import { FlashList, FlashListRef, type ListRenderItem } from "@shopify/flash-list";
import { useAtomValue } from "jotai";
import { CalendarDays } from "lucide-react-native";
import { type Ref, useCallback, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, View } from "react-native";
import { withUniwind } from "uniwind";
import { WeeklyThemeCard } from "./card";

const UniCalendarDays = withUniwind(CalendarDays);

type TimelineHandle = {
  scrollToTop: () => void;
};

type Props = {
  state: "open" | "closed";
  ref?: Ref<TimelineHandle>;
};

const ThemePlaceholder = () => (
  <View className="gap-4 px-3 py-3">
    {Array.from({ length: 3 }, (_, index) => (
      <View key={index} className="gap-2">
        <CatalystSkeleton className="h-32 w-full rounded-xl" />
        <CatalystSkeleton className="h-4 w-3/5 rounded-full" />
        <CatalystSkeleton className="h-3 w-full rounded-full" />
      </View>
    ))}
  </View>
);

const EmptyState = ({ state }: Pick<Props, "state">) => (
  <CatalystEmptyState
    icon={<UniCalendarDays />}
    title={state === "open" ? "開催中のお題はありません" : "過去のお題はありません"}
    description={state === "open" ? "次のお題をお待ちください" : undefined}
  />
);

export const WeeklyThemeList = ({ state, ref }: Props) => {
  const client = useAtomValue(clientAtom);
  const [themes, setThemes] = useState<CatalystWeeklyTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const list = useRef<FlashListRef<CatalystWeeklyTheme>>(null);

  const fetchThemes = useCallback(
    async (cursor?: string | null) => {
      const weeklyThemes = client?.catalyst.v1.weeklyThemes;
      if (!weeklyThemes) {
        return { themes: [], nextCursor: null };
      }
      const { data } = await weeklyThemes.get({
        query: { state, take: 20, cursor: cursor ?? undefined },
        throwOnError: true,
      });

      return data;
    },
    [client, state],
  );

  const load = useCallback(async () => {
    const data = await fetchThemes();
    setThemes(data.themes);
    setNextCursor(data.nextCursor);
  }, [fetchThemes]);

  useAsyncEffect(async () => {
    setLoading(true);
    try {
      await load();
    } finally {
      setLoading(false);
    }
  }, [load]);

  useImperativeHandle(
    ref,
    () => ({ scrollToTop: () => list.current?.scrollToOffset({ offset: 0, animated: true }) }),
    [],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onLoadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const data = await fetchThemes(nextCursor);
      setThemes((previous) => [
        ...previous,
        ...data.themes.filter((theme) => !previous.some((item) => item.slug === theme.slug)),
      ]);
      setNextCursor(data.nextCursor);
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchThemes, isLoadingMore, nextCursor]);

  const renderItem = useCallback<ListRenderItem<CatalystWeeklyTheme>>(
    ({ item }) => <WeeklyThemeCard theme={item} />,
    [],
  );

  return (
    <FlashList
      numColumns={LIST_COLUMNS}
      ref={list}
      data={themes}
      keyExtractor={(item) => item.slug}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.75}
      ListEmptyComponent={loading ? ThemePlaceholder : <EmptyState state={state} />}
      ListEmptyComponentStyle={{ minHeight: "80%" }}
      ListFooterComponent={isLoadingMore ? <ActivityIndicator className="py-4" /> : null}
    />
  );
};
