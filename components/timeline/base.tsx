import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { cn } from "@/lib/utils";
import { CatalystStatus } from "@natsuneko-laboratory/catalyst-sdk";
import { FlashList, ListRenderItem } from "@shopify/flash-list";
import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, useColorScheme, View } from "react-native";
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
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  onScroll?: React.ComponentProps<typeof FlashList<CatalystStatus>>["onScroll"];
};

export const TimelineBase = ({ fetcher, ListHeaderComponent, onScroll }: Props) => {
  const [items, setItems] = useState<CatalystStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <FlashList
      keyExtractor={(w) => w.id}
      data={items}
      renderItem={onRender}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.75}
      ItemSeparatorComponent={ItemSeparator}
      ListFooterComponent={isLoading ? <LoadingIndicator /> : null}
      ListHeaderComponent={ListHeaderComponent}
      onScroll={onScroll}
      scrollEventThrottle={onScroll ? 16 : undefined}
    />
  );
};
