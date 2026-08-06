import { CatalystEmptyState } from "@/components/design-system";
import { UserListPlaceholder } from "@/components/explorer/users/skeleton";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { clientAtom } from "@/models/atoms/credential";
import type { CatalystRemoteFollower } from "@/models/sdk-types";
import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { useAtomValue } from "jotai";
import { Lock } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { withUniwind } from "uniwind";
import { RemoteActorCard } from "./remote-actor-card";

const UniLock = withUniwind(Lock);

type Props = {
  screenName: string;
};

export const RemoteFollowerList = ({ screenName }: Props) => {
  const client = useAtomValue(clientAtom);
  const [actors, setActors] = useState<CatalystRemoteFollower[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const isLoadingRef = useRef(false);

  const fetchPage = useCallback(
    async (page: number) => {
      if (!client || isLoadingRef.current) return;
      isLoadingRef.current = true;
      if (page === 1) {
        setIsInitialLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const result = await client.catalyst.v1.relationships.by.username.username.followers.remote.get({
          path: { username: screenName },
          query: { page },
        });
        if (result.response?.status === 403) {
          setIsForbidden(true);
          return;
        }
        if (!result.data) return;
        const data = result.data;
        setActors((current) => (page === 1 ? data.items : [...current, ...data.items]));
        setNextPage(data.page.next);
        setIsForbidden(false);
      } finally {
        isLoadingRef.current = false;
        setIsInitialLoading(false);
        setIsLoadingMore(false);
      }
    },
    [client, screenName],
  );

  useAsyncEffect(async () => {
    setActors([]);
    setNextPage(null);
    setIsForbidden(false);
    await fetchPage(1);
  }, [screenName]);

  const renderItem = useCallback<ListRenderItem<CatalystRemoteFollower>>(
    ({ item }) => <RemoteActorCard actor={item} />,
    [],
  );

  if (isForbidden) {
    return (
      <CatalystEmptyState
        title="リモートフォロワーは非公開です"
        description="このユーザーのフォロワー一覧は公開されていません。"
        icon={<UniLock />}
      />
    );
  }

  return (
    <FlashList
      data={actors}
      keyExtractor={(actor) => actor.id}
      renderItem={renderItem}
      ListEmptyComponent={
        isInitialLoading ? UserListPlaceholder : <CatalystEmptyState title="リモートフォロワーがいません" />
      }
      ListFooterComponent={
        isLoadingMore ? (
          <View className="py-4">
            <ActivityIndicator />
          </View>
        ) : null
      }
      onEndReached={() => {
        if (nextPage !== null && !isInitialLoading) fetchPage(nextPage);
      }}
      onEndReachedThreshold={0.3}
    />
  );
};
