import { Image, ListFilter, Smile } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { Page, PageHeader } from "../components/page";
import { TimelineSkeleton } from "../components/status-skeleton";
import { Avatar, Button, Divider, IconButton, SegmentedTabs, type SegmentedTab } from "../components/ui";

const UniImage = withUniwind(Image);
const UniSmile = withUniwind(Smile);
const UniListFilter = withUniwind(ListFilter);

type Timeline = "recommended" | "following";

const TIMELINES: SegmentedTab<Timeline>[] = [
  { key: "recommended", label: "おすすめ" },
  { key: "following", label: "フォロー中" },
];

// タイムライン先頭のインライン投稿欄
const Composer = () => {
  return (
    <View>
      <View className="flex-row gap-3 px-5 py-4">
        <Avatar />
        <View className="flex-1 gap-3">
          <Pressable accessibilityRole="button" focusable className="min-h-10 justify-center">
            <Text className="text-lg text-light-text-subtle dark:text-dark-text-subtle">いまどうしてる？</Text>
          </Pressable>
          <Divider />
          <View className="flex-row items-center">
            <IconButton label="画像を追加">
              <UniImage size={18} className="text-light-link dark:text-dark-link" />
            </IconButton>
            <IconButton label="絵文字を追加">
              <UniSmile size={18} className="text-light-link dark:text-dark-link" />
            </IconButton>
            <View className="flex-1" />
            <Button label="投稿" disabled />
          </View>
        </View>
      </View>
      <Divider />
    </View>
  );
};

export const HomeScreen = () => {
  const [timeline, setTimeline] = useState<Timeline>("recommended");

  return (
    <Page
      header={
        <PageHeader
          title="ホーム"
          actions={
            <IconButton label="表示設定">
              <UniListFilter size={18} className="text-light-icon dark:text-dark-icon" />
            </IconButton>
          }
        >
          <SegmentedTabs tabs={TIMELINES} value={timeline} onChange={setTimeline} />
        </PageHeader>
      }
    >
      <Composer />
      <TimelineSkeleton />
    </Page>
  );
};
