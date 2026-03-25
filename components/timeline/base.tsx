import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { cn } from "@/lib/utils";
import { CatalystStatus } from "@natsuneko-laboratory/catalyst-sdk";
import { FlashList, FlashListRef, ListRenderItem } from "@shopify/flash-list";
import React, { useCallback, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, StyleProp, useColorScheme, View, ViewStyle } from "react-native";
import { TimelineStatus } from "./status";

const ItemSeparator = () => {
  const theme = useColorScheme();
  return <View className={cn("h-px", theme === "dark" ? "bg-gray-700" : "bg-gray-300")} />;
};

const LoadingIndicator = () => {
  return (
    <View className="py-4">
      <ActivityIndicator />
    </View>
  );
};

type Props = {
  fetcher: (since: string | null, until: string | null) => Promise<CatalystStatus[]>;
  ListEmptyComponent?: React.ComponentType;
  ListEmptyComponentStyle?: StyleProp<ViewStyle>;
  ref?: React.Ref<TimelineHandle>;
};

export type TimelineHandle = {
  scrollToTop: () => void;
};

export const TimelineBase = ({ fetcher, ListEmptyComponent, ListEmptyComponentStyle, ref }: Props) => {
  const [items, setItems] = useState<CatalystStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<FlashListRef<CatalystStatus>>(null);

  const onRender = useCallback<ListRenderItem<CatalystStatus>>(({ item }) => {
    return <TimelineStatus status={item} />;
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const since = items.length > 0 ? items[0].id : null;
      const newItems = await fetcher(since, null);

      if (newItems) {
        setItems((prevItems) => [...newItems, ...prevItems]);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [items, fetcher]);

  const onLoadMore = useCallback(async () => {
    setIsLoading(true);

    try {
      const until = items.length > 0 ? items.slice(-1)[0].id : null;
      const newItems = await fetcher(null, until);

      if (newItems) {
        setItems((prevItems) => [...prevItems, ...newItems]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [items, fetcher]);

  useAsyncOneTimeEffect(async () => {
    setIsLoading(true);

    try {
      if (items.length === 0) {
        const items = await fetcher(null, null);

        if (items) {
          setItems(items);
        }
      }
    } finally {
      setIsLoading(false);
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

  return (
    <FlashList
      ref={listRef}
      keyExtractor={(w) => w.id}
      data={items}
      renderItem={onRender}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.75}
      ItemSeparatorComponent={ItemSeparator}
      ListFooterComponent={isLoading ? <LoadingIndicator /> : null}
      ListEmptyComponent={!isLoading ? ListEmptyComponent : undefined}
      ListEmptyComponentStyle={!isLoading ? ListEmptyComponentStyle : undefined}
    />
  );
};