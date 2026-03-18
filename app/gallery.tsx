import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { getCdnUrl } from "@/lib/media";
import { clientAtom } from "@/models/atoms/credential";
import type { CatalystStatus } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import React, { memo, useCallback, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, View } from "react-native";

const COLUMNS = 2;
const GAP = 2;
const SCREEN_WIDTH = Dimensions.get("window").width;
const COLUMN_WIDTH = (SCREEN_WIDTH - GAP * (COLUMNS - 1)) / COLUMNS;
const LOAD_MORE_THRESHOLD = 200;

const GalleryCell = memo(({ status }: { status: CatalystStatus }) => {
  const router = useRouter();
  const media = status.medias[0];
  const [isImageLoading, setIsImageLoading] = useState(true);
  if (!media) return null;

  const aspectRatio =
    media.metadata?.width && media.metadata?.height ? media.metadata.width / media.metadata.height : 1;
  const cellHeight = COLUMN_WIDTH / aspectRatio;
  const [realId] = status.id.split("/");

  return (
    <Pressable onPress={() => router.push(`/status/${realId}`)} style={{ marginBottom: GAP }}>
      <View style={{ width: COLUMN_WIDTH, height: cellHeight, borderRadius: 4, overflow: "hidden" }}>
        <Image
          source={{
            uri: getCdnUrl({
              src: media.url,
              variant: "xsmall",
              width: COLUMN_WIDTH,
            }),
          }}
          style={{ width: COLUMN_WIDTH, height: cellHeight }}
          contentFit="cover"
          onLoadEnd={() => setIsImageLoading(false)}
        />
        {isImageLoading && (
          <View className="absolute inset-0 items-center justify-center bg-light-skeleton dark:bg-dark-skeleton">
            <ActivityIndicator />
          </View>
        )}
      </View>
    </Pressable>
  );
});
GalleryCell.displayName = "GalleryCell";

function distributeToColumns(items: CatalystStatus[]): [CatalystStatus[], CatalystStatus[]] {
  const columns: [CatalystStatus[], CatalystStatus[]] = [[], []];
  const heights = [0, 0];

  for (const item of items) {
    const media = item.medias[0];
    if (!media) continue;

    const aspectRatio =
      media.metadata?.width && media.metadata?.height ? media.metadata.width / media.metadata.height : 1;
    const cellHeight = COLUMN_WIDTH / aspectRatio;

    const shorter = heights[0] <= heights[1] ? 0 : 1;
    columns[shorter].push(item);
    heights[shorter] += cellHeight + GAP;
  }

  return columns;
}

export default function GalleryScreen() {
  const client = useAtomValue(clientAtom);
  const [items, setItems] = useState<CatalystStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    isLoadingRef.current = true;
    try {
      const result = await client.catalyst.galleryTimeline({});
      setItems(result.statuses);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [client]);

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current) return;

    const lastItem = items[items.length - 1];
    if (!lastItem) return;

    setIsLoading(true);
    isLoadingRef.current = true;
    try {
      const result = await client.catalyst.galleryTimeline({
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

  useAsyncOneTimeEffect(fetchItems);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
      const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
      if (distanceFromBottom < LOAD_MORE_THRESHOLD) {
        loadMore();
      }
    },
    [loadMore],
  );

  const [leftColumn, rightColumn] = distributeToColumns(items);

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <Stack.Screen options={{ title: "ギャラリー" }} />
      <ScrollView onScroll={handleScroll} scrollEventThrottle={16}>
        <View className="flex-row" style={{ gap: GAP }}>
          <View style={{ width: COLUMN_WIDTH }}>
            {leftColumn.map((item) => (
              <GalleryCell key={item.id} status={item} />
            ))}
          </View>
          <View style={{ width: COLUMN_WIDTH }}>
            {rightColumn.map((item) => (
              <GalleryCell key={item.id} status={item} />
            ))}
          </View>
        </View>
        {isLoading && (
          <View className="py-4">
            <ActivityIndicator />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
