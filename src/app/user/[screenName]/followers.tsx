import { CatalystSegmentedControl } from "@/components/design-system";
import { FollowList } from "@/components/profile/follow-list";
import { RemoteFollowerList } from "@/components/profile/remote-follower-list";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

type FollowerSource = "catalyst" | "remote";

const sourceOptions = [
  { value: "catalyst", label: "Catalyst" },
  { value: "remote", label: "リモート" },
] as const;

export default function FollowersPage() {
  const { screenName } = useLocalSearchParams<{ screenName: string }>();
  const [source, setSource] = useState<FollowerSource>("catalyst");

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <Stack.Screen options={{ title: "フォロワー" }} />
      <View className="border-b border-light-divider bg-light-background px-4 py-2 dark:border-dark-divider dark:bg-dark-surface">
        <CatalystSegmentedControl
          accessibilityLabel="フォロワーの種類"
          value={source}
          options={sourceOptions}
          onValueChange={setSource}
        />
      </View>
      {source === "catalyst" ? (
        <FollowList screenName={screenName} type="followers" />
      ) : (
        <RemoteFollowerList screenName={screenName} />
      )}
    </View>
  );
}
