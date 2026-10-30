import {
  CatalystEmptyState,
  CatalystListItem,
  CatalystListItemContent,
  CatalystSkeleton,
  CatalystText,
} from "@/components/design-system";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { LIST_COLUMNS } from "@/lib/device-layout";
import { quoteSearchQualifier } from "@/lib/search-query";
import { fetchVRChatWorldAuthorName, isVRChatWorldId, vrchatWorldThumbnailUrl } from "@/lib/vrchat-world";
import { clientAtom } from "@/models/atoms/credential";
import type { EpicleseWorldResponse } from "@natsuneko-laboratory/catalyst-sdk";
import { FlashList, FlashListRef, ListRenderItem, useRecyclingState } from "@shopify/flash-list";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { ChevronRight, Globe, SearchX } from "lucide-react-native";
import { memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { View } from "react-native";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);
const UniGlobe = withUniwind(Globe);
const UniChevronRight = withUniwind(ChevronRight);
const UniSearchXIcon = withUniwind(SearchX);

type TimelineHandle = {
  scrollToTop: () => void;
};

/**
 * カタログ検索の 1 件。カタログには作成者が入っていないワールドが多いので、
 * 無いときは VRChat のワールドに限り miliastra から補う。問い合わせるのは描画された行だけ
 */
const WorldRow = memo(({ world }: { world: EpicleseWorldResponse }) => {
  const router = useRouter();
  const isVRChat = isVRChatWorldId(world.platformIdentifier);
  // カタログの作成者名は先頭に半角スペースが付いていることがある
  const catalogAuthorName = world.author?.name.trim() || null;
  // FlashList は行を使い回すので、別のワールドの行になったら状態を戻す
  const [fetchedAuthorName, setFetchedAuthorName] = useRecyclingState<string | null>(null, [world.id]);
  const [isThumbnailBroken, setIsThumbnailBroken] = useRecyclingState(!isVRChat, [world.id]);
  const authorName = catalogAuthorName ?? fetchedAuthorName;

  useEffect(() => {
    if (catalogAuthorName || !isVRChat) return;

    const controller = new AbortController();
    fetchVRChatWorldAuthorName(world.platformIdentifier, controller.signal).then((name) => {
      if (!controller.signal.aborted) setFetchedAuthorName(name);
    });
    return () => controller.abort();
  }, [catalogAuthorName, isVRChat, setFetchedAuthorName, world.platformIdentifier]);

  // 投稿詳細でワールドをタップしたときと同じ検索に飛ばす。先頭にワールドのカードが出る
  const onPress = () => {
    const query = [world.platform && `platform:${world.platform.name}`, `world:${quoteSearchQualifier(world.name)}`]
      .filter(Boolean)
      .join(" ");
    router.push(`/search/${encodeURIComponent(query)}`);
  };

  return (
    <CatalystListItem onPress={onPress} accessibilityRole="button" accessibilityLabel={`${world.name} の投稿を検索`}>
      <View className="aspect-video w-32 items-center justify-center overflow-hidden rounded-lg bg-light-surface-muted dark:bg-dark-surface-muted">
        {isThumbnailBroken ? (
          <UniGlobe size={24} className="text-light-text-subtle dark:text-dark-text-subtle" />
        ) : (
          <UniImage
            source={vrchatWorldThumbnailUrl(world.platformIdentifier)}
            contentFit="cover"
            className="absolute inset-0"
            onError={() => setIsThumbnailBroken(true)}
          />
        )}
      </View>
      <CatalystListItemContent className="gap-0.5">
        <CatalystText variant="subtitle" numberOfLines={2}>
          {world.name}
        </CatalystText>
        {/* 作成者が届いてから行が伸びないよう、取得中も 1 行分の高さを取っておく */}
        <CatalystText variant="caption" tone="muted" numberOfLines={1}>
          {authorName ? `作成者: ${authorName}` : " "}
        </CatalystText>
        {world.platform && (
          <CatalystText variant="caption" tone="muted" numberOfLines={1}>
            {world.platform.name}
          </CatalystText>
        )}
      </CatalystListItemContent>
      <UniChevronRight size={14} className="text-light-icon dark:text-dark-icon" />
    </CatalystListItem>
  );
});
WorldRow.displayName = "WorldRow";

const WorldListPlaceholder = () => {
  return (
    <View accessibilityLabel="ワールドを読み込み中" accessibilityRole="progressbar" className="flex-1">
      {Array.from({ length: 8 }, (_, index) => (
        <View
          key={index}
          className="flex-row items-center gap-3 border-b border-light-divider px-4 py-3 dark:border-dark-divider"
        >
          <CatalystSkeleton className="aspect-video w-32 rounded-lg" />
          <View className="min-w-0 flex-1 gap-1.5">
            <CatalystSkeleton className="h-4 w-4/5 rounded-full" />
            <CatalystSkeleton className="h-3 w-3/5 rounded-full" />
            <CatalystSkeleton className="h-3 w-16 rounded-full" />
          </View>
        </View>
      ))}
    </View>
  );
};

const WorldsEmptyResult = () => {
  return (
    <CatalystEmptyState
      icon={<UniSearchXIcon />}
      title="ワールドが見つかりません"
      description="ワールド名の一部や、wrld_ から始まる ID でも検索できます"
    />
  );
};

type Props = {
  query: string;
  ref?: React.Ref<TimelineHandle>;
};

// キーワードが空のときは、登録されているワールドを名前順にすべて出す
export const WorldList = ({ query, ref }: Props) => {
  const client = useAtomValue(clientAtom);
  const [worlds, setWorlds] = useState<EpicleseWorldResponse[]>([]);
  // `offset` は件数ではなくページの番号
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLoadingMore = useRef(false);
  // キーワードを変えたら番号を進め、前のキーワードのリクエストが後から返ってきても結果を捨てる
  const requestId = useRef(0);
  const list = useRef<FlashListRef<EpicleseWorldResponse>>(null);

  const fetchWorlds = useCallback(
    async (page?: number) => {
      if (!client) return null;

      const { data } = await client.epiclese.v1.worlds.get({
        query: { q: query || undefined, offset: page },
        throwOnError: true,
      });
      return data;
    },
    [client, query],
  );

  useAsyncEffect(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    setWorlds([]);
    setNextPage(null);
    try {
      const data = await fetchWorlds();
      if (data && id === requestId.current) {
        setWorlds(data.items);
        setNextPage(data.page.next);
      }
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [fetchWorlds]);

  const onLoadMore = useCallback(async () => {
    if (nextPage === null || isLoadingMore.current) return;

    const id = requestId.current;
    isLoadingMore.current = true;
    try {
      const data = await fetchWorlds(nextPage);
      if (data && id === requestId.current) {
        // 読み込みの間にワールドが登録されるとページの境目がずれるので、重複を除く
        setWorlds((prev) => [...prev, ...data.items.filter((w) => !prev.some((v) => v.id === w.id))]);
        setNextPage(data.page.next);
      }
    } catch (e) {
      // 失敗しても一覧はそのまま残し、次にスクロールしたときにまた試す
      console.error(e);
    } finally {
      isLoadingMore.current = false;
    }
  }, [fetchWorlds, nextPage]);

  const onRender = useCallback<ListRenderItem<EpicleseWorldResponse>>(({ item }) => {
    return <WorldRow world={item} />;
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      scrollToTop: () => {
        list.current?.scrollToOffset({ offset: 0, animated: true });
      },
    }),
    [],
  );

  return (
    <FlashList
      numColumns={LIST_COLUMNS}
      ref={list}
      data={worlds}
      keyExtractor={(w) => w.id}
      renderItem={onRender}
      ListEmptyComponent={isLoading ? WorldListPlaceholder : WorldsEmptyResult}
      ListEmptyComponentStyle={{ minHeight: "80%" }}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.75}
    />
  );
};
