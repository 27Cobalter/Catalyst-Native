import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { accountAtom } from "@/models/atoms/account";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Tabs, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { Bell, House, Search } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabItem = {
  key: string;
  label: string;
  href: string;
  icon: (color: string) => React.ReactNode;
  authRequired?: boolean;
};

function CustomTabBar({ state }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const account = useAtomValue(accountAtom);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = Colors[colorScheme === "unspecified" ? "light" : colorScheme];

  const tabs: TabItem[] = [
    {
      key: "index",
      label: "ホーム",
      href: "/(drawer)/(tabs)/",
      icon: (color) => <House size={28} color={color} />,
    },
    {
      key: "explore",
      label: "検索",
      href: "/(drawer)/(tabs)/explore",
      icon: (color) => <Search size={28} color={color} />,
    },
    ...(account
      ? [
          {
            key: "notifications",
            label: "通知",
            href: "/(drawer)/(tabs)/notifications",
            icon: (color: string) => <Bell size={28} color={color} />,
          },
          {
            key: "profile",
            label: "プロフィール",
            href: "/(drawer)/(tabs)/profile",
            icon: () => (
              <View className="overflow-hidden rounded-full">
                <Image
                  source={`${account.user.profile?.iconUrl}/tiny`}
                  style={{ width: 28, height: 28 }}
                  contentFit="cover"
                />
              </View>
            ),
          },
        ]
      : []),
  ];

  const activeTabRoute = state.routes[state.index]?.name;

  const getIsActive = (tab: TabItem) => {
    if (tab.key === "index") return activeTabRoute === "index";
    return activeTabRoute === tab.key;
  };

  return (
    <View
      style={{
        flexDirection: "row",
        paddingBottom: insets.bottom,
        backgroundColor: colorScheme === "dark" ? Colors.dark.background : Colors.light.background,
        borderTopWidth: 0.5,
        borderTopColor: colorScheme === "dark" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = getIsActive(tab);
        const color = isActive ? colors.tint : colors.icon;

        return (
          <Pressable
            key={tab.key}
            onPressIn={() => {
              if (process.env.EXPO_OS === "ios") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            onPress={() => {
              router.navigate(tab.href as any);
            }}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 8,
            }}
          >
            {tab.icon(color)}
            <Text style={{ color, fontSize: 10, marginTop: 2 }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
