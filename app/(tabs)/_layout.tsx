import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { accountAtom } from "@/models/atoms/account";
import { Image } from "expo-image";
import { Tabs } from "expo-router";
import { useAtomValue } from "jotai";
import { Bell, House, Search } from "lucide-react-native";
import React from "react";
import { View } from "react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const account = useAtomValue(accountAtom);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme === "unspecified" ? "light" : colorScheme].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "ホーム",
          tabBarIcon: ({ color }) => <House size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "検索",
          tabBarIcon: ({ color }) => <Search size={28} color={color} />,
        }}
      />
      {account && (
        <Tabs.Screen
          name="notifications"
          options={{
            title: "通知",
            tabBarIcon: ({ color }) => <Bell size={28} color={color} />,
          }}
        />
      )}
      {account && (
        <Tabs.Screen
          name="profile"
          options={{
            title: "プロフィール",
            tabBarIcon: () => (
              <View className="overflow-hidden rounded-full">
                <Image
                  source={`${account.user.profile?.iconUrl}/tiny`}
                  style={{ width: 28, height: 28 }}
                  contentFit="cover"
                />
              </View>
            ),
          }}
        />
      )}
    </Tabs>
  );
}
