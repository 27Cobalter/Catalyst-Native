import {
  ContentTypeSelectorSheet,
  type ContentTypeSelectorSheetRef,
} from "@/components/content-type-selector-sheet";
import { Tab, Tabs } from "@/components/tabs";
import { FirehoseTimeline } from "@/components/timeline/firehose";
import { FollowingTimeline } from "@/components/timeline/following";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { accountAtom } from "@/models/atoms/account";
import { useAtomValue } from "jotai";
import React, { useCallback, useRef } from "react";
import { View } from "react-native";

const TABS: Tab[] = [
  { key: "following", label: "フォロー中" },
  { key: "firehose", label: "グローバル" },
];

export default function HomeScreen() {
  const account = useAtomValue(accountAtom);
  const selectorSheetRef = useRef<ContentTypeSelectorSheetRef>(null);

  const handleFabPress = useCallback(() => {
    selectorSheetRef.current?.open();
  }, []);

  const handleContentTypeSelect = useCallback((contentType: string) => {
    // TODO: Navigate to the corresponding composer screen
    console.log("Selected content type:", contentType);
  }, []);

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
        <FloatingActionButton onPress={handleFabPress} />
        <ContentTypeSelectorSheet
          ref={selectorSheetRef}
          onSelect={handleContentTypeSelect}
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
