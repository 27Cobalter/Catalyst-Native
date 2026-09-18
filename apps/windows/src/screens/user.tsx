import { CalendarDays, Ellipsis, Link } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { TimelineSkeleton } from "../components/status-skeleton";
import { Avatar, Button, IconButton, SegmentedTabs, Skeleton, type SegmentedTab } from "../components/ui";

const UniCalendarDays = withUniwind(CalendarDays);
const UniEllipsis = withUniwind(Ellipsis);
const UniLink = withUniwind(Link);

type Tab = "statuses" | "replies" | "media" | "reactions";

const TABS: SegmentedTab<Tab>[] = [
  { key: "statuses", label: "投稿" },
  { key: "replies", label: "返信" },
  { key: "media", label: "メディア" },
  { key: "reactions", label: "リアクション" },
];

type Props = {
  screenName: string;
};

// プロフィール: ヘッダー画像 → アバター・操作 → 自己紹介 → フォロー数 → タブ付きタイムライン
export const UserProfile = ({ screenName }: Props) => {
  const [tab, setTab] = useState<Tab>("statuses");

  return (
    <ScrollView stickyHeaderIndices={[1]} contentContainerClassName="pb-10">
      <View>
        <Skeleton className="aspect-[3/1] max-h-56 w-full rounded-none" />
        <View className="flex-row items-end justify-between px-5">
          <Avatar size="xl" name={screenName} className="-mt-12" />
          <View className="flex-row items-center gap-2 pb-1">
            <IconButton label="その他の操作">
              <UniEllipsis size={16} className="text-light-icon dark:text-dark-icon" />
            </IconButton>
            <Button label="フォロー" />
          </View>
        </View>
        <View className="gap-3 px-5 pt-3">
          <View className="gap-1">
            <Skeleton className="h-5 w-40" />
            <Text selectable className="text-sm text-light-text-muted dark:text-dark-text-muted">
              @{screenName}
            </Text>
          </View>
          <View className="gap-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </View>
          <View className="flex-row flex-wrap gap-x-4 gap-y-1">
            <View className="flex-row items-center gap-1">
              <UniLink size={14} className="text-light-icon dark:text-dark-icon" />
              <Skeleton className="h-3 w-28" />
            </View>
            <View className="flex-row items-center gap-1">
              <UniCalendarDays size={14} className="text-light-icon dark:text-dark-icon" />
              <Skeleton className="h-3 w-24" />
            </View>
          </View>
          <View className="flex-row gap-4 pb-2">
            {["フォロー", "フォロワー"].map((label) => (
              <View key={label} className="flex-row items-center gap-1">
                <Skeleton className="h-3.5 w-8" />
                <Text className="text-[13px] text-light-text-muted dark:text-dark-text-muted">{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View className="border-b-hairline border-light-divider bg-light-background dark:border-dark-divider dark:bg-dark-background">
        <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />
      </View>
      <TimelineSkeleton prefix={`${screenName}-${tab}`} />
    </ScrollView>
  );
};
