import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { merge } from "@/lib/merge";
import { clientAtom } from "@/models/atoms/credential";
import { applyFetchedReactionsAtom, applyFetchedStatusesAtom } from "@/models/atoms/reactions";
import { reactionClock } from "@/models/reaction-freshness";
import type { CatalystStatus, CatalystStatusV1_1, CatalystStatusV1_2 } from "@/models/sdk-types";
import { FlashList, FlashListRef, ListRenderItem } from "@shopify/flash-list";
import { useAtomValue, useSetAtom } from "jotai";
import React, { useCallback, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, StyleProp, View, ViewStyle } from "react-native";
import { TimelinePlaceholder } from "./placeholder";
import { TimelineAdvertisement } from "./advertisement";
import { TimelineStatus } from "./status";

const ItemSeparator = () => {
  return <View className="h-px bg-light-divider dark:bg-dark-divider" />;
};

const LoadingIndicator = () => {
  return (
    <View className="py-4">
      <ActivityIndicator />
    </View>
  );
};

type Props = {
  fetcher: (since: string | null, until: string | null) => Promise<TimelineStatusItem[]>;
  renderItem?: ListRenderItem<TimelineStatusItem>;
  ListHeaderComponent?: React.ComponentType;
  ListEmptyComponent?: React.ComponentType;
  ListEmptyComponentStyle?: StyleProp<ViewStyle>;
  onRefresh?: () => void;
  ref?: React.Ref<TimelineHandle>;
};

export type TimelineStatusItem = CatalystStatus | CatalystStatusV1_1 | CatalystStatusV1_2;

export type TimelineHandle = {
  scrollToTop: () => void;
};

// POST /catalyst/v1/statuses/reactions が一度に受け付ける投稿の数
const MAX_REACTION_REFRESH_COUNT = 100;

const isAdvertisement = (item: TimelineStatusItem) => "advertisement" in item && !!item.advertisement;

// 本文などを抜いて届く合言葉付きの投稿
const isLocked = (item: TimelineStatusItem) => "locked" in item && !!item.locked;

const getPaginationCursor = (item: TimelineStatusItem): string => {
  if ("cursor" in item && typeof item.cursor === "string" && item.cursor.length > 0) {
    return item.cursor;
  }

  return item.id;
};

export const TimelineBase = ({
  fetcher,
  renderItem,
  ListHeaderComponent,
  ListEmptyComponent,
  ListEmptyComponentStyle,
  onRefresh: onRefreshCallback,
  ref,
}: Props) => {
  const [items, setItems] = useState<TimelineStatusItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const listRef = useRef<FlashListRef<TimelineStatusItem>>(null);
  const sets = useRef<Set<string>>(new Set());
  const hasMore = useRef(true);
  const isLoadingRef = useRef(false);

  const client = useAtomValue(clientAtom);
  const applyFetchedReactions = useSetAtom(applyFetchedReactionsAtom);
  const applyFetchedStatuses = useSetAtom(applyFetchedStatusesAtom);

  // 読み込み済みの投稿のリアクションを取り直す。pull-to-refresh は先頭で行うので、先頭から順に取る
  const refreshReactions = useCallback(
    async (statuses: TimelineStatusItem[]) => {
      const ids = statuses
        .filter((item) => !isAdvertisement(item) && !isLocked(item))
        .slice(0, MAX_REACTION_REFRESH_COUNT)
        .map((item) => item.id);
      if (ids.length === 0) return;

      const requestedAt = reactionClock();
      try {
        const { data } = await client.catalyst.v1.statuses.reactions.create({ body: { ids }, throwOnError: true });
        applyFetchedReactions({ entries: Object.entries(data.reactions), requestedAt });
      } catch {
        // 取り直せなくても、表示はそのままにする
      }
    },
    [client, applyFetchedReactions],
  );

  const defaultRender = useCallback<ListRenderItem<TimelineStatusItem>>(({ item }) => {
    if ("advertisement" in item && item.advertisement) {
      return <TimelineAdvertisement status={item} />;
    }

    return <TimelineStatus status={item} />;
  }, []);

  const getItemType = useCallback(
    (item: TimelineStatusItem) => (isAdvertisement(item) ? "advertisement" : "status"),
    [],
  );

  const onRender = renderItem ?? defaultRender;

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    hasMore.current = true;

    // 新着の読み込みは待たせない
    void refreshReactions(items);

    const requestedAt = reactionClock();
    try {
      const since = items.length > 0 ? getPaginationCursor(items[0]) : null;
      const [newItems] = await Promise.all([
        //
        fetcher(since, null),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);

      if (newItems.length > 0) {
        applyFetchedStatuses({ statuses: newItems, requestedAt });
        setItems((prevItems) => merge(prevItems, newItems, sets, (item) => item.id, "first"));
      }
    } finally {
      setIsRefreshing(false);
      onRefreshCallback?.();
    }
  }, [items, fetcher, refreshReactions, applyFetchedStatuses, onRefreshCallback]);

  const onLoadMore = useCallback(async () => {
    if (!hasMore.current || isLoadingRef.current || isInitialLoading) return;

    setIsLoadingMore(true);
    isLoadingRef.current = true;

    try {
      const until = items.length > 0 ? getPaginationCursor(items.slice(-1)[0]) : null;
      const requestedAt = reactionClock();
      const newItems = await fetcher(null, until);

      if (newItems.length > 0) {
        const actuallyNew = newItems.filter((item) => !sets.current.has(item.id));
        if (actuallyNew.length > 0) {
          applyFetchedStatuses({ statuses: actuallyNew, requestedAt });
          setItems((prevItems) => merge(prevItems, newItems, sets, (item) => item.id));
        } else {
          hasMore.current = false;
        }
      } else {
        hasMore.current = false;
      }
    } finally {
      setIsLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [items, fetcher, isInitialLoading, applyFetchedStatuses]);

  useAsyncOneTimeEffect(async () => {
    setIsInitialLoading(true);
    isLoadingRef.current = true;

    try {
      if (items.length === 0) {
        const requestedAt = reactionClock();
        const items = await fetcher(null, null);

        if (items) {
          applyFetchedStatuses({ statuses: items, requestedAt });
          setItems((prev) => merge(prev, items, sets, (item) => item.id));
        }
      }
    } finally {
      setIsInitialLoading(false);
      isLoadingRef.current = false;
    }
  });

  useImperativeHandle(
    ref,
    () => ({
      scrollToTop: () => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      },
    }),
    [],
  );

  const EmptyComponent = isInitialLoading ? TimelinePlaceholder : ListEmptyComponent;

  return (
    <FlashList
      ref={listRef}
      keyExtractor={(w) => w.id}
      data={items}
      renderItem={onRender}
      getItemType={getItemType}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.75}
      ItemSeparatorComponent={ItemSeparator}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={isLoadingMore ? <LoadingIndicator /> : null}
      ListEmptyComponent={EmptyComponent}
      ListEmptyComponentStyle={!isInitialLoading ? ListEmptyComponentStyle : undefined}
    />
  );
};
