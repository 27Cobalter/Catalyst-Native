import { useState } from "react";
import { View } from "react-native";
import { Page, PageHeader } from "../components/page";
import { TimelineSkeleton } from "../components/status-skeleton";
import { SearchField, SegmentedTabs, type SegmentedTab } from "../components/ui";

type Category = "trending" | "latest" | "media" | "users";

const CATEGORIES: SegmentedTab<Category>[] = [
  { key: "trending", label: "話題" },
  { key: "latest", label: "最新" },
  { key: "media", label: "メディア" },
  { key: "users", label: "ユーザー" },
];

export const ExplorerScreen = () => {
  const [category, setCategory] = useState<Category>("trending");

  return (
    <Page
      rightRail={false}
      header={
        <PageHeader title="探索">
          <View className="px-5 pb-2">
            <SearchField placeholder="キーワード・#タグ・@ユーザーで検索" />
          </View>
          <SegmentedTabs tabs={CATEGORIES} value={category} onChange={setCategory} />
        </PageHeader>
      }
    >
      <TimelineSkeleton />
    </Page>
  );
};
