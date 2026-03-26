import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { merge } from "@/lib/merge";
import { TimelineBase } from "@/components/timeline/base";
import { getCdnUrl } from "@/lib/media";
import { accountAtom } from "@/models/atoms/account";
import type {
  CatalystAlbum,
  CatalystAlbumDisplayMode,
  CatalystSmartAlbum,
  CatalystStatus,
  EgeriaUser,
} from "@natsuneko-laboratory/catalyst-sdk";
import dayjs from "dayjs";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { Calendar, FileQuestion, MessageSquare, Pencil } from "lucide-react-native";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { withUniwind } from "uniwind";

import "@/global.css";

const UniCalendar = withUniwind(Calendar);
const UniFileQuestion = withUniwind(FileQuestion);
const UniImage = withUniwind(Image);
const UniMessageSquare = withUniwind(MessageSquare);
const UniPencil = withUniwind(Pencil);

const GRID_COLUMNS = 3;
const GRID_GAP = 1;
const GALLERY_COLUMNS = 2;
const GALLERY_GAP = 2;
const LOAD_MORE_THRESHOLD = 200;

type AlbumType = "album" | "smartAlbum";

type AlbumInfo = {
  title: string;
  description: string;
  user?: EgeriaUser;
  since?: string;
  until?: string;
  mode: CatalystAlbumDisplayMode;
};

type Props = {
  id: string;
  albumType: AlbumType;
};

const formatPeriod = (since?: string, until?: string): string => {
  if (!since && !until) return "";

  const fmt = (d: string) => dayjs(d).format("YYYY/MM/DD");

  if (since && until) return `${fmt(since)} - ${fmt(until)}`;
  if (since) return `${fmt(since)} から`;
  if (until) return `${fmt(until)} まで`;
  return "";
};

const AlbumHeader = ({ info }: { info: AlbumInfo }) => {
  const router = useRouter();
  const { user, description, since, until } = info;
  const period = formatPeriod(since, until);

  const hasContent = user || description.length > 0 || period.length > 0;
  if (!hasContent) return null;

  return (
    <View className="px-4 py-3 bg-light-background dark:bg-dark-background">
      {user && (
        <TouchableOpacity
          className="flex-row items-center mb-2"
          activeOpacity={0.7}
          onPress={() => router.push(`/user/${user.screenName}`)}
        >
          {user.profile?.iconUrl ? (
            <UniImage
              source={{ uri: getCdnUrl({ src: user.profile.iconUrl, variant: "icon", width: 64 }) }}
              className="w-8 h-8 rounded-full"
              contentFit="cover"
            />
          ) : (
            <View className="w-8 h-8 rounded-full bg-light-skeleton dark:bg-dark-skeleton" />
          )}
          <View className="ml-2">
            <Text className="text-sm font-semibold text-light-text dark:text-dark-text">
              {user.displayName}
            </Text>
            <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
              @{user.screenName}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {description.length > 0 && (
        <Text
          className="text-sm text-light-text-muted dark:text-dark-text-muted mb-1"
          numberOfLines={3}
        >
          {description}
        </Text>
      )}

      {period.length > 0 && (
        <View className="flex-row items-center gap-1">
          <UniCalendar size={12} className="text-light-text-muted dark:text-dark-text-muted" />
          <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">{period}</Text>
        </View>
      )}
    </View>
  );
};

const EmptyState = () => (
  <View className="items-center justify-center px-6 py-16">
    <Text className="text-sm text-light-text-muted dark:text-dark-text-muted">
      まだ投稿がありません
    </Text>
  </View>
);

const GridCell = memo(({ status, cellSize }: { status: CatalystStatus; cellSize: number }) => {
  const router = useRouter();
  const media = status.medias[0];
  const [isImageLoading, setIsImageLoading] = useState(Boolean(media));
  const [realId] = status.id.split("/");

  return (
    <Pressable onPress={() => router.push(`/status/${realId}`)} style={{ width: cellSize, height: cellSize }}>
      {media ? (
        <View style={{ width: cellSize, height: cellSize }}>
          <UniImage
            source={{
              uri: getCdnUrl({
                src: media.url,
                variant: "tiny",
                width: cellSize,
              }),
            }}
            style={{ width: cellSize, height: cellSize }}
            contentFit="cover"
            onLoadEnd={() => setIsImageLoading(false)}
          />
          {isImageLoading && (
            <View className="absolute inset-0 items-center justify-center bg-light-skeleton dark:bg-dark-skeleton">
              <ActivityIndicator />
            </View>
          )}
        </View>
      ) : (
        <View className="flex-1 items-center justify-center bg-light-surface dark:bg-dark-surface">
          <UniMessageSquare size={24} className="text-light-text-muted dark:text-dark-text-muted" />
        </View>
      )}
    </Pressable>
  );
});
GridCell.displayName = "GridCell";

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
    <Pressable onPress={() => router.push(`/status/${realId}`)} style={{ marginBottom: GALLERY_GAP }}>
      <View style={{ width: columnWidth, height: cellHeight, borderRadius: 4, overflow: "hidden" }}>
        <UniImage
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

const distributeToColumns = (
  items: CatalystStatus[],
  columnWidth: number,
): [CatalystStatus[], CatalystStatus[]] => {
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
    heights[shorter] += cellHeight + GALLERY_GAP;
  }

  return columns;
};

const AlbumVisualContent = ({
  mode,
  fetcher,
}: {
  mode: Extract<CatalystAlbumDisplayMode, "grid" | "gallery">;
  fetcher: (since: string | null, until: string | null) => Promise<CatalystStatus[]>;
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const [items, setItems] = useState<CatalystStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLoadingRef = useRef(false);
  const sets = useRef<Set<string>>(new Set());

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    isLoadingRef.current = true;
    try {
      const result = await fetcher(null, null);
      sets.current = new Set();
      setItems(merge([], result, sets.current, (item) => item.id));
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [fetcher]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const since = items[0]?.id ?? null;
      const newItems = await fetcher(since, null);
      setItems((prev) => merge(newItems, prev, sets.current, (item) => item.id));
    } finally {
      setIsRefreshing(false);
    }
  }, [fetcher, items]);

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current) return;

    const until = items[items.length - 1]?.id ?? null;
    if (!until) return;

    setIsLoading(true);
    isLoadingRef.current = true;
    try {
      const newItems = await fetcher(null, until);
      if (newItems.length > 0) {
        setItems((prev) => merge(prev, newItems, sets.current, (item) => item.id));
      }
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [fetcher, items]);

  useAsyncOneTimeEffect(loadInitial);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isLoadingRef.current) return;

      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
      if (distanceFromBottom < LOAD_MORE_THRESHOLD) {
        loadMore();
      }
    },
    [loadMore],
  );

  if (mode === "grid") {
    const cellSize = (screenWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
    const rows: CatalystStatus[][] = [];
    for (let i = 0; i < items.length; i += GRID_COLUMNS) {
      rows.push(items.slice(i, i + GRID_COLUMNS));
    }

    return (
      <ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {rows.length === 0 && !isLoading ? <EmptyState /> : null}
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} className="flex-row" style={{ marginTop: rowIndex > 0 ? GRID_GAP : 0 }}>
            {row.map((item, colIndex) => (
              <View key={item.id} style={{ marginLeft: colIndex > 0 ? GRID_GAP : 0 }}>
                <GridCell status={item} cellSize={cellSize} />
              </View>
            ))}
          </View>
        ))}
        {isLoading && (
          <View className="py-4">
            <ActivityIndicator />
          </View>
        )}
      </ScrollView>
    );
  }

  const columnWidth = (screenWidth - GALLERY_GAP * (GALLERY_COLUMNS - 1)) / GALLERY_COLUMNS;
  const [leftColumn, rightColumn] = distributeToColumns(items, columnWidth);

  return (
    <ScrollView
      onScroll={handleScroll}
      scrollEventThrottle={16}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      {leftColumn.length === 0 && rightColumn.length === 0 && !isLoading ? <EmptyState /> : null}
      <View className="flex-row" style={{ gap: GALLERY_GAP }}>
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
  );
};

export const AlbumDetailPage = ({ id, albumType }: Props) => {
  const account = useAtomValue(accountAtom);
  const [albumInfo, setAlbumInfo] = useState<AlbumInfo | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const router = useRouter();

  const canEdit =
    albumInfo?.user && account?.user ? albumInfo.user.id === account.user.id : false;

  useEffect(() => {
    if (!account?.credential.client || !id) return;

    const fetchInfo = async () => {
      try {
        if (albumType === "album") {
          const album: CatalystAlbum = await account.credential.client.catalyst.getAlbum(id);
          setAlbumInfo({
            title: album.name,
            description: album.description,
            user: album.user,
            mode: album.mode,
          });
        } else {
          const album: CatalystSmartAlbum =
            await account.credential.client.catalyst.getSmartAlbum(id);
          setAlbumInfo({
            title: album.name,
            description: album.description,
            user: album.user,
            since: album.since,
            until: album.until,
            mode: album.mode,
          });
        }
      } catch {
        setIsNotFound(true);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchInfo();
  }, [id, account, albumType]);

  const fetcher = useCallback(
    async (since: string | null, until: string | null): Promise<CatalystStatus[]> => {
      if (!account?.credential.client) return [];

      const opts: { since?: string; until?: string } = {};
      if (since) opts.since = since;
      if (until) opts.until = until;

      if (albumType === "album") {
        const album = await account.credential.client.catalyst.getAlbum(id, opts);
        return album.statuses;
      }
      const album = await account.credential.client.catalyst.getSmartAlbum(id, opts);
      return album.statuses;
    },
    [account, id, albumType],
  );

  if (isInitialLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "" }} />
        <View className="flex-1 bg-light-background dark:bg-dark-background items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  if (isNotFound) {
    return (
      <>
        <Stack.Screen options={{ title: "" }} />
        <View className="flex-1 bg-light-background dark:bg-dark-background items-center justify-center">
          <UniFileQuestion size={64} className="text-light-gray dark:text-dark-gray" />
          <Text className="font-semibold text-light-gray dark:text-dark-gray mt-2 text-center">
            {albumType === "album" ? "アルバム" : "スマートアルバム"}が見つかりません
          </Text>
          <Text className="text-sm text-light-gray dark:text-dark-gray mt-2 text-center">
            削除されたか、アクセスできないコンテンツです
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: albumInfo?.title ?? "",
          headerRight: canEdit
            ? () => (
                <TouchableOpacity
                  style={{ padding: 8 }}
                  onPress={() => {
                    if (albumType === "album") {
                      router.push(`/album/${id}/edit`);
                    } else {
                      router.push(`/smart-album/${id}/edit`);
                    }
                  }}
                >
                  <UniPencil size={20} className="text-light-tint dark:text-dark-tint" />
                </TouchableOpacity>
              )
            : undefined,
        }}
      />

      <View className="flex-1 bg-light-background dark:bg-dark-background">
        {albumInfo && <AlbumHeader info={albumInfo} />}
        {albumInfo && <View className="h-px bg-light-divider dark:bg-dark-divider" />}
        {albumInfo?.mode === "timeline" ? (
          <TimelineBase fetcher={fetcher} ListEmptyComponent={EmptyState} />
        ) : (
          <AlbumVisualContent mode={albumInfo.mode} fetcher={fetcher} />
        )}
      </View>
    </>
  );
};
