import { CatalystListItem, CatalystSearchField, CatalystText } from "@/components/design-system";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { clientAtom } from "@/models/atoms/credential";
import type { EditableWorld } from "@/models/epiclese-metadata-editor";
import type { EpiclesePlatformResponse, EpicleseWorldResponse } from "@natsuneko-laboratory/catalyst-sdk";
import { useAtomValue } from "jotai";
import { Check } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

import { PickerHeader } from "../picker-header";

const UniCheck = withUniwind(Check);

type Props = {
  platform: EpiclesePlatformResponse;
  value: EditableWorld | undefined;
  onCancel: () => void;
  onSelect: (world: EpicleseWorldResponse) => void;
  onClear: () => void;
  onRegister: () => void;
};

type Row = { id: string; name: string; authorName: string | undefined; world: EpicleseWorldResponse | undefined };

export const WorldSearchStep = ({ platform, value, onCancel, onSelect, onClear, onRegister }: Props) => {
  const client = useAtomValue(clientAtom);
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  const fetchWorlds = useCallback(
    async (q: string) => {
      const { data } = await client.epiclese.v1.worlds.get({ query: { q, platform: platform.id }, throwOnError: true });
      return data.items;
    },
    [client, platform.id],
  );
  const { results, isLoading, isError, retry } = useDebouncedSearch(query, fetchWorlds);

  // 選択中のワールドが検索結果に無くても、何が選ばれているかが分かるように先頭に出す (Web 版と同じ)
  const rows: Row[] = results.map((world) => ({
    id: world.id,
    name: world.name,
    authorName: world.author?.name,
    world,
  }));
  if (value?.id && !rows.some((row) => row.id === value.id)) {
    rows.unshift({ id: value.id, name: value.name, authorName: value.author?.name, world: undefined });
  }

  return (
    <>
      <PickerHeader title="ワールド" left={{ label: "キャンセル", onPress: onCancel }} />
      <View className="gap-3 px-4 py-3">
        <CatalystSearchField
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery("")}
          placeholder="ワールド名もしくは ID を入力..."
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value && (
          <Pressable onPress={onClear} hitSlop={8} className="self-start">
            <CatalystText tone="danger">選択を外す</CatalystText>
          </Pressable>
        )}
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
          data={rows}
          keyExtractor={(row) => row.id}
          keyboardShouldPersistTaps="handled"
          // 末尾の行がホームインジケーターに重ならないよう、下の安全領域ぶん余白を取る
          contentContainerStyle={{ paddingBottom: insets.bottom }}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator className="py-8" colorClassName="accent-light-tint dark:accent-dark-tint" />
            ) : (
              <CatalystText tone="muted" className="px-6 py-8 text-center">
                一致するワールドが見つかりませんでした。
              </CatalystText>
            )
          }
          ListFooterComponent={
            <Pressable onPress={onRegister} className="px-4 py-5">
              <CatalystText tone="tint">見つからない場合はワールドを登録</CatalystText>
            </Pressable>
          }
          renderItem={({ item: row }) => {
            const isSelected = row.id === value?.id;

            return (
              <CatalystListItem
                onPress={() => (row.world ? onSelect(row.world) : onCancel())}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                className="px-4"
              >
                <View className="min-w-0 flex-1">
                  <CatalystText variant="label" numberOfLines={1}>
                    {row.name}
                  </CatalystText>
                  {row.authorName && (
                    <CatalystText variant="caption" tone="muted" numberOfLines={1}>
                      {row.authorName}
                    </CatalystText>
                  )}
                </View>
                {isSelected && <UniCheck size={20} className="text-light-tint dark:text-dark-tint" />}
              </CatalystListItem>
            );
          }}
        />
      )}
    </>
  );
};
