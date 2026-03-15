import { SystemNotificationList } from "@/components/notification/system";
import { UserMessageList } from "@/components/notification/user-message";
import { Tab, Tabs } from "@/components/tabs";
import React from "react";
import { View } from "react-native";

const TABS: Tab[] = [
  { key: "system", label: "システム通知" },
  { key: "message", label: "メッセージ" },
];

export default function NotificationsScreen() {
  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <Tabs
        tabs={TABS}
        renderScene={(tab) => {
          if (tab.key === "message") return <UserMessageList />;
          return <SystemNotificationList />;
        }}
      />
    </View>
  );
}
