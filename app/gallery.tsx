import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { getCdnUrl } from "@/lib/media";
import { merge } from "@/lib/merge";
import { clientAtom } from "@/models/atoms/credential";
import type { CatalystStatus } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import React, { memo, useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";

const COLUMNS = 2;
const GAP = 2;
const LOAD_MORE_THRESHOLD = 200;

const GalleryCell = memo(({ status, columnWidth }: { status: CatalystStatus; columnWidth: number }) => {
  const router = useRouter();
  const media = status.medias[0];
  const [isImageLoading, setIsImageLoading] = useState(true);
  if (!media) return null;

  const aspectRatio =
    media.metadata?.width && media.metadata?.height ? media.metadata.width / media.metadata.height : 1;
  const cellHeight = columnWidth / aspectRatio;
  const [realId] = status.id.split("/");

  return (
    <Pressable onPress={() => router.push(`/status/${realId}`)} style={{ marginBottom: GAP }}>
      <View style={{ width: columnWidth, height: cellHeight, borderRadius: 4, overflow: "hidden" }}>
        <Image
          source={{
            uri: getCdnUrl({
              src: media.url,
              variant: "xsmall",
              width: columnWidth,
            }),
          }}
          style={{ width: columnWidth, height: cellHeight }}
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

function distributeToColumns(items: CatalystStatus[], columnWidth: number): [CatalystStatus[], CatalystStatus[]] {
  const columns: [CatalystStatus[], CatalystStatus[]] = [[], []];
  const heights = [0, 0];

  for (const item of items) {
    const media = item.medias[0];
    if (!media) continue;

    const aspectRatio =
      media.metadata?.width && media.metadata?.height ? media.metadata.width / media.metadata.height : 1;
    const cellHeight = columnWidth / aspectRatio;

    const shorter = heights[0] <= heights[1] ? 0 : 1;
    columns[shorter].push(item);
    heights[shorter] += cellHeight + GAP;
  }

  return columns;
}

export default function GalleryScreen() {
  const client = useAtomValue(clientAtom);
  const { width: screenWidth } = useWindowDimensions();
  const columnWidth = (screenWidth - GAP * (COLUMNS - 1)) / COLUMNS;
  const [items, setItems] = useState<CatalystStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const sets = useRef<Set<string>>(new Set());

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    isLoadingRef.current = true;
    try {
      const result = await client.catalyst.galleryTimeline({});
      setItems((prev) => merge(prev, result.statuses, sets, (item) => item.id));
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
        setItems((prev) => merge(prev, result.statuses, sets, (item) => item.id));
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

  const [leftColumn, rightColumn] = distributeToColumns(items, columnWidth);

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <ScrollView onScroll={handleScroll} scrollEventThrottle={16}>
        <View className="flex-row" style={{ gap: GAP }}>
          <View style={{ width: columnWidth }}>
            {leftColumn.map((item) => (
              <GalleryCell key={item.id} status={item} columnWidth={columnWidth} />
            ))}
          </View>
          <View style={{ width: columnWidth }}>
            {rightColumn.map((item) => (
              <GalleryCell key={item.id} status={item} columnWidth={columnWidth} />
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
