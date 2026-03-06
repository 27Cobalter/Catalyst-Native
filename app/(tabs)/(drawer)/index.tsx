import { Tab, Tabs } from "@/components/tabs";
import { FirehoseTimeline } from "@/components/timeline/firehose";
import { FollowingTimeline } from "@/components/timeline/following";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { accountAtom } from "@/models/atoms/account";
import { useAtomValue } from "jotai";
import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TABS: Tab[] = [
  { key: "following", label: "フォロー中" },
  { key: "firehose", label: "グローバル" },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "unspecified" ? "light" : colorScheme];
  const account = useAtomValue(accountAtom);

  if (account) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Tabs
          tabs={TABS}
          renderScene={(tab) => {
            if (tab.key === "firehose") return <FirehoseTimeline />;
            return <FollowingTimeline />;
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <View>
      <FirehoseTimeline />
    </View>
  );
}
