import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { getCdnUrl } from "@/lib/media";
import { clientAtom } from "@/models/atoms/credential";
import { CatalystStatus, EgeriaUser } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { MessageSquare } from "lucide-react-native";
import React, { memo, useCallback, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, Pressable, View } from "react-native";

const COLUMNS = 3;
const GAP = 1;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CELL_SIZE = (SCREEN_WIDTH - GAP * (COLUMNS - 1)) / COLUMNS;

type Props = {
  user?: EgeriaUser | null;
};

export type UserTimelineHandle = {
  loadMore: () => void;
};

const ThumbnailCell = memo(({ status }: { status: CatalystStatus }) => {
  const router = useRouter();
  const media = status.medias[0];

  return (
    <Pressable onPress={() => router.push(`/status/${status.id}`)} style={{ width: CELL_SIZE, height: CELL_SIZE }}>
      {media ? (
        <Image
          source={{
            uri: getCdnUrl({
              src: media.url,
              variant: "tiny",
              width: CELL_SIZE,
            }),
          }}
          style={{ width: CELL_SIZE, height: CELL_SIZE }}
          contentFit="cover"
        />
      ) : (
        <View className="flex-1 items-center justify-center bg-gray-200 dark:bg-gray-800">
          <MessageSquare size={24} color="#9CA3AF" />
        </View>
      )}
    </Pressable>
  );
});
ThumbnailCell.displayName = "ThumbnailCell";

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

    const rows: CatalystStatus[][] = [];
    for (let i = 0; i < items.length; i += COLUMNS) {
      rows.push(items.slice(i, i + COLUMNS));
    }

    return (
      <View>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row" style={{ marginTop: rowIndex > 0 ? GAP : 0 }}>
            {row.map((item, colIndex) => (
              <View key={item.id} style={{ marginLeft: colIndex > 0 ? GAP : 0 }}>
                <ThumbnailCell status={item} />
              </View>
            ))}
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
