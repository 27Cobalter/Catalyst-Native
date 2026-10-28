import { CatalystListItem, CatalystSearchField, CatalystText } from "@/components/design-system";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { clientAtom } from "@/models/atoms/credential";
import type { EpicleseAuthorResponse, EpiclesePlatformResponse } from "@natsuneko-laboratory/catalyst-sdk";
import { useAtomValue } from "jotai";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";

import { PickerHeader } from "../picker-header";

type Props = {
  platform: EpiclesePlatformResponse;
  onBack: () => void;
  onSelect: (author: EpicleseAuthorResponse) => void;
  onRegister: () => void;
};

export const AuthorSearchStep = ({ platform, onBack, onSelect, onRegister }: Props) => {
  const client = useAtomValue(clientAtom);
  const [query, setQuery] = useState("");

  const fetchAuthors = useCallback(
    async (q: string) => {
      const { data } = await client.epiclese.v1.authors.get({
        query: { q, platform: platform.id },
        throwOnError: true,
      });
      return data.items;
    },
    [client, platform.id],
  );
  const { results, isLoading, isError, retry } = useDebouncedSearch(query, fetchAuthors);

  return (
    <>
      <PickerHeader title="ワールド作者" left={{ label: "戻る", onPress: onBack }} />
      <View className="px-4 py-3">
        <CatalystSearchField
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery("")}
          placeholder="作者名もしくは ID を入力..."
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {isError ? (
        <View className="items-center gap-3 px-6 py-8">
          <CatalystText tone="muted">読み込みに失敗しました</CatalystText>
          <Pressable onPress={retry} hitSlop={8}>
            <CatalystText tone="tint">再読み込み</CatalystText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(author) => author.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator className="py-8" colorClassName="accent-light-tint dark:accent-dark-tint" />
            ) : (
              <CatalystText tone="muted" className="px-6 py-8 text-center">
                一致する作者が見つかりませんでした。
              </CatalystText>
            )
          }
          ListFooterComponent={
            <Pressable onPress={onRegister} className="px-4 py-5">
              <CatalystText tone="tint">見つからない場合は作者を登録</CatalystText>
            </Pressable>
          }
          renderItem={({ item: author }) => (
            <CatalystListItem onPress={() => onSelect(author)} accessibilityRole="button" className="px-4">
              <View className="min-w-0 flex-1">
                <CatalystText variant="label" numberOfLines={1}>
                  {author.name}
                </CatalystText>
                <CatalystText variant="caption" tone="muted" numberOfLines={1}>
                  {author.platformIdentifier}
                </CatalystText>
              </View>
            </CatalystListItem>
          )}
        />
      )}
    </>
  );
};
