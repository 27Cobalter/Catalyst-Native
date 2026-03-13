import { Tab, Tabs } from "@/components/tabs";
import { FirehoseTimeline } from "@/components/timeline/firehose";
import { FollowingTimeline } from "@/components/timeline/following";
import { accountAtom } from "@/models/atoms/account";
import { useAtomValue } from "jotai";
import React from "react";
import { View } from "react-native";

const TABS: Tab[] = [
  { key: "following", label: "フォロー中" },
  { key: "firehose", label: "グローバル" },
];

export default function HomeScreen() {
  const account = useAtomValue(accountAtom);

  if (account) {
    return (
      <View className="flex-1 bg-light-background dark:bg-dark-background">
        <Tabs
          tabs={TABS}
          renderScene={(tab) => {
            if (tab.key === "firehose") return <FirehoseTimeline />;
            return <FollowingTimeline />;
          }}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <FirehoseTimeline />
    </View>
  );
}
