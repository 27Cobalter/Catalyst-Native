import { ScrollView, Text, View } from "react-native";
import { StatusActions, TimelineSkeleton } from "../components/status-skeleton";
import { Avatar, Button, Divider, Skeleton } from "../components/ui";
import { useOpenScene } from "../scenes/scene-host";

type Props = {
  id: string;
};

// 投稿詳細: 親スレッド → 本文 (大きめ) → 反応数 → 返信欄 → 返信一覧
export const StatusDetail = ({ id }: Props) => {
  const openScene = useOpenScene();

  return (
    <ScrollView contentContainerClassName="pb-10">
      <View className="gap-3 px-5 pt-4">
        <View className="flex-row items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <View className="flex-1 gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </View>
          <Button tone="secondary" label="フォロー" />
        </View>
        <View className="gap-2 py-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/5" />
        </View>
        <Skeleton className="aspect-video w-full rounded-lg" />
        <Text selectable className="text-xs text-light-text-muted dark:text-dark-text-muted">
          #{id} · 2026年9月18日 12:34
        </Text>
      </View>
      <Divider className="mx-5 mt-3" />
      <View className="flex-row gap-5 px-5 py-3">
        {["リポスト", "リアクション", "ブックマーク"].map((label) => (
          <View key={label} className="flex-row items-center gap-1.5">
            <Skeleton className="h-3.5 w-6" />
            <Text className="text-[13px] text-light-text-muted dark:text-dark-text-muted">{label}</Text>
          </View>
        ))}
      </View>
      <Divider className="mx-5" />
      <View className="px-5 py-1">
        <StatusActions className="justify-between" />
      </View>
      <Divider />
      <View className="flex-row items-center gap-3 px-5 py-3">
        <Avatar size="sm" />
        <Text className="flex-1 text-sm text-light-text-subtle dark:text-dark-text-subtle">返信を投稿</Text>
        <Button label="返信" onPress={() => openScene({ type: "compose", replyTo: id })} />
      </View>
      <Divider />
      <TimelineSkeleton count={4} prefix={`${id}-reply`} />
    </ScrollView>
  );
};
