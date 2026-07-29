import { Markdown } from "@/components/ui/markdown";
import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { openUrlWithBrowser } from "@/models/browser-settings";
import { clientAtom } from "@/models/atoms/credential";
import type { CatalystAnnouncement } from "@/models/sdk-types";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { ExternalLink, Megaphone } from "lucide-react-native";
import { useAtomValue } from "jotai";
import { Ref, memo, useCallback, useImperativeHandle, useRef, useState } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { AnnouncementPlaceholder } from "./placeholder";

const UniMegaphone = withUniwind(Megaphone);
const UniExternalLink = withUniwind(ExternalLink);

type TimelineHandle = {
  scrollToTop: () => void;
};

type Props = {
  ref?: Ref<TimelineHandle>;
};

const ItemSeparator = () => <View className="h-px bg-light-divider dark:bg-dark-divider" />;

const EmptyState = () => (
  <View className="flex-1 items-center justify-center gap-4 py-16">
    <UniMegaphone size={48} colorClassName="accent-light-icon dark:accent-dark-icon" />
    <Text className="text-base font-bold text-light-icon dark:text-dark-icon">お知らせはありません</Text>
  </View>
);

const AnnouncementItem = memo(({ announcement }: { announcement: CatalystAnnouncement }) => {
  const openUrl = useCallback(async () => {
    if (!announcement.url) return;
    await openUrlWithBrowser(announcement.url);
  }, [announcement.url]);

  return (
    <View className="gap-3 px-4 py-4">
      <View className="flex-row items-center gap-2">
        <View className="size-9 items-center justify-center rounded-full bg-light-info-background dark:bg-dark-info-background">
          <UniMegaphone size={18} className="text-light-info dark:text-dark-info" />
        </View>
        <View className="rounded-full border border-light-info bg-light-info-background px-2 py-0.5 dark:border-dark-info dark:bg-dark-info-background">
          <Text className="text-xs text-light-info dark:text-dark-info">{announcement.category}</Text>
        </View>
      </View>
      <Text className="text-base font-bold text-light-text dark:text-dark-text">{announcement.title}</Text>
      <Markdown selectable body={announcement.body} />
      {announcement.url ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${announcement.title}の詳細を開く`}
          className="flex-row items-center self-start gap-1 active:opacity-60"
          onPress={openUrl}
        >
          <Text className="text-sm font-semibold text-light-link dark:text-dark-link">詳細を見る</Text>
          <UniExternalLink size={14} className="text-light-link dark:text-dark-link" />
        </Pressable>
      ) : null}
    </View>
  );
});
AnnouncementItem.displayName = "AnnouncementItem";

export const AnnouncementList = ({ ref }: Props) => {
  const client = useAtomValue(clientAtom);
  const [items, setItems] = useState<CatalystAnnouncement[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const list = useRef<FlashListRef<CatalystAnnouncement>>(null);

  const fetchAnnouncements = useCallback(async () => {
    if (!client) return [];
    const { data } = await client.catalyst.v1.announcements.get({
      query: { target: "ios" },
      throwOnError: true,
    });
    return data.announcements;
  }, [client]);

  const loadAnnouncements = useCallback(async () => {
    const announcements = await fetchAnnouncements();
    setItems(announcements);
  }, [fetchAnnouncements]);

  useAsyncOneTimeEffect(async () => {
    setIsInitialLoading(true);
    try {
      await loadAnnouncements();
    } finally {
      setIsInitialLoading(false);
    }
  });

  useImperativeHandle(
    ref,
    () => ({
      scrollToTop: () => list.current?.scrollToOffset({ offset: 0, animated: true }),
    }),
    [],
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadAnnouncements();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadAnnouncements]);

  const renderItem = useCallback(({ item }: { item: CatalystAnnouncement }) => {
    return <AnnouncementItem announcement={item} />;
  }, []);

  return (
    <FlashList
      ref={list}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      ItemSeparatorComponent={ItemSeparator}
      ListEmptyComponent={isInitialLoading ? AnnouncementPlaceholder : EmptyState}
    />
  );
};
