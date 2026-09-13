import { FollowList } from "@/components/profile/follow-list";
import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

export default function FollowingsPage() {
  const { screenName } = useLocalSearchParams<{ screenName: string }>();

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <Stack.Screen options={{ title: "フォロー中" }} />
      <FollowList screenName={screenName} type="followings" />
    </View>
  );
}
