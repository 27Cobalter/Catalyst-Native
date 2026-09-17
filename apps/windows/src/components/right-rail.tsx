import { ScrollView, Text, View } from "react-native";
import { SearchField, Skeleton } from "./ui";

type RailCardProps = {
  title: string;
  children: React.ReactNode;
};

const RailCard = ({ title, children }: RailCardProps) => {
  return (
    <View className="overflow-hidden rounded-2xl border border-light-divider bg-light-surface dark:border-dark-divider dark:bg-dark-surface">
      <Text
        accessibilityRole="header"
        className="px-4 pb-1 pt-3 text-[15px] font-bold text-light-text dark:text-dark-text"
      >
        {title}
      </Text>
      {children}
    </View>
  );
};

// データ取得前のプレースホルダー行
const TrendRow = () => {
  return (
    <View className="gap-1.5 px-4 py-2.5">
      <Skeleton className="h-2.5 w-16" />
      <Skeleton className="h-3.5 w-32" />
      <Skeleton className="h-2.5 w-20" />
    </View>
  );
};

const ContestRow = () => {
  return (
    <View className="flex-row items-center gap-3 px-4 py-2.5">
      <Skeleton className="size-11 rounded-xl" />
      <View className="flex-1 gap-1.5">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-2.5 w-24" />
      </View>
    </View>
  );
};

// Twitter for Web のような、トレンドやおすすめを並べる右カラム
export const RightRail = () => {
  return (
    <ScrollView className="w-[320px] grow-0" contentContainerClassName="gap-4 px-5 pb-8 pt-4">
      <SearchField placeholder="Catalyst を検索" />
      <RailCard title="トレンド">
        <TrendRow />
        <TrendRow />
        <TrendRow />
        <View className="h-2" />
      </RailCard>
      <RailCard title="開催中のコンテスト">
        <ContestRow />
        <ContestRow />
        <View className="h-2" />
      </RailCard>
      <Text className="px-1 text-[11px] leading-4 text-light-text-subtle dark:text-dark-text-subtle">
        利用規約 · プライバシーポリシー · © Natsuneko Laboratory
      </Text>
    </ScrollView>
  );
};
