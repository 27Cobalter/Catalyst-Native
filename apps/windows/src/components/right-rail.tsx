import { ScrollView, Text, View } from "react-native";
import { Trends } from "./trends";
import { SearchField, Skeleton } from "./ui";
import { RailCard, RailRow } from "./ui/rail";


const ContestRow = () => {
  return (
    <RailRow label="コンテスト">
      <View className="flex-row items-center gap-3 px-4 py-2.5">
        <Skeleton className="size-11 rounded-md" />
        <View className="flex-1 gap-1.5">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-2.5 w-24" />
        </View>
      </View>
    </RailRow>
  );
};

// トレンドやおすすめを並べる右カラム。幅が足りない / 詳細ペインを開いている間は Page 側で非表示にする
export const RightRail = () => {
  return (
    <ScrollView
      className="w-[320px] grow-0 border-l-hairline border-light-divider dark:border-dark-divider"
      contentContainerClassName="gap-4 px-4 pb-8 pt-4"
    >
      <SearchField placeholder="Catalyst を検索" />
      <Trends />
      <RailCard title="開催中のコンテスト">
        <ContestRow />
        <ContestRow />
      </RailCard>
      <Text className="px-1 text-[11px] leading-4 text-light-text-subtle dark:text-dark-text-subtle">
        利用規約 · プライバシーポリシー · © Natsuneko Laboratory
      </Text>
    </ScrollView>
  );
};
