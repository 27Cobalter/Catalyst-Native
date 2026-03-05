import { Tab, Tabs } from "@/components/tabs";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { accountAtom } from "@/models/atoms/account";
import { useAtomValue } from "jotai";
import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TABS: Tab[] = [
  { key: "firehose", label: "おすすめ" },
  { key: "following", label: "フォロー中" },
];

function FirehoseContent({ color }: { color: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 16, color }}>おすすめタイムライン</Text>
    </View>
  );
}

function FollowingContent({ color }: { color: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 16, color }}>フォロー中タイムライン</Text>
    </View>
  );
}

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
            if (tab.key === "firehose") return <FirehoseContent color={colors.icon} />;
            return <FollowingContent color={colors.icon} />;
          }}
        />
      </SafeAreaView>
    );
  }

  return <FirehoseContent color={colors.icon} />;
}
