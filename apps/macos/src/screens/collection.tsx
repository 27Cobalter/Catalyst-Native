import { cn } from "cn";
import { useState } from "react";
import { View } from "react-native";
import { Page, PageHeader } from "../components/page";
import { SegmentedTabs, Skeleton, type SegmentedTab } from "../components/ui";

// コンテスト・お題・ギャラリーのような、カードをグリッドで並べる一覧画面
type CollectionScreenProps<T extends string> = {
  title: string;
  subtitle: string;
  tabs: SegmentedTab<T>[];
  variant: "card" | "media";
};

const CardSkeleton = ({ variant }: { variant: "card" | "media" }) => {
  if (variant === "media") {
    return <Skeleton className="aspect-square w-full rounded-xl" />;
  }

  return (
    <View className="overflow-hidden rounded-2xl border border-light-divider bg-light-surface dark:border-dark-divider dark:bg-dark-surface">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <View className="gap-2 p-4">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/5" />
      </View>
    </View>
  );
};

export const CollectionScreen = <T extends string>({ title, subtitle, tabs, variant }: CollectionScreenProps<T>) => {
  const [tab, setTab] = useState(tabs[0]!.key);
  const [width, setWidth] = useState(0);

  // 画面幅に応じて列数を変える
  const minimum = variant === "media" ? 180 : 280;
  const columns = Math.max(1, Math.floor(width / minimum));

  return (
    <Page
      wide
      rightRail={false}
      header={
        <PageHeader title={title} subtitle={subtitle}>
          <View className="max-w-[640px]">
            <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />
          </View>
        </PageHeader>
      }
    >
      <View
        className={cn("flex-row flex-wrap p-5", variant === "media" ? "gap-2" : "gap-4")}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width - 40)}
      >
        {width > 0 &&
          Array.from({ length: columns * 3 }, (_, index) => (
            <View key={index} style={{ width: (width - (columns - 1) * (variant === "media" ? 8 : 16)) / columns }}>
              <CardSkeleton variant={variant} />
            </View>
          ))}
      </View>
    </Page>
  );
};

export const ContestsScreen = () => (
  <CollectionScreen
    title="コンテスト"
    subtitle="テーマに沿った作品を投稿して参加しよう"
    variant="card"
    tabs={[
      { key: "open", label: "開催中" },
      { key: "upcoming", label: "開催予定" },
      { key: "closed", label: "終了" },
    ]}
  />
);

export const ThemesScreen = () => (
  <CollectionScreen
    title="お題"
    subtitle="毎日のお題に合わせて投稿しよう"
    variant="card"
    tabs={[
      { key: "today", label: "今日のお題" },
      { key: "past", label: "過去のお題" },
    ]}
  />
);

export const GalleryScreen = () => (
  <CollectionScreen
    title="ギャラリー"
    subtitle="みんなの作品をまとめて眺める"
    variant="media"
    tabs={[
      { key: "latest", label: "新着" },
      { key: "popular", label: "人気" },
    ]}
  />
);
