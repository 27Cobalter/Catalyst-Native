import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { cn } from "@/lib/utils";
import { clientAtom } from "@/models/atoms/credential";
import { CatalystStatus, EgeriaUser } from "@natsuneko-laboratory/catalyst-sdk";
import { useAtomValue } from "jotai";
import React, { memo, useCallback, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import { TimelineStatus } from "../timeline/status";

type Props = {
  user?: EgeriaUser | null;
};

export type UserTimelineHandle = {
  loadMore: () => void;
};

const ItemSeparator = () => {
  const theme = useColorScheme();
  return <View className={cn("h-px", theme === "dark" ? "bg-gray-700" : "bg-gray-300")} />;
};

export const UserTimeline = memo(
  React.forwardRef<UserTimelineHandle, Props>(({ user }, ref) => {
    const client = useAtomValue(clientAtom);
    const [items, setItems] = useState<CatalystStatus[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const isLoadingRef = useRef(false);

    const fetchItems = useCallback(async () => {
      if (!user) {
        return;
      }

      setIsLoading(true);
      isLoadingRef.current = true;
      try {
        const result = await client.catalyst.userTimeline(user.screenName, {});
        setItems(result.statuses);
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    }, [client, user]);

    const loadMore = useCallback(async () => {
      if (!user || isLoadingRef.current) {
        return;
      }

      const lastItem = items[items.length - 1];
      if (!lastItem) return;

      setIsLoading(true);
      isLoadingRef.current = true;
      try {
        const result = await client.catalyst.userTimeline(user.screenName, {
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
    }, [user, items, client]);

    useImperativeHandle(ref, () => ({ loadMore }), [loadMore]);

    useAsyncOneTimeEffect(fetchItems);

    return (
      <View>
        {items.map((item, i) => (
          <View key={item.id}>
            {i > 0 && <ItemSeparator />}
            <TimelineStatus status={item} />
          </View>
        ))}
        {isLoading && (
          <View className="py-4">
            <ActivityIndicator />
          </View>
        )}
      </View>
    );
  }),
);
UserTimeline.displayName = "UserTimeline";
