import { AlbumList } from "@/components/explorer/albums/list";
import { AlbumsPlaceholder } from "@/components/explorer/albums/placeholder";
import { ContestsPlaceholder } from "@/components/explorer/contests/placeholder";
import { StatusesPlaceholder } from "@/components/explorer/statuses/placeholder";
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
  const [query, setQuery] = useState<string>("");
  const [focused, setFocused] = useState(false);
  const client = useAtomValue(clientAtom);
  const [state, setState] = useState(v4());

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

  const runQuery = useCallback(() => setState(v4()), []);

  return (
    <View className="flex-col flex-1">
      <View className="px-4">
        <View className="flex flex-row items-center px-2 rounded-lg bg-neutral-200 dark:bg-neutral-800">
          <UniSearchIcon size={24} className="text-light-icon dark:text-dark-icon" />
          <TextInput
            className="w-full shrink text-black dark:text-white placeholder-light-icon dark:placeholder-dark-icon"
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onSubmitEditing={runQuery}
            placeholder="検索..."
          />
          {focused && (
            <UniTimesIcon
              size={24}
              className="text-light-icon dark:text-dark-icon"
              onPress={() => {
                setQuery("");
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
                  return <TimelineBase key={state} fetcher={timeline} />;
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
