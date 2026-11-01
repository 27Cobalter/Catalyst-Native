import { ItemList } from "@/components/explorer/items/list";
import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

/**
 * 検索タブのアイテム一覧を、作者 (ショップ) 名で絞り込んだ状態で開く画面。
 * 投稿のメタデータで作者名を押したときに、その作者のアイテムを探すのに使う
 */
export default function ItemSearchPage() {
  const { author } = useLocalSearchParams<{ author?: string }>();
  const name = author ?? "";

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <Stack.Screen options={{ title: name || "アイテム" }} />
      <ItemList query={name} author={name} description={`「${name}」のアイテムです。`} />
    </View>
  );
}
