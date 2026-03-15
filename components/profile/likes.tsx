import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { cn } from "@/lib/utils";
import { clientAtom } from "@/models/atoms/credential";
import { CatalystStatus } from "@natsuneko-laboratory/catalyst-sdk";
import { useAtomValue } from "jotai";
import { HeartOff, Lock } from "lucide-react-native";
import React, { memo, useCallback, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, Text, useColorScheme, View } from "react-native";
import { TimelineStatus } from "../timeline/status";
import { UserTimelineHandle } from "./timeline";

import "@/global.css";

const ItemSeparator = () => {
  const theme = useColorScheme();
  return <View className={cn("h-px", theme === "dark" ? "bg-gray-700" : "bg-gray-300")} />;
};

const PrivacyNotice = () => {
  const theme = useColorScheme();
  return (
    <View className="flex-row items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800">
      <Lock size={14} color={theme === "dark" ? "#9CA3AF" : "#6B7280"} />
      <Text className="text-sm text-gray-500 dark:text-gray-400">いいねは非公開です。自分にのみ表示されます。</Text>
    </View>
  );
};

const EmptyState = () => {
  const theme = useColorScheme();
  return (
    <View className="items-center justify-center py-16">
      <HeartOff size={48} color={theme === "dark" ? "#6B7280" : "#9CA3AF"} />
      <Text className="mt-4 text-base text-gray-500 dark:text-gray-400">いいねした投稿がありません</Text>
    </View>
  );
};

export const UserLikes = memo(
  React.forwardRef<UserTimelineHandle>((_props, ref) => {
    const client = useAtomValue(clientAtom);
    const [items, setItems] = useState<CatalystStatus[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const isLoadingRef = useRef(false);

    const fetchItems = useCallback(async () => {
      setIsLoading(true);
      isLoadingRef.current = true;
      try {
        const result = await client.catalyst.favoriteTimeline({});
        setItems(result.statuses);
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
        setHasFetched(true);
      }
    }, [client]);

    const loadMore = useCallback(async () => {
      if (isLoadingRef.current) return;

      const lastItem = items[items.length - 1];
      if (!lastItem) return;

      setIsLoading(true);
      isLoadingRef.current = true;
      try {
        const result = await client.catalyst.favoriteTimeline({
          until: lastItem.id,
        });
        if (result.statuses.length > 0) {
          const filtered = result.statuses.filter((w) => !items.find((v) => v.id === w.id));
          setItems((prev) => [...prev, ...filtered]);
        }
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    }, [items, client]);

    useImperativeHandle(ref, () => ({ loadMore }), [loadMore]);

    useAsyncOneTimeEffect(fetchItems);

    return (
      <View>
        <PrivacyNotice />
        {hasFetched && items.length === 0 ? (
          <EmptyState />
        ) : (
          items.map((item, index) => (
            <View key={item.id}>
              {index > 0 && <ItemSeparator />}
              <TimelineStatus status={item} />
            </View>
          ))
        )}
        {isLoading && (
          <View className="py-4">
            <ActivityIndicator />
          </View>
        )}
      </View>
    );
  }),
);
UserLikes.displayName = "UserLikes";
