import {
  CatalystEmptyState,
  CatalystListItem,
  CatalystListItemContent,
  CatalystSkeleton,
  CatalystText,
} from "@/components/design-system";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { useDeviceLayout } from "@/lib/device-layout";
import { quoteSearchQualifier } from "@/lib/search-query";
import { isResoniteWorld, resoniteWorldThumbnailUrl } from "@/lib/resonite-world";
import { getWorldSite } from "@/lib/world-site";
import { clientAtom } from "@/models/atoms/credential";
import type { EpiclesePlatformResponse, EpicleseWorldResponse } from "@natsuneko-laboratory/catalyst-sdk";
import { FlashList, FlashListRef, ListRenderItem, useRecyclingState } from "@shopify/flash-list";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { ChevronRight, Globe, ListFilter, SearchX } from "lucide-react-native";
import { memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { withUniwind } from "uniwind";
import { WorldPlatformSheet, type WorldPlatformSheetRef } from "./platform-sheet";

const UniImage = withUniwind(Image);
const UniGlobe = withUniwind(Globe);
const UniChevronRight = withUniwind(ChevronRight);
const UniSearchXIcon = withUniwind(SearchX);
const UniListFilterIcon = withUniwind(ListFilter);

type TimelineHandle = {
  scrollToTop: () => void;
};

// SDK の型にはまだ無いが、カタログ検索は Resonite のワールドにオーナー ID を付けて返す
type CatalogWorld = EpicleseWorldResponse & { platformOwnerIdentifier?: string | null };

/** サムネイルを引けないプラットフォームなら null */
const getThumbnailUrl = (world: CatalogWorld) => {
  const platformName = world.platform?.name;
  const site = getWorldSite(platformName, world.platformIdentifier);
  if (site) return site.thumbnailUrl;
  if (world.platformOwnerIdentifier && isResoniteWorld(platformName, world.platformIdentifier)) {
    return resoniteWorldThumbnailUrl(world.platformOwnerIdentifier, world.platformIdentifier);
  }
  return null;
};

/**
 * カタログ検索の 1 件。カタログには作成者が入っていないワールドが多いので、
 * 無いときは VRChat・XRift のワールドに限り miliastra から補う。問い合わせるのは描画された行だけ
 */
const WorldRow = memo(({ world }: { world: CatalogWorld }) => {
  const router = useRouter();
  const thumbnailUrl = getThumbnailUrl(world);
  // カタログの作成者名は先頭に半角スペースが付いていることがある
  const catalogAuthorName = world.author?.name.trim() || null;
  // FlashList は行を使い回すので、別のワールドの行になったら状態を戻す
  const [fetchedAuthorName, setFetchedAuthorName] = useRecyclingState<string | null>(null, [world.id]);
  const [isThumbnailBroken, setIsThumbnailBroken] = useRecyclingState(!thumbnailUrl, [world.id]);
  const authorName = catalogAuthorName ?? fetchedAuthorName;
  const platformName = world.platform?.name;

  useEffect(() => {
    const site = getWorldSite(platformName, world.platformIdentifier);
    if (catalogAuthorName || !site) return;

    const controller = new AbortController();
    site.fetchAuthorName(controller.signal).then((name) => {
      if (!controller.signal.aborted) setFetchedAuthorName(name);
    });
    return () => controller.abort();
  }, [catalogAuthorName, platformName, setFetchedAuthorName, world.platformIdentifier]);

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
        {isThumbnailBroken || !thumbnailUrl ? (
          <UniGlobe size={24} className="text-light-text-subtle dark:text-dark-text-subtle" />
        ) : (
          <UniImage
            source={thumbnailUrl}
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

const WorldsEmptyResult = ({ isFiltered }: { isFiltered: boolean }) => {
  return (
    <CatalystEmptyState
      icon={<UniSearchXIcon />}
      title="ワールドが見つかりません"
      description={
        isFiltered
          ? "別のキーワードやプラットフォームで検索してみてください"
          : "ワールド名の一部や、wrld_ から始まる ID でも検索できます"
      }
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
  const { listColumns } = useDeviceLayout();
  const [platforms, setPlatforms] = useState<EpiclesePlatformResponse[]>([]);
  const [platform, setPlatform] = useState<EpiclesePlatformResponse | null>(null);
  const [worlds, setWorlds] = useState<CatalogWorld[]>([]);
  // `offset` は件数ではなくページの番号
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLoadingMore = useRef(false);
  // キーワードを変えたら番号を進め、前のキーワードのリクエストが後から返ってきても結果を捨てる
  const requestId = useRef(0);
  const list = useRef<FlashListRef<CatalogWorld>>(null);
  const platformSheet = useRef<WorldPlatformSheetRef>(null);

  // 絞り込みの選択肢。取れなかったら「すべて」だけになる
  useEffect(() => {
    client?.epiclese.v1.platforms
      .get({ throwOnError: true })
      .then(({ data }) => setPlatforms(data.platforms))
      .catch(console.error);
  }, [client]);

  const fetchWorlds = useCallback(
    async (page?: number) => {
      if (!client) return null;

      const { data } = await client.epiclese.v1.worlds.get({
        query: { q: query || undefined, platform: platform?.id, offset: page },
        throwOnError: true,
      });
      return data;
    },
    [client, platform, query],
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

  const onRender = useCallback<ListRenderItem<CatalogWorld>>(({ item }) => {
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

  const platformLabel = platform?.name ?? "すべて";

  // アイテム検索 (items/list.tsx) の見出しと同じ並び
  const ListHeaderComponent = (
    <View className="gap-1 px-4 pt-4 pb-1.5">
      <View className="flex-row items-center justify-between gap-3">
        <CatalystText variant="title" className="shrink">
          ワールド
        </CatalystText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`プラットフォームで絞り込む: ${platformLabel}`}
          onPress={() => platformSheet.current?.open()}
          className="h-8 flex-row items-center gap-1.5 rounded-full border border-light-divider bg-light-surface pr-3 pl-2.5 active:opacity-80 dark:border-dark-divider dark:bg-dark-surface"
        >
          <UniListFilterIcon size={16} className="text-light-icon dark:text-dark-icon" />
          <CatalystText>{platformLabel}</CatalystText>
        </Pressable>
      </View>
      <CatalystText tone="muted">ワールドの名前や ID から、そのワールドで撮った写真を探せます。</CatalystText>
    </View>
  );

  return (
    <>
      <FlashList
        numColumns={listColumns}
        ref={list}
        data={worlds}
        keyExtractor={(w) => w.id}
        renderItem={onRender}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={isLoading ? WorldListPlaceholder : <WorldsEmptyResult isFiltered={platform !== null} />}
        ListEmptyComponentStyle={{ minHeight: "80%" }}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.75}
        // プラットフォームを切り替えると一覧を丸ごと入れ替えるので、前の一覧の位置を保とうとしないようにする
        maintainVisibleContentPosition={{ disabled: true }}
      />
      <WorldPlatformSheet ref={platformSheet} platforms={platforms} selected={platform} onSelect={setPlatform} />
    </>
  );
};
