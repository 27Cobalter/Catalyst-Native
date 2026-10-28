import {
  CatalystAvatar,
  CatalystDivider,
  CatalystListItem,
  CatalystSearchField,
  CatalystText,
} from "@/components/design-system";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { clientAtom } from "@/models/atoms/credential";
import { MAX_USERS, toggleUser, toUserProfile, type UserProfile } from "@/models/epiclese-metadata-editor";
import type { UserResponse } from "@natsuneko-laboratory/catalyst-sdk";
import { useAtomValue } from "jotai";
import { Check, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, View } from "react-native";
import { withUniwind } from "uniwind";

const UniCheck = withUniwind(Check);
const UniX = withUniwind(X);

type Props = {
  visible: boolean;
  users: { id: string }[];
  profiles: Record<string, UserProfile>;
  onCancel: () => void;
  onDone: (users: { id: string }[], profiles: Record<string, UserProfile>) => void;
};

// 「完了」を押すまで編集画面には反映しないので、開いている間は下書きを持つ
export const UserPickerModal = ({ visible, users, profiles, onCancel, onDone }: Props) => {
  const client = useAtomValue(clientAtom);
  const [draft, setDraft] = useState(users);
  const [draftProfiles, setDraftProfiles] = useState(profiles);
  const [query, setQuery] = useState("");
  const [isLimited, setIsLimited] = useState(false);

  useEffect(() => {
    if (!visible) return;

    setDraft(users);
    setDraftProfiles(profiles);
    setQuery("");
    setIsLimited(false);
    // 開いた時点の値から始めればよく、開いている間に親の値が変わっても下書きは作り直さない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const fetchUsers = useCallback(
    async (q: string) => {
      const { data } = await client.egeria.v1.search.get({ query: { q }, throwOnError: true });
      return data.users;
    },
    [client],
  );
  const { results, isLoading, isError, retry } = useDebouncedSearch<UserResponse>(query, fetchUsers, {
    skipEmpty: true,
  });

  const handleToggle = useCallback((user: Pick<UserResponse, "id" | "displayName" | "screenName" | "profile">) => {
    setDraftProfiles((prev) => ({ ...prev, [user.id]: toUserProfile(user) }));
    setDraft((prev) => {
      const next = toggleUser(prev, user.id);
      setIsLimited(next.limited);
      return next.users;
    });
  }, []);

  const handleRemove = useCallback((userId: string) => {
    setDraft((prev) => prev.filter((user) => user.id !== userId));
    setIsLimited(false);
  }, []);

  const displayNameOf = (userId: string) => draftProfiles[userId]?.displayName ?? userId.slice(0, 8);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View className="flex-1 bg-light-background dark:bg-dark-background">
        <View className="min-h-14 flex-row items-center justify-between px-4">
          <Pressable onPress={onCancel} hitSlop={8} className="py-2">
            <CatalystText variant="subtitle" tone="tint" className="font-normal">
              キャンセル
            </CatalystText>
          </Pressable>
          <CatalystText variant="subtitle">写っている人</CatalystText>
          <Pressable onPress={() => onDone(draft, draftProfiles)} hitSlop={8} className="py-2">
            <CatalystText variant="subtitle" tone="tint">
              完了
            </CatalystText>
          </Pressable>
        </View>
        <CatalystDivider />

        <View className="gap-2 px-4 py-3">
          <CatalystText variant="caption" tone="subtle">
            {draft.length}/{MAX_USERS} 人
          </CatalystText>
          {draft.length === 0 ? (
            <CatalystText tone="muted">ユーザーが選択されていません</CatalystText>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {draft.map((user) => (
                <Pressable
                  key={user.id}
                  onPress={() => handleRemove(user.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${displayNameOf(user.id)} を外す`}
                  className="flex-row items-center gap-1.5 rounded-full bg-light-surface-muted py-1 pr-2.5 pl-1 dark:bg-dark-surface-muted"
                >
                  <CatalystAvatar
                    size="sm"
                    source={draftProfiles[user.id]?.iconUrl}
                    fallback={displayNameOf(user.id)}
                    className="size-6"
                  />
                  <CatalystText className="max-w-32" numberOfLines={1}>
                    {displayNameOf(user.id)}
                  </CatalystText>
                  <UniX size={14} className="text-light-icon dark:text-dark-icon" />
                </Pressable>
              ))}
            </ScrollView>
          )}
          {isLimited && <CatalystText tone="danger">最大 {MAX_USERS} 人まで選べます</CatalystText>}
          <CatalystSearchField
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery("")}
            placeholder="表示名やユーザー名で検索..."
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
            keyExtractor={(user) => user.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              isLoading ? (
                <ActivityIndicator className="py-8" colorClassName="accent-light-tint dark:accent-dark-tint" />
              ) : query.trim() !== "" ? (
                <CatalystText tone="muted" className="px-6 py-8 text-center">
                  一致するユーザーが見つかりませんでした。
                </CatalystText>
              ) : undefined
            }
            renderItem={({ item: user }) => {
              const isSelected = draft.some((selected) => selected.id === user.id);

              return (
                <CatalystListItem
                  onPress={() => handleToggle(user)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  className="px-4"
                >
                  <CatalystAvatar source={user.profile?.iconUrl} fallback={user.displayName} />
                  <View className="min-w-0 flex-1">
                    <CatalystText variant="label" numberOfLines={1}>
                      {user.displayName}
                    </CatalystText>
                    <CatalystText variant="caption" tone="muted" numberOfLines={1}>
                      @{user.screenName}
                    </CatalystText>
                  </View>
                  {isSelected && <UniCheck size={20} className="text-light-tint dark:text-dark-tint" />}
                </CatalystListItem>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
};
