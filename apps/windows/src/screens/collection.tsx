import {
  createTabNavigator,
  type NavigationItemContentProps,
} from "@natsuneko-laboratory/react-native-desktop-navigation";
import { cn } from "cn";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Page, PageHeader } from "../components/page";
import { Skeleton, TabItemContent } from "../components/ui";

// コンテスト・お題・ギャラリーのような、カードをグリッドで並べる一覧画面
type CollectionTab<T extends string> = { key: T; label: string };
type CollectionScreenProps<T extends string> = {
  title: string;
  subtitle: string;
  tabs: CollectionTab<T>[];
  variant: "card" | "media";
};

const CardSkeleton = ({ variant }: { variant: "card" | "media" }) => {
  if (variant === "media") {
    return <Skeleton className="aspect-square w-full rounded-md" />;
  }

  return (
    <View className="overflow-hidden rounded-lg border-hairline border-light-divider bg-light-surface dark:border-dark-divider dark:bg-dark-surface">
      <Skeleton className="aspect-video w-full rounded-none" />
      <View className="gap-2 p-4">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/5" />
      </View>
    </View>
  );
};

// 各タブは同じプレースホルダーグリッドを表示するため、variant だけを閉じ込めたコンポーネントを Tabs.Screen に渡す
const CollectionGrid = ({ variant }: { variant: "card" | "media" }) => {
  const [width, setWidth] = useState(0);
  const minimum = variant === "media" ? 180 : 280;
  const columns = Math.max(1, Math.floor(width / minimum));

  return (
    <ScrollView>
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
    </ScrollView>
  );
};

export const CollectionScreen = <T extends string>({ title, subtitle, tabs, variant }: CollectionScreenProps<T>) => {
  // タブ構成は画面ごとに固定なので、マウント時に一度だけ Navigator とグリッドの component 参照を作る
  const [Tabs] = useState(() => createTabNavigator<{ [key in T]: undefined }>());
  const [Grid] = useState(() => () => <CollectionGrid variant={variant} />);

  return (
    <Page wide rightRail={false} scroll={false} header={<PageHeader title={title} subtitle={subtitle} />}>
      <Tabs.Navigator
        barStyle={{ backgroundColor: "transparent", paddingHorizontal: 12 }}
        contentStyle={{ backgroundColor: "transparent" }}
        screenOptions={{
          // 他画面の SegmentedTabs (components/ui.tsx) と見た目を揃える: 左寄せの SelectorBar 風
          itemStyle: {
            margin: 0,
            padding: 0,
            borderWidth: 0,
            borderRadius: 0,
            // ライブラリ側が選択時に colors.selectedBackground を既定で敷くため、下線のみの見た目にするには打ち消す必要がある
            backgroundColor: "transparent",
          },
          renderItemContent: ({ label, selected, hovered }: NavigationItemContentProps) => (
            <TabItemContent label={label} selected={selected} hovered={hovered} />
          ),
        }}
      >
        {tabs.map((tab) => (
          // ジェネリックな T から Tabs.Screen の name (Extract<keyof Params, string>) へは TS が自動で対応できないため明示キャストする
          <Tabs.Screen key={tab.key} name={tab.key as never} component={Grid} options={{ label: tab.label }} />
        ))}
      </Tabs.Navigator>
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
