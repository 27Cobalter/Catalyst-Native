import { useColorScheme } from "@/hooks/use-color-scheme";
import { useHaptics } from "@/hooks/use-haptics";
import { cn } from "@/lib/utils";
import { accountAtom } from "@/models/atoms/account";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Tabs, type BottomTabBarProps } from "expo-router/js-tabs";
import { useAtomValue } from "jotai";
import { Bell, House, Search } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const UniHouse = withUniwind(House);
const UniSearch = withUniwind(Search);
const UniBell = withUniwind(Bell);

type TabItem = {
  key: string;
  label: string;
  icon: (className: string) => React.ReactNode;
};

function CustomTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const account = useAtomValue(accountAtom);
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();

  const tabs: TabItem[] = [
    {
      key: "index",
      label: "ホーム",
      icon: (className) => <UniHouse size={28} className={className} />,
    },
    {
      key: "explore",
      label: "検索",
      icon: (className) => <UniSearch size={28} className={className} />,
    },
    ...(account
      ? [
          {
            key: "notifications",
            label: "通知",
            icon: (className: string) => <UniBell size={28} className={className} />,
          },
          {
            key: "profile",
            label: "プロフィール",
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

  return (
    <View
      className="bg-light-background dark:bg-dark-background"
      style={{
        flexDirection: "row",
        paddingBottom: insets.bottom,
        borderTopWidth: 0.5,
        borderTopColor: colorScheme === "dark" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTabRoute === tab.key;
        const className = isActive ? "text-light-tint dark:text-dark-tint" : "text-light-icon dark:text-dark-icon";

        return (
          <Pressable
            key={tab.key}
            onPressIn={() => {
              if (process.env.EXPO_OS === "ios") {
                haptics.impact(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            onPress={() => {
              const route = state.routes.find((route) => route.name === tab.key);
              if (!route) {
                return;
              }

              const isFocused = state.routes[state.index]?.key === route.key;
              const event = emitter.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigateToTab(route.key);
              }
            }}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 8,
            }}
          >
            {tab.icon(className)}
            <Text
              className={cn("text-light-icon dark:text-light-icon", isActive && "text-light-tint dark:text-dark-tint")}
              style={{ fontSize: 10, marginTop: 2 }}
            >
              {tab.label}
            </Text>
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
