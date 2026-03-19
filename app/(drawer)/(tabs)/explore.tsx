import { AlbumList } from "@/components/explorer/albums/list";
import { AlbumsPlaceholder } from "@/components/explorer/albums/placeholder";
import { ContestsPlaceholder } from "@/components/explorer/contests/placeholder";
import { StatusesEmptyResult } from "@/components/explorer/statuses/empty-result";
import { StatusesPlaceholder } from "@/components/explorer/statuses/placeholder";
import { UserList } from "@/components/explorer/users/list";
import { UsersPlaceholder } from "@/components/explorer/users/placeholder";
import { Tab, Tabs } from "@/components/tabs";
import { TimelineBase } from "@/components/timeline/base";
import { clientAtom } from "@/models/atoms/credential";
import { useAtomValue } from "jotai";
import { Search, X } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { TextInput, View } from "react-native";
import { withUniwind } from "uniwind";
import { v4 } from "uuid";

const UniSearchIcon = withUniwind(Search);
const UniTimesIcon = withUniwind(X);

const TABS: Tab[] = [
  { key: "statuses", label: "投稿" },
  { key: "albums", label: "アルバム" },
  { key: "users", label: "ユーザー" },
  { key: "contests", label: "コンテスト" },
];

export default function HomeScreen() {
  const [state, setState] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [focused, setFocused] = useState(false);
  const client = useAtomValue(clientAtom);
  const [stateKey, setStateKey] = useState(v4());

  const timeline = useCallback(
    async (since: string | null, until: string | null) => {
      return (
        (
          await client?.catalyst.searchTimeline({
            q: query,
            since: since ?? undefined,
            until: until ?? undefined,
          })
        )?.statuses ?? []
      );
    },
    [client, query],
  );

  const runQuery = useCallback(() => {
    setQuery(state);
    setStateKey(v4());
  }, [state]);

  return (
    <View className="flex-col flex-1 bg-light-background dark:bg-dark-background">
      <View className="px-4">
        <View className="flex flex-row items-center px-2 rounded-lg bg-neutral-200 dark:bg-neutral-800">
          <UniSearchIcon size={24} className="text-light-icon dark:text-dark-icon" />
          <TextInput
            className="w-full h-8 shrink-0 android:h-10 text-black dark:text-white placeholder-light-icon dark:placeholder-dark-icon"
            value={state}
            onChangeText={setState}
            onFocus={() => setFocused(true)}
            onSubmitEditing={runQuery}
            placeholder="検索..."
          />
          {focused && (
            <UniTimesIcon
              size={24}
              className="text-light-icon dark:text-dark-icon"
              onPress={() => {
                setState("");
                setFocused(false);
              }}
            />
          )}
        </View>
      </View>
      <View className="flex-1">
        <Tabs
          tabs={TABS}
          renderScene={(w) => {
            switch (w.key) {
              case "statuses": {
                if (query) {
                  return (
                    <TimelineBase
                      key={stateKey}
                      fetcher={timeline}
                      ListEmptyComponent={StatusesEmptyResult}
                      ListEmptyComponentStyle={{ minHeight: "100%" }}
                    />
                  );
                }

                return <StatusesPlaceholder />;
              }

              case "albums": {
                if (query) {
                  return <AlbumList query={query} />;
                }

                return <AlbumsPlaceholder />;
              }

              case "users": {
                if (query) {
                  return <UserList query={query} />;
                }

                return <UsersPlaceholder />;
              }

              case "contests": {
                if (query) {
                }

                return <ContestsPlaceholder />;
              }
            }
          }}
        />
      </View>
    </View>
  );
}
