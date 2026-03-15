import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { cn } from "@/lib/utils";
import { clientAtom } from "@/models/atoms/credential";
import type { Notification } from "@natsuneko-laboratory/catalyst-sdk";
import { FlashList } from "@shopify/flash-list";
import { useAtomValue } from "jotai";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Platform, PushNotificationIOS, RefreshControl, Text, View, useColorScheme } from "react-native";
import { FollowNotification } from "./follow";
import { ReactionNotification } from "./reaction";

const REACTION_TITLE = "natsuneko-laboratory:reaction:increment";
const FOLLOW_TITLE = "natsuneko-laboratory:follow:increment";

const ItemSeparator = () => {
  const theme = useColorScheme();
  return <View className={cn("h-px", theme === "dark" ? "bg-gray-700" : "bg-gray-300")} />;
};

const EmptyState = () => (
  <View className="flex-1 items-center justify-center py-16 gap-4">
    <Text className="text-5xl">🔕</Text>
    <Text className="text-base font-bold text-light-icon dark:text-dark-icon">通知がありません</Text>
  </View>
);

export const SystemNotificationList = () => {
  const client = useAtomValue(clientAtom);
  const [items, setItems] = useState<Notification[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(
    async (since: string | null, until: string | null) => {
      if (!client) return [];

      const result = await client.steambird.notifications(client.steambird.ISSUER_CATALYST_SYSTEM_MESSAGE, {
        ...(since ? { since } : {}),
        ...(until ? { until } : {}),
      });
      return result.notifications.filter((n) => n.title === REACTION_TITLE || n.title === FOLLOW_TITLE);
    },
    [client],
  );

  const markAllAsRead = useCallback(async () => {
    if (!client) return;
    try {
      await client.steambird.readAll(client.steambird.ISSUER_CATALYST_SYSTEM_MESSAGE);
      if (Platform.OS === "ios") {
        PushNotificationIOS.setApplicationIconBadgeNumber(0);
      }
    } catch {
      // 既読処理の失敗は無視
    }
  }, [client]);

  useAsyncOneTimeEffect(async () => {
    if (!client) return;
    setIsLoading(true);
    try {
      const notifications = await fetchNotifications(null, null);
      setItems(notifications);
      await markAllAsRead();
    } finally {
      setIsLoading(false);
    }
  });

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const since = items.length > 0 ? items[0].id : null;
      const newItems = await fetchNotifications(since, null);
      if (newItems.length > 0) {
        const existingIds = new Set(items.map((i) => i.id));
        const unique = newItems.filter((n) => !existingIds.has(n.id));
        setItems((prev) => [...unique, ...prev]);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [items, fetchNotifications]);

  const onLoadMore = useCallback(async () => {
    if (isLoading || items.length === 0) return;
    setIsLoading(true);
    try {
      const until = items[items.length - 1].id;
      const newItems = await fetchNotifications(null, until);
      if (newItems.length > 0) {
        const existingIds = new Set(items.map((i) => i.id));
        const unique = newItems.filter((n) => !existingIds.has(n.id));
        setItems((prev) => [...prev, ...unique]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [items, isLoading, fetchNotifications]);

  const renderItem = useCallback(({ item }: { item: Notification }) => {
    if (item.title === REACTION_TITLE) {
      return <ReactionNotification notification={item} />;
    }
    if (item.title === FOLLOW_TITLE) {
      return <FollowNotification notification={item} />;
    }
    return null;
  }, []);

  return (
    <FlashList
      keyExtractor={(w) => w.id}
      data={items}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.75}
      ItemSeparatorComponent={ItemSeparator}
      ListFooterComponent={isLoading ? <ActivityIndicator className="py-4" /> : null}
      ListEmptyComponent={!isLoading ? EmptyState : undefined}
    />
  );
};
